<script setup lang="ts">
/**
 * VoiceChat Component
 * AURA ARCHIVE - Real-time voice conversation with AI stylist
 * Uses Gemini Live API via WebSocket with direct API key
 * Integrated with Live2D model for visual feedback
 */

import { useProductSizeLabel } from '~/composables/useProductSizeLabel'
import type { VoiceConfig } from '~/utils/voice-config'
import { DEFAULT_LIVE2D_MODEL_URL, cloneDefaultVoiceConfig, normalizeVoiceConfig } from '~/utils/voice-config'

const config = useRuntimeConfig()
const router = useRouter()
const route = useRoute()
const { buildAiCustomerContext, buildAiCustomerContextQuery } = useAiCustomerContext()
const cartStore = useCartStore()
const authStore = useAuthStore()
const { getImageUrl } = useImageUrl()
const { formatSizeLabel } = useProductSizeLabel()
const { success: notifySuccess, info: notifyInfo, warning: notifyWarning } = useNotification()

const props = withDefaults(defineProps<{
  startMinimized?: boolean
}>(), {
  startMinimized: false,
})

const emit = defineEmits<{
  close: []
}>()

const STORAGE_KEY = 'aura_chat_session_id'

// Connection states
type VoiceState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error'

const state = ref<VoiceState>('idle')
const errorMessage = ref('')
const transcript = ref('')
const aiTranscript = ref('')
const suggestedProducts = ref<any[]>([])
const suggestedProductsRail = ref<HTMLElement | null>(null)
const sessionId = ref('')
const isMinimized = ref(props.startMinimized)
const isSettingsReady = ref(false)
const voiceSettings = ref<VoiceConfig>(cloneDefaultVoiceConfig())
const live2dModelUrl = computed(() => {
  if (!isSettingsReady.value) return null
  return voiceSettings.value?.live2dModelUrl || DEFAULT_LIVE2D_MODEL_URL
})
const live2dScale = computed(() => voiceSettings.value.live2dScale)
const live2dOffsetY = computed(() => voiceSettings.value.live2dOffsetY)
const live2dSnapshotWidth = computed(() => (isMinimized.value ? 224 : 440))
const live2dSnapshotHeight = computed(() => (isMinimized.value ? 320 : 520))
const live2dSnapshotFitMode = computed<'contain' | 'mascot'>(() => (isMinimized.value ? 'mascot' : 'contain'))
const voiceCharacterName = computed(() => voiceSettings.value.characterName || 'AURA')
const voiceCharacterSubtitle = computed(() => voiceSettings.value.characterSubtitle || 'AI Stylist Voice Call')
const voiceHintText = computed(() => voiceSettings.value.hintText || 'Nói bất cứ điều gì để bắt đầu tư vấn')
const speakingLabel = computed(() => `${voiceCharacterName.value} đang trả lời...`)
const hasActiveVoiceSession = computed(() =>
  ['connecting', 'listening', 'processing', 'speaking'].includes(state.value),
)
let isInitialGreetingTurn = false
let hasSentInitialGreetingPrompt = false

const normalizeVoiceErrorMessage = (message?: string) => {
  const raw = String(message || '').trim()

  if (/quota|rate[-_\s]?limit|too many requests|resource_exhausted|exceeded/i.test(raw)) {
    return 'Gemini đang chạm giới hạn dùng thử. Hãy thử lại sau hoặc đổi model/API key.'
  }

  if (/api key|permission|unauthorized|forbidden/i.test(raw)) {
    return 'Cấu hình API key voice chưa hợp lệ. Hãy kiểm tra lại trong admin.'
  }

  return raw || 'Không thể bắt đầu cuộc gọi'
}

// Live2D Model
const live2dCanvas = ref<HTMLCanvasElement | null>(null)
const {
  isModelReady,
  hasVisibleFrame,
  setLipSync,
  setMood,
  playGesture,
  playRandomMotion,
  playIdle,
  playGreeting,
  playNod,
  playThinking,
  playHappy,
  playIntroduceProduct,
  playRecommendProduct,
  playGoodbye,
  playSurprised,
  playShy,
  playExcited,
  playConfused,
  playAngry,
  playSad,
  playApologize,
  playEncourage,
  playListen,
  playAgree,
  handlePointerMove: onLive2DPointerMove,
  handleTap: onLive2DTap,
} = useLive2D(live2dCanvas, {
  modelUrl: live2dModelUrl,
  fallbackModelUrl: DEFAULT_LIVE2D_MODEL_URL,
  fitMode: live2dSnapshotFitMode,
  live2dScale,
  live2dOffsetY,
})
let pendingAnimation: string | null = null

// Audio refs
let websocket: WebSocket | null = null
let audioContext: AudioContext | null = null
let mediaStream: MediaStream | null = null
let playbackContext: AudioContext | null = null
type QueuedAudio = {
  buffer: ArrayBuffer
  sampleRate: number
}

let audioQueue: QueuedAudio[] = []
let isPlaying = false
let playbackSource: AudioBufferSourceNode | null = null
let micSourceNode: MediaStreamAudioSourceNode | null = null
let micProcessorNode: ScriptProcessorNode | null = null
let micMonitorNode: GainNode | null = null
let currentTurnAudioParts = new Set<string>()
let currentTurnTextParts = new Set<string>()
let isStreamingAiResponse = false
let shouldResumeListeningAfterPlayback = false
let pendingAudioChunks: QueuedAudio[] = []
let audioFlushTimer: ReturnType<typeof setTimeout> | null = null
const AUDIO_BATCH_MS = 80 // batch small chunks for smoother playback
const DEFAULT_OUTPUT_SAMPLE_RATE = 24000

// Waveform animation + LipSync
const audioLevel = ref(0)
let analyserNode: AnalyserNode | null = null
let playbackAnalyserNode: AnalyserNode | null = null
let animationFrame: number | null = null
let lipSyncFrame: number | null = null
let lastSalesCueAt = 0
let listeningCooldown: ReturnType<typeof setTimeout> | null = null
let silenceFlushTimer: ReturnType<typeof setTimeout> | null = null
let hasDetectedSpeechSinceLastFlush = false
const MIC_ACTIVITY_RMS_THRESHOLD = 0.01
const AUDIO_END_SILENCE_MS = 900

// --- Idle Tracking & Context-Awareness ---
let lastActivityAt = Date.now()
let hasCheckedIn = false
let idleCheckInterval: ReturnType<typeof setInterval> | null = null

const resetActivity = () => {
  if (state.value !== 'error' && state.value !== 'idle') {
    lastActivityAt = Date.now()
    hasCheckedIn = false
  }
}

const resetStreamingResponseTracking = ({ clearDedup = true } = {}) => {
  if (clearDedup) {
    currentTurnAudioParts = new Set()
    currentTurnTextParts = new Set()
  }
  isStreamingAiResponse = false
  shouldResumeListeningAfterPlayback = false
}

const appendUniqueTranscript = (text: string) => {
  const transcriptText = text.trim()
  if (!transcriptText) return

  // Gemini can resend cumulative transcript snapshots for the same turn.
  if (transcriptText.startsWith(aiTranscript.value)) {
    aiTranscript.value = transcriptText
    currentTurnTextParts.add(transcriptText)
    return
  }

  if (aiTranscript.value.startsWith(transcriptText) || currentTurnTextParts.has(transcriptText)) {
    return
  }

  currentTurnTextParts.add(transcriptText)
  aiTranscript.value = aiTranscript.value
    ? `${aiTranscript.value} ${transcriptText}`
    : transcriptText
}

const resumeListeningIfPlaybackFinished = () => {
  if (!shouldResumeListeningAfterPlayback) return
  if (isPlaying || audioQueue.length > 0 || playbackSource) return
  if (pendingAudioChunks.length > 0) return

  shouldResumeListeningAfterPlayback = false

  // Cooldown to prevent echo from being picked up by mic
  if (listeningCooldown) clearTimeout(listeningCooldown)
  listeningCooldown = setTimeout(() => {
    listeningCooldown = null
    if (state.value === 'speaking' || state.value === 'processing') {
      state.value = 'listening'
    }
  }, 600)
}

const sendAudioStreamEnd = () => {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) return
  if (state.value !== 'listening') return

  websocket.send(JSON.stringify({
    realtimeInput: {
      audioStreamEnd: true,
    },
  }))

  hasDetectedSpeechSinceLastFlush = false
  console.log('[Voice] audioStreamEnd sent')
}

const sendInitialGreetingPrompt = (greetingMessage: string) => {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) return
  if (hasSentInitialGreetingPrompt) return

  const fallbackGreeting = 'Chào bạn! Mình là AURA. Hôm nay bạn đang muốn tìm món đồ nào vậy?'
  const openingLine = greetingMessage?.trim() || fallbackGreeting.replace('AURA', voiceCharacterName.value)

  const cueText = `[He thong: Day la loi mo dau cua cuoc goi. Hay noi tu nhien va chi chao mot lan, khong lap lai y chao. Neu phu hop, hay dung sat cau nay: "${openingLine}". Sau do lang nghe khach.]`

  hasSentInitialGreetingPrompt = true

  websocket.send(JSON.stringify({
    realtimeInput: {
      text: cueText,
    },
  }))

  console.log('[Voice] Initial greeting prompt sent')
}

const getOrCreateSessionId = () => {
  if (!import.meta.client) return ''

  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing) return existing

  const freshId = crypto.randomUUID()
  localStorage.setItem(STORAGE_KEY, freshId)
  return freshId
}

const minimizeVoiceWidget = () => {
  isMinimized.value = true
}

const maximizeVoiceWidget = () => {
  isMinimized.value = false
}

const updateSuggestedProducts = (products: any[] = []) => {
  suggestedProducts.value = Array.isArray(products) ? products : []
  nextTick(() => {
    suggestedProductsRail.value?.scrollTo({ left: 0, behavior: 'auto' })
  })

  if (suggestedProducts.value.length > 1) {
    maximizeVoiceWidget()
  }

  if (suggestedProducts.value.length) {
    playIntroduceProduct()
  }
}

const scrollSuggestedProducts = (direction: 'left' | 'right') => {
  suggestedProductsRail.value?.scrollBy({
    left: direction === 'left' ? -220 : 220,
    behavior: 'smooth',
  })
}

const handleSuggestedProductsWheel = (event: WheelEvent) => {
  const rail = suggestedProductsRail.value
  if (!rail) return

  const dominantDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
    ? event.deltaX
    : event.deltaY

  if (!dominantDelta) return

  event.preventDefault()
  rail.scrollBy({
    left: dominantDelta,
    behavior: 'auto',
  })
}

const handleCanvasPointerMove = (event: PointerEvent) => {
  if (isMinimized.value) return
  onLive2DPointerMove(event)
}

const handleCanvasPointerDown = (event: PointerEvent) => {
  if (isMinimized.value) {
    maximizeVoiceWidget()
    return
  }

  onLive2DTap(event)
}

const buildVoiceTokenUrl = () => {
  const params = buildAiCustomerContextQuery()
  if (sessionId.value) {
    params.set('sessionId', sessionId.value)
  }
  params.set('t', String(Date.now()))

  return `${config.public.apiUrl}/chat/voice-token?${params.toString()}`
}

const sendCustomerContextCue = (reason = 'customer_context_update') => {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) return
  if (state.value === 'connecting') return

  const context = buildAiCustomerContext()
  const parts = [
    `[He thong: ${reason}.`,
    `Khach dang o trang ${context.currentPath}.`,
    `Loai trang: ${context.pageType}.`,
  ]

  if (context.productSlug) parts.push(`San pham dang xem: ${context.productSlug}.`)
  if (context.category) parts.push(`Danh muc dang loc: ${context.category}.`)
  if (context.search) parts.push(`Tu khoa dang tim: ${context.search}.`)
  parts.push('Hay ghi nho ngu canh nay de tu van dung luc; khong can noi ra neu khach chua hoi.]')

  websocket.send(JSON.stringify({
    realtimeInput: {
      text: parts.join(' '),
    },
  }))
}

const stopCurrentPlayback = () => {
  if (!playbackSource) return

  playbackSource.onended = null

  try {
    playbackSource.stop()
  } catch {
    // Ignore stop errors when playback already ended.
  }

  try {
    playbackSource.disconnect()
  } catch {
    // Ignore disconnect errors during teardown.
  }

  playbackSource = null
}

const teardownVoiceSession = ({ emitClose = false } = {}) => {
  const activeSocket = websocket
  websocket = null

  if (activeSocket && activeSocket.readyState !== WebSocket.CLOSED) {
    activeSocket.onopen = null
    activeSocket.onmessage = null
    activeSocket.onerror = null
    activeSocket.onclose = null

    try {
      activeSocket.close(1000, 'client closed')
    } catch {
      // Ignore close errors during teardown.
    }
  }

  if (playbackAnalyserNode) {
    playbackAnalyserNode.disconnect()
    playbackAnalyserNode = null
  }

  if (lipSyncFrame) {
    cancelAnimationFrame(lipSyncFrame)
    lipSyncFrame = null
  }

  if (micProcessorNode) {
    micProcessorNode.onaudioprocess = null
    micProcessorNode.disconnect()
    micProcessorNode = null
  }

  if (micMonitorNode) {
    micMonitorNode.disconnect()
    micMonitorNode = null
  }

  if (micSourceNode) {
    micSourceNode.disconnect()
    micSourceNode = null
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop())
    mediaStream = null
  }

  stopCurrentPlayback()

  if (audioContext) {
    audioContext.close()
    audioContext = null
  }

  if (playbackContext) {
    playbackContext.close()
    playbackContext = null
  }

  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }

  analyserNode = null
  audioQueue = []
  isPlaying = false
  audioLevel.value = 0
  suggestedProducts.value = []
  state.value = 'idle'
  resetStreamingResponseTracking()
  if (listeningCooldown) {
    clearTimeout(listeningCooldown)
    listeningCooldown = null
  }
  if (silenceFlushTimer) {
    clearTimeout(silenceFlushTimer)
    silenceFlushTimer = null
  }
  hasDetectedSpeechSinceLastFlush = false
  isInitialGreetingTurn = false
  hasSentInitialGreetingPrompt = false
  
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval)
    idleCheckInterval = null
  }

  if (emitClose) {
    emit('close')
  }
}

/**
 * Start voice session
 */
const startVoiceSession = async () => {
  if (!sessionId.value) {
    sessionId.value = getOrCreateSessionId()
  }

  teardownVoiceSession()
  state.value = 'connecting'
  errorMessage.value = ''
  transcript.value = ''
  aiTranscript.value = ''
  suggestedProducts.value = []

  try {
    // 1. Get voice config from backend (API key + model + system prompt + tools)
    const configRes = await $fetch<{
      success: boolean
      data: {
        apiKey: string
        model: string
        fallbackModels?: string[]
        systemPrompt: string
        greetingMessage: string
        tools: any[]
        voiceSettings?: Partial<VoiceConfig>
      }
    }>(buildVoiceTokenUrl(), {
      cache: 'no-store',
    })

    if (!configRes.success || !configRes.data?.apiKey) {
      throw new Error('Failed to get voice config')
    }

    const { apiKey, model, fallbackModels = [], systemPrompt, greetingMessage, tools, voiceSettings: fetchedVoiceSettings } = configRes.data
    voiceSettings.value = normalizeVoiceConfig(fetchedVoiceSettings)
    isSettingsReady.value = true
    console.log('[Voice] Models available:', model, fallbackModels.length ? `fallbacks: ${fallbackModels.join(', ')}` : 'no fallbacks')

    // 2. Connect to Gemini Live API via WebSocket (direct API key)
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`
    const ws = new WebSocket(wsUrl)
    websocket = ws

    ws.onopen = async () => {
      if (websocket !== ws) return
      console.log('[Voice] WebSocket connected')

      // Start idle tracking interval (Context-Awareness)
      if (idleCheckInterval) clearInterval(idleCheckInterval)
      resetActivity() // Start counting from connection
      if (voiceSettings.value.idleReminderSeconds > 0) {
        idleCheckInterval = setInterval(() => {
        if (!websocket || websocket.readyState !== WebSocket.OPEN) return
        if (state.value !== 'listening') return
        
        const idleTime = Date.now() - lastActivityAt
        if (idleTime > voiceSettings.value.idleReminderSeconds * 1000 && !hasCheckedIn) {
          hasCheckedIn = true
          console.log(`[Voice] User is idle for ${voiceSettings.value.idleReminderSeconds}s. Sending context cue to AI.`)
          
          const contextMsg = {
            realtimeInput: {
              text: '[Hệ thống: Khách hàng dường như không có bất kỳ tương tác trên màn hình hay giọng nói nào trong khoảng 1 phút qua. Hãy chủ động lên tiếng hỏi thăm ngắn gọn tự nhiên xem họ còn ở đó không hoặc có cần tư vấn thêm gì không.]',
            }
          }
          websocket.send(JSON.stringify(contextMsg))
        }
        }, 1000)
      }

      // 3. Send full setup config
      const setupMessage = {
        setup: {
          model: `models/${model}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            temperature: voiceSettings.value.temperature,
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceSettings.value.voiceName,
                },
              },
            },
          },
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          tools: [{
            functionDeclarations: tools,
          }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      }

      ws.send(JSON.stringify(setupMessage))
      console.log('[Voice] Setup sent with model:', model, 'voice:', voiceSettings.value.voiceName)
    }

    ws.onmessage = async (event) => {
      if (websocket !== ws) return

      try {
        const data = typeof event.data === 'string'
          ? JSON.parse(event.data)
          : JSON.parse(await event.data.text?.() || event.data)

        // Handle setup complete — NOW start mic capture + AI greets first
        if (data.setupComplete) {
          console.log('[Voice] Setup complete — starting mic capture')
          await startMicCapture()
          isInitialGreetingTurn = true
          state.value = 'processing'
          sendInitialGreetingPrompt(greetingMessage)
          return
        }

        // Handle tool calls
        if (data.toolCall) {
          state.value = 'processing'
          console.log('[Voice] Tool call received:', data.toolCall)
          await handleToolCall(data.toolCall)
          return
        }

        // Handle server content (audio response)
        if (data.serverContent) {
          const serverContent = data.serverContent
          const parts = serverContent.modelTurn?.parts || []
          const hasAudioParts = parts.some((part: any) =>
            part.inlineData?.mimeType?.startsWith('audio/')
          )

          if (hasAudioParts && !isStreamingAiResponse) {
            // New model turn starting — reset dedup counters
            resetStreamingResponseTracking({ clearDedup: true })
            isStreamingAiResponse = true
            aiTranscript.value = ''
          }

          // Gemini 3.1 Live can deliver transcript + audio in the same event.
          if (serverContent.outputTranscription?.text) {
            appendUniqueTranscript(serverContent.outputTranscription.text)
          }

          if (serverContent.inputTranscription?.text) {
            const transcriptText = serverContent.inputTranscription.text.trim()
            if (transcriptText) {
              transcript.value = transcriptText
            }
          }

          if (hasAudioParts) {
            state.value = 'speaking'
          }

          for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith('audio/')) {
              const audioData = part.inlineData.data
              if (!audioData || currentTurnAudioParts.has(audioData)) continue

              currentTurnAudioParts.add(audioData)
              state.value = 'speaking'
              const audioBytes = base64ToArrayBuffer(audioData)
              scheduleAudioChunk(audioBytes, parseAudioSampleRate(part.inlineData.mimeType))
            }
          }

          // Check if response is complete
          if (serverContent.turnComplete) {
            const isGreetingTurn = isInitialGreetingTurn
            if (isGreetingTurn) {
              isInitialGreetingTurn = false
            }

            console.log('[Voice] Turn complete')
            // Flush any remaining batched audio
            flushPendingAudio()
            // Do NOT clear dedup here — just mark turn as done
            resetStreamingResponseTracking({ clearDedup: false })
            shouldResumeListeningAfterPlayback = true
            resumeListeningIfPlaybackFinished()

            // Sync transcript to backend session memory (fire-and-forget)
            if (!isGreetingTurn && sessionId.value && (transcript.value || aiTranscript.value)) {
              $fetch(`${config.public.apiUrl}/chat/voice-sync`, {
                method: 'POST',
                body: {
                  sessionId: sessionId.value,
                  userText: transcript.value,
                  aiText: aiTranscript.value,
                  context: buildAiCustomerContext(),
                },
              }).catch(() => {})
              
              // Clear after sync so we don't duplicate on tool call boundaries
              transcript.value = ''
              aiTranscript.value = ''
            }
          }

          // Handle interrupted (barge-in)
          if (serverContent.interrupted) {
            console.log('[Voice] Interrupted by user')
            clearAudioQueue()
            resetStreamingResponseTracking({ clearDedup: true })
            state.value = 'listening'
          }
        }
      } catch (err) {
        console.error('[Voice] Message parse error:', err)
      }
    }

    ws.onerror = (error) => {
      if (websocket !== ws) return
      console.error('[Voice] WebSocket error:', error)
      teardownVoiceSession()
      state.value = 'error'
      errorMessage.value = normalizeVoiceErrorMessage('Lỗi kết nối với AI voice')
    }

    ws.onclose = (event) => {
      if (websocket !== ws) return

      console.log('[Voice] WebSocket closed:', event.code, event.reason)

      const shouldShowError =
        state.value !== 'idle'
        && state.value !== 'error'
        && event.code !== 1000

      teardownVoiceSession()

      if (shouldShowError) {
        errorMessage.value = normalizeVoiceErrorMessage(event.reason || 'Voice connection closed unexpectedly')
        state.value = 'error'
      }
    }
  } catch (error: any) {
    console.error('[Voice] Start error:', error)
    teardownVoiceSession()
    state.value = 'error'
    errorMessage.value = normalizeVoiceErrorMessage(error?.data?.message || error.message)
  }
}

const openSalesRoute = async (path: string) => {
  try {
    suggestedProducts.value = []
    await router.push(path)
    minimizeVoiceWidget()
  } catch {
    if (import.meta.client) {
      window.location.href = path
    }
  }
}

const fetchProductBySlug = async (slug: string) => {
  const response = await $fetch<{ success: boolean; data: { product: any } }>(
    `${config.public.apiUrl}/products/${slug}`
  )

  if (!response.success || !response.data?.product) {
    throw new Error('Product not found')
  }

  return response.data.product
}

const getPrimaryProductImage = (product: any) => {
  try {
    const images = typeof product?.images === 'string'
      ? JSON.parse(product.images)
      : product?.images

    if (Array.isArray(images) && images.length > 0) {
      return getImageUrl(images[0]) || images[0] || ''
    }
  } catch {
    // Fall through to empty image.
  }

  return ''
}

const getAvailableVariants = (product: any) =>
  (Array.isArray(product?.variants) ? product.variants : []).filter((variant: any) => variant?.status === 'AVAILABLE')

const addProductToCartBySlug = async (slug: string, quantity = 1) => {
  if (!authStore.isAuthenticated) {
    openSalesRoute(`/auth/login?redirect=/shop/${slug}`)
    return { success: false, message: 'Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng.' }
  }

  const product = await fetchProductBySlug(slug)
  const availableVariants = getAvailableVariants(product)

  if (!availableVariants.length) {
    return { success: false, message: 'Sản phẩm hiện không còn hàng.' }
  }

  const variantsToAdd = availableVariants
    .filter((variant: any) => !cartStore.isInCart(variant.id))
    .slice(0, Math.max(1, quantity))

  if (!variantsToAdd.length) {
    return { success: false, message: 'Sản phẩm này đã có trong giỏ hoặc không còn thêm được nữa.' }
  }

  let addedCount = 0
  for (const variant of variantsToAdd) {
    const added = cartStore.addToCart({
      id: variant.id,
      productId: product.id,
      productName: product.name,
      productBrand: product.brand,
      productImage: getPrimaryProductImage(product),
      variantSize: variant.size || '',
      variantColor: variant.color || '',
      price: parseFloat(product.sale_price || product.base_price || 0),
    })

    if (added) {
      addedCount++
    }
  }

  if (!addedCount) {
    return { success: false, message: 'Không thể thêm sản phẩm vào giỏ.' }
  }

  return {
    success: true,
    message: `Đã thêm ${addedCount} sản phẩm vào giỏ hàng.`,
    product,
    addedCount,
  }
}

const saveProductToWishlistBySlug = async (slug: string) => {
  if (!authStore.isAuthenticated) {
    openSalesRoute(`/auth/login?redirect=/shop/${slug}`)
    return { success: false, message: 'Bạn cần đăng nhập để lưu wishlist.' }
  }

  const product = await fetchProductBySlug(slug)
  const token = localStorage.getItem('token')
  if (!token) {
    openSalesRoute(`/auth/login?redirect=/shop/${slug}`)
    return { success: false, message: 'Bạn cần đăng nhập để lưu wishlist.' }
  }

  await $fetch(`${config.public.apiUrl}/wishlist`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: { productId: product.id },
  })

  return {
    success: true,
    message: 'Đã lưu sản phẩm vào wishlist.',
    product,
  }
}

/**
 * Handle tool calls from Gemini
 */
const handleToolCall = async (toolCall: any) => {
  const calls = toolCall.functionCalls || []
  const responses: any[] = []

  console.log('[Voice] Tool calls received:', calls.map((c: any) => ({ name: c.name, args: c.args })))

  for (const call of calls) {
    try {
      if (call.name === 'navigate_to_product' && call.args?.slug) {
        await openSalesRoute(`/shop/${call.args.slug}`)
        responses.push({
          id: call.id,
          name: call.name,
          response: { success: true, message: `Đã mở trang sản phẩm ${call.args.name || call.args.slug}` },
        })
        continue
      }

      if (call.name === 'navigate_to_category') {
        const category = call.args?.category || ''
        const queryParams: Record<string, string> = {}
        if (category) queryParams.category = category
        if (call.args?.brand) queryParams.brand = call.args.brand

        await openSalesRoute(`/shop?${new URLSearchParams(queryParams).toString()}`)
        responses.push({
          id: call.id,
          name: call.name,
          response: { success: true, message: `Đã mở trang ${category || 'cửa hàng'}` },
        })
        continue
      }

      if (call.name === 'add_to_cart' && call.args?.slug) {
        const result = await addProductToCartBySlug(call.args.slug, call.args?.quantity || 1)
        if (result.success) {
          notifySuccess(result.message)
          playHappy()
          if (call.args?.openCartAfterAdd) {
            await openSalesRoute('/cart')
          }
        } else {
          notifyWarning(result.message)
        }

        responses.push({
          id: call.id,
          name: call.name,
          response: result,
        })
        continue
      }

      if (call.name === 'open_cart') {
        await openSalesRoute('/cart')
        notifyInfo('Đã mở giỏ hàng cho bạn.')
        responses.push({
          id: call.id,
          name: call.name,
          response: { success: true, message: 'Đã mở giỏ hàng.' },
        })
        continue
      }

      if (call.name === 'go_to_checkout') {
        const targetPath = authStore.isAuthenticated ? '/checkout' : '/auth/login?redirect=/checkout'
        await openSalesRoute(targetPath)
        playNod()
        notifyInfo(authStore.isAuthenticated ? 'Đã mở trang checkout.' : 'Đã mở trang đăng nhập để tiếp tục checkout.')
        responses.push({
          id: call.id,
          name: call.name,
          response: {
            success: true,
            message: authStore.isAuthenticated ? 'Đã mở trang checkout.' : 'Đã mở trang đăng nhập để tiếp tục checkout.',
          },
        })
        continue
      }

      if (call.name === 'save_to_wishlist' && call.args?.slug) {
        const result = await saveProductToWishlistBySlug(call.args.slug)
        if (result.success) {
          notifySuccess(result.message)
          playHappy()
        } else {
          notifyInfo(result.message)
        }

        responses.push({
          id: call.id,
          name: call.name,
          response: result,
        })
        continue
      }

      if (call.name === 'play_animation') {
        const animType = call.args?.animation || 'idle'
        triggerAnimation(animType)
        responses.push({
          id: call.id,
          name: call.name,
          response: { success: true, message: `Đã thực hiện animation: ${animType}` },
        })
        continue
      }

      if (call.name === 'end_call') {
        if (isModelReady.value) {
          playGoodbye()
        }
        responses.push({
          id: call.id,
          name: call.name,
          response: { success: true, message: 'Kết thúc cuộc gọi' },
        })
        if (websocket?.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({
            toolResponse: {
              functionResponses: responses,
            },
          }))
        }
        setTimeout(() => {
          teardownVoiceSession({ emitClose: true })
        }, 4000)
        return
      }

      const res = await $fetch<{ success: boolean; data: any }>(
        `${config.public.apiUrl}/chat/voice-tool-call`,
        {
          method: 'POST',
          body: {
            toolName: call.name,
            args: call.args || {},
            sessionId: sessionId.value,
            context: buildAiCustomerContext(),
          },
        }
      )

      const toolData = res.data || {}
      if (call.name === 'search_products') {
        updateSuggestedProducts(toolData.products)
      }

      responses.push({
        id: call.id,
        name: call.name,
        response: toolData,
      })
    } catch {
      responses.push({
        id: call.id,
        name: call.name,
        response: { error: 'Failed to execute tool' },
      })
    }
  }

  // Send tool responses back to Gemini
  if (websocket?.readyState === WebSocket.OPEN) {
    const toolResponse = {
      toolResponse: {
        functionResponses: responses,
      },
    }
    websocket.send(JSON.stringify(toolResponse))
    console.log('[Voice] Tool response sent:', responses.length)
  }
}

/**
 * Trigger Live2D animation by name
 */
const triggerAnimation = (animation: string) => {
  if (!isModelReady.value) {
    pendingAnimation = animation
    return
  }

  switch (animation) {
    case 'wave':
    case 'greeting':
    case 'hello':
    case 'chao':
      playGreeting()
      break
    case 'nod':
    case 'agree':
    case 'dong_y':
      playNod()
      break
    case 'think':
    case 'thinking':
    case 'suy_nghi':
      playThinking()
      break
    case 'happy':
    case 'excited':
    case 'smile':
    case 'laugh':
    case 'vui':
    case 'cuoi':
      playHappy()
      break
    case 'product':
    case 'products':
    case 'present':
    case 'presentation':
    case 'introduce':
    case 'introduce_product':
    case 'show_product':
    case 'gioi_thieu':
      playIntroduceProduct()
      break
    case 'recommend':
    case 'recommend_product':
    case 'suggest':
    case 'suggest_product':
    case 'goi_y':
    case 'tu_van':
      playRecommendProduct()
      break
    case 'goodbye':
    case 'bye':
    case 'tam_biet':
      playGoodbye()
      break
    case 'surprised':
    case 'surprise':
    case 'shock':
    case 'wow':
    case 'ngac_nhien':
      playSurprised()
      break
    case 'shy':
    case 'blush':
    case 'embarrassed':
    case 'nguong':
    case 'mac_co':
      playShy()
      break
    case 'hype':
    case 'celebrate':
    case 'yay':
    case 'hao_hung':
    case 'phan_khoi':
      playExcited()
      break
    case 'confused':
    case 'what':
    case 'huh':
    case 'boi_roi':
    case 'khong_hieu':
      playConfused()
      break
    case 'angry':
    case 'mad':
    case 'upset':
    case 'gian':
    case 'tuc':
      playAngry()
      break
    case 'sad':
    case 'cry':
    case 'sorry':
    case 'buon':
    case 'tiec':
      playSad()
      break
    case 'apologize':
    case 'xin_loi':
      playApologize()
      break
    case 'encourage':
    case 'cheer':
    case 'co_len':
    case 'co_gang':
      playEncourage()
      break
    case 'listen':
    case 'lang_nghe':
    case 'nghe':
      playListen()
      break
    case 'deny':
    case 'refuse':
    case 'khong':
    case 'tu_choi':
      playAgree()
      break
    default:
      playRandomMotion()
      break
  }
}

/**
 * Start microphone capture
 */
const startMicCapture = async () => {
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      sampleRate: 16000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })

  audioContext = new AudioContext({ sampleRate: 16000 })
  await audioContext.resume().catch(() => {})
  console.log('[Voice] Mic AudioContext sampleRate:', audioContext.sampleRate)
  micSourceNode = audioContext.createMediaStreamSource(mediaStream)

  // Setup analyser for waveform visualization
  analyserNode = audioContext.createAnalyser()
  analyserNode.fftSize = 256
  micSourceNode.connect(analyserNode)
  startWaveformAnimation()

  // Use ScriptProcessor for PCM capture (wider browser support than AudioWorklet)
  const bufferSize = 2048
  micProcessorNode = audioContext.createScriptProcessor(bufferSize, 1, 1)
  micMonitorNode = audioContext.createGain()
  micMonitorNode.gain.value = 0

  micProcessorNode.onaudioprocess = (e) => {
    if (state.value !== 'listening') return
    if (!websocket || websocket.readyState !== WebSocket.OPEN) return

    const inputData = e.inputBuffer.getChannelData(0)

    // Convert float32 to int16
    let sumSquares = 0
    const pcm16 = new Int16Array(inputData.length)
    for (let i = 0; i < inputData.length; i++) {
      const s = Math.max(-1, Math.min(1, inputData[i]))
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
      sumSquares += inputData[i] * inputData[i]
    }

    // Track speech locally so we can flush the audio stream after a brief pause.
    const rms = Math.sqrt(sumSquares / inputData.length)
    if (rms > MIC_ACTIVITY_RMS_THRESHOLD) {
      resetActivity()
      hasDetectedSpeechSinceLastFlush = true
      if (silenceFlushTimer) {
        clearTimeout(silenceFlushTimer)
        silenceFlushTimer = null
      }
    } else if (hasDetectedSpeechSinceLastFlush && !silenceFlushTimer) {
      silenceFlushTimer = setTimeout(() => {
        silenceFlushTimer = null
        sendAudioStreamEnd()
      }, AUDIO_END_SILENCE_MS)
    }

    // Send as base64 to Gemini
    const base64 = arrayBufferToBase64(pcm16.buffer)
    const audioMessage = {
      realtimeInput: {
        audio: {
          data: base64,
          mimeType: `audio/pcm;rate=${audioContext?.sampleRate || 16000}`,
        },
      },
    }
    websocket.send(JSON.stringify(audioMessage))
  }

  micSourceNode.connect(micProcessorNode)
  // Keep the processor alive without routing the mic back to the speakers.
  micProcessorNode.connect(micMonitorNode)
  micMonitorNode.connect(audioContext.destination)
}

/**
 * Audio playback - enqueue and play audio chunks
 */
/**
 * Batch small audio chunks to reduce glitches from tiny buffers.
 * Each chunk from Gemini is very short; playing them individually
 * causes audible clicks between chunks.
 */
const scheduleAudioChunk = (chunk: ArrayBuffer, sampleRate = DEFAULT_OUTPUT_SAMPLE_RATE) => {
  const normalizedSampleRate = Number.isFinite(sampleRate) && sampleRate > 0
    ? sampleRate
    : DEFAULT_OUTPUT_SAMPLE_RATE

  if (pendingAudioChunks.length && pendingAudioChunks[0]?.sampleRate !== normalizedSampleRate) {
    flushPendingAudio()
  }

  pendingAudioChunks.push({ buffer: chunk, sampleRate: normalizedSampleRate })
  if (audioFlushTimer) clearTimeout(audioFlushTimer)
  audioFlushTimer = setTimeout(flushPendingAudio, AUDIO_BATCH_MS)
}

const flushPendingAudio = () => {
  if (audioFlushTimer) {
    clearTimeout(audioFlushTimer)
    audioFlushTimer = null
  }
  if (!pendingAudioChunks.length) return

  // Merge all pending chunks into one contiguous PCM buffer
  const sampleRate = pendingAudioChunks[0]?.sampleRate || DEFAULT_OUTPUT_SAMPLE_RATE
  const totalLength = pendingAudioChunks.reduce((sum, c) => sum + c.buffer.byteLength, 0)
  const merged = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of pendingAudioChunks) {
    merged.set(new Uint8Array(chunk.buffer), offset)
    offset += chunk.buffer.byteLength
  }
  pendingAudioChunks = []
  enqueueAudio({ buffer: merged.buffer, sampleRate })
}

const enqueueAudio = (audioBuffer: QueuedAudio) => {
  audioQueue.push(audioBuffer)
  if (!isPlaying) {
    playNext()
  }
}

const playNext = async () => {
  if (audioQueue.length === 0) {
    isPlaying = false
    setLipSync(0)
    resumeListeningIfPlaybackFinished()
    return
  }

  isPlaying = true
  const queuedAudio = audioQueue.shift()!

  try {
    // Use device's native sample rate for best quality output.
    // We resample the 24kHz PCM to match.
    if (!playbackContext) {
      playbackContext = new AudioContext()
    }

    await playbackContext.resume().catch(() => {})

    // Create playback analyser for LipSync (once)
    if (!playbackAnalyserNode) {
      playbackAnalyserNode = playbackContext.createAnalyser()
      playbackAnalyserNode.fftSize = 256
      playbackAnalyserNode.connect(playbackContext.destination)
      startLipSyncAnimation()
    }

    // Gemini returns PCM 24kHz audio — resample to device rate
    const float32 = pcm16ToFloat32(queuedAudio.buffer)
    const deviceRate = playbackContext.sampleRate
    const resampledData = resampleLinear(float32, queuedAudio.sampleRate, deviceRate)

    const audioBuffer2 = playbackContext.createBuffer(1, resampledData.length, deviceRate)
    audioBuffer2.getChannelData(0).set(resampledData)

    const source = playbackContext.createBufferSource()
    playbackSource = source
    source.buffer = audioBuffer2
    source.connect(playbackAnalyserNode!)
    source.onended = () => {
      if (playbackSource === source) {
        playbackSource = null
      }
      playNext()
    }
    source.start()
  } catch (err) {
    console.error('[Voice] Playback error:', err)
    isPlaying = false
    stopCurrentPlayback()
    playNext()
  }
}

const clearAudioQueue = () => {
  audioQueue = []
  pendingAudioChunks = []
  if (audioFlushTimer) {
    clearTimeout(audioFlushTimer)
    audioFlushTimer = null
  }
  isPlaying = false
  stopCurrentPlayback()
  resumeListeningIfPlaybackFinished()
}

/**
 * Waveform animation (mic input level)
 */
const startWaveformAnimation = () => {
  const update = () => {
    if (!analyserNode) return
    const data = new Uint8Array(analyserNode.frequencyBinCount)
    analyserNode.getByteFrequencyData(data)
    const avg = data.reduce((sum, val) => sum + val, 0) / data.length
    audioLevel.value = avg / 255
    animationFrame = requestAnimationFrame(update)
  }
  update()
}

/**
 * LipSync animation — reads playback audio level and drives model mouth
 */
const startLipSyncAnimation = () => {
  const update = () => {
    if (!playbackAnalyserNode) return
    const data = new Uint8Array(playbackAnalyserNode.frequencyBinCount)
    playbackAnalyserNode.getByteFrequencyData(data)
    const avg = data.reduce((sum, val) => sum + val, 0) / data.length
    const lipLevel = Math.min(1, (avg / 128) * 1.5) // Amplify for visible mouth movement
    setLipSync(lipLevel)
    lipSyncFrame = requestAnimationFrame(update)
  }
  update()
}

const cueSalesEnergy = (text: string) => {
  if (!isModelReady.value || !text) return

  const now = Date.now()
  if (now - lastSalesCueAt < 1400) return

  const normalized = text.toLowerCase()

  // --- Closing / Buy intention ---
  if (/(thêm vào giỏ|checkout|chốt đơn|mở giỏ|thanh toán|đặt mua|mua ngay|đặt hàng)/i.test(normalized)) {
    lastSalesCueAt = now
    playGesture('closing', { mood: 'delighted', cooldownMs: 200, force: true })
    return
  }

  // --- Recommend / Suggest ---
  if (/(mình tìm được|gợi ý|rất hợp|phù hợp|ưu tiên mẫu này|đề xuất|rất đẹp|nên thử|giá tốt)/i.test(normalized)) {
    lastSalesCueAt = now
    playRecommendProduct()
    return
  }

  // --- Thinking / Searching ---
  if (/(để mình tìm|mình kiểm tra|để mình xem|chờ chút|để xem|đang tìm|kiểm tra xem)/i.test(normalized)) {
    lastSalesCueAt = now
    playGesture('think', { mood: 'curious', cooldownMs: 200, force: true })
    return
  }

  // --- Apologize ---
  if (/(xin lỗi|rất tiếc|thật ra|không thể|hết hàng|không có sẵn|thông cảm)/i.test(normalized)) {
    lastSalesCueAt = now
    playApologize()
    return
  }

  // --- Happy / Excited ---
  if (/(tuyệt vời|xuất sắc|quá đẹp|hoàn hảo|siêu|cực kỳ|wow|yay|quá tốt|rất vui|mừng)/i.test(normalized)) {
    lastSalesCueAt = now
    playExcited()
    return
  }

  // --- Surprised ---
  if (/(ồ|óa|woa|trời ơi|ôi|bất ngờ|thật sao|không thể tin)/i.test(normalized)) {
    lastSalesCueAt = now
    playSurprised()
    return
  }

  // --- Encourage ---
  if (/(cố lên|đừng lo|yên tâm|sẽ giúp|sẽ tìm giúp|mình hỗ trợ|đừng ngại)/i.test(normalized)) {
    lastSalesCueAt = now
    playEncourage()
    return
  }

  // --- Sad / Empathy ---
  if (/(buồn|tiếc|thương|đáng tiếc|không may|đã hết)/i.test(normalized)) {
    lastSalesCueAt = now
    playSad()
    return
  }

  // --- Introduce product ---
  if (/(giới thiệu|trình bày|xem qua|có mẫu|đây là|sản phẩm này|mẫu mới|bộ sưu tập)/i.test(normalized)) {
    lastSalesCueAt = now
    playIntroduceProduct()
    return
  }

  // --- Greeting / Welcome ---
  if (/(chào bạn|xin chào|chào mừng|rất vui|hân hạnh)/i.test(normalized)) {
    lastSalesCueAt = now
    playGreeting()
    return
  }

  // --- Agreement / Nodding ---
  if (/(đúng rồi|vâng|chính xác|đồng ý|được luôn|ok|tốt lắm)/i.test(normalized)) {
    lastSalesCueAt = now
    playAgree()
    return
  }

  // --- Listening ---
  if (/(mình hiểu|mình nghe|mình lắng nghe|mình biết rồi|mình nắm rồi)/i.test(normalized)) {
    lastSalesCueAt = now
    playListen()
    return
  }
}

const applyVoiceStateAnimation = (newState: VoiceState, oldState?: VoiceState) => {
  if (!isModelReady.value) return

  switch (newState) {
    case 'listening':
      setLipSync(0)
      if (oldState === 'connecting') {
        playGreeting()
      } else {
        setMood('soft')
        if (oldState !== 'listening') {
          playIdle()
        }
      }
      break
    case 'speaking':
      setMood('smile')
      if (oldState !== 'speaking') {
        playGesture('subtleTalk', { mood: 'soft', cooldownMs: 300 })
      }
      break
    case 'processing':
      playThinking()
      break
    case 'idle':
    case 'error':
      setLipSync(0)
      setMood(newState === 'error' ? 'serious' : 'neutral')
      playIdle()
      break
  }
}

// Watch state changes to trigger Live2D animations
watch(state, applyVoiceStateAnimation)

watch(isModelReady, (ready) => {
  if (!ready) return

  if (pendingAnimation) {
    const animation = pendingAnimation
    pendingAnimation = null
    triggerAnimation(animation)
    return
  }

  applyVoiceStateAnimation(state.value)
})

watch(aiTranscript, (text) => {
  if (state.value === 'speaking' && text) {
    cueSalesEnergy(text)
  }
})

/**
 * Stop voice session
 */
const stopVoiceSession = () => {
  teardownVoiceSession({ emitClose: true })
}

const handleQuickAdd = async (slug: string) => {
  const result = await addProductToCartBySlug(slug, 1)
  if (result.success) {
    notifySuccess(result.message)
    playHappy()
  } else {
    notifyWarning(result.message)
  }
}

const handleQuickWishlist = async (slug: string) => {
  const result = await saveProductToWishlistBySlug(slug)
  if (result.success) {
    notifySuccess(result.message)
    playHappy()
  } else {
    notifyInfo(result.message)
  }
}

/**
 * Helpers
 */
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

const pcm16ToFloat32 = (buffer: ArrayBuffer): Float32Array => {
  const int16 = new Int16Array(buffer)
  const float32 = new Float32Array(int16.length)
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768
  }
  return float32
}

const parseAudioSampleRate = (mimeType?: string): number => {
  const match = String(mimeType || '').match(/rate=(\d+)/i)
  const parsed = match ? Number(match[1]) : DEFAULT_OUTPUT_SAMPLE_RATE
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_OUTPUT_SAMPLE_RATE
}

/**
 * Resample audio from srcRate to dstRate using linear interpolation.
 * Produces much cleaner output than forcing AudioContext to a non-native rate.
 */
const resampleLinear = (input: Float32Array, srcRate: number, dstRate: number): Float32Array => {
  if (srcRate === dstRate) return input

  const ratio = srcRate / dstRate
  const outputLength = Math.ceil(input.length / ratio)
  const output = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio
    const lo = Math.floor(srcIndex)
    const hi = Math.min(lo + 1, input.length - 1)
    const frac = srcIndex - lo
    output[i] = input[lo] * (1 - frac) + input[hi] * frac
  }

  return output
}

// State label mapping
const stateLabel = computed(() => {
  switch (state.value) {
    case 'connecting': return 'Đang kết nối...'
    case 'listening': return 'Đang nghe bạn...'
    case 'processing': return 'Đang xử lý...'
    case 'speaking': return 'AURA đang trả lời...'
    case 'error': return errorMessage.value
    default: return 'Sẵn sàng'
  }
})

const dynamicStateLabel = computed(() =>
  state.value === 'speaking'
    ? speakingLabel.value
    : stateLabel.value
)

watch(() => route.fullPath, (path, previousPath) => {
  if (!previousPath || path === previousPath) return
  minimizeVoiceWidget()
  sendCustomerContextCue('customer_navigated')
})

// Cleanup on unmount
onUnmounted(() => {
  teardownVoiceSession()
  window.removeEventListener('pointermove', resetActivity)
  window.removeEventListener('keydown', resetActivity)
  window.removeEventListener('touchstart', resetActivity)
  window.removeEventListener('wheel', resetActivity)
})

// Prepare voice UI; the actual Gemini session starts only after an explicit click.
onMounted(() => {
  window.addEventListener('pointermove', resetActivity, { passive: true })
  window.addEventListener('keydown', resetActivity, { passive: true })
  window.addEventListener('touchstart', resetActivity, { passive: true })
  window.addEventListener('wheel', resetActivity, { passive: true })

  sessionId.value = getOrCreateSessionId()
  
  // Tự động kết nối với Gemini khi UI vừa mở lên để cất lời chào khách
  startVoiceSession()
})
</script>

<template>
  <!-- Voice Chat Overlay -->
  <div
    class="fixed inset-0 z-[60] flex overflow-y-auto overscroll-contain transition-[background-color,backdrop-filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
    :class="isMinimized
      ? 'pointer-events-none items-end justify-end bg-transparent backdrop-blur-0'
      : 'pointer-events-auto items-center justify-center bg-black/80 px-3 py-4 backdrop-blur-sm sm:px-6 sm:py-6'"
  >
    <div
      class="relative flex flex-col items-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
      :class="isMinimized
        ? 'pointer-events-auto mr-4 mb-4 w-56 overflow-visible bg-transparent p-0 shadow-none'
        : [
          'pointer-events-auto mx-auto w-full max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto overscroll-contain rounded-[32px] border border-white/10 bg-neutral-950/95 px-4 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:px-6 sm:py-6',
          suggestedProducts.length ? 'max-w-2xl' : 'max-w-md',
        ]"
    >

      <!-- Voice Header -->
      <div v-if="!isMinimized" class="text-center">
        <h2 class="text-2xl font-serif text-white tracking-widest">{{ voiceCharacterName }}</h2>
        <p class="text-sm text-white/60 mt-1">{{ voiceCharacterSubtitle }}</p>
      </div>

      <!-- Live2D Model Container -->
      <div
        class="relative flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        :class="isMinimized ? 'h-80 w-56 cursor-pointer' : 'w-full'"
        @pointermove="handleCanvasPointerMove"
        @pointerdown="handleCanvasPointerDown"
      >
        <button
          v-if="!isMinimized"
          type="button"
          class="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white/75 transition hover:bg-black/55 hover:text-white"
          aria-label="Thu nhỏ cuộc gọi"
          @pointerdown.stop
          @click.stop="minimizeVoiceWidget"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 19h4v-4m0 4-5-5M9 5H5v4m0-4 5 5" />
          </svg>
        </button>

        <div
          v-if="false"
          class="absolute right-1.5 top-1.5 z-20 flex items-center gap-1"
        >
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/80 transition hover:bg-black/65 hover:text-white"
            aria-label="Phóng to cuộc gọi"
            @pointerdown.stop
            @click.stop="maximizeVoiceWidget"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 5H5v4m0-4 5 5m5 9h4v-4m0 4-5-5" />
            </svg>
          </button>
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-500/90 text-white transition hover:bg-red-500"
            aria-label="Kết thúc cuộc gọi"
            @pointerdown.stop
            @click.stop="stopVoiceSession"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8l-8 8M8 8l8 8" />
            </svg>
          </button>
        </div>
        <!-- Glow ring based on state -->
        <div
          class="pointer-events-none absolute inset-0 rounded-2xl transition-all duration-500"
          :class="{
            'shadow-[0_18px_50px_rgba(16,185,129,0.12)]': state === 'listening',
            'shadow-[0_18px_50px_rgba(59,130,246,0.12)]': state === 'speaking',
            'shadow-[0_18px_50px_rgba(245,158,11,0.12)]': state === 'processing',
          }"
        />

        <div
          v-if="!isModelReady"
          class="voice-live2d-layer pointer-events-none absolute z-0 flex items-center justify-center overflow-visible bg-transparent"
          :class="isMinimized
            ? 'h-80 w-56'
            : 'h-[42dvh] min-h-[280px] max-h-[520px] w-full max-w-[440px]'"
        >
          <Live2DSnapshot
            v-if="live2dModelUrl"
            :key="`voice-static-${live2dModelUrl}-${live2dSnapshotWidth}-${live2dSnapshotHeight}-${live2dSnapshotFitMode}-${live2dScale}-${live2dOffsetY}`"
            :model-url="live2dModelUrl"
            :width="live2dSnapshotWidth"
            :height="live2dSnapshotHeight"
            :fit-mode="live2dSnapshotFitMode"
            :live2d-scale="live2dScale"
            :live2d-offset-y="live2dOffsetY"
            class="h-full w-full bg-transparent"
          />
        </div>

        <!-- Live2D Canvas -->
        <canvas
          ref="live2dCanvas"
          width="440"
          height="520"
          class="voice-live2d-canvas relative z-10 outline-none transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          :class="[
            isMinimized
              ? 'h-80 w-56 border-0 bg-transparent shadow-none'
              : 'h-[42dvh] min-h-[280px] max-h-[520px] w-full max-w-[440px] border-0 bg-transparent',
            {
              'opacity-0': !(isModelReady || hasVisibleFrame),
              'opacity-100': isModelReady || hasVisibleFrame,
            },
          ]"
        />

        <!-- Loading overlay -->
        <div
          v-if="state === 'connecting'"
          class="absolute inset-0 z-20 flex flex-col items-center justify-center"
          :class="isMinimized ? 'bg-transparent' : 'bg-transparent'"
        >
          <svg :class="isMinimized ? 'h-6 w-6' : 'h-10 w-10'" class="text-white/60 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p class="text-white/50 text-xs mt-3">Đang kết nối...</p>
        </div>

        <div
          v-if="state === 'error'"
          class="absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/90 border border-red-200 shadow-sm"
          :class="isMinimized ? 'bottom-1.5 px-2 py-0.5 text-[9px]' : 'bottom-1 px-3 py-1.5'"
        >
          <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span class="text-red-500 text-[11px] font-medium">Lỗi kết nối</span>
        </div>
      </div>

      <!-- State Label -->
      <p v-if="!isMinimized" class="text-white/80 text-sm tracking-wide">{{ dynamicStateLabel }}</p>

      <!-- AI transcript (shows what AI is saying) -->
      <div
        v-if="aiTranscript && !isMinimized"
        class="max-w-xs text-center text-white/50 text-xs leading-relaxed max-h-20 overflow-y-auto px-4"
      >
        {{ aiTranscript }}
      </div>

      <!-- Suggested Products -->
      <div
        v-if="suggestedProducts.length && !isMinimized"
        class="w-full max-w-full"
      >
        <p class="text-white/40 text-xs text-center mb-2">Sản phẩm gợi ý</p>
        <div class="mb-2 flex items-center justify-end gap-1.5">
          <button
            type="button"
            class="rounded-full border border-white/10 bg-white/5 p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Cuộn sản phẩm sang trái"
            @click="scrollSuggestedProducts('left')"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            class="rounded-full border border-white/10 bg-white/5 p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Cuộn sản phẩm sang phải"
            @click="scrollSuggestedProducts('right')"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div
          ref="suggestedProductsRail"
          class="scrollbar-hide flex touch-pan-x snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden px-1 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          @wheel="handleSuggestedProductsWheel"
        >
          <article
            v-for="(p, i) in suggestedProducts"
            :key="i"
            class="flex-shrink-0 snap-start w-56 bg-white/10 hover:bg-white/15 rounded-lg p-3 transition-colors border border-white/10"
          >
            <div v-if="p.image" class="mb-2 h-20 w-full overflow-hidden rounded-md bg-white/5">
              <img :src="getImageUrl(p.image) || p.image" :alt="p.name" class="h-full w-full object-cover" />
            </div>
            <p class="text-white text-xs font-medium truncate">{{ p.name }}</p>
            <p class="text-white/50 text-[10px] truncate mt-0.5">{{ p.brand }}</p>
            <div class="flex items-center justify-between mt-2">
              <span class="text-emerald-400 text-xs font-semibold">
                {{ p.sale_price || p.price }}
              </span>
              <span class="text-white/30 text-[10px]">Xem →</span>
            </div>
            <div v-if="p.variants?.length" class="mt-1">
              <span
                v-for="v in p.variants.filter((v: any) => v.status === 'AVAILABLE').slice(0, 3)"
                :key="v.size"
                class="inline-block text-[9px] bg-white/10 text-white/60 rounded px-1 mr-1"
              >
                {{ formatSizeLabel(v.size) }}
              </span>
            </div>
            <button
              type="button"
              class="mt-3 w-full rounded-md bg-white/12 px-2 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/20"
              @click="openSalesRoute(`/shop/${p.slug}`)"
            >
              Xem chi tiết
            </button>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                class="rounded-md bg-emerald-500/80 px-2 py-1.5 text-[11px] font-medium text-white transition hover:bg-emerald-500"
                @click="handleQuickAdd(p.slug)"
              >
                Thêm giỏ
              </button>
              <button
                type="button"
                class="rounded-md bg-white/10 px-2 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/20"
                @click="handleQuickWishlist(p.slug)"
              >
                Lưu lại
              </button>
            </div>
          </article>
        </div>
      </div>

      <!-- Hint -->
      <p v-if="!isMinimized" class="text-center text-white/30 text-xs">
        {{ voiceHintText }}
      </p>

      <!-- Controls -->
      <div v-if="!isMinimized" class="sticky bottom-0 z-10 flex w-full justify-center bg-gradient-to-t from-neutral-950 via-neutral-950/95 to-transparent pb-1 pt-4">
        <div class="flex items-center gap-6 rounded-full border border-white/10 bg-black/35 px-5 py-3 backdrop-blur-sm">
        <!-- Start Call button -->
        <button
          v-if="state === 'idle'"
          @click="startVoiceSession"
          class="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all shadow-lg hover:shadow-emerald-500/25 hover:scale-105 active:scale-95"
          aria-label="Bắt đầu cuộc gọi"
          title="Bắt đầu cuộc gọi"
        >
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 18.5a5.5 5.5 0 0 0 5.5-5.5V7a5.5 5.5 0 0 0-11 0v6a5.5 5.5 0 0 0 5.5 5.5Z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 12.5a7 7 0 0 0 14 0M12 19v4m-4 0h8" />
          </svg>
        </button>

        <!-- End Call button -->
        <button
          v-if="hasActiveVoiceSession"
          @click="stopVoiceSession"
          class="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-lg hover:shadow-red-500/30 hover:scale-105 active:scale-95"
          aria-label="Kết thúc cuộc gọi"
        >
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8l-8 8M8 8l8 8" />
          </svg>
        </button>

        <!-- Retry button (on error) -->
        <button
          v-if="state === 'error'"
          @click="startVoiceSession"
          class="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          aria-label="Thử lại"
        >
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.voice-live2d-layer,
.voice-live2d-layer :deep(.live2d-snapshot),
.voice-live2d-layer :deep(img),
.voice-live2d-canvas {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  outline: 0 !important;
}

.voice-live2d-canvas:focus,
.voice-live2d-canvas:focus-visible {
  outline: 0 !important;
}
</style>
