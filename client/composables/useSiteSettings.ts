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

  const normalizeUrl = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (/^(https?:|mailto:|tel:)/i.test(trimmed) || trimmed.startsWith('/')) return trimmed
    return `https://${trimmed}`
  }

  const urlSetting = (key: string) => computed(() => {
    const value = settings.value[key]
    return typeof value === 'string' && value.trim() ? normalizeUrl(value) : ''
  })

  const zaloLink = computed(() => {
    const value = settings.value.zalo_link
    if (typeof value !== 'string' || !value.trim()) return ''

    const trimmed = value.trim()
    if (/^\+?\d[\d\s.()-]+$/.test(trimmed)) {
      return `https://zalo.me/${trimmed.replace(/\D/g, '')}`
    }

    return normalizeUrl(trimmed)
  })

  const messengerLink = computed(() => {
    const value = settings.value.messenger_link
    if (typeof value !== 'string' || !value.trim()) return ''

    const trimmed = value.trim()
    if (/^[a-z0-9.]+$/i.test(trimmed)) {
      return `https://m.me/${trimmed}`
    }

    return normalizeUrl(trimmed)
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
  const contactPhone = textSetting('contact_phone', '+84 123 456 789')
  const contactEmail = textSetting('contact_email', 'hello@aura-archive.com')
  const contactAddress = textSetting('contact_address', '123 Luxury Street, District 1, Ho Chi Minh City, Vietnam')
  const socialFacebookUrl = urlSetting('social_facebook')
  const socialInstagramUrl = urlSetting('social_instagram')
  const socialTiktokUrl = urlSetting('social_tiktok')
  const socialYoutubeUrl = urlSetting('social_youtube')

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
    contactPhone,
    contactEmail,
    contactAddress,
    socialFacebookUrl,
    socialInstagramUrl,
    socialTiktokUrl,
    socialYoutubeUrl,
    zaloLink,
    messengerLink,
  }
}
