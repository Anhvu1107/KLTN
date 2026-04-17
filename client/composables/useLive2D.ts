/**
 * useLive2D Composable
 * Manages Live2D model lifecycle, LipSync, motions, expressions, and mouse tracking.
 */
import { toValue } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { DEFAULT_LIVE2D_MODEL_URL } from '~/utils/voice-config'
import { resolveLive2DAssetUrl } from '~/utils/live2d-assets'
import { ensureLive2DCubismCoreLoaded } from '~/utils/live2d-loader'
import { computeLive2DLayout, getLive2DRenderBounds } from '~/utils/live2d-layout'
import { patchPixiWebGL, waitForWebGLContext } from '~/utils/pixi-webgl-patch'
import {
  buildCommonLive2DBehaviorProfile,
  loadLive2DMotionCatalog,
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
  const resolvedModelUrl = computed(() => {
    const rawUrl = toValue(options.modelUrl)
    return rawUrl === null ? null : resolveModelUrl(rawUrl || DEFAULT_LIVE2D_MODEL_URL)
  })
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
  let baseModelX = 0
  let baseModelY = 0
  let ambientPhase = Math.random() * Math.PI * 2
  let ambientTicker: ((delta: number) => void) | null = null
  let suspendAmbientMotion = false

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

  const removeAmbientTicker = () => {
    if (!app || !ambientTicker) return
    try {
      app.ticker?.remove?.(ambientTicker)
    } catch {
      // Ignore ticker teardown errors.
    }
    ambientTicker = null
  }

  const applyAmbientTransform = () => {
    if (!model || !app) return

    if (suspendAmbientMotion) {
      model.x = baseModelX
      model.y = baseModelY
      return
    }

    const screenHeight = Math.max(Number(app?.renderer?.screen?.height) || 400, 1)
    
    // Significantly increased amplitudes so subtle models (like Miku) still look actively floating and alive
    const amplitudeY = Math.min(Math.max(screenHeight * 0.012, 4.0), 8.0) 
    const amplitudeX = amplitudeY * 0.35
    const offsetY = Math.sin(ambientPhase) * amplitudeY
    const offsetX = Math.sin(ambientPhase * 0.62) * amplitudeX

    model.x = baseModelX + offsetX
    model.y = baseModelY + offsetY
  }

  const attachAmbientTicker = () => {
    if (!app || ambientTicker) return

    let lastFocusChangeAt = 0

    ambientTicker = (delta = 1) => {
      if (!model || isUnmounted || !isModelReady.value) return

      ambientPhase += 0.015 * Math.max(delta, 0.5)
      applyAmbientTransform()

      // Dynamically make the model look around every 2-4 seconds to look alive on touch devices
      const now = Date.now()
      if (now - lastFocusChangeAt > 3000) {
        if (Math.random() > 0.4) {
          const rx = (Math.random() * 2 - 1) * 300 // Simulate X tracking
          const ry = (Math.random() * 2 - 1) * 300 // Simulate Y tracking
          model.focus(rx, ry)
        } else {
          model.focus(0, 0) // Look forward
        }
        lastFocusChangeAt = now + Math.random() * 2000
      }
    }

    app.ticker?.add?.(ambientTicker)
  }

  const destroyCurrentModel = () => {
    clearIdleMotionLoop()
    removeAmbientTicker()

    if (model) {
      if (app && app.stage) {
        try {
          app.stage.removeChild(model)
        } catch {}
      }
      try {
        model.destroy({ children: true, texture: false, baseTexture: false })
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
    baseModelX = 0
    baseModelY = 0
    ambientPhase = Math.random() * Math.PI * 2
    suspendAmbientMotion = false
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

    // Fallback timer: in case motionFinish fails to fire or playIdle returns false
    idleMotionTimer = setTimeout(() => {
      idleMotionTimer = null
      if (isUnmounted || !model || !isModelReady.value) return
      playIdle()
    }, delayMs)
  }

  const triggerNextIdle = () => {
    // Only schedule the next idle if we are not destroyed
    if (isUnmounted || !isModelReady.value) return
    // Clear any fallback timers
    clearIdleMotionLoop()
    idleMotionTimer = setTimeout(() => {
      idleMotionTimer = null
      if (isUnmounted || !model || !isModelReady.value) return
      playIdle()
    }, 1000) // 1 second gap between natural idle loops
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
      customScale: resolvedLive2DScale.value,
      customOffsetY: resolvedLive2DOffsetY.value,
    })

    model.scale.set(layout.scale)
    baseModelX = layout.x
    baseModelY = layout.y
    applyAmbientTransform()
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

      // Patch PixiJS to prevent checkMaxIfStatementsInShader crash
      // when WebGL context returns 0 for MAX_TEXTURE_IMAGE_UNITS
      patchPixiWebGL(PIXI)

      const { Live2DModel, MotionPreloadStrategy } = await import('pixi-live2d-display/cubism4')
      if (isUnmounted || token !== initToken) return

      // Wait for WebGL context to be truly ready (prevents crash on context-limited devices)
      const webglReady = await waitForWebGLContext(8, 400)
      if (!webglReady) {
        console.warn('[Live2D] WebGL context not ready after retries, proceeding anyway')
      }
      if (isUnmounted || token !== initToken) return

      const canvasSize = getCanvasDisplaySize(canvas)

      const localApp = new PIXI.Application({
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
      const renderer = localApp.renderer as any
      renderer.backgroundAlpha = 0
      renderer.backgroundColor = 0x000000

      if (isUnmounted || token !== initToken) {
        try { localApp?.destroy(true, { children: true }) } catch {}
        return
      }

      app = localApp

      console.log('[Live2D] Loading model:', modelUrl)
      const loadedModel: any = await Live2DModel.from(modelUrl, {
        autoInteract: false,
        motionPreload: MotionPreloadStrategy.IDLE,
      })

      if (isUnmounted || token !== initToken) {
        try { loadedModel?.destroy?.() } catch {}
        return
      }

      model = loadedModel

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
      suspendAmbientMotion = true
      layoutModel()
      app.render()
      suspendAmbientMotion = false
      applyAmbientTransform()

      const motionMgr = model.internalModel.motionManager
      const runtimeMotionDefinitions = motionMgr?.definitions || {}
      const modelDefinition = await modelDefinitionPromise
      if (isUnmounted || token !== initToken) {
        try { loadedModel?.destroy?.() } catch {}
        return
      }
      const motionCatalog = await loadLive2DMotionCatalog(modelUrl, modelDefinition)
      if (isUnmounted || token !== initToken) {
        try { loadedModel?.destroy?.() } catch {}
        return
      }

      behaviorProfile.value = buildCommonLive2DBehaviorProfile({
        modelDefinition,
        runtimeMotionDefinitions,
        motionCatalog,
      })
      resolvedLipSyncParamId = null

      activeModelUrl = modelUrl
      isModelReady.value = true
      hasVisibleFrame.value = true
      attachAmbientTicker()
      isLoading.value = false
      errorMessage.value = ''
      observeCanvasResize()
      verifyVisibleFrame(token)

      const availableGroups = Object.keys(runtimeMotionDefinitions)
      console.log('[Live2D] Motion groups:', availableGroups)
      console.log('[Live2D] Behavior profile:', {
        idleGroup: behaviorProfile.value.idleGroup,
        idleMotionCount: behaviorProfile.value.idleMotionCount,
        primaryGestureGroup: behaviorProfile.value.primaryGestureGroup,
        primaryGestureMotionCount: behaviorProfile.value.primaryGestureMotionCount,
        primaryGestureMotions: behaviorProfile.value.primaryGestureMotions,
        lipSyncParamIds: behaviorProfile.value.lipSyncParamIds,
        expressionByMood: behaviorProfile.value.expressionByMood,
        gestureMap: behaviorProfile.value.gestureMap,
      })

      // Disable native idle loop since we handle it customly to support unclassified groups.
      if (model.internalModel?.motionManager) {
        // Prevent native loop from interfering
        model.internalModel.motionManager.groups.idle = 'DISABLED_NATIVE_IDLE'
        
        // Listen to motion finish to cleanly resume idle looping
        model.internalModel.motionManager.on('motionFinish', () => {
          if (!isUnmounted && isModelReady.value) {
            triggerNextIdle()
          }
        })
      }

      setTimeout(() => {
        if (!isUnmounted && token === initToken) {
          playIdle()
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
  const playMotion = async (group: string, index = 0, priority = 3, retries = 1): Promise<boolean> => {
    if (!model?.internalModel?.motionManager) return false

    try {
      const motionManager = model.internalModel.motionManager
      const success = await motionManager.startMotion(group, index, priority)
      if (!success && retries > 0) {
        // Motion may need to be fetched on-demand; retry after a short delay.
        await new Promise(resolve => setTimeout(resolve, 600))
        if (!isUnmounted && isModelReady.value) {
          return await playMotion(group, index, priority, retries - 1)
        }
        return false
      }
      console.log(`[Live2D] Motion group='${group}', index=${index}, priority=${priority} -> ${success}`)
      return success
    } catch (error) {
      console.warn('[Live2D] Motion error:', error)
      return false
    }
  }

  const pickGestureMotion = (
    gesture: string,
    candidates: Array<{ group: string; index: number }>,
  ) => {
    if (!candidates.length) return null
    if (candidates.length === 1) return candidates[0]

    const pool = candidates.filter(motion => `${gesture}:${motion.group}:${motion.index}` !== lastGestureKey)
    const selected = pool[Math.floor(Math.random() * pool.length)] ?? candidates[0]
    lastGestureKey = `${gesture}:${selected.group}:${selected.index}`
    return selected
  }

  const playGesture = async (
    semanticGesture: CommonGesture,
    options: { mood?: CommonMood, priority?: number, cooldownMs?: number, force?: boolean } = {},
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

    const semanticGesturePlan = (semanticGesture in behaviorProfile.value.gestureMap ? semanticGesture : 'subtleTalk') as CommonGesture
    const plan = behaviorProfile.value.gestureMap[semanticGesturePlan]
      || behaviorProfile.value.gestureMap.subtleTalk

    if (!plan || plan.group === undefined || plan.group === null) {
      await playRandomMotion(options.priority ?? 3)
      return
    }

    const motionCandidates = plan.motions?.length
      ? plan.motions.map(motion => ({ group: motion.group, index: motion.index }))
      : plan.indexes.map(index => ({ group: plan.group, index }))

    if (!motionCandidates.length) {
      await playRandomMotion(options.priority ?? 3)
      return
    }

    const selectedMotion = pickGestureMotion(semanticGesturePlan, motionCandidates)
    if (!selectedMotion) {
      await playRandomMotion(options.priority ?? 3)
      return
    }

    const success = await playMotion(selectedMotion.group, selectedMotion.index, options.priority ?? 3)
    if (success === false) scheduleIdleMotionLoop(5000)
  }

  const playRandomMotion = async (priority = 3) => {
    const semanticMotions = behaviorProfile.value.primaryGestureMotions
    if (model && semanticMotions.length) {
      const motion = semanticMotions[Math.floor(Math.random() * semanticMotions.length)]
      const success = await playMotion(motion.group, motion.index, priority)
      if (success === false) scheduleIdleMotionLoop(5000)
      return
    }

    const primaryGroup = behaviorProfile.value.primaryGestureGroup
    const count = behaviorProfile.value.primaryGestureMotionCount
    if (!model || primaryGroup === undefined || primaryGroup === null || count === 0) return

    const index = Math.floor(Math.random() * count)
    const success = await playMotion(primaryGroup, index, priority)
    if (success === false) scheduleIdleMotionLoop(5000)
  }

  const playIdle = async () => {
    const idleGroup = behaviorProfile.value.idleGroup
    const idleCount = behaviorProfile.value.idleMotionCount
    const fallbackGroup = behaviorProfile.value.primaryGestureGroup
    const fallbackCount = behaviorProfile.value.primaryGestureMotionCount
    const group = idleCount > 0 ? idleGroup : fallbackGroup
    const count = idleCount > 0 ? idleCount : fallbackCount

    if (!model || group === undefined || group === null || count === 0) return false

    // If we're using a large group of unclassified motions ("" group usually has all motions),
    // we should only play index 0 (which is almost always the true idle motion),
    // otherwise the model will spam random talk/action gestures when it should be idle.
    const isUnclassifiedGroup = group === '' && count > 5
    const index = isUnclassifiedGroup ? 0 : Math.floor(Math.random() * count)
    
    setMood('soft')
    const success = await playMotion(group, index, 2)
    
    // If it failed to start, motionFinish won't fire. Set a fallback timer to try again.
    if (success === false) {
      scheduleIdleMotionLoop(5000)
    }
    return success !== false
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

  const playIntroduceProduct = () => {
    playGesture('introduceProduct', { mood: 'delighted', priority: 3, cooldownMs: 250, force: true })
  }

  const playRecommendProduct = () => {
    playGesture('recommendProduct', { mood: 'delighted', priority: 3, cooldownMs: 250, force: true })
  }

  const playGoodbye = () => {
    playGesture('goodbye', { mood: 'smile', priority: 3, cooldownMs: 250, force: true })
  }

  const playSurprised = () => {
    playGesture('surprised', { mood: 'curious', priority: 3, cooldownMs: 250, force: true })
  }

  const playShy = () => {
    playGesture('shy', { mood: 'soft', priority: 3, cooldownMs: 250, force: true })
  }

  const playExcited = () => {
    playGesture('excited', { mood: 'delighted', priority: 3, cooldownMs: 250, force: true })
  }

  const playConfused = () => {
    playGesture('confused', { mood: 'curious', priority: 3, cooldownMs: 300, force: true })
  }

  const playAngry = () => {
    playGesture('angry', { mood: 'serious', priority: 3, cooldownMs: 250, force: true })
  }

  const playSad = () => {
    playGesture('sad', { mood: 'soft', priority: 3, cooldownMs: 300, force: true })
  }

  const playApologize = () => {
    playGesture('apologize', { mood: 'soft', priority: 3, cooldownMs: 250, force: true })
  }

  const playEncourage = () => {
    playGesture('encourage', { mood: 'smile', priority: 3, cooldownMs: 250, force: true })
  }

  const playListen = () => {
    playGesture('listen', { mood: 'soft', priority: 3, cooldownMs: 400, force: true })
  }

  const playAgree = () => {
    playGesture('nod', { mood: 'smile', priority: 3, cooldownMs: 200, force: true })
  }

  const playMotionByNumber = async (num: number) => {
    const primaryGroup = behaviorProfile.value.primaryGestureGroup
    const count = behaviorProfile.value.primaryGestureMotionCount
    if (num < 1 || primaryGroup === undefined || primaryGroup === null || count === 0) return

    const index = (num - 1) % count
    const success = await playMotion(primaryGroup, index, 3)
    if (success === false) scheduleIdleMotionLoop(5000)
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
    if (app) {
      try {
        app.destroy(true, { children: true })
      } catch (e) {
        console.warn('[Live2D] Error destroying PIXI app:', e)
      }
      app = null
    }
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
    playIntroduceProduct,
    playRecommendProduct,
    playGoodbye,
    playSurprised,
    playShy,
    playExcited,
    playConfused,
    playAngry,
    playSad,
    playApologize,
    playEncourage,
    playListen,
    playAgree,
    playMotionByNumber,
    setExpression,
    setExpressionByName,
    handlePointerMove,
    handleTap,
    resize,
    destroy,
  }
}
