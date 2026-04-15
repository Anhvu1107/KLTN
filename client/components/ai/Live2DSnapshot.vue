<script setup lang="ts">
/**
 * Live2DSnapshot
 * Renders a Live2D model in a hidden canvas, captures a snapshot,
 * and displays it as a static image.
 *
 * Uses a global sequential queue so only ONE model renders at a time
 * (browsers limit simultaneous WebGL contexts).
 * Caches results in sessionStorage for instant subsequent loads.
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

/** Resolve /uploads/... URLs to the backend server origin */
const resolvedUrl = computed(() => {
  const url = props.modelUrl
  if (url.startsWith('/uploads/')) {
    const config = useRuntimeConfig()
    const backendOrigin = (config.public.apiUrl as string).replace(/\/api\/v\d+\/?$/, '')
    return `${backendOrigin}${url}`
  }
  return url
})

// ---------------------------------------------------------------------------
// Global sequential render queue (shared across all instances)
// ---------------------------------------------------------------------------
const QUEUE_KEY = '__live2d_snapshot_queue__'

function getQueue(): Array<() => Promise<void>> {
  if (!(window as any)[QUEUE_KEY]) {
    (window as any)[QUEUE_KEY] = []
    ;(window as any)[`${QUEUE_KEY}_running`] = false
  }
  return (window as any)[QUEUE_KEY]
}

async function processQueue() {
  if ((window as any)[`${QUEUE_KEY}_running`]) return
  ;(window as any)[`${QUEUE_KEY}_running`] = true

  const queue = getQueue()
  while (queue.length > 0) {
    const task = queue.shift()!
    await task()
    // Small gap between renders to let GPU breathe
    await new Promise(r => setTimeout(r, 100))
  }

  ;(window as any)[`${QUEUE_KEY}_running`] = false
}

function enqueueRender(task: () => Promise<void>) {
  getQueue().push(task)
  processQueue()
}

// ---------------------------------------------------------------------------
// Core render logic
// ---------------------------------------------------------------------------
const doRender = async () => {
  // Check sessionStorage cache first
  try {
    const cached = sessionStorage.getItem(cacheKey.value)
    if (cached) {
      snapshotUrl.value = cached
      return
    }
  } catch { /* sessionStorage may be unavailable */ }

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

    // Create a temporary DOM-attached canvas (required for WebGL)
    const canvas = document.createElement('canvas')
    const dpr = window.devicePixelRatio || 1
    const sz = canvasSize.value * dpr
    canvas.width = sz
    canvas.height = sz
    canvas.style.cssText = 'position:fixed;top:-9999px;left:-9999px;pointer-events:none;opacity:0;'
    document.body.appendChild(canvas)

    const app = new PIXI.Application({
      view: canvas,
      backgroundAlpha: 0,
      width: sz,
      height: sz,
      resolution: 1,
      antialias: true,
    })

    const model = await Live2DModel.from(resolvedUrl.value, {
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

    // Wait for model to fully render
    await new Promise(r => setTimeout(r, 500))
    app.render()

    // Capture canvas to data URL
    const dataUrl = canvas.toDataURL('image/png')
    snapshotUrl.value = dataUrl

    // Cache in sessionStorage
    try {
      sessionStorage.setItem(cacheKey.value, dataUrl)
    } catch { /* quota exceeded */ }

    // Cleanup
    model.destroy()
    app.destroy(true, { children: true })
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
  } catch (err) {
    console.warn('[Live2DSnapshot] Failed to render:', props.modelUrl, err)
    hasError.value = true
  } finally {
    isRendering.value = false
  }
}

onMounted(() => {
  if (!import.meta.client) return

  // Check cache synchronously first (instant display)
  try {
    const cached = sessionStorage.getItem(cacheKey.value)
    if (cached) {
      snapshotUrl.value = cached
      return
    }
  } catch { /* ignore */ }

  // Enqueue for sequential rendering
  isRendering.value = true
  enqueueRender(doRender)
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
    <div v-else-if="isRendering" class="w-full h-full flex items-center justify-center bg-neutral-100 rounded">
      <div class="flex flex-col items-center gap-1.5">
        <div class="w-5 h-5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
        <span class="text-[9px] text-neutral-400">Đang tải...</span>
      </div>
    </div>

    <!-- Error / fallback -->
    <div v-else-if="hasError" class="w-full h-full flex items-center justify-center bg-neutral-50 text-neutral-400 rounded">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  </div>
</template>
