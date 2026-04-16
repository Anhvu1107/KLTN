/**
 * Voice Controller
 * AURA ARCHIVE - Handle HTTP requests for real-time voice AI
 */

const voiceService = require('../services/voice.service');
const catchAsync = require('../utils/catchAsync');

const getRequestContext = (source = {}) => ({
    currentPath: source.currentPath || null,
    currentUrl: source.currentUrl || null,
    pageType: source.pageType || null,
    productSlug: source.productSlug || null,
    category: source.category || null,
    search: source.search || null,
    pageTitle: source.pageTitle || null,
});

/**
 * GET /api/v1/chat/voice-token
 * Get voice session config (API key + model + system prompt + tools)
 * Client uses this to connect directly to Gemini Live API via WebSocket
 */
const getVoiceToken = catchAsync(async (req, res) => {
    const config = await voiceService.getVoiceConfig(
        req.query.sessionId || null,
        getRequestContext(req.query)
    );

    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'Surrogate-Control': 'no-store',
    });

    res.status(200).json({
        success: true,
        data: {
            apiKey: config.apiKey,
            model: config.model,
            fallbackModels: config.fallbackModels,
            systemPrompt: config.systemPrompt,
            greetingMessage: config.greetingMessage,
            tools: config.tools,
            voiceSettings: config.voiceSettings,
        },
    });
});

/**
 * GET /api/v1/chat/voice-settings
 * Lightweight public config for visual widgets. This does not require or
 * expose Gemini credentials, so the mascot can render even if voice is down.
 */
const getVoiceSettings = catchAsync(async (req, res) => {
    const voiceSettings = await voiceService.getStoredVoiceSettings();

    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'Surrogate-Control': 'no-store',
    });

    res.status(200).json({
        success: true,
        data: {
            voiceSettings,
        },
    });
});

/**
 * POST /api/v1/chat/voice-tool-call
 * Execute a tool call from the frontend during a voice session
 */
const handleToolCall = catchAsync(async (req, res) => {
    const { toolName, args, sessionId, context } = req.body;

    if (!toolName) {
        return res.status(400).json({
            success: false,
            message: 'toolName is required',
        });
    }

    const result = await voiceService.executeToolCall(toolName, args || {}, sessionId || null, context || null);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * POST /api/v1/chat/voice-sync
 * Sync voice transcript to shared session memory
 */
const syncTranscript = catchAsync(async (req, res) => {
    const { sessionId, userText, aiText, context } = req.body;

    if (!sessionId) {
        return res.status(400).json({
            success: false,
            message: 'sessionId is required',
        });
    }

    await voiceService.syncVoiceTranscript(sessionId, userText || '', aiText || '', context || null);

    res.status(200).json({ success: true });
});

const previewVoice = catchAsync(async (req, res) => {
    const preview = await voiceService.generateVoicePreview({
        voiceName: req.body?.voiceName,
        text: req.body?.text,
    });

    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'Surrogate-Control': 'no-store',
    });

    res.status(200).json({
        success: true,
        data: preview,
    });
});

module.exports = {
    getVoiceToken,
    getVoiceSettings,
    handleToolCall,
    syncTranscript,
    previewVoice,
};
