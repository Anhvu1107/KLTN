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

const toPositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const toFiniteNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const getLive2DRenderBounds = (model: any): Live2DRenderBounds => {
  try {
    const bounds = model?.getLocalBounds?.()
    if (bounds?.width && bounds?.height) {
      return {
        x: toFiniteNumber(bounds.x, 0),
        y: toFiniteNumber(bounds.y, 0),
        width: toPositiveNumber(bounds.width, 1),
        height: toPositiveNumber(bounds.height, 1),
      }
    }
  } catch {
    // Bounds can be unavailable until first render pass.
  }

  return {
    x: 0,
    y: 0,
    width: toPositiveNumber(model?.internalModel?.width ?? model?.width, 1),
    height: toPositiveNumber(model?.internalModel?.height ?? model?.height, 1),
  }
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
