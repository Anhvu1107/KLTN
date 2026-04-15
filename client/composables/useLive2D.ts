/**
 * useLive2D Composable
 * Manages Live2D model lifecycle, LipSync, motions, expressions, and mouse tracking.
 */
import { toValue } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { DEFAULT_LIVE2D_MODEL_URL } from '~/utils/voice-config'

// Motion group names matching model3.json
const MOTION_GROUP = {
  DEFAULT: '', // M01-M10 motions
  IDLE: 'Idle', // W01-W02 idle motions
}

const EXPRESSION_BY_MOOD: Record<string, string> = {
  neutral: 'exp_00',
  smile: 'exp_01',
  serious: 'exp_02',
  soft: 'exp_04',
  curious: 'exp_05',
  delighted: 'exp_06',
}

const GESTURE_VARIANTS: Record<string, number[]> = {
  greeting: [4, 5],
  nod: [0, 8],
  think: [2, 9],
  happy: [5, 6],
  closing: [0, 5],
  goodbye: [7, 4],
  subtleTalk: [1, 8],
}

type UseLive2DOptions = {
  modelUrl?: MaybeRefOrGetter<string | null | undefined>
}

export function useLive2D(
  canvasRef: Ref<HTMLCanvasElement | null>,
  options: UseLive2DOptions = {},
) {
  const isModelReady = ref(false)
  const isLoading = ref(true)
  const resolvedModelUrl = computed(() => toValue(options.modelUrl) || DEFAULT_LIVE2D_MODEL_URL)

  let app: any = null
  let model: any = null
  let isUnmounted = false
  let activeModelUrl = ''
  let initToken = 0

  // Track current lipsync target level; applied every frame via beforeModelUpdate.
  let currentLipLevel = 0
  let lastGestureAt = 0
  let lastGestureKey = ''

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

        try {
          model.internalModel.coreModel.setParameterValueById(
            'ParamMouthOpenY',
            currentLipLevel,
          )
        } catch {
          // Ignore missing mouth parameter on third-party models.
        }
      })

      app.stage.addChild(model)
      activeModelUrl = modelUrl
      isModelReady.value = true
      isLoading.value = false

      const motionMgr = model.internalModel.motionManager
      console.log('[Live2D] Motion groups:', Object.keys(motionMgr.definitions))

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

  const setMood = (mood: keyof typeof EXPRESSION_BY_MOOD | string = 'neutral') => {
    const expressionName = EXPRESSION_BY_MOOD[mood] || EXPRESSION_BY_MOOD.neutral
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

  const pickGestureIndex = (gesture: string) => {
    const candidates = GESTURE_VARIANTS[gesture] || GESTURE_VARIANTS.subtleTalk
    if (candidates.length === 1) return candidates[0]

    const pool = candidates.filter(index => `${gesture}:${index}` !== lastGestureKey)
    const selected = pool[Math.floor(Math.random() * pool.length)] ?? candidates[0]
    lastGestureKey = `${gesture}:${selected}`
    return selected
  }

  const playGesture = (
    gesture: keyof typeof GESTURE_VARIANTS | string,
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

    playMotion(MOTION_GROUP.DEFAULT, pickGestureIndex(gesture), options.priority ?? 3)
  }

  const playRandomMotion = (priority = 3) => {
    if (!model) return
    const candidates = [1, 2, 5, 8]
    const index = candidates[Math.floor(Math.random() * candidates.length)]
    playMotion(MOTION_GROUP.DEFAULT, index, priority)
  }

  const playIdle = () => {
    if (!model) return
    const index = Math.floor(Math.random() * 2)
    setMood('soft')
    playMotion(MOTION_GROUP.IDLE, index, 1)
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
    if (num < 1 || num > 10) return
    playMotion(MOTION_GROUP.DEFAULT, num - 1, 3)
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
    if (!model) return

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
