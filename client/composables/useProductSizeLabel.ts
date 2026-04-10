const LOCALIZED_SIZE_KEYS: Record<string, string> = {
  'one size': 'sizeLabels.oneSize',
  'free size': 'sizeLabels.freeSize',
  mini: 'sizeLabels.mini',
  small: 'sizeLabels.small',
  medium: 'sizeLabels.medium',
  large: 'sizeLabels.large',
}

const normalizeSizeValue = (size: string) => size.trim().toLowerCase().replace(/\s+/g, ' ')

export const useProductSizeLabel = () => {
  const { t } = useI18n()

  const formatSizeLabel = (size?: string | null) => {
    const rawSize = typeof size === 'string' ? size.trim() : ''
    if (!rawSize) return ''

    const translationKey = LOCALIZED_SIZE_KEYS[normalizeSizeValue(rawSize)]
    if (!translationKey) return rawSize

    const translated = t(translationKey)
    return translated === translationKey ? rawSize : translated
  }

  return {
    formatSizeLabel,
  }
}
