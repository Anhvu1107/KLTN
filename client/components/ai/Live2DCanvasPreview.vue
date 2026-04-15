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
      class="w-full h-full transition-opacity duration-300"
      :class="isModelReady ? 'opacity-100' : 'opacity-0'"
    />

    <div
      v-if="isLoading"
      class="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.12),_transparent_58%)]"
    >
      <div class="flex flex-col items-center gap-2 text-white/55">
        <div class="w-6 h-6 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
        <span class="text-[10px] uppercase tracking-[0.2em]">Loading preview</span>
      </div>
    </div>

    <div
      v-else-if="!isModelReady"
      class="absolute inset-0 flex items-center justify-center text-center text-white/40 px-4"
    >
      <span class="text-[11px] uppercase tracking-[0.16em]">Preview unavailable</span>
    </div>
  </div>
</template>
