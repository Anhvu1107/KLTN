<script setup lang="ts">
/**
 * Admin Banners Page
 * AURA ARCHIVE - Visual banner management grouped by section
 */

import { useDialog } from '~/composables/useDialog'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const route = useRoute()
const { t } = useI18n()
const config = useRuntimeConfig()
const getToken = () => process.client ? localStorage.getItem('token') : null
const { confirm: showConfirm } = useDialog()

// Section definitions
const SECTIONS = computed(() => [
  { key: 'hero', label: t('admin.banners.sections.hero'), desc: t('admin.banners.sectionDesc.hero') },
  { key: 'collection_women', label: t('admin.banners.sections.collection_women'), desc: t('admin.banners.sectionDesc.collection_women') },
  { key: 'collection_men', label: t('admin.banners.sections.collection_men'), desc: t('admin.banners.sectionDesc.collection_men') },
  { key: 'homepage_categories', label: t('admin.banners.sections.homepage_categories'), desc: t('admin.banners.sectionDesc.homepage_categories') },
  { key: 'about', label: t('admin.banners.sections.about'), desc: t('admin.banners.sectionDesc.about') },
  { key: 'page_sale', label: t('admin.banners.sections.page_sale'), desc: t('admin.banners.sectionDesc.page_sale') },
  { key: 'page_new_arrivals', label: t('admin.banners.sections.page_new_arrivals'), desc: t('admin.banners.sectionDesc.page_new_arrivals') },
  { key: 'page_featured', label: t('admin.banners.sections.page_featured'), desc: t('admin.banners.sectionDesc.page_featured') },
  { key: 'general', label: t('admin.banners.sections.general'), desc: t('admin.banners.sectionDesc.general') },
])

const PAGE_GROUPS = computed(() => [
  { key: 'home', label: t('admin.banners.groups.home'), sections: ['hero', 'collection_women', 'collection_men', 'homepage_categories'] },
  { key: 'sale', label: t('admin.banners.groups.sale'), sections: ['page_sale'] },
  { key: 'new_arrivals', label: t('admin.banners.groups.new_arrivals'), sections: ['page_new_arrivals'] },
  { key: 'featured', label: t('admin.banners.groups.featured'), sections: ['page_featured'] },
  { key: 'about', label: t('admin.banners.groups.about'), sections: ['about'] },
  { key: 'general', label: t('admin.banners.groups.general'), sections: ['general'] },
])

const currentGroupKey = computed(() => (route.query.group as string) || 'home')
const currentGroup = computed(() => PAGE_GROUPS.value.find((g: any) => g.key === currentGroupKey.value) || PAGE_GROUPS.value[0])
const currentSections = computed(() => SECTIONS.value.filter((s: any) => currentGroup.value.sections.includes(s.key)))

// Animation types
const ANIM_OPTIONS = computed(() => [
  { key: 'none', label: t('admin.banners.animNone'), icon: '⏸️' },
  { key: 'slide', label: t('admin.banners.animSlide'), icon: '◀▶' },
  { key: 'fade', label: t('admin.banners.animFade'), icon: '✨' },
])

// State
const banners = ref<any[]>([])
const isLoading = ref(true)
const showModal = ref(false)
const editingBanner = ref<any>(null)
const formError = ref('')
const isSubmitting = ref(false)

// Animation config per section
const animationConfig = ref<Record<string, string>>({})

const getAnimType = (sectionKey: string) => animationConfig.value[sectionKey] || 'none'

const setAnimType = async (sectionKey: string, animType: string) => {
  animationConfig.value[sectionKey] = animType
  try {
    const token = getToken()
    await $fetch(`${config.public.apiUrl}/admin/settings`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: { settings: [{ key: 'banner_animation_config', value: JSON.stringify(animationConfig.value) }] },
    })
  } catch (error) {
    console.error('Failed to save animation config:', error)
  }
}

const fetchAnimationConfig = async () => {
  try {
    const token = getToken()
    const response = await $fetch<{ success: boolean; data: any }>(
      `${config.public.apiUrl}/admin/settings`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const allSettings = response.data?.settings || response.data || {}
    for (const group of Object.values(allSettings) as any[]) {
      if (!Array.isArray(group)) continue
      for (const setting of group) {
        if (setting.key === 'banner_animation_config' && setting.value) {
          try { animationConfig.value = JSON.parse(setting.value) } catch {
            // Ignore invalid saved animation config.
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch animation config:', error)
  }
}

// Image upload state
const isUploading = ref(false)
const imagePreview = ref('')
const bannerFileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

// Form data
const formData = ref({
  title: '',
  subtitle: '',
  image_url: '',
  link_url: '',
  button_text: 'Shop Now',
  section: 'general',
  position: 0,
  is_active: true,
  starts_at: '',
  ends_at: '',
})

// Computed: group banners by section
const groupedBanners = computed(() => {
  const groups: Record<string, any[]> = {}
  for (const s of SECTIONS.value) { // Changed SECTIONS to SECTIONS.value
    groups[s.key] = banners.value.filter((b: any) => (b.section || 'general') === s.key)
  }
  return groups
})

// Fetch banners
const fetchBanners = async () => {
  isLoading.value = true
  try {
    const token = getToken()
    const response = await $fetch<{ success: boolean; data: { banners: any[] } }>(
      `${config.public.apiUrl}/admin/banners`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    banners.value = response.data.banners || []
  } catch (error) {
    console.error('Failed to fetch banners:', error)
  } finally {
    isLoading.value = false
  }
}

// Open create modal
const openCreateModal = (section = 'general') => {
  editingBanner.value = null
  imagePreview.value = ''
  formData.value = {
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '',
    button_text: 'Shop Now',
    section,
    position: groupedBanners.value[section]?.length || 0,
    is_active: true,
    starts_at: '',
    ends_at: '',
  }
  showModal.value = true
}

// Open edit modal
const openEditModal = (banner: any) => {
  editingBanner.value = banner
  formData.value = {
    title: banner.title,
    subtitle: banner.subtitle || '',
    image_url: banner.image_url,
    link_url: banner.link_url || '',
    button_text: banner.button_text || 'Shop Now',
    section: banner.section || 'general',
    position: banner.position,
    is_active: banner.is_active,
    starts_at: banner.starts_at ? banner.starts_at.split('T')[0] : '',
    ends_at: banner.ends_at ? banner.ends_at.split('T')[0] : '',
  }
  if (banner.image_url) {
    imagePreview.value = banner.image_url.startsWith('http')
      ? banner.image_url
      : `${config.public.apiUrl}${banner.image_url}`
  } else {
    imagePreview.value = ''
  }
  showModal.value = true
}

// Handle banner image upload
const handleBannerUpload = async (file: File) => {
  if (!file) return
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    formError.value = t('admin.banners.invalidImageType')
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    formError.value = t('admin.banners.maxImageSize')
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => { imagePreview.value = e.target?.result as string }
  reader.readAsDataURL(file)
  isUploading.value = true
  formError.value = ''
  try {
    const token = getToken()
    const uploadData = new FormData()
    uploadData.append('banner', file)
    const response = await $fetch<{ success: boolean; data: { url: string } }>(
      `${config.public.apiUrl}/admin/upload/banner`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: uploadData }
    )
    formData.value.image_url = response.data.url
  } catch (error: any) {
    formError.value = error.data?.message || t('admin.banners.uploadFailed')
    imagePreview.value = ''
  } finally {
    isUploading.value = false
  }
}

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) handleBannerUpload(input.files[0])
}
const onDragOver = (e: DragEvent) => { e.preventDefault(); isDragging.value = true }
const onDragLeave = () => { isDragging.value = false }
const onDrop = (e: DragEvent) => {
  e.preventDefault(); isDragging.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) handleBannerUpload(e.dataTransfer.files[0])
}
const removeImage = () => {
  imagePreview.value = ''
  formData.value.image_url = ''
  if (bannerFileInput.value) bannerFileInput.value.value = ''
}

// Submit form
const submitForm = async () => {
  formError.value = ''
  if (!formData.value.title.trim()) { formError.value = t('admin.banners.validationTitle'); return }
  if (!formData.value.image_url) { formError.value = t('admin.banners.validationImage'); return }
  isSubmitting.value = true
  try {
    const token = getToken()
    const url = editingBanner.value
      ? `${config.public.apiUrl}/admin/banners/${editingBanner.value.id}`
      : `${config.public.apiUrl}/admin/banners`
    const payload = {
      ...formData.value,
      starts_at: formData.value.starts_at || null,
      ends_at: formData.value.ends_at || null,
    }
    await $fetch(url, {
      method: editingBanner.value ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: payload,
    })
    showModal.value = false
    await fetchBanners()
  } catch (error: any) {
    formError.value = error.data?.message || t('admin.banners.saveFailed')
  } finally {
    isSubmitting.value = false
  }
}

// Delete banner
const deleteBanner = async (id: string) => {
  const ok = await showConfirm({ title: t('admin.deleteConfirm'), message: t('admin.deleteConfirmDesc', 'Hành động này không thể hoàn tác.'), type: 'danger', confirmText: t('common.delete'), icon: 'trash' })
  if (!ok) return
  try {
    const token = getToken()
    await $fetch(`${config.public.apiUrl}/admin/banners/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    })
    await fetchBanners()
  } catch (error) {
    console.error('Failed to delete banner:', error)
  }
}

// Toggle active status
const toggleActive = async (banner: any) => {
  try {
    const token = getToken()
    await $fetch(`${config.public.apiUrl}/admin/banners/${banner.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: { ...banner, is_active: !banner.is_active },
    })
    banner.is_active = !banner.is_active
  } catch (error) {
    console.error('Failed to toggle banner:', error)
  }
}

// Helpers
const getBannerImageSrc = (banner: any) => {
  if (!banner.image_url) return ''
  return banner.image_url.startsWith('http') ? banner.image_url : `${config.public.apiUrl}${banner.image_url}`
}

const getStatusText = (banner: any) => {
  if (!banner.is_active) return t('admin.banners.toggleOff')
  if (banner.ends_at && new Date(banner.ends_at) < new Date()) return t('admin.banners.statusExpired')
  if (banner.starts_at && new Date(banner.starts_at) > new Date()) return t('admin.banners.statusScheduled')
  return t('admin.banners.statusActive')
}

const getStatusClass = (banner: any) => {
  if (!banner.is_active) return 'bg-neutral-100 text-neutral-500'
  if (banner.ends_at && new Date(banner.ends_at) < new Date()) return 'bg-red-50 text-red-600'
  if (banner.starts_at && new Date(banner.starts_at) > new Date()) return 'bg-yellow-50 text-yellow-700'
  return 'bg-green-50 text-green-700'
}

onMounted(async () => {
  await Promise.all([fetchBanners(), fetchAnimationConfig()])
})
useSeoMeta({ title: 'Banner Management | Admin' })
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="font-serif text-heading-2 text-aura-black">{{ currentGroup.label }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ t('admin.banners.groupDesc', { group: currentGroup.label.toLowerCase() }) }}</p>
      </div>
      <button @click="openCreateModal()" class="btn-primary flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        {{ t('admin.banners.addBanner') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-16">
      <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto"></div>
    </div>

    <!-- Sections with banners -->
    <div v-else class="space-y-8">
      <div v-for="section in currentSections" :key="section.key">
        <!-- Section Header -->
        <div class="flex items-center justify-between mb-3">
          <div>
            <h2 class="text-body font-semibold text-aura-black">{{ section.label }}</h2>
            <p class="text-caption text-neutral-400">{{ section.desc }}</p>
          </div>
          <div class="flex items-center gap-2">
            <!-- Animation selector (only when section has 2+ banners) -->
            <div v-if="groupedBanners[section.key]?.length >= 2" class="flex items-center gap-1 mr-2">
              <span class="text-caption text-neutral-400 mr-1">{{ t('admin.banners.animEffect') }}</span>
              <button
                v-for="anim in ANIM_OPTIONS"
                :key="anim.key"
                @click="setAnimType(section.key, anim.key)"
                class="px-2 py-1 text-xs rounded-md border transition-all"
                :class="getAnimType(section.key) === anim.key
                  ? 'bg-aura-black text-white border-aura-black'
                  : 'bg-white text-neutral-500 border-neutral-300 hover:border-neutral-400'"
              >
                {{ anim.icon }} {{ anim.label }}
              </button>
            </div>
            <button
              @click="openCreateModal(section.key)"
              class="text-caption text-neutral-500 border border-dashed border-neutral-300 rounded-lg px-3 py-1.5 hover:border-neutral-400 hover:text-aura-black transition-colors flex items-center gap-1"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              {{ t('admin.banners.addBtn') }}
            </button>
          </div>
        </div>

        <!-- Banner cards for this section -->
        <div v-if="groupedBanners[section.key]?.length" class="space-y-3">
          <div
            v-for="banner in groupedBanners[section.key]"
            :key="banner.id"
            class="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div class="flex">
              <!-- Image Preview -->
              <div class="w-48 shrink-0 bg-neutral-100 relative">
                <img
                  v-if="banner.image_url"
                  :src="getBannerImageSrc(banner)"
                  :alt="banner.title"
                  class="w-full h-full object-cover"
                  style="min-height: 100px; max-height: 120px;"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-neutral-400 py-8">
                  <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
              </div>

              <!-- Info -->
              <div class="flex-1 px-4 py-3 flex flex-col justify-between min-w-0">
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-medium text-aura-black text-body truncate">{{ banner.title }}</h3>
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium shrink-0" :class="getStatusClass(banner)">
                      {{ getStatusText(banner) }}
                    </span>
                  </div>
                  <p v-if="banner.subtitle" class="text-caption text-neutral-500 truncate">{{ banner.subtitle }}</p>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-3 mt-2">
                  <button
                    @click="toggleActive(banner)"
                    class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
                    :class="banner.is_active ? 'bg-green-500' : 'bg-neutral-300'"
                  >
                    <span
                      class="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform"
                      :class="banner.is_active ? 'translate-x-[18px]' : 'translate-x-[3px]'"
                    />
                  </button>
                  <span class="text-xs text-neutral-400">{{ banner.is_active ? t('admin.banners.toggleOn') : t('admin.banners.toggleOff') }}</span>
                  <div class="flex-1"></div>
                  <button @click="openEditModal(banner)" class="px-2.5 py-1 text-xs text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    {{ t('admin.banners.editBtn') }}
                  </button>
                  <button @click="deleteBanner(banner.id)" class="px-2.5 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    {{ t('admin.banners.deleteBtn') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state for this section -->
        <div v-else class="border-2 border-dashed border-neutral-200 rounded-xl py-6 text-center text-neutral-400">
          <p class="text-caption">{{ t('admin.banners.noBannersInSection') }}</p>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showModal = false">
        <div class="bg-white rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
          <div class="p-6 border-b border-neutral-200 flex items-center justify-between">
            <h2 class="font-serif text-heading-4">{{ editingBanner ? t('admin.banners.editBanner') : t('admin.banners.addBanner') }}</h2>
            <button @click="showModal = false" class="p-1 hover:bg-neutral-100 rounded-lg transition-colors">
              <svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <form @submit.prevent="submitForm" class="p-6 space-y-5">
            <!-- Section selector -->
            <div>
              <label class="input-label">{{ t('admin.banners.sectionLabel') }} *</label>
              <select v-model="formData.section" class="input-field">
                <option v-for="s in SECTIONS" :key="s.key" :value="s.key">{{ s.label }}</option>
              </select>
              <p class="text-caption text-neutral-400 mt-1">{{ SECTIONS.find(s => s.key === formData.section)?.desc }}</p>
            </div>

            <!-- Title -->
            <div>
              <label class="input-label">{{ t('admin.form.title') }} *</label>
              <input v-model="formData.title" type="text" class="input-field" required :placeholder="t('admin.banners.titlePlaceholder')" />
            </div>

            <!-- Subtitle -->
            <div>
              <label class="input-label">{{ t('admin.form.subtitle') }}</label>
              <input v-model="formData.subtitle" type="text" class="input-field" :placeholder="t('admin.banners.subtitlePlaceholder')" />
            </div>

            <!-- Image Upload -->
            <div>
              <label class="input-label">{{ t('admin.banners.bannerImage') }} *</label>
              <input ref="bannerFileInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onFileChange" />
              <div
                v-if="!imagePreview"
                class="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
                :class="isDragging ? 'border-aura-black bg-neutral-50' : 'border-neutral-300 hover:border-neutral-400'"
                @click="bannerFileInput?.click()"
                @dragover="onDragOver"
                @dragleave="onDragLeave"
                @drop="onDrop"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 mx-auto text-neutral-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p class="text-body-sm text-neutral-600">{{ t('admin.banners.dragDropHint') }} <span class="text-aura-black font-medium underline">{{ t('admin.banners.chooseImage') }}</span></p>
                <p class="text-caption text-neutral-400 mt-1">{{ t('admin.banners.imageFormats') }}</p>
              </div>
              <div v-else class="relative rounded-lg overflow-hidden border border-neutral-200">
                <img :src="imagePreview" alt="Banner preview" class="w-full h-48 object-cover" />
                <div v-if="isUploading" class="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div class="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full"></div>
                </div>
                <button v-else type="button" @click="removeImage" class="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors" :title="t('admin.banners.removeImage')">✕</button>
              </div>
            </div>

            <!-- Link & Button Text -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="input-label">{{ t('admin.banners.linkLabel') }}</label>
                <input v-model="formData.link_url" type="text" class="input-field" placeholder="/shop" />
              </div>
              <div>
                <label class="input-label">{{ t('admin.banners.buttonTextLabel') }}</label>
                <input v-model="formData.button_text" type="text" class="input-field" placeholder="Shop Now" />
              </div>
            </div>

            <!-- Schedule -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="input-label">{{ t('admin.banners.startDateLabel') }} <span class="text-neutral-400 font-normal">({{ t('admin.banners.optional') }})</span></label>
                <input v-model="formData.starts_at" type="date" class="input-field" />
              </div>
              <div>
                <label class="input-label">{{ t('admin.banners.endDateLabel') }} <span class="text-neutral-400 font-normal">({{ t('admin.banners.optional') }})</span></label>
                <input v-model="formData.ends_at" type="date" class="input-field" />
              </div>
            </div>

            <!-- Active toggle -->
            <div class="flex items-center gap-3 py-2">
              <button
                type="button"
                @click="formData.is_active = !formData.is_active"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                :class="formData.is_active ? 'bg-green-500' : 'bg-neutral-300'"
              >
                <span class="inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform" :class="formData.is_active ? 'translate-x-6' : 'translate-x-1'" />
              </button>
              <span class="text-body-sm">{{ formData.is_active ? t('admin.banners.activeAfterSave') : t('admin.banners.hiddenNotVisible') }}</span>
            </div>

            <p v-if="formError" class="text-red-600 text-body-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ formError }}</p>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="showModal = false" class="px-5 py-2.5 text-body-sm text-neutral-600 hover:text-aura-black rounded-lg hover:bg-neutral-100 transition-colors">
                {{ t('common.cancel') }}
              </button>
              <button type="submit" :disabled="isSubmitting" class="btn-primary">
                {{ isSubmitting ? t('common.saving') : t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
