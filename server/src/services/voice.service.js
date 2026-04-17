/**
 * Voice Service
 * AURA ARCHIVE - Real-time voice AI using Gemini Live API
 * Handles session config and backend tool execution.
 */

const { SystemPrompt, ChatLog } = require('../models');
const productSearch = require('./ai/product-search');
const sessionMemory = require('./ai/session-memory');
const kb = require('./ai/knowledge-base');
const aiService = require('./ai.service');
const logger = require('../utils/logger');
const chatAdminService = require('./chat-admin.service');
const { emitNewMessage } = require('../socket');
const { isModelUrlAvailable } = require('./live2d.service');

const DEFAULT_GEMINI_LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const DEFAULT_GEMINI_LIVE_MODEL_BACKUP = 'gemini-2.5-flash-native-audio-preview-12-2025';
const DEFAULT_GEMINI_TTS_PREVIEW_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
const DEFAULT_VOICE_PREVIEW_TEXT = 'Xin chao, minh la AURA Stylist. Day la doan nghe thu de ban chon chat giong phu hop nhat.';
const PROMPT_CACHE_TTL = 60 * 1000;
const promptCache = {
    persona: { value: null, expiresAt: 0 },
};
const DEFAULT_VOICE_SETTINGS = Object.freeze({
    voiceName: 'Aoede',
    liveModel: '',
    temperature: 0.2,
    characterId: 'aura-classic',
    characterName: 'AURA',
    characterSubtitle: 'AI Stylist Voice Call',
    hintText: 'Nói bất cứ điều gì để bắt đầu tư vấn',
    live2dModelUrl: '/live2d/office_f/office_f.model3.json',
    live2dScale: 1.0,
    live2dOffsetY: 0,
    idleReminderSeconds: 60,
});

function normalizeVoiceString(value, fallback) {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function clampVoiceNumber(value, min, max, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, parsed));
}

function normalizeVoiceSettings(config = {}) {
    const requestedModelUrl = normalizeVoiceString(
        config.live2dModelUrl,
        DEFAULT_VOICE_SETTINGS.live2dModelUrl
    );
    const live2dModelUrl = isModelUrlAvailable(requestedModelUrl)
        ? requestedModelUrl
        : DEFAULT_VOICE_SETTINGS.live2dModelUrl;

    if (requestedModelUrl !== live2dModelUrl) {
        logger.warn(
            `Configured Live2D model is missing on disk, falling back to default: ${requestedModelUrl}`
        );
    }

    return {
        voiceName: normalizeVoiceString(config.voiceName, DEFAULT_VOICE_SETTINGS.voiceName),
        liveModel: typeof config.liveModel === 'string' ? config.liveModel.trim() : DEFAULT_VOICE_SETTINGS.liveModel,
        temperature: clampVoiceNumber(
            config.temperature,
            0,
            1,
            DEFAULT_VOICE_SETTINGS.temperature
        ),
        characterId: normalizeVoiceString(config.characterId, DEFAULT_VOICE_SETTINGS.characterId),
        characterName: normalizeVoiceString(config.characterName, DEFAULT_VOICE_SETTINGS.characterName),
        characterSubtitle: normalizeVoiceString(
            config.characterSubtitle,
            DEFAULT_VOICE_SETTINGS.characterSubtitle
        ),
        hintText: normalizeVoiceString(config.hintText, DEFAULT_VOICE_SETTINGS.hintText),
        live2dModelUrl,
        live2dScale: clampVoiceNumber(
            config.live2dScale,
            0.1,
            5.0,
            DEFAULT_VOICE_SETTINGS.live2dScale
        ),
        live2dOffsetY: clampVoiceNumber(
            config.live2dOffsetY,
            -1000,
            1000,
            DEFAULT_VOICE_SETTINGS.live2dOffsetY
        ),
        idleReminderSeconds: Math.round(
            clampVoiceNumber(
                config.idleReminderSeconds,
                0,
                600,
                DEFAULT_VOICE_SETTINGS.idleReminderSeconds
            )
        ),
    };
}

function normalizeContextString(value, fallback = null) {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, 240) : fallback;
}

function normalizePageContext(context = {}) {
    if (!context || typeof context !== 'object') return null;

    const normalized = {
        currentPath: normalizeContextString(context.currentPath),
        currentUrl: normalizeContextString(context.currentUrl),
        pageType: normalizeContextString(context.pageType),
        productSlug: normalizeContextString(context.productSlug),
        category: normalizeContextString(context.category),
        search: normalizeContextString(context.search),
        pageTitle: normalizeContextString(context.pageTitle),
    };

    return Object.values(normalized).some(Boolean) ? normalized : null;
}

function mergePageContext(sessionId, pageContext = null) {
    const normalized = normalizePageContext(pageContext);
    if (!sessionId) return normalized;

    const session = sessionMemory.ensureSession(sessionId);
    if (!normalized) return normalized;

    session.context = {
        ...(session.context || {}),
        currentPath: normalized.currentPath || session.context?.currentPath,
        currentUrl: normalized.currentUrl || session.context?.currentUrl,
        pageType: normalized.pageType || session.context?.pageType,
        productSlug: normalized.productSlug || session.context?.productSlug,
        pageTitle: normalized.pageTitle || session.context?.pageTitle,
        ...(normalized.category ? { category: normalized.category } : {}),
        ...(normalized.search ? { search: normalized.search } : {}),
    };

    return normalized;
}

async function getStoredVoiceSettings() {
    try {
        const prompt = await SystemPrompt.findOne({
            where: { key: 'VOICE_CONFIG', is_active: true },
        });

        if (!prompt?.content) {
            return { ...DEFAULT_VOICE_SETTINGS };
        }

        return normalizeVoiceSettings(JSON.parse(prompt.content));
    } catch (error) {
        logger.warn('Failed to load VOICE_CONFIG, using defaults:', error?.message || error);
        return { ...DEFAULT_VOICE_SETTINGS };
    }
}

function extractInlineAudio(payload) {
    const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];

    for (const candidate of candidates) {
        const parts = candidate?.content?.parts || [];
        for (const part of parts) {
            const inlineData = part?.inlineData || part?.inline_data;
            if (inlineData?.data) {
                return {
                    data: inlineData.data,
                    mimeType: inlineData.mimeType || inlineData.mime_type || 'audio/wav',
                };
            }
        }
    }

    return null;
}

function parseAudioRate(mimeType = '') {
    const match = String(mimeType).match(/rate=(\d+)/i);
    const parsed = match ? Number.parseInt(match[1], 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 24000;
}

function pcm16Base64ToWavBase64(audioBase64, {
    sampleRate = 24000,
    channels = 1,
    bitsPerSample = 16,
} = {}) {
    const pcmBuffer = Buffer.from(audioBase64, 'base64');
    const blockAlign = channels * (bitsPerSample / 8);
    const byteRate = sampleRate * blockAlign;
    const header = Buffer.alloc(44);

    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcmBuffer.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcmBuffer.length, 40);

    return Buffer.concat([header, pcmBuffer]).toString('base64');
}

function ensureBrowserPlayablePreview(audio) {
    const mimeType = String(audio?.mimeType || 'audio/wav');
    const normalizedMime = mimeType.toLowerCase();
    const audioBase64 = audio?.data || '';

    if (!audioBase64) {
        return audio;
    }

    if (audioBase64.startsWith('UklGR')) {
        return {
            data: audioBase64,
            mimeType: 'audio/wav',
        };
    }

    // Gemini TTS often returns raw PCM (`audio/L16` or `audio/pcm`), which
    // browser <audio> cannot play until it is wrapped in a WAV container.
    if (normalizedMime.includes('l16') || normalizedMime.includes('pcm')) {
        return {
            data: pcm16Base64ToWavBase64(audioBase64, {
                sampleRate: parseAudioRate(mimeType),
                channels: 1,
                bitsPerSample: 16,
            }),
            mimeType: 'audio/wav',
        };
    }

    if (normalizedMime === 'audio/x-wav') {
        return {
            data: audioBase64,
            mimeType: 'audio/wav',
        };
    }

    return audio;
}

async function generateVoicePreview({ voiceName, text } = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const selectedVoiceName = normalizeVoiceString(voiceName, DEFAULT_VOICE_SETTINGS.voiceName);
    const previewText = normalizeVoiceString(text, DEFAULT_VOICE_PREVIEW_TEXT).slice(0, 240);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(DEFAULT_GEMINI_TTS_PREVIEW_MODEL)}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{
                            text: `Hay doc tu nhien, ro rang, dung nguyen van cau sau bang tieng Viet: "${previewText}"`,
                        }],
                    }],
                    generationConfig: {
                        responseModalities: ['AUDIO'],
                        temperature: 0.4,
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: selectedVoiceName,
                                },
                            },
                        },
                    },
                }),
            }
        );

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(
                payload?.error?.message || `Voice preview request failed (${response.status})`
            );
        }

        const audio = ensureBrowserPlayablePreview(extractInlineAudio(payload));
        if (!audio?.data) {
            throw new Error('Voice preview did not return audio data');
        }

        return {
            voiceName: selectedVoiceName,
            model: DEFAULT_GEMINI_TTS_PREVIEW_MODEL,
            mimeType: audio.mimeType,
            audioBase64: audio.data,
            text: previewText,
        };
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Strip thinking/meta-commentary blocks from AI output.
 */
function sanitizeAiOutput(text) {
    if (!text) return text;

    // Remove **Initiating...** / **Greeting...** / **Thinking...** style blocks and following pure English/reasoning lines
    let cleaned = text.replace(/\*\*[A-Z][a-zA-Z\s]+\*\*\n[\s\S]*?(?=\n\n|$)/g, (match) => {
        // Strip if it looks like meta-commentary instructions
        if (/(?:Initiating|Processing|Analyzing|Searching|I'll|I will|My next|Based on|Let me|Greeting|Approach|Starting|Establishing|focusing)/i.test(match)) {
            return '';
        }
        return match;
    });

    // Remove standalone lines that are pure English meta-commentary
    cleaned = cleaned.split('\n').filter(line => {
        const trimmed = line.trim();
        if (!trimmed) return true;
        // Filter out lines that are clearly internal reasoning in English
        return !/^(?:\*\*)?(?:Initiating|Processing|Analyzing|I'm |I will |My (?:next|plan)|Based on|Let me|The user|Greeting|Approach|Starting)/.test(trimmed);
    }).join('\n');

    // Collapse multiple blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

    return cleaned || text;
}

function extractFirstImage(images) {
    if (!images) return null;

    try {
        const parsed = typeof images === 'string' ? JSON.parse(images) : images;
        return Array.isArray(parsed) && parsed.length ? parsed[0] : null;
    } catch {
        return null;
    }
}

function buildSessionSnapshot(sessionId, pageContext = null) {
    const session = sessionMemory.getSession(sessionId);
    const currentPage = normalizePageContext(pageContext) || normalizePageContext(session?.context || {});
    if (!session && !currentPage) return '';

    const ctx = session?.context || {};
    const sales = session?.salesState || {};
    const parts = [];

    if (currentPage?.currentPath) parts.push(`Trang dang xem: ${currentPage.currentPath}`);
    if (currentPage?.pageType) parts.push(`Loai trang: ${currentPage.pageType}`);
    if (currentPage?.productSlug) parts.push(`San pham dang xem: ${currentPage.productSlug}`);
    if (currentPage?.search) parts.push(`Tu khoa dang duyet: ${currentPage.search}`);

    if (ctx.height_cm) parts.push(`Chiều cao: ${ctx.height_cm}cm`);
    if (ctx.weight_kg) parts.push(`Cân nặng: ${ctx.weight_kg}kg`);
    if (ctx.size) parts.push(`Size: ${ctx.size}`);
    if (ctx.style) parts.push(`Phong cách: ${Array.isArray(ctx.style) ? ctx.style.join(', ') : ctx.style}`);
    if (ctx.color) parts.push(`Màu thích: ${ctx.color}`);
    if (ctx.occasion) parts.push(`Dịp mặc: ${ctx.occasion}`);
    if (ctx.budget_label) parts.push(`Ngân sách: ${ctx.budget_label}`);
    if (ctx.brand) parts.push(`Brand quan tâm: ${ctx.brand}`);
    if (ctx.category) parts.push(`Danh mục quan tâm: ${ctx.category}`);

    const snapshot = [];
    if (parts.length) {
        snapshot.push(`Khách đã chia sẻ: ${parts.join(' | ')}`);
    }
    if (sales.last_recommended_slugs?.length) {
        snapshot.push(`Sản phẩm vừa gợi ý gần đây: ${sales.last_recommended_slugs.join(', ')}`);
    }

    // Include recent conversation history so voice AI knows what was discussed
    const messages = session?.messages || [];
    if (messages.length > 0) {
        const recent = messages.slice(-6);
        const historyLines = recent.map(m => {
            const role = m.role === 'user' ? 'Khách' : 'AURA';
            const text = (m.content || '').substring(0, 150);
            return `${role}: ${text}`;
        });
        snapshot.push(`Lịch sử trò chuyện gần đây:\n${historyLines.join('\n')}`);
    }

    return snapshot.length ? `\nTHÔNG TIN KHÁCH HÀNG:\n- ${snapshot.join('\n- ')}` : '';
}

async function getPersonaForVoice() {
    try {
        if (promptCache.persona.value && promptCache.persona.expiresAt > Date.now()) {
            return promptCache.persona.value;
        }

        const prompt = await SystemPrompt.findOne({
            where: { key: 'STYLIST_PERSONA', is_active: true },
        });

        const persona = prompt?.content || null;
        promptCache.persona = {
            value: persona,
            expiresAt: Date.now() + PROMPT_CACHE_TTL,
        };

        return persona;
    } catch (error) {
        logger.error('Failed to fetch AI persona for voice:', error);
        return null;
    }
}

/**
 * Build system prompt optimized for voice conversations.
 */
const buildVoiceSystemPrompt = async (sessionId = null, pageContext = null) => {
    const persona = await getPersonaForVoice();
    const normalizedPageContext = normalizePageContext(pageContext);
    const sessionSnapshot = buildSessionSnapshot(sessionId, normalizedPageContext);
    let currentProductSnapshot = '';

    if (normalizedPageContext?.productSlug) {
        const currentProduct = await productSearch.getProductBySlug(normalizedPageContext.productSlug);
        if (currentProduct) {
            currentProductSnapshot = `\nCURRENT PRODUCT PAGE:\n${productSearch.buildProductContextForAi([currentProduct])}\nNeu khach hoi "mon nay", "cai nay", "san pham nay", hay uu tien tra loi dua tren CURRENT PRODUCT PAGE.`;
        }
    }

    const antiThinking = `BẮT BUỘC: Bạn PHẢI nói TRỰC TIẾP với khách hàng bằng tiếng Việt. KHÔNG BAO GIỜ được viết suy nghĩ nội bộ, giải thích quy trình, hay meta-commentary. Mọi output phải là lời nói tự nhiên dành cho khách.
CHÀO HỎI: KHÔNG BAO GIỜ tự động chào. Chỉ chào DUY NHẤT MỘT LẦN khi nhận cue từ [He thong]. Sau khi chào xong, TUYỆT ĐỐI KHÔNG chào lại lần 2.`;

    const basePrompt = persona || `Bạn là AURA — nhân viên tư vấn thời trang tại AURA ARCHIVE, shop đồ hiệu secondhand chính hãng.

Bạn là một NGƯỜI THẬT, không phải robot. Nói chuyện tự nhiên, ấm áp, có cảm xúc. Bạn hào hứng khi tìm được món đồ hay, cảm thông khi khách lăn tăn, và thành thật khi chưa tìm được thứ phù hợp.

Bạn giống một người bạn thân rành thời trang — thoải mái, vui vẻ, nhưng rất chuyên nghiệp khi tư vấn.`;

    const conversationGuidance = `

CÁCH BẠN NÓI CHUYỆN:
- Nói tự nhiên, gần gũi, như đang trò chuyện với bạn bè. Dùng "mình" và "bạn".
- Trả lời bằng tiếng Việt, trừ khi khách nói tiếng Anh.
- Mỗi lượt 1-3 câu ngắn gọn, đi vào trọng tâm. Không vòng vo.
- KHÔNG dùng markdown, emoji hay link. Khách đang nghe, không đọc.
- Biết bày tỏ cảm xúc: "Ôi món này hay lắm!", "Tiếc quá mình chưa tìm được...", "Mình thấy cái này hợp bạn lắm vì..."

TƯ VẤN SẢN PHẨM:
- Trước khi tìm, hỏi nhẹ nhàng về size hoặc số đo. Kiểu: "Bạn thường mặc size gì nhỉ?" hoặc "Cao bao nhiêu để mình tìm form hợp nè?"
- Nếu khách muốn xem ngay, hỏi nhanh 1 câu về size rồi tìm luôn.
- Khi giới thiệu: đọc tên, giá, size còn, tình trạng, và 1-2 lý do vì sao hợp.
- Nói rõ size có sẵn và đối chiếu với size khách, ví dụ: "Món này có size M, vừa với chiều cao 1m70 của bạn."
- Giới thiệu 2-3 món, highlight 1 món mình thấy hợp nhất.
- Chỉ giới thiệu sản phẩm còn hàng VÀ CÓ SIZE PHÙ HỢP.

KHI KHÁCH LĂN TĂN:
- Đừng né tránh — đối mặt chân thành.
- Giá cao: chia sẻ giá trị thật (auth, tình trạng, độ hiếm), hoặc gợi ý món khác hợp budget.
- Sợ size: tư vấn dựa trên kinh nghiệm, gợi ý size phù hợp.
- Lo secondhand: giải thích quy trình xác thực, cam kết chính hãng.
- Mỗi lượt kết thúc tự nhiên — gợi ý bước tiếp theo nhưng đừng ép.

CÂU HỎI NGOÀI THỜI TRANG:
- Vui vẻ nói mình chỉ rành thời trang, rồi quay lại chủ đề. Kiểu: "Ôi cái đó mình mù tịt luôn á! Nhưng mà nè, bạn có đang tìm đồ gì không?"`;

    const toolInstructions = `

LIVE2D VÀ CỬ CHỈ:
- Chào hỏi -> play_animation animation="wave"
- Đồng ý, xác nhận -> play_animation animation="nod"
- Đang suy nghĩ, tìm kiếm -> play_animation animation="think"
- Tìm được món hay, vui -> play_animation animation="happy"
- Giới thiệu/trình bày sản phẩm -> play_animation animation="introduce_product"
- Đề xuất sản phẩm phù hợp -> play_animation animation="recommend_product"
- Tạm biệt -> end_call

HỖ TRỢ KHÁCH:
- Khách muốn xem danh mục -> navigate_to_category
- Khách muốn xem món cụ thể -> navigate_to_product
- Khách ưng món, muốn lấy -> add_to_cart
- Khách muốn xem giỏ -> open_cart
- Khách muốn thanh toán -> go_to_checkout
- Khách muốn lưu xem sau -> save_to_wishlist

QUY TẮC QUAN TRỌNG:
- Tuyệt đối không bịa sản phẩm. Luôn dùng search_products để tìm hàng thật.
- Khi gọi search_products: NẾU ĐÃ BIẾT SIZE CỦA KHÁCH, BẮT BUỘC PHẢI TRUYỀN THAM SỐ size.
- Nếu không tìm thấy, nói thật rồi gợi ý thử tiêu chí khác.
- Chỉ trả lời về thời trang, sản phẩm, mua sắm tại shop.
- Khi gợi ý sản phẩm, PHẢI lọc và chỉ giới thiệu sản phẩm có variant size phù hợp.

TUYỆT ĐỐI CẤM — OUTPUT FORMAT:
- KHÔNG BAO GIỜ được viết ra suy nghĩ nội bộ, meta-commentary, hoặc giải thích quy trình của bạn.
- KHÔNG được viết những câu như "Initiating the interaction", "I'll now search...", "Let me think...", "Based on the instructions..."
- KHÔNG được giải thích bạn đang làm gì hoặc tại sao. Chỉ NÓI TRỰC TIẾP với khách hàng.
- Mọi output của bạn PHẢI là lời nói trực tiếp dành cho khách hàng, bằng tiếng Việt.
- Ví dụ SAI: "**Initiating** I will greet the customer using mình and bạn..."
- Ví dụ ĐÚNG: "Chào bạn! Mình là AURA, rất vui được gặp bạn!"`;

    return `${antiThinking}\n\n${basePrompt}\n${conversationGuidance}\n${toolInstructions}${sessionSnapshot}${currentProductSnapshot}`;
};

/**
 * Get function declarations for Gemini Live tool calling.
 */
const getToolDeclarations = () => {
    return [
        {
            name: 'search_products',
            description: 'Tìm kiếm sản phẩm thật trong kho AURA ARCHIVE. QUAN TRỌNG: Nếu khách đã nói size, BẮT BUỘC phải truyền tham số size để lọc đúng sản phẩm phù hợp.',
            parameters: {
                type: 'object',
                properties: {
                    search: { type: 'string', description: 'Từ khóa tìm kiếm tự do.' },
                    brand: { type: 'string', description: 'Tên thương hiệu.' },
                    category: { type: 'string', description: 'Danh mục tiếng Anh: Shoes, Bags, Tops, Pants, Outerwear, Accessories.' },
                    size: { type: 'string', description: 'Size khách cần. LUÔN LUÔN truyền nếu khách đã nói size hoặc số đo. Giá trị: XS, S, M, L, XL, XXL, hoặc số đo giày.' },
                    minPrice: { type: 'number', description: 'Giá tối thiểu VND.' },
                    maxPrice: { type: 'number', description: 'Giá tối đa VND.' },
                },
            },
        },
        {
            name: 'get_inventory_summary',
            description: 'Xem nhanh tổng quan kho hàng hiện tại.',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
        {
            name: 'navigate_to_product',
            description: 'Mở trang chi tiết của một sản phẩm cụ thể.',
            parameters: {
                type: 'object',
                properties: {
                    slug: { type: 'string', description: 'Slug sản phẩm.' },
                    name: { type: 'string', description: 'Tên sản phẩm.' },
                },
                required: ['slug'],
            },
        },
        {
            name: 'navigate_to_category',
            description: 'Mở trang danh mục để khách duyệt thêm.',
            parameters: {
                type: 'object',
                properties: {
                    category: { type: 'string', description: 'Danh mục tiếng Anh.' },
                    brand: { type: 'string', description: 'Brand lọc thêm nếu cần.' },
                },
            },
        },
        {
            name: 'add_to_cart',
            description: 'Thêm sản phẩm khách đang ưng vào giỏ hàng.',
            parameters: {
                type: 'object',
                properties: {
                    slug: { type: 'string', description: 'Slug sản phẩm cần thêm vào giỏ.' },
                    quantity: { type: 'number', description: 'Số lượng muốn thêm. Mặc định là 1.' },
                    openCartAfterAdd: { type: 'boolean', description: 'Nếu true thì mở giỏ hàng ngay sau khi thêm.' },
                },
                required: ['slug'],
            },
        },
        {
            name: 'open_cart',
            description: 'Mở trang giỏ hàng cho khách kiểm tra đơn.',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
        {
            name: 'go_to_checkout',
            description: 'Đưa khách tới bước checkout khi họ sẵn sàng chốt đơn.',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
        {
            name: 'save_to_wishlist',
            description: 'Lưu sản phẩm để khách xem lại sau nếu chưa mua ngay.',
            parameters: {
                type: 'object',
                properties: {
                    slug: { type: 'string', description: 'Slug sản phẩm cần lưu.' },
                },
                required: ['slug'],
            },
        },
        {
            name: 'play_animation',
            description: 'Điều khiển biểu cảm/cử chỉ Live2D: wave, nod, think, happy, introduce_product, recommend_product, goodbye.',
            parameters: {
                type: 'object',
                properties: {
                    animation: {
                        type: 'string',
                        enum: ['wave', 'nod', 'think', 'happy', 'introduce_product', 'recommend_product', 'goodbye'],
                    },
                },
                required: ['animation'],
            },
        },
        {
            name: 'end_call',
            description: 'Kết thúc cuộc gọi voice chat.',
            parameters: {
                type: 'object',
                properties: {
                    reason: { type: 'string', description: 'Lý do kết thúc cuộc gọi.' },
                },
            },
        },
        {
            name: 'get_brand_info',
            description: 'Lấy thông tin chi tiết về một thương hiệu: nguồn gốc, phong cách, size guide, khoảng giá.',
            parameters: {
                type: 'object',
                properties: {
                    brand: { type: 'string', description: 'Tên thương hiệu cần tra cứu.' },
                },
                required: ['brand'],
            },
        },
        {
            name: 'get_style_advice',
            description: 'Lấy lời khuyên về phong cách thời trang: techwear, avant-garde, minimalist, streetwear.',
            parameters: {
                type: 'object',
                properties: {
                    style: { type: 'string', description: 'Phong cách cần tư vấn.' },
                },
                required: ['style'],
            },
        },
        {
            name: 'suggest_size',
            description: 'Gợi ý size dựa trên chiều cao và cân nặng của khách hàng.',
            parameters: {
                type: 'object',
                properties: {
                    height_cm: { type: 'number', description: 'Chiều cao (cm).' },
                    weight_kg: { type: 'number', description: 'Cân nặng (kg).' },
                },
            },
        },
        {
            name: 'get_policy',
            description: 'Lấy thông tin chính sách cửa hàng: vận chuyển (shipping), đổi trả (return), ký gửi (consignment), xác thực (authenticity), thanh toán (payment).',
            parameters: {
                type: 'object',
                properties: {
                    topic: {
                        type: 'string',
                        enum: ['shipping', 'return', 'consignment', 'authenticity', 'payment'],
                        description: 'Chủ đề chính sách cần tra cứu.',
                    },
                },
                required: ['topic'],
            },
        },
    ];
};

function normalizeVoiceProduct(product) {
    return {
        id: product.id || '',
        name: product.name || 'Unknown',
        brand: product.brand || '',
        price: product.base_price ? `${Math.floor(parseFloat(product.base_price)).toLocaleString('vi-VN')}₫` : '',
        sale_price: product.sale_price ? `${Math.floor(parseFloat(product.sale_price)).toLocaleString('vi-VN')}₫` : null,
        category: product.category || '',
        condition: product.condition_text || '',
        slug: product.slug || '',
        image: extractFirstImage(product.images),
        available_count: (Array.isArray(product.variants) ? product.variants : []).filter((variant) => variant?.status === 'AVAILABLE').length,
        variants: (Array.isArray(product.variants) ? product.variants : []).map((variant) => ({
            id: variant.id || '',
            size: variant.size || '',
            color: variant.color || '',
            material: variant.material || '',
            status: variant.status === 'AVAILABLE'
                ? 'Còn hàng'
                : variant.status === 'SOLD'
                    ? 'Đã bán'
                    : 'Đang giữ',
        })),
    };
}

function updateSessionFromTool(sessionId, toolName, args = {}, payload = {}) {
    if (!sessionId) return;

    const session = sessionMemory.ensureSession(sessionId);

    if (toolName === 'search_products') {
        if (args.brand) session.context.brand = args.brand;
        if (args.category) session.context.category = args.category;
        if (args.size) session.context.size = args.size;
        if (args.minPrice || args.maxPrice) {
            session.context.budget_label = [
                args.minPrice ? `tu ${args.minPrice}` : null,
                args.maxPrice ? `den ${args.maxPrice}` : null,
            ].filter(Boolean).join(' ');
        }

        session.salesState = {
            ...(session.salesState || {}),
            stage: payload.products?.length ? 'recommendation' : 'discovery',
            next_action: payload.products?.length
                ? 'recommend_best_match_and_invite_view'
                : 'refine_search_criteria',
            last_recommended_slugs: (payload.products || []).map((product) => product.slug).filter(Boolean).slice(0, 4),
            last_recommended_product_ids: (payload.products || []).map((product) => product.id).filter(Boolean).slice(0, 4),
            last_tool_action: toolName,
        };
        return;
    }

    if (['navigate_to_product', 'add_to_cart', 'open_cart', 'go_to_checkout', 'save_to_wishlist'].includes(toolName)) {
        session.salesState = {
            ...(session.salesState || {}),
            stage: toolName === 'go_to_checkout' ? 'closing' : 'recommendation',
            next_action: toolName === 'go_to_checkout'
                ? 'complete_checkout'
                : toolName === 'add_to_cart'
                    ? 'confirm_cart_then_checkout'
                    : 'keep_customer_engaged',
            last_tool_action: toolName,
        };
    }
}

/**
 * Execute a backend tool call from Gemini Live API.
 */
const executeToolCall = async (toolName, args = {}, sessionId = null, pageContext = null) => {
    try {
        mergePageContext(sessionId, pageContext);

        switch (toolName) {
        case 'search_products': {
            const products = await productSearch.searchProducts({
                search: args.search || null,
                brand: args.brand || null,
                category: args.category || null,
                size: args.size || null,
                minPrice: args.minPrice || null,
                maxPrice: args.maxPrice || null,
                limit: 5,
            });

            logger.info(`[Voice] search_products args: ${JSON.stringify(args)}, found: ${products.length}`);

            if (!products.length) {
                updateSessionFromTool(sessionId, toolName, args, { products: [] });
                return { found: 0, message: 'Không tìm thấy sản phẩm phù hợp.' };
            }

            const normalized = products.map(normalizeVoiceProduct);
            updateSessionFromTool(sessionId, toolName, args, { products: normalized });

            return {
                found: normalized.length,
                products: normalized,
            };
        }

        case 'get_inventory_summary': {
            const summary = await productSearch.getInventorySummary();
            if (!summary || !Object.keys(summary).length) {
                return { message: 'Không thể lấy thông tin kho hàng lúc này.' };
            }

            updateSessionFromTool(sessionId, toolName, args, {});

            return {
                total_products: summary.total_products || 0,
                total_available: summary.total_available || 0,
                categories: (summary.categories || []).map((category) => ({
                    name: category.category,
                    count: category.product_count,
                })),
                top_brands: (summary.top_brands || []).map((brand) => ({
                    name: brand.brand,
                    count: brand.product_count,
                })),
                price_range: summary.price_range || {},
            };
        }

        case 'get_brand_info': {
            const brandInfo = kb.getBrandInfo(args.brand || '');
            if (!brandInfo) {
                return { found: false, message: `Không tìm thấy thông tin về thương hiệu "${args.brand}".` };
            }
            return { found: true, brand: brandInfo };
        }

        case 'get_style_advice': {
            const advice = kb.getStyleAdvice(args.style || '');
            if (!advice) {
                return { found: false, message: `Không có thông tin về phong cách "${args.style}".` };
            }
            return { found: true, style: advice };
        }

        case 'suggest_size': {
            const suggestion = kb.suggestSize(args.height_cm || null, args.weight_kg || null);
            if (sessionId) {
                const session = sessionMemory.ensureSession(sessionId);
                if (args.height_cm) session.context.height_cm = args.height_cm;
                if (args.weight_kg) session.context.weight_kg = args.weight_kg;
            }
            return { suggestion };
        }

        case 'get_policy': {
            const policy = kb.STORE_POLICIES[args.topic] || null;
            if (!policy) {
                return { found: false, message: `Không tìm thấy chính sách "${args.topic}".` };
            }
            return { found: true, policy };
        }

        default:
            return { error: `Unknown backend tool: ${toolName}` };
        }
    } catch (error) {
        logger.error(`Voice tool call error (${toolName}):`, error.message);
        return { error: 'Xin lỗi, không thể truy vấn dữ liệu lúc này.' };
    }
};

/**
 * Get voice session config for frontend.
 */
const getVoiceConfig = async (sessionId = null, pageContext = null) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const voiceSettings = await getStoredVoiceSettings();

    // Live model fallback chain
    const liveModels = [
        voiceSettings.liveModel,
        process.env.GEMINI_LIVE_MODEL_MAIN || process.env.GEMINI_LIVE_MODEL || DEFAULT_GEMINI_LIVE_MODEL,
        process.env.GEMINI_LIVE_MODEL_BACKUP || DEFAULT_GEMINI_LIVE_MODEL_BACKUP,
    ]
        .map(value => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i); // deduplicate

    const primaryLiveModel = liveModels[0] || DEFAULT_GEMINI_LIVE_MODEL;
    const fallbackLiveModels = liveModels.filter(model => model !== primaryLiveModel);

    const normalizedPageContext = mergePageContext(sessionId, pageContext);

    const systemPrompt = await buildVoiceSystemPrompt(sessionId, normalizedPageContext);
    const greetingMessage = await aiService.getGreeting();

    return {
        apiKey,
        model: primaryLiveModel,
        fallbackModels: fallbackLiveModels,
        systemPrompt,
        greetingMessage,
        tools: getToolDeclarations(),
        voiceSettings,
    };
};

/**
 * Sync voice conversation transcript to shared session memory + database.
 * Called by frontend after each voice turn so text chat has full context.
 * Also updates ChatSession for admin visibility and emits WebSocket events.
 */
const syncVoiceTranscript = async (sessionId, userText, aiText, pageContext = null) => {
    if (!sessionId) return;

    mergePageContext(sessionId, pageContext);

    if (userText && userText.trim()) {
        const content = userText.trim();

        sessionMemory.appendMessage(sessionId, {
            role: 'user',
            content,
            source: 'voice',
        });

        try {
            await ChatLog.create({
                session_id: sessionId,
                role: 'USER',
                content,
                metadata: { source: 'voice' },
            });

            await chatAdminService.updateSessionStats(sessionId, content);
            emitNewMessage(sessionId, { role: 'USER', content });
        } catch (err) {
            logger.error('[Voice] Failed to save user transcript to DB:', err.message);
        }
    }

    if (aiText && aiText.trim()) {
        const content = sanitizeAiOutput(aiText.trim());
        
        if (content) {
            sessionMemory.appendMessage(sessionId, {
                role: 'assistant',
                content,
                source: 'voice',
            });

            try {
                await ChatLog.create({
                    session_id: sessionId,
                    role: 'ASSISTANT',
                    content,
                    metadata: { source: 'voice' },
                });

                await chatAdminService.updateSessionStats(sessionId, content);
                emitNewMessage(sessionId, { role: 'ASSISTANT', content });
            } catch (err) {
                logger.error('[Voice] Failed to save AI transcript to DB:', err.message);
            }
        }
    }
};

module.exports = {
    getVoiceConfig,
    getStoredVoiceSettings,
    generateVoicePreview,
    executeToolCall,
    syncVoiceTranscript,
    buildVoiceSystemPrompt,
    getToolDeclarations,
};
