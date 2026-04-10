<script setup lang="ts">
/**
 * Admin - Product Attributes Settings
 * AURA ARCHIVE - Manage dynamic product options (brands, categories, colors, sizes, materials)
 */

import { useProductSizeLabel } from '~/composables/useProductSizeLabel'
import { DEFAULT_SIZE_GROUPS, flattenSizeGroups, normalizeSizeGroups, type SizeGroups } from '~/utils/productSizeGroups'

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

type LocalizedOption = { value: string; label_en: string; label_vi: string }
type ProductAttributesState = {
  brands: string[]
  categories: LocalizedOption[]
  colors: LocalizedOption[]
  sizes: string[]
  size_groups: SizeGroups
  materials: LocalizedOption[]
}

type SavableAttributeKey = 'brands' | 'categories' | 'colors' | 'size_groups' | 'materials'
const SIZE_GROUP_TRANSLATION_KEYS: Record<string, string> = {
  Tops: 'categories.tops',
  Pants: 'categories.pants',
  Outerwear: 'categories.outerwear',
  Shoes: 'categories.shoes',
  Bags: 'categories.bags',
  Accessories: 'categories.accessories',
  Dresses: 'categories.dresses',
  Jewelry: 'categories.jewelry',
  Watches: 'categories.watches',
}

const { t, locale } = useI18n()
const config = useRuntimeConfig()
const { getToken } = useAuthToken()
const { formatSizeLabel } = useProductSizeLabel()

const createEmptyAttributes = (): ProductAttributesState => ({
  brands: [],
  categories: [],
  colors: [],
  sizes: flattenSizeGroups(DEFAULT_SIZE_GROUPS),
  size_groups: normalizeSizeGroups(DEFAULT_SIZE_GROUPS),
  materials: [],
})

const normalizeAttributes = (rawAttributes?: Partial<ProductAttributesState>): ProductAttributesState => {
  const categories = Array.isArray(rawAttributes?.categories) ? rawAttributes.categories : []
  const sizeGroups = normalizeSizeGroups(rawAttributes?.size_groups, categories)

  return {
    brands: Array.isArray(rawAttributes?.brands) ? rawAttributes.brands : [],
    categories,
    colors: Array.isArray(rawAttributes?.colors) ? rawAttributes.colors : [],
    sizes: flattenSizeGroups(sizeGroups),
    size_groups: sizeGroups,
    materials: Array.isArray(rawAttributes?.materials) ? rawAttributes.materials : [],
  }
}

// Active tab
const activeTab = ref('brands')
const tabs = computed(() => [
  { key: 'brands', label: t('admin.attributes.brands', 'Th\u01b0\u01a1ng hi\u1ec7u') },
  { key: 'categories', label: t('admin.attributes.categories', 'Danh m\u1ee5c') },
  { key: 'colors', label: t('admin.attributes.colors', 'M\u00e0u s\u1eafc') },
  { key: 'sizes', label: t('admin.attributes.sizes', 'K\u00edch c\u1ee1') },
  { key: 'materials', label: t('admin.attributes.materials', 'Ch\u1ea5t li\u1ec7u') },
])

// Data state
const attributes = ref<ProductAttributesState>(createEmptyAttributes())

const isLoading = ref(true)
const isSaving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// New item input
const newBrand = ref('')
const newCategory = ref({ value: '', label_en: '', label_vi: '' })
const newColor = ref({ value: '', label_en: '', label_vi: '' })
const newMaterial = ref({ value: '', label_en: '', label_vi: '' })
const newSizeInputs = reactive<Record<string, string>>({})

const getSizeGroupLabel = (groupKey: string) => {
  if (groupKey === 'default') {
    return t('admin.attributes.sizeGroupDefault')
  }

  const translationKey = SIZE_GROUP_TRANSLATION_KEYS[groupKey]
  if (translationKey) return t(translationKey)

  const category = attributes.value.categories.find((item) => item.value === groupKey)
  if (!category) return groupKey

  if (locale.value === 'vi') {
    return category.label_vi || category.label_en || category.value
  }

  return category.label_en || category.label_vi || category.value
}

const sizeGroupEntries = computed(() => {
  const seen = new Set<string>()
  const entries: Array<{ key: string; label: string; hint: string }> = []

  const pushEntry = (rawKey?: string) => {
    const key = rawKey?.trim()
    if (!key || seen.has(key)) return

    seen.add(key)
    entries.push({
      key,
      label: getSizeGroupLabel(key),
      hint: key === 'default'
        ? t('admin.attributes.sizesFallbackHint')
        : t('admin.attributes.sizesGroupHint'),
    })
  }

  pushEntry('default')
  attributes.value.categories.forEach((category) => pushEntry(category.value))
  Object.keys(attributes.value.size_groups).forEach((groupKey) => pushEntry(groupKey))

  return entries
})

watch(
  () => attributes.value.categories.map((category) => `${category.value}|${category.label_en}|${category.label_vi}`),
  () => {
    attributes.value.size_groups = normalizeSizeGroups(attributes.value.size_groups, attributes.value.categories)
    attributes.value.sizes = flattenSizeGroups(attributes.value.size_groups)
  },
  { deep: true }
)

// Fetch attributes from API
const fetchAttributes = async () => {
  isLoading.value = true
  try {
    const response = await $fetch<{
      success: boolean
      data: { attributes: Partial<ProductAttributesState> }
    }>(`${config.public.apiUrl}/settings/product-attributes`)

    if (response.success) {
      attributes.value = normalizeAttributes(response.data.attributes)
    }
  } catch (err: any) {
    errorMessage.value = err?.data?.message || t('notifications.loadError', 'Failed to load attributes')
  } finally {
    isLoading.value = false
  }
}

// Save a specific attribute
const saveAttribute = async (key: SavableAttributeKey) => {
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const items = key === 'size_groups'
      ? attributes.value.size_groups
      : attributes.value[key]

    await $fetch(`${config.public.apiUrl}/admin/product-attributes/${key}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: { items }
    })

    if (key === 'size_groups') {
      attributes.value.sizes = flattenSizeGroups(attributes.value.size_groups)
    }

    successMessage.value = t('common.saveSuccess', '\u0110\u00e3 l\u01b0u th\u00e0nh c\u00f4ng!')
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (err: any) {
    errorMessage.value = err?.data?.message || t('notifications.saveError', 'L\u01b0u th\u1ea5t b\u1ea1i')
  } finally {
    isSaving.value = false
  }
}

// Add item functions
const addBrand = () => {
  const nextBrand = newBrand.value.trim()

  if (nextBrand && !attributes.value.brands.includes(nextBrand)) {
    attributes.value.brands.push(nextBrand)
    newBrand.value = ''
  }
}

const addSizeToGroup = (groupKey: string) => {
  const nextSize = newSizeInputs[groupKey]?.trim()

  if (!nextSize) return

  if (!attributes.value.size_groups[groupKey]) {
    attributes.value.size_groups[groupKey] = []
  }

  if (!attributes.value.size_groups[groupKey].includes(nextSize)) {
    attributes.value.size_groups[groupKey].push(nextSize)
    attributes.value.sizes = flattenSizeGroups(attributes.value.size_groups)
  }

  newSizeInputs[groupKey] = ''
}

const addCategory = () => {
  if (newCategory.value.value.trim() && newCategory.value.label_en.trim()) {
    attributes.value.categories.push({ ...newCategory.value })
    newCategory.value = { value: '', label_en: '', label_vi: '' }
  }
}

const addColor = () => {
  if (newColor.value.value.trim() && newColor.value.label_en.trim()) {
    attributes.value.colors.push({ ...newColor.value })
    newColor.value = { value: '', label_en: '', label_vi: '' }
  }
}

const addMaterial = () => {
  if (newMaterial.value.value.trim() && newMaterial.value.label_en.trim()) {
    attributes.value.materials.push({ ...newMaterial.value })
    newMaterial.value = { value: '', label_en: '', label_vi: '' }
  }
}

// Remove item functions
const removeBrand = (index: number) => {
  attributes.value.brands.splice(index, 1)
}

const removeSizeFromGroup = (groupKey: string, index: number) => {
  attributes.value.size_groups[groupKey]?.splice(index, 1)
  attributes.value.sizes = flattenSizeGroups(attributes.value.size_groups)
}

const removeCategory = (index: number) => {
  attributes.value.categories.splice(index, 1)
}

const removeColor = (index: number) => {
  attributes.value.colors.splice(index, 1)
}

const removeMaterial = (index: number) => {
  attributes.value.materials.splice(index, 1)
}

onMounted(() => {
  fetchAttributes()
})

useSeoMeta({
  title: 'Product Attributes | AURA ARCHIVE Admin',
})
</script>

<template>
  <div class="p-8">
    <div class="max-w-4xl">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="font-serif text-heading-2 text-aura-black">{{ $t('admin.attributes.title') }}</h1>
        <p class="text-body text-neutral-600 mt-1">{{ $t('admin.attributes.description') }}</p>
      </div>

      <!-- Messages -->
      <div v-if="successMessage" class="mb-6 p-4 bg-green-50 border border-green-200 rounded-sm text-body-sm text-green-700">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm text-body-sm text-red-700">
        {{ errorMessage }}
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="text-center py-16">
        <p class="text-neutral-500">{{ $t('common.loading') }}</p>
      </div>

      <div v-else>
        <!-- Tabs -->
        <div class="flex border-b border-neutral-200 mb-6 overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            class="px-6 py-3 text-body-sm whitespace-nowrap transition-colors"
            :class="activeTab === tab.key 
              ? 'text-aura-black border-b-2 border-aura-black font-medium' 
              : 'text-neutral-500 hover:text-aura-black'"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Brands Tab -->
        <div v-if="activeTab === 'brands'" class="bg-white p-6 rounded-sm shadow-card">
          <h2 class="font-serif text-heading-4 text-aura-black mb-4">{{ $t('admin.attributes.brands') }}</h2>
          <p class="text-body-sm text-neutral-500 mb-6">{{ $t('admin.attributes.brandsDesc') }}</p>

          <!-- List -->
          <div class="flex flex-wrap gap-2 mb-6">
            <div
              v-for="(brand, index) in attributes.brands"
              :key="index"
              class="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-100 rounded-sm"
            >
              <span class="text-body-sm">{{ brand }}</span>
              <button
                type="button"
                @click="removeBrand(index)"
                class="w-4 h-4 flex items-center justify-center text-neutral-400 hover:text-red-500"
              >
                &#215;
              </button>
            </div>
          </div>

          <!-- Add new -->
          <div class="flex gap-3">
            <input
              v-model="newBrand"
              type="text"
              class="input-field flex-1"
              :placeholder="t('admin.attributes.addBrand', 'Th\u00eam th\u01b0\u01a1ng hi\u1ec7u m\u1edbi...')"
              @keyup.enter="addBrand"
            />
            <button type="button" @click="addBrand" class="btn-secondary">
              {{ $t('common.add') }}
            </button>
          </div>

          <!-- Save -->
          <div class="mt-6 pt-6 border-t border-neutral-200">
            <button 
              type="button" 
              @click="saveAttribute('brands')"
              :disabled="isSaving"
              class="btn-primary"
            >
              {{ isSaving ? $t('common.saving') : $t('common.save') }}
            </button>
          </div>
        </div>

        <!-- Categories Tab -->
        <div v-if="activeTab === 'categories'" class="bg-white p-6 rounded-sm shadow-card">
          <h2 class="font-serif text-heading-4 text-aura-black mb-4">{{ $t('admin.attributes.categories') }}</h2>
          <p class="text-body-sm text-neutral-500 mb-6">{{ $t('admin.attributes.categoriesDesc') }}</p>

          <!-- List -->
          <div class="space-y-2 mb-6">
            <div
              v-for="(cat, index) in attributes.categories"
              :key="index"
              class="flex items-center gap-4 p-3 bg-neutral-50 rounded-sm"
            >
              <span class="text-body-sm font-medium w-24">{{ cat.value }}</span>
              <span class="text-body-sm text-neutral-500">EN: {{ cat.label_en }}</span>
              <span class="text-body-sm text-neutral-500">VI: {{ cat.label_vi }}</span>
              <button
                type="button"
                @click="removeCategory(index)"
                class="ml-auto text-neutral-400 hover:text-red-500"
              >
                &#215;
              </button>
            </div>
          </div>

          <!-- Add new -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <input v-model="newCategory.value" type="text" class="input-field" placeholder="Value (code)" />
            <input v-model="newCategory.label_en" type="text" class="input-field" placeholder="Label (English)" />
            <input v-model="newCategory.label_vi" type="text" class="input-field" placeholder="Label (Ti\u1ebfng Vi\u1ec7t)" />
            <button type="button" @click="addCategory" class="btn-secondary">
              {{ $t('common.add') }}
            </button>
          </div>

          <!-- Save -->
          <div class="mt-6 pt-6 border-t border-neutral-200">
            <button 
              type="button" 
              @click="saveAttribute('categories')"
              :disabled="isSaving"
              class="btn-primary"
            >
              {{ isSaving ? $t('common.saving') : $t('common.save') }}
            </button>
          </div>
        </div>

        <!-- Colors Tab -->
        <div v-if="activeTab === 'colors'" class="bg-white p-6 rounded-sm shadow-card">
          <h2 class="font-serif text-heading-4 text-aura-black mb-4">{{ $t('admin.attributes.colors') }}</h2>
          <p class="text-body-sm text-neutral-500 mb-6">{{ $t('admin.attributes.colorsDesc') }}</p>

          <!-- List -->
          <div class="space-y-2 mb-6">
            <div
              v-for="(color, index) in attributes.colors"
              :key="index"
              class="flex items-center gap-4 p-3 bg-neutral-50 rounded-sm"
            >
              <span class="text-body-sm font-medium w-24">{{ color.value }}</span>
              <span class="text-body-sm text-neutral-500">EN: {{ color.label_en }}</span>
              <span class="text-body-sm text-neutral-500">VI: {{ color.label_vi }}</span>
              <button
                type="button"
                @click="removeColor(index)"
                class="ml-auto text-neutral-400 hover:text-red-500"
              >
                &#215;
              </button>
            </div>
          </div>

          <!-- Add new -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <input v-model="newColor.value" type="text" class="input-field" placeholder="Value (code)" />
            <input v-model="newColor.label_en" type="text" class="input-field" placeholder="Label (English)" />
            <input v-model="newColor.label_vi" type="text" class="input-field" placeholder="Label (Ti\u1ebfng Vi\u1ec7t)" />
            <button type="button" @click="addColor" class="btn-secondary">
              {{ $t('common.add') }}
            </button>
          </div>

          <!-- Save -->
          <div class="mt-6 pt-6 border-t border-neutral-200">
            <button 
              type="button" 
              @click="saveAttribute('colors')"
              :disabled="isSaving"
              class="btn-primary"
            >
              {{ isSaving ? $t('common.saving') : $t('common.save') }}
            </button>
          </div>
        </div>

        <!-- Sizes Tab -->
        <div v-if="activeTab === 'sizes'" class="bg-white p-6 rounded-sm shadow-card">
          <h2 class="font-serif text-heading-4 text-aura-black mb-4">{{ $t('admin.attributes.sizes') }}</h2>
          <p class="text-body-sm text-neutral-500 mb-6">
            {{ t('admin.attributes.sizesByCategoryDesc') }}
          </p>

          <div class="space-y-5">
            <div
              v-for="group in sizeGroupEntries"
              :key="group.key"
              class="border border-neutral-200 rounded-sm p-4"
            >
              <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                <div>
                  <h3 class="text-body font-medium text-aura-black">{{ group.label }}</h3>
                  <p class="text-caption text-neutral-500">{{ group.hint }}</p>
                </div>
                <span class="text-caption uppercase tracking-wide text-neutral-400">
                  {{ t('admin.attributes.sizeCount', { count: attributes.size_groups[group.key]?.length || 0 }) }}
                </span>
              </div>

              <div class="flex flex-wrap gap-2 mb-4">
                <div
                  v-for="(size, index) in attributes.size_groups[group.key]"
                  :key="`${group.key}-${index}`"
                  class="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-100 rounded-sm"
                >
                  <span class="text-body-sm">{{ formatSizeLabel(size) }}</span>
                  <button
                    type="button"
                    @click="removeSizeFromGroup(group.key, index)"
                    class="w-4 h-4 flex items-center justify-center text-neutral-400 hover:text-red-500"
                  >
                    &#215;
                  </button>
                </div>
              </div>

              <div class="flex gap-3">
                <input
                  v-model="newSizeInputs[group.key]"
                  type="text"
                  class="input-field flex-1"
                  :placeholder="t('admin.attributes.addSize', 'Th\u00eam k\u00edch c\u1ee1 m\u1edbi...')"
                  @keyup.enter="addSizeToGroup(group.key)"
                />
                <button type="button" @click="addSizeToGroup(group.key)" class="btn-secondary">
                  {{ $t('common.add') }}
                </button>
              </div>
            </div>
          </div>

          <!-- Save -->
          <div class="mt-6 pt-6 border-t border-neutral-200">
            <button 
              type="button" 
              @click="saveAttribute('size_groups')"
              :disabled="isSaving"
              class="btn-primary"
            >
              {{ isSaving ? $t('common.saving') : $t('common.save') }}
            </button>
          </div>
        </div>

        <!-- Materials Tab -->
        <div v-if="activeTab === 'materials'" class="bg-white p-6 rounded-sm shadow-card">
          <h2 class="font-serif text-heading-4 text-aura-black mb-4">{{ $t('admin.attributes.materials') }}</h2>
          <p class="text-body-sm text-neutral-500 mb-6">{{ $t('admin.attributes.materialsDesc') }}</p>

          <!-- List -->
          <div class="space-y-2 mb-6">
            <div
              v-for="(mat, index) in attributes.materials"
              :key="index"
              class="flex items-center gap-4 p-3 bg-neutral-50 rounded-sm"
            >
              <span class="text-body-sm font-medium w-24">{{ mat.value }}</span>
              <span class="text-body-sm text-neutral-500">EN: {{ mat.label_en }}</span>
              <span class="text-body-sm text-neutral-500">VI: {{ mat.label_vi }}</span>
              <button
                type="button"
                @click="removeMaterial(index)"
                class="ml-auto text-neutral-400 hover:text-red-500"
              >
                &#215;
              </button>
            </div>
          </div>

          <!-- Add new -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <input v-model="newMaterial.value" type="text" class="input-field" placeholder="Value (code)" />
            <input v-model="newMaterial.label_en" type="text" class="input-field" placeholder="Label (English)" />
            <input v-model="newMaterial.label_vi" type="text" class="input-field" placeholder="Label (Ti\u1ebfng Vi\u1ec7t)" />
            <button type="button" @click="addMaterial" class="btn-secondary">
              {{ $t('common.add') }}
            </button>
          </div>

          <!-- Save -->
          <div class="mt-6 pt-6 border-t border-neutral-200">
            <button 
              type="button" 
              @click="saveAttribute('materials')"
              :disabled="isSaving"
              class="btn-primary"
            >
              {{ isSaving ? $t('common.saving') : $t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
