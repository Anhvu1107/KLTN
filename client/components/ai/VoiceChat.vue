<script setup lang="ts">
/**
 * VoiceChat Component
 * AURA ARCHIVE - Real-time voice conversation with AI stylist
 * Uses Gemini Live API via WebSocket with direct API key
 */

const config = useRuntimeConfig()
const { t } = useI18n()

const emit = defineEmits<{
  close: []
}>()

// Connection states
type VoiceState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error'

const state = ref<VoiceState>('idle')
const errorMessage = ref('')
const transcript = ref('')
const aiTranscript = ref('')
const suggestedProducts = ref<any[]>([])

// Audio refs
let websocket: WebSocket | null = null
let audioContext: AudioContext | null = null
let mediaStream: MediaStream | null = null
let playbackContext: AudioContext | null = null
let audioQueue: ArrayBuffer[] = []
let isPlaying = false

// Waveform animation
const audioLevel = ref(0)
let analyserNode: AnalyserNode | null = null
let animationFrame: number | null = null

/**
 * Start voice session
 */
const startVoiceSession = async () => {
  state.value = 'connecting'
  errorMessage.value = ''
  transcript.value = ''
  aiTranscript.value = ''
  suggestedProducts.value = []

  try {
    // 1. Get voice config from backend (API key + model + system prompt + tools)
    const configRes = await $fetch<{
      success: boolean
      data: { apiKey: string; model: string; systemPrompt: string; tools: any[] }
    }>(`${config.public.apiUrl}/chat/voice-token`)

    if (!configRes.success || !configRes.data?.apiKey) {
      throw new Error('Failed to get voice config')
    }

    const { apiKey, model, systemPrompt, tools } = configRes.data

    // 2. Connect to Gemini Live API via WebSocket (direct API key)
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`
    websocket = new WebSocket(wsUrl)

    websocket.onopen = async () => {
      console.log('[Voice] WebSocket connected')

      // 3. Send full setup config
      const setupMessage = {
        setup: {
          model: `models/${model}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            temperature: 0.3,
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
        },
      }

      websocket!.send(JSON.stringify(setupMessage))
      console.log('[Voice] Setup sent with model:', model)
      // Mic capture starts after setupComplete (see onmessage handler)
    }

    websocket.onmessage = async (event) => {
      try {
        const data = typeof event.data === 'string'
          ? JSON.parse(event.data)
          : JSON.parse(await event.data.text?.() || event.data)

        // Handle setup complete — NOW start mic capture
        if (data.setupComplete) {
          console.log('[Voice] Setup complete — starting mic capture')
          await startMicCapture()
          state.value = 'listening'
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
          const parts = data.serverContent.modelTurn?.parts || []

          for (const part of parts) {
            // Audio response
            if (part.inlineData?.mimeType?.startsWith('audio/')) {
              state.value = 'speaking'
              const audioBytes = base64ToArrayBuffer(part.inlineData.data)
              enqueueAudio(audioBytes)
            }

            // Text transcript of AI response
            if (part.text) {
              aiTranscript.value = part.text
            }
          }

          // Check if response is complete
          if (data.serverContent.turnComplete) {
            console.log('[Voice] Turn complete')
            state.value = 'listening'
          }

          // Handle interrupted (barge-in)
          if (data.serverContent.interrupted) {
            console.log('[Voice] Interrupted by user')
            clearAudioQueue()
            state.value = 'listening'
          }
        }
      } catch (err) {
        console.error('[Voice] Message parse error:', err)
      }
    }

    websocket.onerror = (error) => {
      console.error('[Voice] WebSocket error:', error)
      state.value = 'error'
      errorMessage.value = 'Lỗi kết nối với AI voice'
    }

    websocket.onclose = (event) => {
      console.log('[Voice] WebSocket closed:', event.code, event.reason)
      if (state.value !== 'idle' && state.value !== 'error') {
        if (event.code !== 1000 && event.reason) {
          state.value = 'error'
          errorMessage.value = event.reason.substring(0, 80)
        } else {
          state.value = 'idle'
        }
      }
    }
  } catch (error: any) {
    console.error('[Voice] Start error:', error)
    state.value = 'error'
    errorMessage.value = error.message || 'Không thể bắt đầu cuộc gọi'
  }
}

/**
 * Handle tool calls from Gemini
 */
const handleToolCall = async (toolCall: any) => {
  const calls = toolCall.functionCalls || []
  const responses: any[] = []

  for (const call of calls) {
    try {
      // Handle navigation locally (no backend needed)
      if (call.name === 'navigate_to_product' && call.args?.slug) {
        window.open(`/shop/${call.args.slug}`, '_blank')
        responses.push({
          id: call.id,
          name: call.name,
          response: { success: true, message: `Đã mở trang sản phẩm ${call.args.name || call.args.slug}` },
        })
        continue
      }

      // Forward other tool calls to backend
      const res = await $fetch<{ success: boolean; data: any }>(
        `${config.public.apiUrl}/chat/voice-tool-call`,
        {
          method: 'POST',
          body: {
            toolName: call.name,
            args: call.args || {},
          },
        }
      )

      const toolData = res.data || {}

      // Store products for display
      if (call.name === 'search_products' && toolData.products?.length) {
        suggestedProducts.value = toolData.products
      }

      responses.push({
        id: call.id,
        name: call.name,
        response: toolData,
      })
    } catch (err) {
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
  const source = audioContext.createMediaStreamSource(mediaStream)

  // Setup analyser for waveform visualization
  analyserNode = audioContext.createAnalyser()
  analyserNode.fftSize = 256
  source.connect(analyserNode)
  startWaveformAnimation()

  // Use ScriptProcessor for PCM capture (wider browser support than AudioWorklet)
  const bufferSize = 4096
  const scriptNode = audioContext.createScriptProcessor(bufferSize, 1, 1)

  scriptNode.onaudioprocess = (e) => {
    if (state.value !== 'listening' && state.value !== 'speaking') return
    if (!websocket || websocket.readyState !== WebSocket.OPEN) return

    const inputData = e.inputBuffer.getChannelData(0)

    // Convert float32 to int16
    const pcm16 = new Int16Array(inputData.length)
    for (let i = 0; i < inputData.length; i++) {
      const s = Math.max(-1, Math.min(1, inputData[i]))
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }

    // Send as base64 to Gemini
    const base64 = arrayBufferToBase64(pcm16.buffer)
    const audioMessage = {
      realtimeInput: {
        mediaChunks: [{
          data: base64,
          mimeType: 'audio/pcm;rate=16000',
        }],
      },
    }
    websocket.send(JSON.stringify(audioMessage))
  }

  source.connect(scriptNode)
  scriptNode.connect(audioContext.destination)
}

/**
 * Audio playback - enqueue and play audio chunks
 */
const enqueueAudio = (audioBuffer: ArrayBuffer) => {
  audioQueue.push(audioBuffer)
  if (!isPlaying) {
    playNext()
  }
}

const playNext = async () => {
  if (audioQueue.length === 0) {
    isPlaying = false
    return
  }

  isPlaying = true
  const buffer = audioQueue.shift()!

  try {
    if (!playbackContext) {
      playbackContext = new AudioContext({ sampleRate: 24000 })
    }

    // Gemini returns PCM 24kHz audio
    const float32 = pcm16ToFloat32(buffer)
    const audioBuffer2 = playbackContext.createBuffer(1, float32.length, 24000)
    audioBuffer2.getChannelData(0).set(float32)

    const source = playbackContext.createBufferSource()
    source.buffer = audioBuffer2
    source.connect(playbackContext.destination)
    source.onended = () => playNext()
    source.start()
  } catch (err) {
    console.error('[Voice] Playback error:', err)
    isPlaying = false
    playNext()
  }
}

const clearAudioQueue = () => {
  audioQueue = []
  isPlaying = false
}

/**
 * Waveform animation
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
 * Stop voice session
 */
const stopVoiceSession = () => {
  // Close WebSocket
  if (websocket) {
    websocket.close()
    websocket = null
  }

  // Stop mic
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop())
    mediaStream = null
  }

  // Close audio contexts
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }

  if (playbackContext) {
    playbackContext.close()
    playbackContext = null
  }

  // Stop animation
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }

  analyserNode = null
  clearAudioQueue()
  suggestedProducts.value = []

  state.value = 'idle'
  emit('close')
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

// State label mapping
const stateLabel = computed(() => {
  switch (state.value) {
    case 'connecting': return t('voice.connecting', 'Đang kết nối...')
    case 'listening': return t('voice.listening', 'Đang nghe bạn...')
    case 'processing': return t('voice.processing', 'Đang tìm kiếm...')
    case 'speaking': return t('voice.speaking', 'AURA đang trả lời...')
    case 'error': return errorMessage.value
    default: return t('voice.ready', 'Sẵn sàng')
  }
})

// Cleanup on unmount
onUnmounted(() => {
  stopVoiceSession()
})

// Auto-start when mounted
onMounted(() => {
  startVoiceSession()
})
</script>

<template>
  <!-- Voice Chat Overlay -->
  <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
    <div class="relative w-full max-w-sm mx-4 flex flex-col items-center gap-8 py-12">

      <!-- AURA Brand -->
      <div class="text-center">
        <h2 class="text-2xl font-serif text-white tracking-widest">AURA</h2>
        <p class="text-sm text-white/60 mt-1">AI Stylist Voice Call</p>
      </div>

      <!-- Waveform Circle -->
      <div class="relative flex items-center justify-center">
        <!-- Outer pulse rings -->
        <div
          v-if="state === 'listening' || state === 'speaking'"
          class="absolute w-48 h-48 rounded-full border border-white/20"
          :style="{
            transform: `scale(${1 + audioLevel * 0.3})`,
            transition: 'transform 0.1s ease-out',
          }"
        />
        <div
          v-if="state === 'listening' || state === 'speaking'"
          class="absolute w-40 h-40 rounded-full border border-white/10"
          :style="{
            transform: `scale(${1 + audioLevel * 0.5})`,
            transition: 'transform 0.1s ease-out',
          }"
        />

        <!-- Main circle -->
        <div
          class="w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300"
          :class="{
            'bg-white/10 border-2 border-white/30': state === 'idle',
            'bg-emerald-500/20 border-2 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]': state === 'listening',
            'bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.3)]': state === 'processing',
            'bg-blue-500/20 border-2 border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.3)]': state === 'speaking',
            'bg-white/5 border-2 border-white/20 animate-pulse': state === 'connecting',
            'bg-red-500/20 border-2 border-red-400': state === 'error',
          }"
        >
          <!-- Mic icon (listening) -->
          <svg v-if="state === 'listening'" class="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 10v2a7 7 0 01-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" stroke-width="1.5" />
            <line x1="8" y1="23" x2="16" y2="23" stroke-width="1.5" />
          </svg>

          <!-- Speaker icon (speaking) -->
          <svg v-else-if="state === 'speaking'" class="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8H4a1 1 0 00-1 1v6a1 1 0 001 1h2.5l5 4V4l-5 4z" />
          </svg>

          <!-- Search icon (processing) -->
          <svg v-else-if="state === 'processing'" class="w-12 h-12 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>

          <!-- Connecting spinner -->
          <svg v-else-if="state === 'connecting'" class="w-12 h-12 text-white/60 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>

          <!-- Error icon -->
          <svg v-else-if="state === 'error'" class="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>

          <!-- Idle phone icon -->
          <svg v-else class="w-12 h-12 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
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
          <a
            v-for="(p, i) in suggestedProducts.slice(0, 4)"
            :key="i"
            :href="`/shop/${p.slug}`"
            target="_blank"
            class="flex-shrink-0 w-36 bg-white/10 hover:bg-white/15 rounded-lg p-3 transition-colors border border-white/10"
          >
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
                v-for="v in p.variants.filter((v: any) => v.status === 'Còn hàng').slice(0, 3)"
                :key="v.size"
                class="inline-block text-[9px] bg-white/10 text-white/60 rounded px-1 mr-1"
              >
                {{ v.size }}
              </span>
            </div>
          </a>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex items-center gap-6">
        <!-- End Call button -->
        <button
          @click="stopVoiceSession"
          class="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-lg hover:shadow-red-500/30 hover:scale-105 active:scale-95"
          :aria-label="t('voice.endCall', 'Kết thúc cuộc gọi')"
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
          :aria-label="t('voice.retry', 'Thử lại')"
        >
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <!-- Hint -->
      <p class="text-white/30 text-xs">
        {{ t('voice.hint', 'Nói bất cứ điều gì để bắt đầu tư vấn') }}
      </p>
    </div>
  </div>
</template>
