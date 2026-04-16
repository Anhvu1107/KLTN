type AiCustomerContext = {
  currentPath: string
  currentUrl: string
  pageType: string
  productSlug: string | null
  category: string | null
  search: string | null
  query: Record<string, string>
  pageTitle: string
  capturedAt: string
}

const firstString = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    return firstString(value[0])
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return null
}

const cleanQuery = (query: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(query)
      .map(([key, value]) => [key, firstString(value)])
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  )

const detectPageType = (path: string) => {
  if (path === '/') return 'home'
  if (path.startsWith('/shop/') && path.length > '/shop/'.length) return 'product'
  if (path.startsWith('/shop')) return 'shop'
  if (path.startsWith('/cart')) return 'cart'
  if (path.startsWith('/checkout')) return 'checkout'
  if (path.startsWith('/wishlist')) return 'wishlist'
  if (path.startsWith('/blog')) return 'blog'
  if (path.startsWith('/auth')) return 'auth'
  return 'page'
}

export const useAiCustomerContext = () => {
  const route = useRoute()

  const buildAiCustomerContext = (): AiCustomerContext => {
    const query = cleanQuery(route.query as Record<string, unknown>)
    const productSlug = firstString(route.params.slug) || firstString(route.params.id)
    const currentPath = route.fullPath || route.path || '/'

    return {
      currentPath,
      currentUrl: import.meta.client ? window.location.href : currentPath,
      pageType: detectPageType(route.path || currentPath),
      productSlug,
      category: query.category || query.c || null,
      search: query.search || query.q || query.keyword || null,
      query,
      pageTitle: import.meta.client ? document.title : '',
      capturedAt: new Date().toISOString(),
    }
  }

  const buildAiCustomerContextQuery = () => {
    const context = buildAiCustomerContext()
    const params = new URLSearchParams()

    params.set('currentPath', context.currentPath)
    params.set('pageType', context.pageType)
    if (context.productSlug) params.set('productSlug', context.productSlug)
    if (context.category) params.set('category', context.category)
    if (context.search) params.set('search', context.search)
    if (context.pageTitle) params.set('pageTitle', context.pageTitle.slice(0, 120))

    return params
  }

  return {
    buildAiCustomerContext,
    buildAiCustomerContextQuery,
  }
}
