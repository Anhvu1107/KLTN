<script setup lang="ts">
const props = defineProps<{
  modelUrl: string
  fitMode?: 'contain' | 'mascot'
  live2dScale?: number
  live2dOffsetY?: number
  width?: number
  height?: number
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
const canvasWidth = computed(() => props.width || 224)
const canvasHeight = computed(() => props.height || 320)

const {
  isLoading,
  isModelReady,
  hasVisibleFrame,
  handlePointerMove,
  handleTap,
} = useLive2D(canvas, {
  modelUrl: computed(() => props.modelUrl),
  fitMode: computed(() => props.fitMode || 'contain'),
  live2dScale: computed(() => props.live2dScale ?? 1.0),
  live2dOffsetY: computed(() => props.live2dOffsetY ?? 0),
})
</script>

<template>
  <div
    class="relative w-full h-full touch-none"
    @pointermove="handlePointerMove"
    @pointerdown="handleTap"
  >
    <Live2DSnapshot
      v-if="!isModelReady"
      :key="`preview-static-${props.modelUrl}-${props.fitMode || 'contain'}-${props.live2dScale ?? 1}-${props.live2dOffsetY ?? 0}`"
      :model-url="props.modelUrl"
      :width="canvasWidth"
      :height="canvasHeight"
      :fit-mode="props.fitMode || 'contain'"
      :live2d-scale="props.live2dScale ?? 1"
      :live2d-offset-y="props.live2dOffsetY ?? 0"
      class="absolute inset-0 z-0 h-full w-full bg-transparent"
    />

    <canvas
      ref="canvas"
      :width="canvasWidth"
      :height="canvasHeight"
      class="relative z-10 w-full h-full bg-transparent transition-opacity duration-300"
      :class="isModelReady || hasVisibleFrame ? 'opacity-100' : 'opacity-0'"
    />

    <div
      v-if="isLoading && !isModelReady"
      class="absolute inset-0 z-20 flex items-center justify-center bg-transparent"
    >
      <div class="w-6 h-6 rounded-full border-2 border-neutral-200 border-t-neutral-700 bg-white/75 shadow-sm animate-spin" />
    </div>

    <div
      v-else-if="!isModelReady"
      class="absolute inset-0 z-20 bg-transparent"
    />
  </div>
</template>
