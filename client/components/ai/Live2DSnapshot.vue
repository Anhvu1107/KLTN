<script setup lang="ts">
/**
 * Live2DSnapshot
 * Renders a Live2D model in a hidden canvas, captures a snapshot,
 * and displays it as a static image. Fully automatic – works for
 * any model URL, no manual screenshot step needed.
 *
 * Caches results in sessionStorage so subsequent page loads are instant.
 */

const props = defineProps<{
  modelUrl: string
  size?: number
}>()

const canvasSize = computed(() => props.size || 200)
const snapshotUrl = ref<string | null>(null)
const isRendering = ref(false)
const hasError = ref(false)

const cacheKey = computed(() => `live2d_snap_${props.modelUrl}`)

const renderSnapshot = async () => {
  // Check sessionStorage cache first
  if (import.meta.client) {
    try {
      const cached = sessionStorage.getItem(cacheKey.value)
      if (cached) {
        snapshotUrl.value = cached
        return
      }
    } catch { /* sessionStorage may be unavailable */ }
  }

  isRendering.value = true

  try {
    // Wait for Cubism Core
    let retries = 0
    while (!(window as any).Live2DCubismCore && retries < 40) {
      await new Promise(r => setTimeout(r, 150))
      retries++
    }
    if (!(window as any).Live2DCubismCore) {
      hasError.value = true
      return
    }

    const PIXI = await import('pixi.js')
    ;(window as any).PIXI = PIXI

    const { Live2DModel } = await import('pixi-live2d-display/cubism4')

    // Create offscreen canvas
    const canvas = document.createElement('canvas')
    const sz = canvasSize.value * (window.devicePixelRatio || 1)
    canvas.width = sz
    canvas.height = sz

    const app = new PIXI.Application({
      view: canvas,
      backgroundAlpha: 0,
      width: sz,
      height: sz,
      resolution: 1,
      antialias: true,
    })

    const model = await Live2DModel.from(props.modelUrl, {
      autoInteract: false,
    })

    // Scale model to fit canvas
    const modelH = model.internalModel.height
    const modelW = model.internalModel.width
    const scale = (sz / modelH) * 1.6
    model.scale.set(scale)
    model.x = (sz - modelW * scale) / 2
    model.y = sz * 0.05

    app.stage.addChild(model)

    // Wait a few frames for the model to fully render
    await new Promise(r => setTimeout(r, 300))
    app.render()

    // Capture canvas to data URL
    const dataUrl = canvas.toDataURL('image/png')
    snapshotUrl.value = dataUrl

    // Cache in sessionStorage
    try {
      sessionStorage.setItem(cacheKey.value, dataUrl)
    } catch { /* quota exceeded – still works without cache */ }

    // Cleanup
    model.destroy()
    app.destroy(true, { children: true })
  } catch (err) {
    console.warn('[Live2DSnapshot] Failed to render:', props.modelUrl, err)
    hasError.value = true
  } finally {
    isRendering.value = false
  }
}

onMounted(() => {
  renderSnapshot()
})
</script>

<template>
  <div class="live2d-snapshot" :style="{ width: canvasSize + 'px', height: canvasSize + 'px' }">
    <!-- Captured snapshot -->
    <img
      v-if="snapshotUrl"
      :src="snapshotUrl"
      :alt="modelUrl"
      class="w-full h-full object-cover"
    />

    <!-- Loading state -->
    <div v-else-if="isRendering" class="w-full h-full flex items-center justify-center bg-neutral-100">
      <div class="w-5 h-5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
    </div>

    <!-- Error / fallback -->
    <div v-else-if="hasError" class="w-full h-full flex items-center justify-center bg-neutral-50 text-neutral-400">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
      </svg>
    </div>
  </div>
</template>
