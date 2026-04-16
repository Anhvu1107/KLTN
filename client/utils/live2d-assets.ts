/**
 * Resolve Live2D model URLs for both bundled public assets and uploaded models.
 *
 * Bundled `/live2d/**` files must stay on the frontend origin. Uploaded
 * `/uploads/**` files can be proxied same-origin, or served directly from the
 * API origin when the frontend is configured with an absolute API URL.
 */
export const resolveLive2DAssetUrl = (url?: string | null): string => {
  const trimmed = typeof url === 'string' ? url.trim() : ''
  if (!trimmed) return ''

  if (/^(https?:|data:|blob:)/i.test(trimmed)) {
    return trimmed
  }

  if (!trimmed.startsWith('/uploads/')) {
    return trimmed
  }

  try {
    const config = useRuntimeConfig()
    const apiUrl = String(config.public.apiUrl || '').replace(/\/+$/, '')

    if (/^https?:\/\//i.test(apiUrl)) {
      return `${apiUrl.replace(/\/api\/v1$/i, '')}${trimmed}`
    }
  } catch {
    // Outside of Nuxt context we keep the relative same-origin URL.
  }

  return trimmed
}
