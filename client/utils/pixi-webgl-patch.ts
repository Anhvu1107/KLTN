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
}

/**
 * Check if the browser can allocate a usable WebGL context right now.
 * Returns true if we can get a GL context and query basic parameters.
 * Uses a dummy canvas to avoid poisoning the real canvas's context options.
 */
export const isWebGLContextReady = (): boolean => {
  try {
    const dummy = document.createElement('canvas')
    // Get context with minimal requirements
    const gl = dummy.getContext('webgl2') || dummy.getContext('webgl')
    if (!gl) return false
    
    const maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)
    const isValid = typeof maxTextures === 'number' && maxTextures > 0
    
    // Explicitly lose context immediately so we don't consume the browser's context limit
    const ext = gl.getExtension('WEBGL_lose_context')
    if (ext) ext.loseContext()
    
    return isValid
  } catch {
    return false
  }
}

/**
 * Wait until the browser can allocate a usable WebGL context, with retries.
 * This is useful when the browser is recovering from a context limit after destroying a previous one.
 */
export const waitForWebGLContext = async (
  maxRetries = 5,
  delayMs = 300,
): Promise<boolean> => {
  for (let i = 0; i < maxRetries; i++) {
    if (isWebGLContextReady()) return true
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }
  return isWebGLContextReady()
}
