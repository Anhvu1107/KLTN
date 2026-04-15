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

onMounted(async () => {
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
    }>(`${config.public.apiUrl}/chat/voice-token`)

    const nextModelUrl = res?.data?.voiceSettings?.live2dModelUrl
      || res?.voiceSettings?.live2dModelUrl

    if (nextModelUrl) {
      configuredModelUrl.value = nextModelUrl
    }
  } catch {
    // Fallback to default on error
  }
})

const {
  isModelReady,
  isLoading,
  playIdle,
  playGreeting,
  playMotionByNumber,
  handlePointerMove,
  handleTap,
} = useLive2D(mascotCanvas, { modelUrl: configuredModelUrl })

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
    class="fixed bottom-4 right-4 z-50 group cursor-pointer"
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
      <!-- Canvas -->
      <canvas
        ref="mascotCanvas"
        width="320"
        height="448"
        class="w-full h-full rounded-2xl"
        :class="{
          'opacity-0': isLoading,
          'opacity-100': !isLoading,
        }"
        style="transition: opacity 0.5s ease-in;"
      />

      <!-- Loading placeholder -->
      <div
        v-if="isLoading"
        class="absolute inset-0 flex items-center justify-center rounded-2xl bg-neutral-900/80 border border-white/10"
      >
        <div class="w-6 h-6 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
      </div>

      <!-- Chat prompt badge -->
      <div
        class="absolute -top-4 -left-6 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 whitespace-nowrap shadow-lg"
        :class="{
          'bg-aura-black text-white scale-100': !isHovered,
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
