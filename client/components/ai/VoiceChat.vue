<script setup lang="ts">
/**
 * VoiceChat Component
 * AURA ARCHIVE - Real-time voice conversation with AI stylist
 * Uses Gemini Live API via WebSocket with direct API key
 * Integrated with Live2D model for visual feedback
 */

const config = useRuntimeConfig()
const router = useRouter()
const cartStore = useCartStore()
const authStore = useAuthStore()
const { getImageUrl } = useImageUrl()
const { success: notifySuccess, info: notifyInfo, warning: notifyWarning } = useNotification()

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
const sessionId = ref('')
let isInitialGreetingTurn = false

// Live2D Model
const live2dCanvas = ref<HTMLCanvasElement | null>(null)
const {
  isModelReady,
  isLoading: isModelLoading,
  setLipSync,
  setMood,
  playGesture,
  playRandomMotion,
  playIdle,
  playGreeting,
  playNod,
  playThinking,
  playHappy,
  playGoodbye,
  handlePointerMove: onLive2DPointerMove,
  handleTap: onLive2DTap,
} = useLive2D(live2dCanvas)

// Audio refs
let websocket: WebSocket | null = null
let audioContext: AudioContext | null = null
let mediaStream: MediaStream | null = null
let playbackContext: AudioContext | null = null
let audioQueue: ArrayBuffer[] = []
let isPlaying = false
let playbackSource: AudioBufferSourceNode | null = null
let micSourceNode: MediaStreamAudioSourceNode | null = null
let micProcessorNode: ScriptProcessorNode | null = null
let currentTurnAudioIndex = 0
let currentTurnTextParts = new Set<string>()
let isStreamingAiResponse = false
let shouldResumeListeningAfterPlayback = false
let pendingAudioChunks: ArrayBuffer[] = []
let audioFlushTimer: ReturnType<typeof setTimeout> | null = null
const AUDIO_BATCH_MS = 80 // batch small chunks for smoother playback

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
    currentTurnAudioIndex = 0
    currentTurnTextParts = new Set()
  }
  isStreamingAiResponse = false
  shouldResumeListeningAfterPlayback = false
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

  const cueText = [
    '[He thong: Cuoc goi vua bat dau. Hay chu dong chao khach truoc bang tieng Viet that tu nhien, ngan gon trong 1-2 cau.]',
    greetingMessage?.trim() ? `Goi y cau chao: ${greetingMessage.trim()}` : '',
    '[Sau loi chao, hoi ngan gon khach dang muon tim gi hom nay.]',
  ].filter(Boolean).join('\n')

  websocket.send(JSON.stringify({
    clientContent: {
      turns: [{
        role: 'user',
        parts: [{ text: cueText }],
      }],
      turnComplete: true,
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

const sessionQuery = computed(() =>
  sessionId.value
    ? `?${new URLSearchParams({ sessionId: sessionId.value }).toString()}`
    : ''
)

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
      data: { apiKey: string; model: string; systemPrompt: string; greetingMessage: string; tools: any[] }
    }>(`${config.public.apiUrl}/chat/voice-token${sessionQuery.value}`)

    if (!configRes.success || !configRes.data?.apiKey) {
      throw new Error('Failed to get voice config')
    }

    const { apiKey, model, systemPrompt, greetingMessage, tools } = configRes.data

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
      idleCheckInterval = setInterval(() => {
        if (!websocket || websocket.readyState !== WebSocket.OPEN) return
        if (state.value !== 'listening') return
        
        const idleTime = Date.now() - lastActivityAt
        if (idleTime > 60000 && !hasCheckedIn) {
          hasCheckedIn = true
          console.log('[Voice] User is idle for 60s. Sending context cue to AI.')
          
          const contextMsg = {
            clientContent: {
              turns: [{
                role: 'user',
                parts: [{ 
                  text: '[Hệ thống: Khách hàng dường như không có bất kỳ tương tác trên màn hình hay giọng nói nào trong khoảng 1 phút qua. Hãy chủ động lên tiếng hỏi thăm ngắn gọn tự nhiên xem họ còn ở đó không hoặc có cần tư vấn thêm gì không.]' 
                }]
              }],
              turnComplete: true
            }
          }
          websocket.send(JSON.stringify(contextMsg))
        }
      }, 1000)

      // 3. Send full setup config
      const setupMessage = {
        setup: {
          model: `models/${model}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            temperature: 0.2,
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Aoede',
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
      console.log('[Voice] Setup sent with model:', model)
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

        // Handle output audio transcription (what AI actually said)
        if (data.serverContent?.outputTranscription?.text) {
          const transcriptText = data.serverContent.outputTranscription.text.trim()
          if (transcriptText) {
            aiTranscript.value = aiTranscript.value
              ? `${aiTranscript.value} ${transcriptText}`
              : transcriptText
          }
          return
        }

        // Handle input audio transcription (what user actually said)
        if (data.serverContent?.inputTranscription?.text) {
          const transcriptText = data.serverContent.inputTranscription.text.trim()
          if (transcriptText) {
            transcript.value = transcriptText
          }
          return
        }

        // Handle server content (audio response)
        if (data.serverContent) {
          const parts = data.serverContent.modelTurn?.parts || []
          const hasAudioParts = parts.some((part: any) =>
            part.inlineData?.mimeType?.startsWith('audio/')
          )

          if (hasAudioParts && !isStreamingAiResponse) {
            // New model turn starting — reset dedup counters
            resetStreamingResponseTracking({ clearDedup: true })
            isStreamingAiResponse = true
            aiTranscript.value = ''
          }

          if (hasAudioParts) {
            state.value = 'speaking'
          }

          for (const part of parts) {
            // Audio response — use sequential index to avoid replaying
            if (part.inlineData?.mimeType?.startsWith('audio/')) {
              currentTurnAudioIndex++
              state.value = 'speaking'
              const audioBytes = base64ToArrayBuffer(part.inlineData.data)
              scheduleAudioChunk(audioBytes)
            }
          }

          // Check if response is complete
          if (data.serverContent.turnComplete) {
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
                },
              }).catch(() => {})
              
              // Clear after sync so we don't duplicate on tool call boundaries
              transcript.value = ''
              aiTranscript.value = ''
            }
          }

          // Handle interrupted (barge-in)
          if (data.serverContent.interrupted) {
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
      errorMessage.value = 'Lỗi kết nối với AI voice'
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
        errorMessage.value = event.reason
          ? event.reason.substring(0, 80)
          : 'Voice connection closed unexpectedly'
        state.value = 'error'
      }
    }
  } catch (error: any) {
    console.error('[Voice] Start error:', error)
    teardownVoiceSession()
    state.value = 'error'
    errorMessage.value = error.message || 'Không thể bắt đầu cuộc gọi'
  }
}

const openSalesRoute = async (path: string) => {
  try {
    await router.push(path)
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
          },
        }
      )

      const toolData = res.data || {}
      if (call.name === 'search_products' && toolData.products?.length) {
        suggestedProducts.value = toolData.products
        playHappy()
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
  if (!isModelReady.value) return

  switch (animation) {
    case 'wave':
    case 'greeting':
      playGreeting()
      break
    case 'nod':
    case 'agree':
      playNod()
      break
    case 'think':
    case 'thinking':
      playThinking()
      break
    case 'happy':
    case 'excited':
      playHappy()
      break
    case 'goodbye':
    case 'bye':
      playGoodbye()
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
  micProcessorNode.connect(audioContext.destination)
}

/**
 * Audio playback - enqueue and play audio chunks
 */
/**
 * Batch small audio chunks to reduce glitches from tiny buffers.
 * Each chunk from Gemini is very short; playing them individually
 * causes audible clicks between chunks.
 */
const scheduleAudioChunk = (chunk: ArrayBuffer) => {
  pendingAudioChunks.push(chunk)
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
  const totalLength = pendingAudioChunks.reduce((sum, c) => sum + c.byteLength, 0)
  const merged = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of pendingAudioChunks) {
    merged.set(new Uint8Array(chunk), offset)
    offset += chunk.byteLength
  }
  pendingAudioChunks = []
  enqueueAudio(merged.buffer)
}

const enqueueAudio = (audioBuffer: ArrayBuffer) => {
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
  const buffer = audioQueue.shift()!

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
    const float32 = pcm16ToFloat32(buffer)
    const deviceRate = playbackContext.sampleRate
    const resampledData = resampleLinear(float32, 24000, deviceRate)

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
  if (/(thêm vào giỏ|checkout|chốt đơn|mở giỏ)/i.test(normalized)) {
    lastSalesCueAt = now
    playGesture('closing', { mood: 'delighted', cooldownMs: 200, force: true })
    return
  }

  if (/(mình tìm được|gợi ý|rất hợp|phù hợp|ưu tiên mẫu này)/i.test(normalized)) {
    lastSalesCueAt = now
    playGesture('happy', { mood: 'delighted', cooldownMs: 200, force: true })
    return
  }

  if (/(để mình tìm|mình kiểm tra|để mình xem)/i.test(normalized)) {
    lastSalesCueAt = now
    playGesture('think', { mood: 'curious', cooldownMs: 200, force: true })
  }
}

// Watch state changes to trigger Live2D animations
watch(state, (newState, oldState) => {
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
    case 'processing': return 'Đang tìm kiếm...'
    case 'speaking': return 'AURA đang trả lời...'
    case 'error': return errorMessage.value
    default: return 'Sẵn sàng'
  }
})

// Cleanup on unmount
onUnmounted(() => {
  teardownVoiceSession()
  window.removeEventListener('pointermove', resetActivity)
  window.removeEventListener('keydown', resetActivity)
  window.removeEventListener('touchstart', resetActivity)
  window.removeEventListener('wheel', resetActivity)
})

// Auto-start when mounted
onMounted(() => {
  window.addEventListener('pointermove', resetActivity, { passive: true })
  window.addEventListener('keydown', resetActivity, { passive: true })
  window.addEventListener('touchstart', resetActivity, { passive: true })
  window.addEventListener('wheel', resetActivity, { passive: true })

  sessionId.value = getOrCreateSessionId()
  startVoiceSession()
})
</script>

<template>
  <!-- Voice Chat Overlay -->
  <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
    <div class="relative w-full max-w-md mx-4 flex flex-col items-center gap-6 py-8">

      <!-- AURA Brand -->
      <div class="text-center">
        <h2 class="text-2xl font-serif text-white tracking-widest">AURA</h2>
        <p class="text-sm text-white/60 mt-1">AI Stylist Voice Call</p>
      </div>

      <!-- Live2D Model Container -->
      <div
        class="relative flex items-center justify-center"
        @pointermove="onLive2DPointerMove"
        @pointerdown="onLive2DTap"
      >
        <!-- Glow ring based on state -->
        <div
          class="absolute inset-0 rounded-2xl transition-all duration-500"
          :class="{
            'shadow-[0_0_40px_rgba(16,185,129,0.25)]': state === 'listening',
            'shadow-[0_0_40px_rgba(59,130,246,0.25)]': state === 'speaking',
            'shadow-[0_0_40px_rgba(245,158,11,0.25)]': state === 'processing',
          }"
        />

        <!-- Live2D Canvas -->
        <canvas
          ref="live2dCanvas"
          width="440"
          height="520"
          class="rounded-2xl border-2 transition-all duration-300 bg-gradient-to-b from-neutral-900/50 to-neutral-800/50"
          :class="{
            'border-white/10 opacity-40': state === 'connecting' || state === 'idle',
            'border-emerald-400/40': state === 'listening',
            'border-blue-400/40': state === 'speaking',
            'border-amber-400/40': state === 'processing',
            'border-red-400/40': state === 'error',
          }"
        />

        <!-- Loading overlay -->
        <div
          v-if="state === 'connecting' || isModelLoading"
          class="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/40"
        >
          <svg class="w-10 h-10 text-white/60 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p class="text-white/50 text-xs mt-3">Đang kết nối...</p>
        </div>

        <!-- Error overlay — small badge at bottom, not covering the face -->
        <div
          v-if="state === 'error'"
          class="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-400/30 backdrop-blur-sm"
        >
          <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span class="text-red-300 text-[11px] font-medium">Lỗi kết nối</span>
        </div>

        <!-- State indicator badge -->
        <div
          v-if="state === 'listening' || state === 'speaking'"
          class="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium backdrop-blur-sm"
          :class="{
            'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30': state === 'listening',
            'bg-blue-500/20 text-blue-300 border border-blue-400/30': state === 'speaking',
          }"
        >
          <span
            class="w-1.5 h-1.5 rounded-full animate-pulse"
            :class="{
              'bg-emerald-400': state === 'listening',
              'bg-blue-400': state === 'speaking',
            }"
          />
          {{ state === 'listening' ? 'Đang nghe...' : 'Đang trả lời...' }}
        </div>
      </div>

      <!-- State Label -->
      <p class="text-white/80 text-sm tracking-wide">{{ stateLabel }}</p>

      <!-- AI transcript (shows what AI is saying) -->
      <div
        v-if="aiTranscript"
        class="max-w-xs text-center text-white/50 text-xs leading-relaxed max-h-20 overflow-y-auto px-4"
      >
        {{ aiTranscript }}
      </div>

      <!-- Suggested Products -->
      <div
        v-if="suggestedProducts.length"
        class="w-full max-w-sm px-4"
      >
        <p class="text-white/40 text-xs text-center mb-2">Sản phẩm gợi ý</p>
        <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <article
            v-for="(p, i) in suggestedProducts.slice(0, 4)"
            :key="i"
            class="flex-shrink-0 w-40 bg-white/10 hover:bg-white/15 rounded-lg p-3 transition-colors border border-white/10"
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
                {{ v.size }}
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

      <!-- Controls -->
      <div class="flex items-center gap-6">
        <!-- End Call button -->
        <button
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

      <!-- Hint -->
      <p class="text-white/30 text-xs">
        Nói bất cứ điều gì để bắt đầu tư vấn
      </p>
    </div>
  </div>
</template>
