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

const mascotCanvas = ref<HTMLCanvasElement | null>(null)
const isHovered = ref(false)

// Fetch admin-configured model URL from voice settings
const config = useRuntimeConfig()
const configuredModelUrl = ref(DEFAULT_LIVE2D_MODEL_URL)

const loadConfiguredModel = async () => {
  try {
    const res = await $fetch<{
      success?: boolean
      data?: {
        voiceSettings?: {
          live2dModelUrl?: string
        }
      }
      voiceSettings?: {
        live2dModelUrl?: string
      }
    }>(`${config.public.apiUrl}/chat/voice-settings?t=${Date.now()}`, {
      cache: 'no-store',
    })

    const nextModelUrl = res?.data?.voiceSettings?.live2dModelUrl
      || res?.voiceSettings?.live2dModelUrl

    if (nextModelUrl) {
      configuredModelUrl.value = nextModelUrl
    }
  } catch {
    // Fallback to default on error
  }
}

onMounted(() => {
  loadConfiguredModel()
  window.addEventListener('focus', loadConfiguredModel)
})

onUnmounted(() => {
  window.removeEventListener('focus', loadConfiguredModel)
})

const {
  isModelReady,
  hasVisibleFrame,
  isLoading,
  playIdle,
  playGreeting,
  playMotionByNumber,
  handlePointerMove,
} = useLive2D(mascotCanvas, {
  modelUrl: configuredModelUrl,
  fallbackModelUrl: DEFAULT_LIVE2D_MODEL_URL,
  fitMode: 'mascot',
})

// Play greeting when model is ready
watch(isModelReady, (ready) => {
  if (ready) {
    playGreeting()
  }
})

// Play random motion on hover
const onMouseEnter = () => {
  isHovered.value = true
  if (isModelReady.value) {
    const randomMotion = Math.ceil(Math.random() * 5) // M01-M05
    playMotionByNumber(randomMotion)
  }
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
      class="relative w-40 h-56 transition-all duration-300"
      :class="{
        'scale-105': isHovered,
      }"
    >
      <div class="live2d-mascot__stage absolute inset-0 overflow-visible bg-transparent">
        <Live2DSnapshot
          :key="`mascot-static-${configuredModelUrl}`"
          :model-url="configuredModelUrl"
          :size="320"
          class="live2d-mascot__snapshot w-full h-full bg-transparent"
        />
      </div>

      <!-- Canvas -->
      <canvas
        ref="mascotCanvas"
        width="320"
        height="448"
        class="live2d-mascot__canvas relative z-10 w-full h-full bg-transparent"
        :class="{
          'opacity-0': isLoading || !hasVisibleFrame,
          'opacity-100': hasVisibleFrame,
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
        class="absolute -top-4 -left-6 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 whitespace-nowrap shadow-lg"
        :class="{
          'border border-neutral-200 bg-white/95 text-neutral-800 scale-100': !isHovered,
          'bg-emerald-500 text-white scale-110': isHovered,
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
