<script setup lang="ts">
/**
 * Live2D Mascot Widget
 * AURA ARCHIVE - Floating Live2D character that replaces the chat button
 * Click to open chat, hover for interaction
 */

import { DEFAULT_LIVE2D_MODEL_URL } from '~/utils/voice-config'

const emit = defineEmits<{
  click: []
}>()

const VOICE_CONFIG_UPDATED_KEY = 'aura_voice_config_updated_at'
const mascotCanvas = ref<HTMLCanvasElement | null>(null)
const isHovered = ref(false)

// Fetch admin-configured model URL from voice settings
const config = useRuntimeConfig()
const configuredModelUrl = ref<string | null>(null)
const live2dScale = ref(1.0)
const live2dOffsetY = ref(0)

const clampVoiceNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

const loadConfiguredModel = async () => {
  try {
    const res = await $fetch<{
      success?: boolean
      data?: {
        voiceSettings?: {
          live2dModelUrl?: string
          live2dScale?: number | string
          live2dOffsetY?: number | string
        }
      }
      voiceSettings?: {
        live2dModelUrl?: string
        live2dScale?: number | string
        live2dOffsetY?: number | string
      }
    }>(`${config.public.apiUrl}/chat/voice-settings?t=${Date.now()}`, {
      cache: 'no-store',
    })

    const settings = res?.data?.voiceSettings || res?.voiceSettings

    const nextModelUrl = settings?.live2dModelUrl
    if (nextModelUrl) {
      configuredModelUrl.value = nextModelUrl
    } else {
      configuredModelUrl.value = DEFAULT_LIVE2D_MODEL_URL
    }

    live2dScale.value = clampVoiceNumber(settings?.live2dScale, 0.1, 5, 1)
    live2dOffsetY.value = clampVoiceNumber(settings?.live2dOffsetY, -1000, 1000, 0)
  } catch {
    // Fallback to default on error
    configuredModelUrl.value = DEFAULT_LIVE2D_MODEL_URL
  }
}

onMounted(() => {
  loadConfiguredModel()
  window.addEventListener('focus', loadConfiguredModel)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('storage', handleVoiceConfigStorage)
})

onUnmounted(() => {
  window.removeEventListener('focus', loadConfiguredModel)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('storage', handleVoiceConfigStorage)
})

const handleVisibilityChange = () => {
  if (!document.hidden) {
    loadConfiguredModel()
  }
}

const handleVoiceConfigStorage = (event: StorageEvent) => {
  if (event.key !== VOICE_CONFIG_UPDATED_KEY) return
  loadConfiguredModel()
}

const {
  isModelReady,
  hasVisibleFrame,
  isLoading,
  playIdle,
  playGreeting,
  playRandomMotion,
  handlePointerMove,
} = useLive2D(mascotCanvas, {
  modelUrl: configuredModelUrl,
  fallbackModelUrl: DEFAULT_LIVE2D_MODEL_URL,
  fitMode: 'mascot',
  live2dScale,
  live2dOffsetY,
})

// Play greeting when model is ready
watch(isModelReady, (ready) => {
  if (ready) {
    setTimeout(() => playGreeting(), 180)
  }
})

// Use real model motions on hover; framing is still controlled by the shared layout.
const onMouseEnter = () => {
  isHovered.value = true
  if (isModelReady.value) playRandomMotion()
}

const onMouseLeave = () => {
  isHovered.value = false
  if (isModelReady.value) {
    playIdle()
  }
}

const onClick = () => {
  emit('click')
}
</script>

<template>
  <div
    class="live2d-mascot fixed bottom-4 right-4 z-50 group cursor-pointer"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @click="onClick"
    @pointermove="handlePointerMove"
  >
    <!-- Mascot container -->
    <div
      class="relative w-56 h-80 transition-all duration-300"
      :class="{
        'drop-shadow-[0_10px_24px_rgba(16,185,129,0.24)]': isHovered,
      }"
    >
      <div class="live2d-mascot__stage absolute inset-0 overflow-hidden bg-transparent">
        <Live2DSnapshot
          v-if="!isModelReady && configuredModelUrl"
          :key="`mascot-static-${configuredModelUrl}-${live2dScale}-${live2dOffsetY}`"
          :model-url="configuredModelUrl"
          :width="224"
          :height="320"
          fit-mode="mascot"
          :live2d-scale="live2dScale"
          :live2d-offset-y="live2dOffsetY"
          class="live2d-mascot__snapshot w-full h-full bg-transparent"
        />
      </div>

      <!-- Canvas -->
      <canvas
        ref="mascotCanvas"
        width="224"
        height="320"
        class="live2d-mascot__canvas relative z-10 w-full h-full bg-transparent"
        :class="{
          'opacity-0': isLoading || !(isModelReady || hasVisibleFrame),
          'opacity-100': !isLoading && (isModelReady || hasVisibleFrame),
        }"
        style="transition: opacity 0.5s ease-in;"
      />

      <!-- Loading placeholder -->
      <div
        v-if="isLoading"
        class="absolute inset-0 flex items-center justify-center rounded-2xl bg-transparent"
      >
        <div class="w-6 h-6 rounded-full border-2 border-neutral-200 border-t-neutral-700 bg-white/80 shadow-sm animate-spin" />
      </div>

      <!-- Chat prompt badge -->
      <div
        class="absolute -top-11 left-1/2 z-20 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 whitespace-nowrap shadow-lg"
        :class="{
          'border border-neutral-200 bg-white/95 text-neutral-800': !isHovered,
          'bg-emerald-500 text-white': isHovered,
        }"
      >
        {{ isHovered ? 'Tư vấn ngay! ✨' : 'Chào bạn 👋' }}
      </div>

      <!-- Pulse indicator -->
      <div class="absolute -top-1 -right-1 w-3 h-3">
        <span class="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
        <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.live2d-mascot,
.live2d-mascot__stage,
.live2d-mascot__snapshot,
.live2d-mascot__canvas,
.live2d-mascot__stage :deep(.live2d-snapshot),
.live2d-mascot__stage :deep(.live2d-snapshot img),
.live2d-mascot__stage :deep(canvas) {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

.live2d-mascot__canvas {
  background-color: transparent !important;
}
</style>
