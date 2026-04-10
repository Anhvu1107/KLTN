export type SizeGroups = Record<string, string[]>

export const DEFAULT_SIZE_GROUPS: SizeGroups = {
  default: ['One Size', 'Free Size'],
  Tops: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  Outerwear: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  Dresses: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  Pants: ['26', '27', '28', '29', '30', '31', '32', '33', '34', '36', '38', '40'],
  Shoes: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
  Bags: ['Mini', 'Small', 'Medium', 'Large', 'One Size'],
  Accessories: ['One Size', 'Free Size'],
  Jewelry: ['One Size', 'Free Size'],
  Watches: ['One Size'],
}

const sanitizeSizes = (sizes: unknown): string[] => {
  if (!Array.isArray(sizes)) return []

  return sizes.reduce<string[]>((acc, size) => {
    if (typeof size !== 'string') return acc

    const normalized = size.trim()
    if (!normalized || acc.includes(normalized)) return acc

    acc.push(normalized)
    return acc
  }, [])
}

export const cloneSizeGroups = (groups: SizeGroups = DEFAULT_SIZE_GROUPS): SizeGroups =>
  Object.entries(groups).reduce<SizeGroups>((acc, [key, sizes]) => {
    acc[key] = sanitizeSizes(sizes)
    return acc
  }, {})

export const normalizeSizeGroups = (
  groups: unknown,
  categories: Array<{ value: string }> = []
): SizeGroups => {
  const normalized = cloneSizeGroups()

  if (groups && typeof groups === 'object' && !Array.isArray(groups)) {
    Object.entries(groups as Record<string, unknown>).forEach(([key, sizes]) => {
      const normalizedKey = key.trim()
      if (!normalizedKey) return
      normalized[normalizedKey] = sanitizeSizes(sizes)
    })
  }

  categories.forEach((category) => {
    const key = category?.value?.trim()
    if (!key || key in normalized) return
    normalized[key] = cloneSizeGroups()[key] || [...(normalized.default || DEFAULT_SIZE_GROUPS.default)]
  })

  if (!('default' in normalized)) {
    normalized.default = [...DEFAULT_SIZE_GROUPS.default]
  }

  return normalized
}

export const flattenSizeGroups = (groups: SizeGroups): string[] => {
  const flattened: string[] = []

  Object.values(normalizeSizeGroups(groups)).forEach((sizes) => {
    sizes.forEach((size) => {
      if (!flattened.includes(size)) {
        flattened.push(size)
      }
    })
  })

  return flattened
}

export const getSizesForCategory = (groups: SizeGroups, category?: string): string[] => {
  const normalized = normalizeSizeGroups(groups)

  if (category && category in normalized) {
    return [...normalized[category]]
  }

  return [...(normalized.default || DEFAULT_SIZE_GROUPS.default)]
}
