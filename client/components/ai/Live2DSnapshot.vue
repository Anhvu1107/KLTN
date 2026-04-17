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

import { ensureLive2DCubismCoreLoaded } from '~/utils/live2d-loader'
import { resolveLive2DAssetUrl } from '~/utils/live2d-assets'
import { computeLive2DLayout, getLive2DRenderBounds } from '~/utils/live2d-layout'
import { patchPixiWebGL } from '~/utils/pixi-webgl-patch'

const props = defineProps<{
  modelUrl: string
  size?: number
  width?: number
  height?: number
  fitMode?: 'contain' | 'mascot'
  live2dScale?: number
  live2dOffsetY?: number
}>()

const SNAPSHOT_CACHE_VERSION = 'v10-shared-layout'

const canvasWidth = computed(() => props.width || props.size || 200)
const canvasHeight = computed(() => props.height || props.size || 200)
const snapshotFitMode = computed(() => props.fitMode || 'contain')
const snapshotScale = computed(() => {
  const scale = Number(props.live2dScale ?? 1)
  return Number.isFinite(scale) ? scale : 1
})
const snapshotOffsetY = computed(() => {
  const offsetY = Number(props.live2dOffsetY ?? 0)
  return Number.isFinite(offsetY) ? offsetY : 0
})
const snapshotUrl = ref<string | null>(null)
const isRendering = ref(false)
const hasError = ref(false)

const resolvedUrl = computed(() => {
  return resolveLive2DAssetUrl(props.modelUrl) || props.modelUrl
})

const cacheKey = computed(() =>
  [
    SNAPSHOT_CACHE_VERSION,
    'live2d_snap',
    resolvedUrl.value,
    canvasWidth.value,
    canvasHeight.value,
    snapshotFitMode.value,
    snapshotScale.value,
    snapshotOffsetY.value,
  ].join(':'),
)

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
    const cached = sessionStorage.getItem(key)
    // A valid base64 PNG data URL should be significantly longer than 'data:,'
    if (cached && cached.length > 50 && cached.startsWith('data:image/')) {
      return cached
    }
    return null
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

const isEdgeBackgroundPixel = (
  data: Uint8ClampedArray,
  index: number,
  bg: { red: number, green: number, blue: number },
) => {
  const red = data[index] || 0
  const green = data[index + 1] || 0
  const blue = data[index + 2] || 0
  const alpha = data[index + 3] || 0

  if (alpha <= 8) return true

  const dr = red - bg.red
  const dg = green - bg.green
  const db = blue - bg.blue
  const distance = Math.sqrt((dr * dr) + (dg * dg) + (db * db))
  const isDarkNeutral = red < 58 && green < 58 && blue < 58 && Math.abs(red - green) < 16 && Math.abs(green - blue) < 16

  return distance < 48 || isDarkNeutral
}

const captureTransparentSnapshot = (source: HTMLCanvasElement) => {
  const width = Math.max(source.width, 1)
  const height = Math.max(source.height, 1)
  const output = document.createElement('canvas')
  output.width = width
  output.height = height

  const context = output.getContext('2d', { willReadFrequently: true })
  if (!context) return source.toDataURL('image/png')

  context.clearRect(0, 0, width, height)
  context.drawImage(source, 0, 0)

  const image = context.getImageData(0, 0, width, height)
  const { data } = image
  const bg = {
    red: data[0] || 0,
    green: data[1] || 0,
    blue: data[2] || 0,
  }

  if ((data[3] || 0) <= 8) {
    return output.toDataURL('image/png')
  }

  const visited = new Uint8Array(width * height)
  const stack: number[] = []
  const enqueue = (pixelIndex: number) => {
    if (visited[pixelIndex]) return
    const dataIndex = pixelIndex * 4
    if (!isEdgeBackgroundPixel(data, dataIndex, bg)) return
    visited[pixelIndex] = 1
    stack.push(pixelIndex)
  }

  for (let x = 0; x < width; x++) {
    enqueue(x)
    enqueue((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    enqueue(y * width)
    enqueue(y * width + (width - 1))
  }

  while (stack.length > 0) {
    const pixelIndex = stack.pop()!
    const x = pixelIndex % width
    const y = Math.floor(pixelIndex / width)

    if (x > 0) enqueue(pixelIndex - 1)
    if (x < width - 1) enqueue(pixelIndex + 1)
    if (y > 0) enqueue(pixelIndex - width)
    if (y < height - 1) enqueue(pixelIndex + width)
  }

  for (let pixelIndex = 0; pixelIndex < visited.length; pixelIndex++) {
    if (!visited[pixelIndex]) continue
    const dataIndex = pixelIndex * 4
    data[dataIndex] = 0
    data[dataIndex + 1] = 0
    data[dataIndex + 2] = 0
    data[dataIndex + 3] = 0
  }

  context.putImageData(image, 0, 0)
  return output.toDataURL('image/png')
}

// ---------------------------------------------------------------------------
// Core render logic
// ---------------------------------------------------------------------------
type RenderRequest = {
  requestId: number
  cacheKey: string
  modelUrl: string
  resolvedUrl: string
  width: number
  height: number
  fitMode: 'contain' | 'mascot'
  live2dScale: number
  live2dOffsetY: number
}

const doRender = async (request: RenderRequest) => {
  if (request.requestId !== latestRequestId) return

  isRendering.value = true
  hasError.value = false

  let canvas: HTMLCanvasElement | null = null
  let app: any = null
  let snapshotModel: any = null

  try {
    const hasCore = await ensureLive2DCubismCoreLoaded()
    if (request.requestId !== latestRequestId) return

    if (!hasCore) {
      hasError.value = true
      return
    }

    const PIXI = await import('pixi.js')
    if (request.requestId !== latestRequestId) return
    ;(window as any).PIXI = PIXI

    // Patch PixiJS to prevent checkMaxIfStatementsInShader crash
    patchPixiWebGL(PIXI)

    const { Live2DModel, MotionPreloadStrategy } = await import('pixi-live2d-display/cubism4')
    if (request.requestId !== latestRequestId) return

    // Create a temporary DOM-attached canvas (required for WebGL)
    canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:fixed;top:-9999px;left:-9999px;pointer-events:none;opacity:0;background:transparent;'
    canvas.style.width = `${request.width}px`
    canvas.style.height = `${request.height}px`
    document.body.appendChild(canvas)

    app = new PIXI.Application({
      view: canvas,
      backgroundColor: 0xffffff,
      backgroundAlpha: 0,
      autoStart: false,
      clearBeforeRender: true,
      useContextAlpha: 'notMultiplied',
      premultipliedAlpha: false,
      width: request.width,
      height: request.height,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
      preserveDrawingBuffer: true,
    })
    const renderer = app.renderer as any
    renderer.backgroundAlpha = 0
    renderer.backgroundColor = 0xffffff

    const model = await Live2DModel.from(request.resolvedUrl, {
      autoInteract: false,
      motionPreload: MotionPreloadStrategy.NONE,
    })
    snapshotModel = model
    if (request.requestId !== latestRequestId) return

    app.stage.addChild(model)

    const applyLayout = (scaleFactor = 1) => {
      const screenW = Math.max(app.renderer.screen.width || request.width, 1)
      const screenH = Math.max(app.renderer.screen.height || request.height, 1)
      const bounds = getLive2DRenderBounds(model)
      const layout = computeLive2DLayout({
        viewportWidth: screenW,
        viewportHeight: screenH,
        bounds,
        fitMode: request.fitMode,
        customScale: request.live2dScale * scaleFactor,
        customOffsetY: request.live2dOffsetY,
      })

      model.scale.set(layout.scale)
      model.x = layout.x
      model.y = layout.y
    }

    applyLayout(1)

    // Give WebGL one full paint cycle before reading the canvas buffer.
    await waitFrames(2)
    app.render()
    await waitFrames(1)

    // Capture canvas to data URL
    const dataUrl = captureTransparentSnapshot(canvas)
    if (request.requestId !== latestRequestId) return

    if (!dataUrl || dataUrl.length < 50 || !dataUrl.startsWith('data:image/')) {
      throw new Error('Captured snapshot data URL is invalid or empty')
    }

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
      snapshotModel?.destroy?.({ children: true, texture: false, baseTexture: false })
    } catch {
      // Keep shared textures alive; other Live2D canvases may use the same model.
    }

    try {
      app?.destroy(false, { children: false, texture: false, baseTexture: false })
    } catch {
      // Ignore renderer teardown errors.
    }

    if (canvas?.parentNode) {
      canvas.parentNode.removeChild(canvas)
    }

    // Give the browser time to reclaim the WebGL context
    // before the mascot's useLive2D tries to create a new one
    await new Promise(r => setTimeout(r, 150))

    if (request.requestId === latestRequestId) {
      isRendering.value = false
    }
  }
}

const requestRender = () => {
  if (!import.meta.client || !props.modelUrl) return

  const request: RenderRequest = {
    requestId: ++latestRequestId,
    cacheKey: cacheKey.value,
    modelUrl: props.modelUrl,
    resolvedUrl: resolvedUrl.value,
    width: canvasWidth.value,
    height: canvasHeight.value,
    fitMode: snapshotFitMode.value,
    live2dScale: snapshotScale.value,
    live2dOffsetY: snapshotOffsetY.value,
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

watch([resolvedUrl, canvasWidth, canvasHeight, snapshotFitMode, snapshotScale, snapshotOffsetY], () => {
  requestRender()
})

onMounted(() => {
  if (!import.meta.client) return
  requestRender()
})

const handleImageError = () => {
  console.warn('[Live2D] Snapshot image failed to decode, clearing corrupt cache')
  hasError.value = true
  snapshotUrl.value = ''
  try {
    sessionStorage.removeItem(cacheKey.value)
  } catch {}
}

onBeforeUnmount(() => {
  latestRequestId++
})
</script>

<template>
  <div class="live2d-snapshot w-full h-full bg-transparent">
    <img
      v-if="snapshotUrl"
      :src="snapshotUrl"
      :alt="modelUrl"
      class="w-full h-full object-contain"
      @error="handleImageError"
    />

    <!-- Loading state -->
    <div v-else-if="isRendering" class="w-full h-full flex items-center justify-center bg-transparent">
      <div class="w-5 h-5 border-2 border-neutral-200 border-t-neutral-700 rounded-full bg-white/75 shadow-sm animate-spin" />
    </div>

    <!-- Error / fallback -->
    <div v-else-if="hasError" class="w-full h-full bg-transparent" />
  </div>
</template>
