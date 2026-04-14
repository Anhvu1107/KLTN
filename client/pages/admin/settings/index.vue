<script setup lang="ts">
/**
 * Admin Settings Page
 * AURA ARCHIVE - System configuration management
 */

import { useAuthToken } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { t } = useI18n()

const config = useRuntimeConfig()
const { getToken } = useAuthToken()

const settings = ref<Record<string, any[]>>({})
const isLoading = ref(true)
const isSaving = ref(false)
const saveMessage = ref('')

const uploadingStates = ref<Record<string, boolean>>({})
const fileInputs = ref<Record<string, HTMLInputElement>>({})
const catalogBrands = ref<Array<{ name: string; count: number }>>([])

const groupLabels = computed((): Record<string, string> => ({
  general: t('admin.settings.general'),
  homepage: 'Homepage',
  contact: t('admin.settings.contact'),
  social: t('admin.settings.social'),
  seo: t('admin.settings.seo'),
  scripts: t('admin.settings.scripts'),
  payment: t('admin.paymentSettings.title'),
  product_attributes: t('admin.attributes.title'),
  'Scripts & Analytics': t('admin.settings.scripts')
}))

// Translate setting labels based on current locale
const settingLabel = (setting: any) => {
  const key = `admin.settings.labels.${setting.key}`
  const translated = t(key)
  // If translation exists (not equal to the key itself), use it; otherwise fallback to DB label
  return translated !== key ? translated : (setting.label || setting.key)
}

// Translate setting descriptions based on current locale
const settingDescription = (setting: any) => {
  if (!setting.description) return ''
  const key = `admin.settings.descriptions.${setting.key}`
  const translated = t(key)
  // If translation exists (not equal to the key itself), use it; otherwise fallback to DB description
  return translated !== key ? translated : setting.description
}

const parseJsonArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
  }

  if (typeof value !== 'string' || !value.trim()) {
    return []
  }

  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
  } catch {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
}

const getFeaturedBrandsValue = (setting: any) => parseJsonArray(setting.value)

const isFeaturedBrandSelected = (setting: any, brandName: string) => {
  return getFeaturedBrandsValue(setting).includes(brandName)
}

const toggleFeaturedBrand = (setting: any, brandName: string) => {
  const current = getFeaturedBrandsValue(setting)
  const next = current.includes(brandName)
    ? current.filter((item) => item !== brandName)
    : [...current, brandName]

  setting.value = JSON.stringify(next)
}

const clearFeaturedBrands = (setting: any) => {
  setting.value = JSON.stringify([])
}

// Fetch settings
const fetchSettings = async () => {
  try {
    const response = await $fetch<{ success: boolean; data: { settings: any } }>(
      `${config.public.apiUrl}/admin/settings`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
    settings.value = response.data.settings
  } catch (error) {
    console.error('Failed to fetch settings:', error)
  } finally {
    isLoading.value = false
  }
}

// Handle Image Upload
const triggerImageUpload = (key: string) => {
  const input = fileInputs.value[key]
  if (input) input.click()
}

const handleImageUpload = async (event: Event, setting: any) => {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  
  // Validate file type
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    saveMessage.value = t('admin.invalidImageType')
    setTimeout(() => { saveMessage.value = '' }, 3000)
    target.value = ''
    return
  }
  
  // Validate file size (2MB max)
  if (file.size > 2 * 1024 * 1024) {
    saveMessage.value = t('admin.aiConfig.avatarHint')
    setTimeout(() => { saveMessage.value = '' }, 3000)
    target.value = ''
    return
  }

  try {
    uploadingStates.value[setting.key] = true
    
    const formData = new FormData()
    formData.append('images', file)

    const response = await $fetch<{ success: boolean; data: { urls: string[] } }>(`${config.public.apiUrl}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      body: formData,
    })

    if (response.data.urls.length > 0) {
      setting.value = response.data.urls[0]
      // Trigger a small save automatically for better UX
      saveMessage.value = t('admin.uploadSuccess') || 'Uploaded successfully'
      setTimeout(() => { saveMessage.value = '' }, 3000)
    }
  } catch (error) {
    console.error('Failed to upload image:', error)
    saveMessage.value = t('admin.uploadError')
    setTimeout(() => { saveMessage.value = '' }, 3000)
  } finally {
    uploadingStates.value[setting.key] = false
    target.value = ''
  }
}

const fetchCatalogBrands = async () => {
  try {
    const response = await $fetch<{ success: boolean; data: { brands: Array<string | { brand?: string; count?: number | string }> } }>(
      `${config.public.apiUrl}/products/brands`
    )

    const seen = new Set<string>()
    catalogBrands.value = (response.data?.brands || [])
      .map((item) => typeof item === 'string'
        ? { name: item.trim(), count: 0 }
        : {
            name: (item?.brand || '').trim(),
            count: Number(item?.count || 0),
          }
      )
      .filter((item) => {
        if (!item.name) return false

        const normalized = item.name.toLowerCase()
        if (seen.has(normalized)) return false

        seen.add(normalized)
        return true
      })
  } catch (error) {
    console.error('Failed to fetch catalog brands:', error)
    catalogBrands.value = []
  }
}

// Save settings
const saveSettings = async () => {
  isSaving.value = true
  saveMessage.value = ''
  
  try {
    // Flatten all settings into array
    const allSettings = Object.values(settings.value)
      .flat()
      .map((s: any) => ({ key: s.key, value: s.value }))

    await $fetch(`${config.public.apiUrl}/admin/settings`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: { settings: allSettings },
    })

    saveMessage.value = t('admin.settings.saveSuccess')
    setTimeout(() => { saveMessage.value = '' }, 3000)
  } catch (error) {
    console.error('Failed to save settings:', error)
    saveMessage.value = t('admin.settings.saveError')
  } finally {
    isSaving.value = false
  }
}

// Seed default settings
const seedDefaults = async () => {
  try {
    await $fetch(`${config.public.apiUrl}/admin/settings/seed`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    await fetchSettings()
  } catch (error) {
    console.error('Failed to seed settings:', error)
  }
}

onMounted(() => {
  fetchSettings()
  fetchCatalogBrands()
})

useSeoMeta({ title: `${t('admin.settings.title')} | Admin` })
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-serif text-heading-2 text-aura-black">{{ t('admin.settings.title') }}</h1>
      <div class="flex items-center gap-3">
        <span v-if="saveMessage" class="text-green-600 text-body-sm">{{ saveMessage }}</span>
        <button @click="saveSettings" :disabled="isSaving" class="btn-primary">
          {{ isSaving ? t('common.saving') : t('admin.saveChanges') }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto"></div>
    </div>

    <div v-else class="space-y-8">
      <!-- Settings Groups -->
      <div 
        v-for="(groupSettings, group) in settings" 
        :key="group"
        class="card p-8"
      >
        <h2 class="text-heading-4 text-aura-black mb-6 pb-4 border-b">
          {{ groupLabels[group] || group }}
        </h2>

        <div class="space-y-4">
          <!-- Special: product_attributes → clickable links to attributes page -->
          <template v-if="group === 'product_attributes'">
            <NuxtLink
              v-for="setting in groupSettings"
              :key="setting.key"
              to="/admin/settings/attributes"
              class="flex items-center justify-between p-4 rounded-lg border border-neutral-100 hover:border-neutral-300 hover:bg-neutral-50 transition-all cursor-pointer group"
            >
              <div>
                <p class="text-body-sm text-neutral-700 font-medium group-hover:text-aura-black">{{ settingLabel(setting) }}</p>
                <p v-if="setting.description" class="text-caption text-neutral-500 mt-1">{{ settingDescription(setting) }}</p>
              </div>
              <svg class="w-5 h-5 text-neutral-400 group-hover:text-aura-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </NuxtLink>
          </template>

          <!-- Special: payment → clickable link to payment settings page -->
          <template v-else-if="group === 'payment'">
            <NuxtLink
              v-for="setting in groupSettings"
              :key="setting.key"
              to="/admin/settings/payments"
              class="flex items-center justify-between p-4 rounded-lg border border-neutral-100 hover:border-neutral-300 hover:bg-neutral-50 transition-all cursor-pointer group"
            >
              <div>
                <p class="text-body-sm text-neutral-700 font-medium group-hover:text-aura-black">{{ settingLabel(setting) }}</p>
                <p v-if="setting.description" class="text-caption text-neutral-500 mt-1">{{ settingDescription(setting) }}</p>
              </div>
              <svg class="w-5 h-5 text-neutral-400 group-hover:text-aura-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </NuxtLink>
          </template>

          <!-- Default: normal editable settings -->
          <template v-else>
          <div v-for="setting in groupSettings" :key="setting.key" class="grid grid-cols-3 gap-4 items-start">
            <label class="text-body-sm text-neutral-700 pt-2">
              {{ settingLabel(setting) }}
              <p v-if="setting.description" class="text-caption text-neutral-500 mt-1">{{ settingDescription(setting) }}</p>
            </label>
            
            <div class="col-span-2">
              <template v-if="setting.key === 'homepage_featured_brands'">
                <div class="space-y-4">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <p class="text-caption text-neutral-500">
                      Chon brand dang co trong catalog. Neu de trong, trang chu se tu dong lay 5 brand dau tien.
                    </p>
                    <button
                      type="button"
                      class="text-caption uppercase tracking-wider text-neutral-500 hover:text-aura-black transition-colors"
                      @click="clearFeaturedBrands(setting)"
                    >
                      Bo chon
                    </button>
                  </div>

                  <div v-if="getFeaturedBrandsValue(setting).length > 0" class="flex flex-wrap gap-2">
                    <button
                      v-for="selectedBrand in getFeaturedBrandsValue(setting)"
                      :key="selectedBrand"
                      type="button"
                      class="inline-flex items-center gap-2 rounded-full border border-aura-black bg-aura-black px-3 py-1.5 text-caption uppercase tracking-wider text-white"
                      @click="toggleFeaturedBrand(setting, selectedBrand)"
                    >
                      <span>{{ selectedBrand }}</span>
                      <span aria-hidden="true">x</span>
                    </button>
                  </div>
                  <p v-else class="text-body-sm text-neutral-500">
                    Chua chon brand nao.
                  </p>

                  <div v-if="catalogBrands.length > 0" class="flex flex-wrap gap-2">
                    <button
                      v-for="brandOption in catalogBrands"
                      :key="brandOption.name"
                      type="button"
                      class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-caption uppercase tracking-wider transition-colors"
                      :class="isFeaturedBrandSelected(setting, brandOption.name)
                        ? 'border-aura-black bg-aura-black text-white'
                        : 'border-neutral-300 text-neutral-600 hover:border-aura-black hover:text-aura-black'"
                      @click="toggleFeaturedBrand(setting, brandOption.name)"
                    >
                      <span>{{ brandOption.name }}</span>
                      <span class="text-[10px] opacity-70">{{ brandOption.count }}</span>
                    </button>
                  </div>
                  <p v-else class="text-body-sm text-neutral-500">
                    Chua co brand nao trong catalog de chon.
                  </p>
                </div>
              </template>

              <!-- Text input -->
              <input
                v-else-if="setting.type === 'text'"
                v-model="setting.value"
                type="text"
                class="input-field"
              />
              
              <template v-else-if="setting.type === 'textarea'">
                <!-- Textarea -->
                <textarea
                  v-model="setting.value"
                  rows="3"
                  class="input-field"
                ></textarea>
              </template>
              <template v-else-if="setting.type === 'image'">
                <!-- Image Upload -->
                <div class="space-y-4">
                <!-- Current Image Preview -->
                <div v-if="setting.value" class="w-24 h-24 bg-neutral-100 rounded border border-neutral-200 overflow-hidden relative group">
                  <img :src="setting.value" :alt="setting.label" class="w-full h-full object-contain p-2" />
                  <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button @click="setting.value = ''" class="text-white hover:text-red-400 p-2" :title="t('common.remove')">
                      <Icon name="ph:trash-fill" class="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <!-- Upload Button -->
                <div class="flex items-center gap-4">
                  <button 
                    @click="triggerImageUpload(setting.key)" 
                    type="button"
                    class="btn-secondary py-2"
                    :disabled="uploadingStates[setting.key]"
                  >
                    <Icon v-if="uploadingStates[setting.key]" name="ph:spinner-gap-bold" class="w-5 h-5 animate-spin mr-2" />
                    <Icon v-else name="ph:upload-simple-bold" class="w-5 h-5 mr-2" />
                    {{ uploadingStates[setting.key] ? t('admin.aiConfig.uploading') : t('admin.aiConfig.uploadAvatar') }}
                  </button>
                  <p class="text-caption text-neutral-500">{{ t('admin.aiConfig.avatarHint') }}</p>
                  
                  <input
                    type="file"
                    :ref="(el) => { if (el) fileInputs[setting.key] = el as HTMLInputElement }"
                    accept="image/jpeg, image/png, image/webp"
                    class="hidden"
                    @change="(e) => handleImageUpload(e, setting)"
                  />
                </div>
              </div>
              </template>

              <template v-else-if="setting.type === 'boolean'">
                <!-- Boolean -->
                <div class="pt-2">
                  <input v-model="setting.value" type="checkbox" class="w-5 h-5" />
                </div>
              </template>
            </div>
          </div>
          </template>
        </div>
      </div>

      <!-- Seed Button -->
      <div v-if="Object.keys(settings).length === 0" class="text-center py-12">
        <p class="text-neutral-500 mb-4">{{ t('admin.settings.noSettings') }}</p>
        <button @click="seedDefaults" class="btn-secondary">
          {{ t('admin.settings.createDefaults') }}
        </button>
      </div>
    </div>
  </div>
</template>
