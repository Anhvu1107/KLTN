<script setup lang="ts">
const props = defineProps<{
  modelUrl: string
}>()

const canvas = ref<HTMLCanvasElement | null>(null)

const {
  isLoading,
  isModelReady,
  handlePointerMove,
  handleTap,
} = useLive2D(canvas, {
  modelUrl: computed(() => props.modelUrl),
})
</script>

<template>
  <div
    class="relative w-full h-full touch-none"
    @pointermove="handlePointerMove"
    @pointerdown="handleTap"
  >
    <canvas
      ref="canvas"
      class="w-full h-full bg-transparent transition-opacity duration-300"
      :class="isModelReady ? 'opacity-100' : 'opacity-0'"
    />

    <div
      v-if="isLoading"
      class="absolute inset-0 flex items-center justify-center bg-transparent"
    >
      <div class="w-6 h-6 rounded-full border-2 border-neutral-200 border-t-neutral-700 bg-white/75 shadow-sm animate-spin" />
    </div>

    <div
      v-else-if="!isModelReady"
      class="absolute inset-0 bg-transparent"
    />
  </div>
</template>
