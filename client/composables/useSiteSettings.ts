type PublicSiteSettings = Record<string, string | null | undefined>

type FetchSettingsOptions = {
  force?: boolean
}

export const useSiteSettings = () => {
  const config = useRuntimeConfig()
  const { getImageUrl } = useImageUrl()

  const settings = useState<PublicSiteSettings>('public-site-settings', () => ({}))
  const isLoaded = useState<boolean>('public-site-settings-loaded', () => false)
  const isLoading = useState<boolean>('public-site-settings-loading', () => false)

  const fetchSettings = async (options: FetchSettingsOptions = {}) => {
    if (!options.force && (isLoaded.value || isLoading.value)) return

    isLoading.value = true
    try {
      const response = await $fetch<{ success: boolean; data: { settings: PublicSiteSettings } }>(
        `${config.public.apiUrl}/settings`
      )
      settings.value = response.data?.settings || {}
      isLoaded.value = true
    } catch (error) {
      console.error('Failed to fetch public site settings:', error)
    } finally {
      isLoading.value = false
    }
  }

  const textSetting = (key: string, fallback = '') => computed(() => {
    const value = settings.value[key]
    return typeof value === 'string' && value.trim() ? value.trim() : fallback
  })

  const imageSetting = (key: string) => computed(() => {
    const value = settings.value[key]
    return typeof value === 'string' && value.trim() ? getImageUrl(value.trim()) || '' : ''
  })

  const siteName = textSetting('site_name', 'AURA ARCHIVE')
  const siteTagline = textSetting('site_tagline', 'Luxury Resell Fashion')
  const seoTitle = textSetting('seo_title', 'AURA ARCHIVE | Luxury Resell Fashion')
  const seoDescription = textSetting(
    'seo_description',
    'AURA ARCHIVE - Curated luxury consignment and resell fashion. Discover pre-owned designer pieces.'
  )
  const logoUrl = imageSetting('site_logo')
  const faviconUrl = imageSetting('site_favicon')

  return {
    settings,
    isLoaded,
    isLoading,
    fetchSettings,
    siteName,
    siteTagline,
    seoTitle,
    seoDescription,
    logoUrl,
    faviconUrl,
  }
}
