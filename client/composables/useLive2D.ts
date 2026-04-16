/**
 * useLive2D Composable
 * Manages Live2D model lifecycle, LipSync, motions, expressions, and mouse tracking.
 */
import { toValue } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { DEFAULT_LIVE2D_MODEL_URL } from '~/utils/voice-config'
import {
  buildCommonLive2DBehaviorProfile,
  loadLive2DModelDefinition,
  type CommonGesture,
  type CommonLive2DBehaviorProfile,
  type CommonMood,
} from '~/utils/live2d-common'

type UseLive2DOptions = {
  modelUrl?: MaybeRefOrGetter<string | null | undefined>
}

/**
 * Keep Live2D asset URLs same-origin so Nuxt route rules can proxy `/uploads/**`
 * in both dev and production without triggering cross-origin texture loads.
 */
function resolveModelUrl(url: string): string {
  return url
}

export function useLive2D(
  canvasRef: Ref<HTMLCanvasElement | null>,
  options: UseLive2DOptions = {},
) {
  const isModelReady = ref(false)
  const isLoading = ref(true)
  const behaviorProfile = ref<CommonLive2DBehaviorProfile>(buildCommonLive2DBehaviorProfile())
  const resolvedModelUrl = computed(() => resolveModelUrl(toValue(options.modelUrl) || DEFAULT_LIVE2D_MODEL_URL))

  let app: any = null
  let model: any = null
  let isUnmounted = false
  let activeModelUrl = ''
  let initToken = 0

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

  const destroyCurrentModel = () => {
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
    isModelReady.value = false
  }

  /**
   * Initialize PixiJS Application + load the selected Live2D model.
   */
  const init = async ({ force = false } = {}) => {
    if (isUnmounted) return

    const canvas = canvasRef.value
    const modelUrl = resolvedModelUrl.value

    if (!canvas || !modelUrl) {
      isLoading.value = false
      return
    }

    if (!force && isModelReady.value && activeModelUrl === modelUrl) {
      return
    }

    const token = ++initToken
    isLoading.value = true
    destroyCurrentModel()
    const modelDefinitionPromise = loadLive2DModelDefinition(modelUrl)

    // Wait for Cubism Core to be available.
    let retries = 0
    while (!(window as any).Live2DCubismCore && retries < 50) {
      await new Promise(resolve => setTimeout(resolve, 100))
      if (isUnmounted || token !== initToken) return
      retries++
    }

    if (!(window as any).Live2DCubismCore) {
      console.error('[Live2D] Cubism Core not loaded after timeout')
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

      app = new PIXI.Application({
        view: canvas,
        backgroundAlpha: 0,
        autoStart: true,
        width: canvas.clientWidth || 320,
        height: canvas.clientHeight || 400,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true,
      })

      if (isUnmounted || token !== initToken) {
        destroyCurrentModel()
        return
      }

      console.log('[Live2D] Loading model:', modelUrl)
      model = await Live2DModel.from(modelUrl, {
        autoInteract: false,
        motionPreload: MotionPreloadStrategy.ALL,
      })

      if (isUnmounted || token !== initToken) {
        destroyCurrentModel()
        return
      }

      const screenW = app.renderer.screen.width
      const screenH = app.renderer.screen.height
      const scale = (screenH / model.internalModel.height) * 1.8

      model.scale.set(scale)
      model.x = (screenW - model.internalModel.width * scale) / 2
      model.y = screenH * 0.05

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
      activeModelUrl = modelUrl
      isModelReady.value = true
      isLoading.value = false

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
        }
      }, 500)
    } catch (error) {
      console.error('[Live2D] Init error:', error)
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
  }

  const playRandomMotion = (priority = 3) => {
    const primaryGroup = behaviorProfile.value.primaryGestureGroup
    const count = behaviorProfile.value.primaryGestureMotionCount
    if (!model || primaryGroup === undefined || primaryGroup === null || count === 0) return

    const index = Math.floor(Math.random() * count)
    playMotion(primaryGroup, index, priority)
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
    playMotion(group, index, 1)
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
    app.renderer.resize(canvas.clientWidth, canvas.clientHeight)

    const screenW = app.renderer.screen.width
    const screenH = app.renderer.screen.height
    const scale = (screenH / model.internalModel.height) * 1.8

    model.scale.set(scale)
    model.x = (screenW - model.internalModel.width * scale) / 2
    model.y = screenH * 0.05
  }

  const destroy = () => {
    isUnmounted = true
    destroyCurrentModel()
  }

  watch(
    resolvedModelUrl,
    (nextUrl, previousUrl) => {
      if (!import.meta.client || isUnmounted) return
      if (nextUrl === previousUrl && isModelReady.value) return

      nextTick(() => init({ force: true }))
    },
  )

  onMounted(() => {
    nextTick(() => init())
  })

  onUnmounted(() => {
    destroy()
  })

  return {
    isModelReady,
    isLoading,
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
