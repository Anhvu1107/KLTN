export type Live2DFitMode = 'contain' | 'mascot'

export type Live2DRenderBounds = {
  x: number
  y: number
  width: number
  height: number
}

const FIT_LIMITS: Record<Live2DFitMode, { maxWidth: number, maxHeight: number }> = {
  contain: { maxWidth: 0.86, maxHeight: 0.88 },
  mascot: { maxWidth: 0.92, maxHeight: 0.92 },
}
const DEFAULT_BOUNDS_PADDING_RATIO = 0.08

const toPositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const toFiniteNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const mergeBounds = (a: Live2DRenderBounds, b: Live2DRenderBounds): Live2DRenderBounds => {
  const minX = Math.min(a.x, b.x)
  const minY = Math.min(a.y, b.y)
  const maxX = Math.max(a.x + a.width, b.x + b.width)
  const maxY = Math.max(a.y + a.height, b.y + b.height)

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  }
}

const applyBoundsPadding = (
  bounds: Live2DRenderBounds,
  paddingRatio = DEFAULT_BOUNDS_PADDING_RATIO,
): Live2DRenderBounds => {
  if (paddingRatio <= 0) return bounds
  const extraWidth = bounds.width * paddingRatio
  const extraHeight = bounds.height * paddingRatio
  return {
    x: bounds.x - (extraWidth / 2),
    y: bounds.y - (extraHeight / 2),
    width: bounds.width + extraWidth,
    height: bounds.height + extraHeight,
  }
}

export const getLive2DRenderBounds = (model: any): Live2DRenderBounds => {
  const internalBounds: Live2DRenderBounds = {
    x: 0,
    y: 0,
    width: toPositiveNumber(model?.internalModel?.width ?? model?.width, 1),
    height: toPositiveNumber(model?.internalModel?.height ?? model?.height, 1),
  }

  try {
    const bounds = model?.getLocalBounds?.()
    if (bounds?.width && bounds?.height) {
      const localBounds: Live2DRenderBounds = {
        x: toFiniteNumber(bounds.x, 0),
        y: toFiniteNumber(bounds.y, 0),
        width: toPositiveNumber(bounds.width, 1),
        height: toPositiveNumber(bounds.height, 1),
      }
      return applyBoundsPadding(mergeBounds(localBounds, internalBounds))
    }
  } catch {
    // Bounds can be unavailable until first render pass.
  }

  return applyBoundsPadding(internalBounds)
}

const isForegroundPixel = (red: number, green: number, blue: number, alpha: number) =>
  alpha > 20 && !(red > 246 && green > 246 && blue > 246)

const edgeHitCount = (
  pixels: Uint8Array,
  width: number,
  height: number,
  region: { x0: number, x1: number, y0: number, y1: number },
) => {
  const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 200))
  let hit = 0
  let sampled = 0

  for (let y = region.y0; y < region.y1; y += sampleStep) {
    for (let x = region.x0; x < region.x1; x += sampleStep) {
      const index = ((y * width) + x) * 4
      if (index + 3 >= pixels.length) continue
      sampled++
      if (isForegroundPixel(pixels[index] || 0, pixels[index + 1] || 0, pixels[index + 2] || 0, pixels[index + 3] || 0)) {
        hit++
      }
    }
  }

  const minThreshold = sampled > 0 ? Math.max(8, Math.floor(sampled * 0.02)) : 8
  return hit >= minThreshold
}

export const detectLive2DEdgeContact = (
  pixels: Uint8Array,
  width: number,
  height: number,
) => {
  const safeWidth = Math.max(Math.floor(width || 0), 0)
  let safeHeight = Math.max(Math.floor(height || 0), 0)
  if (!safeWidth || !safeHeight || pixels.length < 4) return false

  if ((safeWidth * safeHeight * 4) > pixels.length) {
    safeHeight = Math.floor(pixels.length / (safeWidth * 4))
    if (!safeHeight) return false
  }

  const stripX = Math.max(2, Math.floor(safeWidth * 0.03))
  const stripY = Math.max(2, Math.floor(safeHeight * 0.03))

  const topHit = edgeHitCount(pixels, safeWidth, safeHeight, { x0: 0, x1: safeWidth, y0: 0, y1: stripY })
  const bottomHit = edgeHitCount(pixels, safeWidth, safeHeight, {
    x0: 0,
    x1: safeWidth,
    y0: Math.max(safeHeight - stripY, 0),
    y1: safeHeight,
  })
  const leftHit = edgeHitCount(pixels, safeWidth, safeHeight, { x0: 0, x1: stripX, y0: 0, y1: safeHeight })
  const rightHit = edgeHitCount(pixels, safeWidth, safeHeight, {
    x0: Math.max(safeWidth - stripX, 0),
    x1: safeWidth,
    y0: 0,
    y1: safeHeight,
  })

  return topHit || bottomHit || leftHit || rightHit
}

export const computeLive2DLayout = ({
  viewportWidth,
  viewportHeight,
  bounds,
  fitMode = 'contain',
  customScale = 1,
  customOffsetY = 0,
}: {
  viewportWidth: number
  viewportHeight: number
  bounds: Live2DRenderBounds
  fitMode?: Live2DFitMode
  customScale?: number
  customOffsetY?: number
}) => {
  const safeViewportWidth = toPositiveNumber(viewportWidth, 320)
  const safeViewportHeight = toPositiveNumber(viewportHeight, 400)
  const fit = FIT_LIMITS[fitMode]
  const maxWidth = safeViewportWidth * fit.maxWidth
  const maxHeight = safeViewportHeight * fit.maxHeight
  const baseScale = Math.max(
    0.01,
    Math.min(
      maxWidth / Math.max(bounds.width, 1),
      maxHeight / Math.max(bounds.height, 1),
    ),
  )
  const finalScale = baseScale * Math.max(0.01, toFiniteNumber(customScale, 1))
  const targetCenterX = safeViewportWidth / 2
  const targetCenterY = (safeViewportHeight / 2) + toFiniteNumber(customOffsetY, 0)
  const boundsCenterX = bounds.x + (bounds.width / 2)
  const boundsCenterY = bounds.y + (bounds.height / 2)

  return {
    scale: finalScale,
    x: targetCenterX - (boundsCenterX * finalScale),
    y: targetCenterY - (boundsCenterY * finalScale),
  }
}
