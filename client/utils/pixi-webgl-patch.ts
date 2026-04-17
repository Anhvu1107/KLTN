/**
 * Patch PixiJS v6 to prevent `checkMaxIfStatementsInShader` from throwing
 * when the WebGL context returns 0 for MAX_TEXTURE_IMAGE_UNITS.
 *
 * This happens when:
 * - Multiple WebGL contexts are created/destroyed rapidly (snapshot + mascot)
 * - The browser's WebGL context limit is hit (typically 8-16 on mobile)
 * - The GL context is "lost" or not fully ready during initialization
 *
 * The patch intercepts the AbstractBatchRenderer.contextChange method
 * to ensure MAX_TEXTURES is always at least 1, preventing the fatal throw.
 */

let patched = false

export const patchPixiWebGL = (PIXI: any) => {
  if (!PIXI || patched) return
  patched = true

  // Patch 1: Override checkMaxIfStatementsInShader via AbstractBatchRenderer
  const BatchRenderer = PIXI.BatchRenderer || PIXI.AbstractBatchRenderer
  if (BatchRenderer?.prototype?.contextChange) {
    const originalContextChange = BatchRenderer.prototype.contextChange

    BatchRenderer.prototype.contextChange = function () {
      try {
        originalContextChange.call(this)
      } catch (e: any) {
        if (e?.message?.includes?.('checkMaxIfStatementsInShader')) {
          console.warn('[Live2D] WebGL shader check failed, applying fallback (MAX_TEXTURES=1)')
          // Force a safe minimum: 1 texture unit is always supported
          this.MAX_TEXTURES = 1
          try {
            this._shader = this.shaderGenerator.generateShader(this.MAX_TEXTURES)
            for (let i = 0; i < this._packedGeometryPoolSize; i++) {
              this._packedGeometries[i] = new (this.geometryClass)()
            }
            this.initFlushBuffers()
          } catch (fallbackError) {
            console.error('[Live2D] Fallback shader generation also failed:', fallbackError)
          }
        } else {
          throw e
        }
      }
    }
  }

  // Patch 2: Handle WebGL context lost/restored gracefully
  if (typeof document !== 'undefined') {
    const handleContextLost = (e: Event) => {
      console.warn('[Live2D] WebGL context lost, preventing default')
      e.preventDefault()
    }

    // Attach to all current and future canvases
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLCanvasElement) {
            node.addEventListener('webglcontextlost', handleContextLost, false)
          }
        }
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    // Patch existing canvases
    document.querySelectorAll('canvas').forEach((canvas) => {
      canvas.addEventListener('webglcontextlost', handleContextLost, false)
    })
  }
}

/**
 * Check if a canvas element has a usable WebGL context.
 * Returns true if we can get a GL context and query basic parameters.
 */
export const isWebGLContextReady = (canvas: HTMLCanvasElement): boolean => {
  try {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return false
    const maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)
    return typeof maxTextures === 'number' && maxTextures > 0
  } catch {
    return false
  }
}

/**
 * Wait until a canvas element has a usable WebGL context, with retries.
 * This is useful when the browser is recovering from a context limit.
 */
export const waitForWebGLContext = async (
  canvas: HTMLCanvasElement,
  maxRetries = 5,
  delayMs = 300,
): Promise<boolean> => {
  for (let i = 0; i < maxRetries; i++) {
    if (isWebGLContextReady(canvas)) return true
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }
  return isWebGLContextReady(canvas)
}
