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

const SNAPSHOT_CACHE_VERSION = 'v3'

const canvasSize = computed(() => props.size || 200)
const snapshotUrl = ref<string | null>(null)
const isRendering = ref(false)
const hasError = ref(false)
const shouldUseLivePreview = computed(() => props.modelUrl.startsWith('/uploads/'))

const resolvedUrl = computed(() => {
  return props.modelUrl
})

const cacheKey = computed(() => `${SNAPSHOT_CACHE_VERSION}:live2d_snap_${resolvedUrl.value}`)

// ---------------------------------------------------------------------------
// Global sequential render queue (shared across all instances)
// ---------------------------------------------------------------------------
const QUEUE_KEY = '__live2d_snapshot_queue__'
let latestRequestId = 0

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

const waitFrames = async (count = 2) => {
  for (let i = 0; i < count; i++) {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  }
}

const readCachedSnapshot = (key: string) => {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

const writeCachedSnapshot = (key: string, value: string) => {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // Ignore quota / storage errors.
  }
}

// ---------------------------------------------------------------------------
// Core render logic
// ---------------------------------------------------------------------------
type RenderRequest = {
  requestId: number
  cacheKey: string
  modelUrl: string
  resolvedUrl: string
  size: number
}

const doRender = async (request: RenderRequest) => {
  if (request.requestId !== latestRequestId) return

  isRendering.value = true
  hasError.value = false

  let canvas: HTMLCanvasElement | null = null
  let app: any = null

  try {
    // Wait for Cubism Core
    let retries = 0
    while (!(window as any).Live2DCubismCore && retries < 40) {
      await new Promise(r => setTimeout(r, 150))
      if (request.requestId !== latestRequestId) return
      retries++
    }

    if (!(window as any).Live2DCubismCore) {
      hasError.value = true
      return
    }

    const PIXI = await import('pixi.js')
    if (request.requestId !== latestRequestId) return
    ;(window as any).PIXI = PIXI

    const { Live2DModel } = await import('pixi-live2d-display/cubism4')
    if (request.requestId !== latestRequestId) return

    // Create a temporary DOM-attached canvas (required for WebGL)
    canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:fixed;top:-9999px;left:-9999px;pointer-events:none;opacity:0;'
    canvas.style.width = `${request.size}px`
    canvas.style.height = `${request.size}px`
    document.body.appendChild(canvas)

    app = new PIXI.Application({
      view: canvas,
      backgroundAlpha: 0,
      autoStart: false,
      width: request.size,
      height: request.size,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
      preserveDrawingBuffer: true,
    })

    const model = await Live2DModel.from(request.resolvedUrl, {
      autoInteract: false,
    })
    if (request.requestId !== latestRequestId) return

    const screenW = Math.max(app.renderer.screen.width || request.size, 1)
    const screenH = Math.max(app.renderer.screen.height || request.size, 1)
    const modelW = Math.max(Number(model.internalModel?.width) || Number(model.width) || 1, 1)
    const modelH = Math.max(Number(model.internalModel?.height) || Number(model.height) || 1, 1)
    const scale = Math.min((screenW * 0.84) / modelW, (screenH * 0.84) / modelH)

    model.scale.set(scale)
    if (model.anchor?.set) {
      model.anchor.set(0.5, 0.5)
      model.x = screenW / 2
      model.y = screenH / 2
    } else {
      model.x = (screenW - modelW * scale) / 2
      model.y = (screenH - modelH * scale) / 2
    }

    app.stage.addChild(model)

    // Give WebGL one full paint cycle before reading the canvas buffer.
    await waitFrames(2)
    app.render()
    await waitFrames(1)

    // Capture canvas to data URL
    const dataUrl = canvas.toDataURL('image/png')
    if (request.requestId !== latestRequestId) return

    snapshotUrl.value = dataUrl
    hasError.value = false

    // Cache in sessionStorage
    writeCachedSnapshot(request.cacheKey, dataUrl)
  } catch (err) {
    if (request.requestId !== latestRequestId) return
    console.warn('[Live2DSnapshot] Failed to render:', request.modelUrl, err)
    hasError.value = true
    snapshotUrl.value = null
  } finally {
    try {
      app?.destroy(true, { children: true })
    } catch {
      // Ignore renderer teardown errors.
    }

    if (canvas?.parentNode) {
      canvas.parentNode.removeChild(canvas)
    }

    if (request.requestId === latestRequestId) {
      isRendering.value = false
    }
  }
}

const requestRender = () => {
  if (!import.meta.client || !props.modelUrl) return

  if (shouldUseLivePreview.value) {
    snapshotUrl.value = null
    hasError.value = false
    isRendering.value = false
    return
  }

  const request: RenderRequest = {
    requestId: ++latestRequestId,
    cacheKey: cacheKey.value,
    modelUrl: props.modelUrl,
    resolvedUrl: resolvedUrl.value,
    size: canvasSize.value,
  }

  const cached = readCachedSnapshot(request.cacheKey)
  if (cached) {
    snapshotUrl.value = cached
    hasError.value = false
    isRendering.value = false
    return
  }

  snapshotUrl.value = null
  hasError.value = false
  isRendering.value = true

  // Enqueue for sequential rendering
  enqueueRender(() => doRender(request))
}

watch([resolvedUrl, canvasSize], () => {
  requestRender()
})

onMounted(() => {
  if (!import.meta.client) return
  requestRender()
})

onBeforeUnmount(() => {
  latestRequestId++
})
</script>

<template>
  <div class="live2d-snapshot w-full h-full">
    <Live2DCanvasPreview
      v-if="shouldUseLivePreview"
      :key="resolvedUrl"
      :model-url="modelUrl"
      class="w-full h-full"
    />

    <!-- Captured snapshot -->
    <img
      v-if="snapshotUrl"
      :src="snapshotUrl"
      :alt="modelUrl"
      class="w-full h-full object-contain"
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
      <div class="flex flex-col items-center gap-1.5 px-3 text-center">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span class="text-[10px] uppercase tracking-[0.12em]">Preview unavailable</span>
      </div>
    </div>
  </div>
</template>
