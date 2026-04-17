/**
 * useLive2D Composable
 * Manages Live2D model lifecycle, LipSync, motions, expressions, and mouse tracking.
 */
import { toValue } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { DEFAULT_LIVE2D_MODEL_URL } from '~/utils/voice-config'
import { resolveLive2DAssetUrl } from '~/utils/live2d-assets'
import { ensureLive2DCubismCoreLoaded } from '~/utils/live2d-loader'
import { computeLive2DLayout, detectLive2DEdgeContact, getLive2DRenderBounds } from '~/utils/live2d-layout'
import {
  buildCommonLive2DBehaviorProfile,
  loadLive2DModelDefinition,
  type CommonGesture,
  type CommonLive2DBehaviorProfile,
  type CommonMood,
} from '~/utils/live2d-common'

type UseLive2DOptions = {
  modelUrl?: MaybeRefOrGetter<string | null | undefined>
  fallbackModelUrl?: MaybeRefOrGetter<string | null | undefined>
  fitMode?: MaybeRefOrGetter<'contain' | 'mascot'>
  live2dScale?: MaybeRefOrGetter<number>
  live2dOffsetY?: MaybeRefOrGetter<number>
}

function resolveModelUrl(url: string): string {
  return resolveLive2DAssetUrl(url) || url
}

export function useLive2D(
  canvasRef: Ref<HTMLCanvasElement | null>,
  options: UseLive2DOptions = {},
) {
  const isModelReady = ref(false)
  const hasVisibleFrame = ref(false)
  const isLoading = ref(true)
  const errorMessage = ref('')
  const behaviorProfile = ref<CommonLive2DBehaviorProfile>(buildCommonLive2DBehaviorProfile())
  const resolvedModelUrl = computed(() => resolveModelUrl(toValue(options.modelUrl) || DEFAULT_LIVE2D_MODEL_URL))
  const resolvedFallbackModelUrl = computed(() =>
    resolveModelUrl(toValue(options.fallbackModelUrl) || DEFAULT_LIVE2D_MODEL_URL),
  )
  const resolvedFitMode = computed(() => toValue(options.fitMode) || 'contain')
  const resolvedLive2DScale = computed(() => {
    const scale = Number(toValue(options.live2dScale) ?? 1)
    return Number.isFinite(scale) ? scale : 1
  })
  const resolvedLive2DOffsetY = computed(() => {
    const offsetY = Number(toValue(options.live2dOffsetY) ?? 0)
    return Number.isFinite(offsetY) ? offsetY : 0
  })

  let app: any = null
  let model: any = null
  let isUnmounted = false
  let activeModelUrl = ''
  let initToken = 0
  let resizeObserver: ResizeObserver | null = null
  let idleMotionTimer: ReturnType<typeof setTimeout> | null = null
  let autoFitScaleFactor = 1

  // Track current lipsync target level; applied every frame via beforeModelUpdate.
  let currentLipLevel = 0
  let lastGestureAt = 0
  let lastGestureKey = ''
  let resolvedLipSyncParamId: string | false | null = null

  const resetBehaviorProfile = () => {
    behaviorProfile.value = buildCommonLive2DBehaviorProfile()
    resolvedLipSyncParamId = null
    lastGestureAt = 0
    lastGestureKey = ''
  }

  const clearIdleMotionLoop = () => {
    if (!idleMotionTimer) return
    clearTimeout(idleMotionTimer)
    idleMotionTimer = null
  }

  const destroyCurrentModel = () => {
    clearIdleMotionLoop()

    if (model) {
      try {
        model.destroy()
      } catch {
        // Ignore model destroy errors during teardown.
      }
      model = null
    }

    if (app) {
      try {
        app.destroy(false, { children: true })
      } catch {
        // Ignore renderer teardown errors.
      }
      app = null
    }

    resetBehaviorProfile()
    autoFitScaleFactor = 1
    activeModelUrl = ''
    isModelReady.value = false
    hasVisibleFrame.value = false
  }

  const disconnectResizeObserver = () => {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
  }

  const scheduleIdleMotionLoop = (delayMs = 6500) => {
    clearIdleMotionLoop()
    if (isUnmounted || !model || !isModelReady.value) return

    idleMotionTimer = setTimeout(() => {
      idleMotionTimer = null
      if (isUnmounted || !model || !isModelReady.value) return

      playIdle()
      scheduleIdleMotionLoop(7000 + Math.floor(Math.random() * 4500))
    }, delayMs)
  }

  const getCanvasDisplaySize = (canvas: HTMLCanvasElement) => {
    const parent = canvas.parentElement
    const width = Math.max(
      canvas.clientWidth || parent?.clientWidth || Number(canvas.getAttribute('width')) || 320,
      1,
    )
    const height = Math.max(
      canvas.clientHeight || parent?.clientHeight || Number(canvas.getAttribute('height')) || 400,
      1,
    )

    return { width, height }
  }

  const layoutModel = () => {
    if (!model || !app) return

    const screenW = Math.max(app.renderer.screen.width || canvasRef.value?.clientWidth || 320, 1)
    const screenH = Math.max(app.renderer.screen.height || canvasRef.value?.clientHeight || 400, 1)
    const bounds = getLive2DRenderBounds(model)
    const layout = computeLive2DLayout({
      viewportWidth: screenW,
      viewportHeight: screenH,
      bounds,
      fitMode: resolvedFitMode.value,
      customScale: resolvedLive2DScale.value * autoFitScaleFactor,
      customOffsetY: resolvedLive2DOffsetY.value,
    })

    model.scale.set(layout.scale)
    model.x = layout.x
    model.y = layout.y
  }

  const waitFrames = async (count = 1) => {
    for (let i = 0; i < count; i++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    }
  }

  const pixelsContainModel = (pixels: Uint8Array) => {
    let meaningfulPixels = 0
    const stride = 16 * 4

    for (let i = 0; i < pixels.length; i += stride) {
      const red = pixels[i] || 0
      const green = pixels[i + 1] || 0
      const blue = pixels[i + 2] || 0
      const alpha = pixels[i + 3] || 0
      const isAlmostWhite = red > 246 && green > 246 && blue > 246

      if (alpha > 24 && !isAlmostWhite) {
        meaningfulPixels++
        if (meaningfulPixels > 24) return true
      }
    }

    return false
  }

  const rendererTouchesEdge = () => {
    try {
      const pixels = app?.renderer?.plugins?.extract?.pixels?.() as Uint8Array | undefined
      if (!pixels?.length) return false

      const width = Math.max(
        Number(canvasRef.value?.width)
        || Number(app?.renderer?.width)
        || Number(app?.renderer?.screen?.width)
        || 0,
        1,
      )
      const height = Math.max(
        Number(canvasRef.value?.height)
        || Number(app?.renderer?.height)
        || Number(app?.renderer?.screen?.height)
        || 0,
        1,
      )

      return detectLive2DEdgeContact(pixels, width, height)
    } catch {
      return false
    }
  }

  const autoFitModelToViewport = async (token: number, { reset = false } = {}) => {
    if (!app || !model || isUnmounted || token !== initToken) return

    if (reset) {
      autoFitScaleFactor = 1
    }

    for (let pass = 0; pass < 6; pass++) {
      if (!app || !model || isUnmounted || token !== initToken) return

      layoutModel()
      app.render()
      await waitFrames(1)

      if (!rendererTouchesEdge()) {
        break
      }

      autoFitScaleFactor = Math.max(0.4, autoFitScaleFactor * 0.92)
    }

    if (!app || !model || isUnmounted || token !== initToken) return
    layoutModel()
    app.render()
  }

  const verifyVisibleFrame = async (token: number) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await waitFrames(2)
      if (isUnmounted || token !== initToken || !app || !model) return

      layoutModel()
      app.render()

      try {
        const pixels = app.renderer.plugins?.extract?.pixels?.()
        if (!pixels || pixelsContainModel(pixels)) {
          hasVisibleFrame.value = true
          return
        }
      } catch {
        // If the browser blocks pixel extraction, trust the loaded model.
        hasVisibleFrame.value = true
        return
      }
    }

    if (!isUnmounted && token === initToken) {
      hasVisibleFrame.value = true
      errorMessage.value = ''
    }
  }

  const observeCanvasResize = () => {
    if (!import.meta.client) return

    disconnectResizeObserver()
    if (!canvasRef.value || typeof ResizeObserver === 'undefined') return

    resizeObserver = new ResizeObserver(() => {
      resize()
      if (!isUnmounted && model && app) {
        void autoFitModelToViewport(initToken, { reset: false })
      }
    })
    resizeObserver.observe(canvasRef.value)
  }

  /**
   * Initialize PixiJS Application + load the selected Live2D model.
   */
  const init = async ({
    force = false,
    candidateModelUrl,
    allowFallback = true,
  }: {
    force?: boolean
    candidateModelUrl?: string
    allowFallback?: boolean
  } = {}) => {
    if (isUnmounted) return

    const canvas = canvasRef.value
    const modelUrl = candidateModelUrl || resolvedModelUrl.value

    if (!canvas || !modelUrl) {
      errorMessage.value = 'Missing Live2D canvas or model URL'
      isLoading.value = false
      return
    }

    if (!force && isModelReady.value && activeModelUrl === modelUrl) {
      return
    }

    const token = ++initToken
    isLoading.value = true
    errorMessage.value = ''
    destroyCurrentModel()
    const modelDefinitionPromise = loadLive2DModelDefinition(modelUrl)

    const hasCore = await ensureLive2DCubismCoreLoaded()
    if (isUnmounted || token !== initToken) return

    if (!hasCore) {
      console.error('[Live2D] Cubism Core not loaded after timeout')
      errorMessage.value = 'Live2D Cubism Core failed to load'
      isLoading.value = false
      return
    }

    try {
      const PIXI = await import('pixi.js')
      if (isUnmounted || token !== initToken) return

      // Expose PIXI globally; required by pixi-live2d-display.
      ;(window as any).PIXI = PIXI

      const { Live2DModel, MotionPreloadStrategy } = await import('pixi-live2d-display/cubism4')
      if (isUnmounted || token !== initToken) return

      const canvasSize = getCanvasDisplaySize(canvas)

      app = new PIXI.Application({
        view: canvas,
        backgroundColor: 0x000000,
        backgroundAlpha: 0,
        clearBeforeRender: true,
        useContextAlpha: true,
        premultipliedAlpha: true,
        autoStart: true,
        width: canvasSize.width,
        height: canvasSize.height,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true,
      })

      canvas.style.background = 'transparent'
      const renderer = app.renderer as any
      renderer.backgroundAlpha = 0
      renderer.backgroundColor = 0x000000

      if (isUnmounted || token !== initToken) {
        destroyCurrentModel()
        return
      }

      console.log('[Live2D] Loading model:', modelUrl)
      model = await Live2DModel.from(modelUrl, {
        autoInteract: false,
        motionPreload: MotionPreloadStrategy.NONE,
      })

      if (isUnmounted || token !== initToken) {
        destroyCurrentModel()
        return
      }

      model.internalModel.on('beforeModelUpdate', () => {
        if (!model?.internalModel?.coreModel) return

        if (resolvedLipSyncParamId === false) return

        const lipSyncParamCandidates = resolvedLipSyncParamId
          ? [resolvedLipSyncParamId]
          : behaviorProfile.value.lipSyncParamIds

        for (const paramId of lipSyncParamCandidates) {
          try {
            model.internalModel.coreModel.setParameterValueById(paramId, currentLipLevel)
            resolvedLipSyncParamId = paramId
            return
          } catch {
            // Probe until we find the mouth parameter that this model actually uses.
          }
        }

        resolvedLipSyncParamId = false
      })

      app.stage.addChild(model)
      autoFitScaleFactor = 1
      await autoFitModelToViewport(token, { reset: true })
      activeModelUrl = modelUrl
      isModelReady.value = true
      isLoading.value = false
      hasVisibleFrame.value = false
      errorMessage.value = ''
      observeCanvasResize()
      verifyVisibleFrame(token)

      const motionMgr = model.internalModel.motionManager
      const runtimeMotionDefinitions = motionMgr?.definitions || {}
      const modelDefinition = await modelDefinitionPromise
      if (isUnmounted || token !== initToken) {
        destroyCurrentModel()
        return
      }

      behaviorProfile.value = buildCommonLive2DBehaviorProfile({
        modelDefinition,
        runtimeMotionDefinitions,
      })
      resolvedLipSyncParamId = null

      const availableGroups = Object.keys(runtimeMotionDefinitions)
      console.log('[Live2D] Motion groups:', availableGroups)
      console.log('[Live2D] Behavior profile:', {
        idleGroup: behaviorProfile.value.idleGroup,
        idleMotionCount: behaviorProfile.value.idleMotionCount,
        primaryGestureGroup: behaviorProfile.value.primaryGestureGroup,
        primaryGestureMotionCount: behaviorProfile.value.primaryGestureMotionCount,
        lipSyncParamIds: behaviorProfile.value.lipSyncParamIds,
        expressionByMood: behaviorProfile.value.expressionByMood,
      })

      setTimeout(() => {
        if (!isUnmounted && token === initToken) {
          playIdle()
          scheduleIdleMotionLoop()
        }
      }, 500)
    } catch (error) {
      console.error('[Live2D] Init error:', error)
      errorMessage.value = error instanceof Error ? error.message : String(error)
      if (
        allowFallback
        && modelUrl !== resolvedFallbackModelUrl.value
        && resolvedFallbackModelUrl.value
      ) {
        console.warn('[Live2D] Falling back to default model:', resolvedFallbackModelUrl.value)
        await init({
          force: true,
          candidateModelUrl: resolvedFallbackModelUrl.value,
          allowFallback: false,
        })
        return
      }

      isLoading.value = false
    }
  }

  /**
   * LipSync - set mouth open level (0.0 to 1.0).
   */
  const setLipSync = (level: number) => {
    currentLipLevel = Math.max(0, Math.min(1, level))
  }

  const setMood = (mood: CommonMood | string = 'neutral') => {
    const normalizedMood = (mood in behaviorProfile.value.expressionByMood ? mood : 'neutral') as CommonMood
    const expressionName = behaviorProfile.value.expressionByMood[normalizedMood]
      || behaviorProfile.value.expressionByMood.neutral

    if (!expressionName) return
    setExpressionByName(expressionName)
  }

  /**
   * Play a motion by group and index.
   */
  const playMotion = async (group: string, index = 0, priority = 3) => {
    if (!model?.internalModel?.motionManager) return

    try {
      const motionManager = model.internalModel.motionManager
      const success = await motionManager.startMotion(group, index, priority)
      console.log(`[Live2D] Motion group='${group}', index=${index}, priority=${priority} -> ${success}`)
    } catch (error) {
      console.warn('[Live2D] Motion error:', error)
    }
  }

  const pickGestureIndex = (gesture: string, candidates: number[]) => {
    if (!candidates.length) return 0
    if (candidates.length === 1) return candidates[0]

    const pool = candidates.filter(index => `${gesture}:${index}` !== lastGestureKey)
    const selected = pool[Math.floor(Math.random() * pool.length)] ?? candidates[0]
    lastGestureKey = `${gesture}:${selected}`
    return selected
  }

  const playGesture = (
    gesture: CommonGesture | string,
    options: { priority?: number; cooldownMs?: number; mood?: string; force?: boolean } = {},
  ) => {
    if (!model) return

    const now = Date.now()
    const cooldownMs = options.cooldownMs ?? 900
    if (!options.force && now - lastGestureAt < cooldownMs) {
      if (options.mood) {
        setMood(options.mood)
      }
      return
    }

    lastGestureAt = now

    if (options.mood) {
      setMood(options.mood)
    }

    const semanticGesture = (gesture in behaviorProfile.value.gestureMap ? gesture : 'subtleTalk') as CommonGesture
    const plan = behaviorProfile.value.gestureMap[semanticGesture]
      || behaviorProfile.value.gestureMap.subtleTalk

    if (!plan || plan.group === undefined || plan.group === null || !plan.indexes.length) return

    const rawIndex = pickGestureIndex(semanticGesture, plan.indexes)
    playMotion(plan.group, rawIndex, options.priority ?? 3)
    scheduleIdleMotionLoop(8500)
  }

  const playRandomMotion = (priority = 3) => {
    const primaryGroup = behaviorProfile.value.primaryGestureGroup
    const count = behaviorProfile.value.primaryGestureMotionCount
    if (!model || primaryGroup === undefined || primaryGroup === null || count === 0) return

    const index = Math.floor(Math.random() * count)
    playMotion(primaryGroup, index, priority)
    scheduleIdleMotionLoop(8500)
  }

  const playIdle = () => {
    const idleGroup = behaviorProfile.value.idleGroup
    const idleCount = behaviorProfile.value.idleMotionCount
    const fallbackGroup = behaviorProfile.value.primaryGestureGroup
    const fallbackCount = behaviorProfile.value.primaryGestureMotionCount
    const group = idleCount > 0 ? idleGroup : fallbackGroup
    const count = idleCount > 0 ? idleCount : fallbackCount

    if (!model || group === undefined || group === null || count === 0) return

    const index = Math.floor(Math.random() * count)
    setMood('soft')
    playMotion(group, index, 2)
  }

  const playGreeting = () => {
    playGesture('greeting', { mood: 'smile', priority: 3, cooldownMs: 200, force: true })
  }

  const playNod = () => {
    playGesture('nod', { mood: 'soft', priority: 3, cooldownMs: 250, force: true })
  }

  const playThinking = () => {
    playGesture('think', { mood: 'curious', priority: 3, cooldownMs: 400, force: true })
  }

  const playHappy = () => {
    playGesture('happy', { mood: 'delighted', priority: 3, cooldownMs: 250, force: true })
  }

  const playGoodbye = () => {
    playGesture('goodbye', { mood: 'smile', priority: 3, cooldownMs: 250, force: true })
  }

  const playMotionByNumber = (num: number) => {
    const primaryGroup = behaviorProfile.value.primaryGestureGroup
    const count = behaviorProfile.value.primaryGestureMotionCount
    if (num < 1 || primaryGroup === undefined || primaryGroup === null || count === 0) return

    const index = (num - 1) % count
    playMotion(primaryGroup, index, 3)
    scheduleIdleMotionLoop(8500)
  }

  const setExpression = (index: number) => {
    if (!model) return

    try {
      model.expression(index)
    } catch (error) {
      console.warn('[Live2D] Expression error:', error)
    }
  }

  const setExpressionByName = (name: string) => {
    if (!model || !name) return

    try {
      model.expression(name)
    } catch (error) {
      console.warn('[Live2D] Expression error:', error)
    }
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (!model || !canvasRef.value) return

    const rect = canvasRef.value.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height

    model.focus(x * 2 - 1, y * 2 - 1)
  }

  const handleTap = (event: PointerEvent) => {
    if (!model || !canvasRef.value) return

    const rect = canvasRef.value.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    model.tap(x, y)
  }

  const resize = () => {
    if (!model || !canvasRef.value || !app) return

    const canvas = canvasRef.value
    const canvasSize = getCanvasDisplaySize(canvas)
    app.renderer.resize(canvasSize.width, canvasSize.height)
    layoutModel()
  }

  const destroy = () => {
    isUnmounted = true
    disconnectResizeObserver()
    destroyCurrentModel()
  }

  watch(
    [resolvedModelUrl, resolvedFallbackModelUrl],
    ([nextUrl, nextFallbackUrl], [previousUrl, previousFallbackUrl]) => {
      if (!import.meta.client || isUnmounted) return
      if (
        nextUrl === previousUrl
        && nextFallbackUrl === previousFallbackUrl
        && isModelReady.value
      ) return

      nextTick(() => init({ force: true }))
    },
  )

  watch(
    [resolvedFitMode, resolvedLive2DScale, resolvedLive2DOffsetY],
    () => {
      if (!import.meta.client || isUnmounted) return
      nextTick(() => {
        resize()
        if (model && app) {
          void autoFitModelToViewport(initToken, { reset: true })
          return
        }

        app?.render?.()
      })
    },
    { flush: 'post' },
  )

  onMounted(() => {
    nextTick(() => init())
  })

  onUnmounted(() => {
    destroy()
  })

  return {
    isModelReady,
    hasVisibleFrame,
    isLoading,
    errorMessage,
    behaviorProfile,
    setLipSync,
    setMood,
    playMotion,
    playGesture,
    playRandomMotion,
    playIdle,
    playGreeting,
    playNod,
    playThinking,
    playHappy,
    playGoodbye,
    playMotionByNumber,
    setExpression,
    setExpressionByName,
    handlePointerMove,
    handleTap,
    resize,
    destroy,
  }
}
