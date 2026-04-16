const LIVE2D_CUBISM_CORE_SRC = '/live2d/core/live2dcubismcore.min.js'
const DEFAULT_CORE_TIMEOUT_MS = 20000

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const hasCubismCore = () =>
  import.meta.client && Boolean((window as any).Live2DCubismCore)

const hasCoreScriptTag = () => {
  if (!import.meta.client) return false

  return Array.from(document.getElementsByTagName('script')).some((script) => {
    const src = script.getAttribute('src') || script.src || ''
    return src.includes(LIVE2D_CUBISM_CORE_SRC)
  })
}

const appendCoreScript = () => {
  if (!import.meta.client || hasCoreScriptTag()) return

  const script = document.createElement('script')
  script.src = LIVE2D_CUBISM_CORE_SRC
  script.defer = true
  script.async = false
  script.dataset.live2dCore = 'true'
  document.head.appendChild(script)
}

export const ensureLive2DCubismCoreLoaded = async (
  timeoutMs = DEFAULT_CORE_TIMEOUT_MS,
) => {
  if (!import.meta.client) return false
  if (hasCubismCore()) return true

  appendCoreScript()

  const startedAt = Date.now()
  while (!hasCubismCore()) {
    if (Date.now() - startedAt >= timeoutMs) {
      return false
    }

    await sleep(100)
  }

  return true
}
