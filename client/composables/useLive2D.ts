/**
 * useLive2D Composable
 * Manages Live2D model lifecycle, LipSync, motions, expressions, and mouse tracking
 */
import type { Ref } from 'vue'

// Model URL for the office_f character
const MODEL_URL = '/live2d/office_f/office_f.model3.json'

// Motion group names matching model3.json
const MOTION_GROUP = {
  DEFAULT: '',      // M01-M10 motions
  IDLE: 'Idle',     // W01-W02 idle motions
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

export function useLive2D(canvasRef: Ref<HTMLCanvasElement | null>) {
  const isModelReady = ref(false)
  const isLoading = ref(true)

  let app: any = null
  let model: any = null
  let destroyed = false

  // Track current lipsync target level — applied every frame via beforeModelUpdate
  let currentLipLevel = 0
  let lastGestureAt = 0
  let lastGestureKey = ''

  /**
   * Initialize PixiJS Application + Load Live2D Model
   */
  const init = async () => {
    if (destroyed) return

    const canvas = canvasRef.value
    if (!canvas) {
      console.warn('[Live2D] Canvas ref not available')
      return
    }

    // Wait for Cubism Core to be available
    let retries = 0
    while (!(window as any).Live2DCubismCore && retries < 50) {
      await new Promise(r => setTimeout(r, 100))
      retries++
    }

    if (!(window as any).Live2DCubismCore) {
      console.error('[Live2D] Cubism Core not loaded after timeout')
      isLoading.value = false
      return
    }

    try {
      // Dynamic imports to avoid SSR issues
      const PIXI = await import('pixi.js')

      // Expose PIXI to window (required by pixi-live2d-display)
      ;(window as any).PIXI = PIXI

      const { Live2DModel, MotionPreloadStrategy } = await import('pixi-live2d-display/cubism4')

      // Create PixiJS application
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

      if (destroyed) { app.destroy(); return }

      // Load model — preload ALL motions so they're ready instantly
      console.log('[Live2D] Loading model with motion preload...')
      model = await Live2DModel.from(MODEL_URL, {
        autoInteract: false,
        motionPreload: MotionPreloadStrategy.ALL,
      })

      if (destroyed) { app.destroy(); return }

      // Size & position model to fill canvas (Bust-up / Upper body focus)
      const screenW = app.renderer.screen.width
      const screenH = app.renderer.screen.height

      // Scale vertically so her height is 1.8x the canvas height, zooming into her upper body
      const scale = (screenH / model.internalModel.height) * 1.8

      model.scale.set(scale)

      // Center horizontally
      model.x = (screenW - model.internalModel.width * scale) / 2
      // Anchor top to show her face, with a slight 5% top padding
      model.y = screenH * 0.05

      // Hook LipSync — apply mouth level every single frame before model update
      model.internalModel.on('beforeModelUpdate', () => {
        if (!model?.internalModel?.coreModel) return
        try {
          model.internalModel.coreModel.setParameterValueById(
            'ParamMouthOpenY',
            currentLipLevel,
          )
        } catch {
          // Parameter not found — ignore
        }
      })

      app.stage.addChild(model)

      isModelReady.value = true
      isLoading.value = false
      console.log('[Live2D] Model loaded and ready')

      // Log available motions for debugging
      const motionMgr = model.internalModel.motionManager
      console.log('[Live2D] Motion groups:', Object.keys(motionMgr.definitions))
      for (const [group, defs] of Object.entries(motionMgr.definitions)) {
        console.log(`[Live2D]   Group "${group}": ${(defs as any[]).length} motions`)
      }

      // Start idle animation after a brief delay to allow preload to complete
      setTimeout(() => playIdle(), 500)
    } catch (err) {
      console.error('[Live2D] Init error:', err)
      isLoading.value = false
    }
  }

  /**
   * LipSync — Set mouth open level (0.0 to 1.0)
   * This is applied every frame via the beforeModelUpdate hook
   */
  const setLipSync = (level: number) => {
    currentLipLevel = Math.max(0, Math.min(1, level))
  }

  const setMood = (mood: keyof typeof EXPRESSION_BY_MOOD | string = 'neutral') => {
    const expressionName = EXPRESSION_BY_MOOD[mood] || EXPRESSION_BY_MOOD.neutral
    setExpressionByName(expressionName)
  }

  /**
   * Play a motion by group and index
   * Uses internalModel.motionManager.startMotion for reliable playback
   */
  const playMotion = async (group: string, index: number = 0, priority: number = 3) => {
    if (!model?.internalModel?.motionManager) return
    try {
      const mgr = model.internalModel.motionManager
      const success = await mgr.startMotion(group, index, priority)
      console.log(`[Live2D] Motion group='${group}', index=${index}, priority=${priority} → ${success}`)
    } catch (err) {
      console.warn('[Live2D] Motion error:', err)
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
    options: { priority?: number; cooldownMs?: number; mood?: string; force?: boolean } = {}
  ) => {
    if (!model) return

    const now = Date.now()
    const cooldownMs = options.cooldownMs ?? 900
    if (!options.force && now - lastGestureAt < cooldownMs) {
      if (options.mood) setMood(options.mood)
      return
    }

    lastGestureAt = now

    if (options.mood) {
      setMood(options.mood)
    }

    playMotion(MOTION_GROUP.DEFAULT, pickGestureIndex(gesture), options.priority ?? 3)
  }

  /**
   * Play a random motion from the default group (M01-M10)
   */
  const playRandomMotion = (priority: number = 3) => {
    if (!model) return
    const candidates = [1, 2, 5, 8]
    const index = candidates[Math.floor(Math.random() * candidates.length)]
    playMotion(MOTION_GROUP.DEFAULT, index, priority)
  }

  /**
   * Play idle animation (W01 or W02 — loops automatically)
   */
  const playIdle = () => {
    if (!model) return
    const index = Math.floor(Math.random() * 2)
    setMood('soft')
    playMotion(MOTION_GROUP.IDLE, index, 1) // IDLE priority
  }

  /**
   * Play a greeting/wave motion
   */
  const playGreeting = () => {
    playGesture('greeting', { mood: 'smile', priority: 3, cooldownMs: 200, force: true })
  }

  /**
   * Play a nod motion (use M01 — short head movement)
   */
  const playNod = () => {
    playGesture('nod', { mood: 'soft', priority: 3, cooldownMs: 250, force: true })
  }

  /**
   * Play a thinking motion
   */
  const playThinking = () => {
    playGesture('think', { mood: 'curious', priority: 3, cooldownMs: 400, force: true })
  }

  /**
   * Play a happy/excited motion
   */
  const playHappy = () => {
    playGesture('happy', { mood: 'delighted', priority: 3, cooldownMs: 250, force: true })
  }

  /**
   * Play goodbye wave
   */
  const playGoodbye = () => {
    playGesture('goodbye', { mood: 'smile', priority: 3, cooldownMs: 250, force: true })
  }

  /**
   * Play a specific default motion by number (1-10 for M01-M10)
   */
  const playMotionByNumber = (num: number) => {
    if (num < 1 || num > 10) return
    playMotion(MOTION_GROUP.DEFAULT, num - 1, 3)
  }

  /**
   * Set expression by index (0-11 for exp_00 to exp_11)
   */
  const setExpression = (index: number) => {
    if (!model) return
    try {
      model.expression(index)
    } catch (err) {
      console.warn('[Live2D] Expression error:', err)
    }
  }

  /**
   * Set expression by name (exp_00, exp_01, etc.)
   */
  const setExpressionByName = (name: string) => {
    if (!model) return
    try {
      model.expression(name)
    } catch (err) {
      console.warn('[Live2D] Expression error:', err)
    }
  }

  /**
   * Enable mouse/touch tracking — eyes and head follow pointer
   */
  const handlePointerMove = (e: PointerEvent) => {
    if (!model || !canvasRef.value) return

    const rect = canvasRef.value.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    model.focus(x * 2 - 1, y * 2 - 1)
  }

  /**
   * Handle tap/click on model
   */
  const handleTap = (e: PointerEvent) => {
    if (!model || !canvasRef.value) return

    const rect = canvasRef.value.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    model.tap(x, y)
  }

  /**
   * Resize model to fit new canvas size
   */
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

  /**
   * Cleanup
   */
  const destroy = () => {
    destroyed = true

    if (model) {
      try { model.destroy() } catch { /* ignore */ }
      model = null
    }

    if (app) {
      try { app.destroy(false, { children: true }) } catch { /* ignore */ }
      app = null
    }

    isModelReady.value = false
  }

  // Lifecycle
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
