/**
 * usePageContent composable
 * AURA ARCHIVE - Shared logic for dynamic block rendering on static pages
 */

export const usePageContent = (pageKey: string) => {
  const config = useRuntimeConfig()
  const { locale } = useI18n()

  const { data: pageData } = useFetch<{
    success: boolean
    data: { content: any }
  }>(`${config.public.apiUrl}/page-content/${pageKey}`)

  const blocks = computed(() => pageData.value?.data?.content?.blocks || [])
  const hasPublishedContent = computed(() => blocks.value.length > 0)

  const getLangField = (data: any, field: string) => {
    const lang = locale.value as string
    return data?.[lang]?.[field] || data?.vi?.[field] || ''
  }

  const getImageSrc = (url: string) => {
    if (!url) return ''
    return url.startsWith('http') ? url : `${config.public.apiUrl}${url}`
  }

  return {
    blocks,
    hasPublishedContent,
    getLangField,
    getImageSrc,
    locale,
  }
}
