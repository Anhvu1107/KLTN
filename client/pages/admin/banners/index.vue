<script setup lang="ts">
/**
 * Admin Banners Page
 * AURA ARCHIVE - Manage homepage banners
 */

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { t } = useI18n()
const config = useRuntimeConfig()
const getToken = () => process.client ? localStorage.getItem('token') : null

// State
const banners = ref<any[]>([])
const isLoading = ref(true)
const showModal = ref(false)
const editingBanner = ref<any>(null)
const formError = ref('')
const isSubmitting = ref(false)

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
  position: 0,
  is_active: true,
  starts_at: '',
  ends_at: '',
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
    banners.value = response.data.banners
  } catch (error) {
    console.error('Failed to fetch banners:', error)
  } finally {
    isLoading.value = false
  }
}

// Open create modal
const openCreateModal = () => {
  editingBanner.value = null
  imagePreview.value = ''
  formData.value = {
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '',
    button_text: 'Shop Now',
    position: banners.value.length,
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
    position: banner.position,
    is_active: banner.is_active,
    starts_at: banner.starts_at ? banner.starts_at.split('T')[0] : '',
    ends_at: banner.ends_at ? banner.ends_at.split('T')[0] : '',
  }
  // Set preview for existing banner image
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

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    formError.value = 'Chỉ chấp nhận file ảnh JPEG, PNG hoặc WebP'
    return
  }

  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    formError.value = 'Kích thước ảnh tối đa 10MB'
    return
  }

  // Show preview immediately
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)

  // Upload file
  isUploading.value = true
  formError.value = ''

  try {
    const token = getToken()
    const uploadData = new FormData()
    uploadData.append('banner', file)

    const response = await $fetch<{ success: boolean; data: { url: string } }>(
      `${config.public.apiUrl}/admin/upload/banner`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadData,
      }
    )

    formData.value.image_url = response.data.url
  } catch (error: any) {
    formError.value = error.data?.message || 'Upload ảnh thất bại'
    imagePreview.value = ''
  } finally {
    isUploading.value = false
  }
}

// File input change handler
const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    handleBannerUpload(input.files[0])
  }
}

// Drag & drop handlers
const onDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}
const onDragLeave = () => {
  isDragging.value = false
}
const onDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    handleBannerUpload(e.dataTransfer.files[0])
  }
}

// Remove image
const removeImage = () => {
  imagePreview.value = ''
  formData.value.image_url = ''
  if (bannerFileInput.value) {
    bannerFileInput.value.value = ''
  }
}

// Submit form
const submitForm = async () => {
  formError.value = ''

  if (!formData.value.image_url) {
    formError.value = 'Vui lòng upload ảnh banner'
    return
  }

  isSubmitting.value = true

  try {
    const token = getToken()
    const url = editingBanner.value
      ? `${config.public.apiUrl}/admin/banners/${editingBanner.value.id}`
      : `${config.public.apiUrl}/admin/banners`

    // Sanitize data before sending
    const payload = {
      ...formData.value,
      position: formData.value.position || 0,
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
    formError.value = error.data?.message || 'Failed to save banner'
  } finally {
    isSubmitting.value = false
  }
}

// Delete banner
const deleteBanner = async (id: string) => {
  if (!confirm(t('admin.deleteConfirm'))) return

  try {
    const token = getToken()
    await $fetch(`${config.public.apiUrl}/admin/banners/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    await fetchBanners()
  } catch (error) {
    console.error('Failed to delete banner:', error)
  }
}

onMounted(fetchBanners)

useSeoMeta({ title: 'Banner Management | Admin' })
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-serif text-heading-2 text-aura-black">{{ t('admin.banners.title') }}</h1>
      <button @click="openCreateModal" class="btn-primary">
        + {{ t('admin.banners.addBanner') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto"></div>
    </div>

    <!-- Banners Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="banner in banners" 
        :key="banner.id"
        class="card overflow-hidden"
      >
        <!-- Preview -->
        <div class="aspect-video bg-neutral-100 relative">
          <img 
            v-if="banner.image_url"
            :src="banner.image_url"
            :alt="banner.title"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-neutral-400">
            No Image
          </div>
          <div class="absolute top-2 right-2">
            <span 
              class="px-2 py-1 rounded text-caption"
              :class="banner.is_active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'"
            >
              {{ banner.is_active ? t('common.active') : t('common.inactive') }}
            </span>
          </div>
        </div>

        <!-- Info -->
        <div class="p-4">
          <h3 class="font-medium text-aura-black mb-1">{{ banner.title }}</h3>
          <p v-if="banner.subtitle" class="text-body-sm text-neutral-600 mb-2 line-clamp-1">{{ banner.subtitle }}</p>
          <p class="text-caption text-neutral-500">Position: {{ banner.position }}</p>
          
          <div class="flex gap-2 mt-4">
            <button @click="openEditModal(banner)" class="flex-1 py-2 text-body-sm border border-neutral-300 hover:border-neutral-400 transition-colors">
              {{ t('common.edit') }}
            </button>
            <button @click="deleteBanner(banner.id)" class="px-4 py-2 text-body-sm text-red-600 border border-red-200 hover:border-red-300 transition-colors">
              {{ t('common.delete') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-if="banners.length === 0" class="col-span-full text-center py-12 text-neutral-500">
        {{ t('admin.banners.noBanners') }}
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="bg-white rounded-sm w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6 border-b border-neutral-200">
            <h2 class="font-serif text-heading-4">{{ editingBanner ? t('admin.banners.editBanner') : t('admin.banners.createBanner') }}</h2>
          </div>

          <form @submit.prevent="submitForm" class="p-6 space-y-4">
            <div>
              <label class="input-label">{{ t('admin.form.title') }} *</label>
              <input v-model="formData.title" type="text" class="input-field" required />
            </div>

            <div>
              <label class="input-label">{{ t('admin.form.subtitle') }}</label>
              <input v-model="formData.subtitle" type="text" class="input-field" />
            </div>

            <div>
              <label class="input-label">{{ t('admin.form.imageUrl') }} *</label>
              <input
                ref="bannerFileInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                @change="onFileChange"
              />

              <!-- Upload area with preview -->
              <div
                v-if="!imagePreview"
                class="border-2 border-dashed rounded-sm p-8 text-center cursor-pointer transition-colors"
                :class="isDragging ? 'border-aura-black bg-neutral-50' : 'border-neutral-300 hover:border-neutral-400'"
                @click="bannerFileInput?.click()"
                @dragover="onDragOver"
                @dragleave="onDragLeave"
                @drop="onDrop"
              >
                <div class="text-neutral-400 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p class="text-body-sm text-neutral-600">Kéo thả ảnh vào đây hoặc <span class="text-aura-black font-medium underline">chọn ảnh</span></p>
                <p class="text-caption text-neutral-400 mt-1">JPEG, PNG, WebP — Tối đa 10MB</p>
              </div>

              <!-- Image preview -->
              <div v-else class="relative rounded-sm overflow-hidden border border-neutral-200">
                <img :src="imagePreview" alt="Banner preview" class="w-full h-48 object-cover" />
                <div v-if="isUploading" class="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div class="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full"></div>
                </div>
                <button
                  v-else
                  type="button"
                  @click="removeImage"
                  class="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                  title="Xóa ảnh"
                >
                  ✕
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="input-label">{{ t('admin.form.linkUrl') }}</label>
                <input v-model="formData.link_url" type="text" class="input-field" placeholder="/shop" />
              </div>
              <div>
                <label class="input-label">{{ t('admin.form.buttonText') }}</label>
                <input v-model="formData.button_text" type="text" class="input-field" />
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="input-label">{{ t('admin.form.position') }}</label>
                <input v-model.number="formData.position" type="number" min="0" class="input-field" />
              </div>
              <div>
                <label class="input-label">{{ t('admin.form.startDate') }}</label>
                <input v-model="formData.starts_at" type="date" class="input-field" />
              </div>
              <div>
                <label class="input-label">{{ t('admin.form.endDate') }}</label>
                <input v-model="formData.ends_at" type="date" class="input-field" />
              </div>
            </div>

            <div class="flex items-center gap-2">
              <input v-model="formData.is_active" type="checkbox" id="is_active" class="w-4 h-4" />
              <label for="is_active" class="text-body-sm">{{ t('common.active') }}</label>
            </div>

            <p v-if="formError" class="text-red-600 text-body-sm">{{ formError }}</p>

            <div class="flex justify-end gap-3 pt-4">
              <button type="button" @click="showModal = false" class="px-4 py-2 text-body-sm text-neutral-600 hover:text-aura-black">
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
