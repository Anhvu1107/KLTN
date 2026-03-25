<script setup lang="ts">
/**
 * Admin Banners Page
 * AURA ARCHIVE - Visual banner management with drag-free reordering
 */

import { useDialog } from '~/composables/useDialog'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { t } = useI18n()
const config = useRuntimeConfig()
const getToken = () => process.client ? localStorage.getItem('token') : null
const { confirm: showConfirm } = useDialog()

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
    banners.value = (response.data.banners || []).sort((a: any, b: any) => a.position - b.position)
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
    formError.value = 'Chỉ chấp nhận file ảnh JPEG, PNG hoặc WebP'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    formError.value = 'Kích thước ảnh tối đa 10MB'
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
    formError.value = error.data?.message || 'Upload ảnh thất bại'
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
  if (!formData.value.title.trim()) { formError.value = 'Vui lòng nhập tiêu đề'; return }
  if (!formData.value.image_url) { formError.value = 'Vui lòng upload ảnh banner'; return }
  isSubmitting.value = true
  try {
    const token = getToken()
    const url = editingBanner.value
      ? `${config.public.apiUrl}/admin/banners/${editingBanner.value.id}`
      : `${config.public.apiUrl}/admin/banners`
    const payload = {
      ...formData.value,
      position: editingBanner.value ? formData.value.position : banners.value.length,
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
    formError.value = error.data?.message || 'Lưu thất bại'
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

// Toggle active status directly
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

// Move banner up/down (swap positions)
const moveBanner = async (index: number, direction: 'up' | 'down') => {
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= banners.value.length) return

  const token = getToken()
  const current = banners.value[index]
  const target = banners.value[targetIndex]
  const tempPos = current.position

  try {
    await Promise.all([
      $fetch(`${config.public.apiUrl}/admin/banners/${current.id}`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` },
        body: { ...current, position: target.position },
      }),
      $fetch(`${config.public.apiUrl}/admin/banners/${target.id}`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` },
        body: { ...target, position: tempPos },
      }),
    ])
    await fetchBanners()
  } catch (error) {
    console.error('Failed to reorder:', error)
  }
}

// Helpers
const getBannerImageSrc = (banner: any) => {
  if (!banner.image_url) return ''
  return banner.image_url.startsWith('http') ? banner.image_url : `${config.public.apiUrl}${banner.image_url}`
}

const getStatusText = (banner: any) => {
  if (!banner.is_active) return 'Tắt'
  if (banner.ends_at && new Date(banner.ends_at) < new Date()) return 'Hết hạn'
  if (banner.starts_at && new Date(banner.starts_at) > new Date()) return 'Chờ hiển thị'
  return 'Đang hiển thị'
}

const getStatusClass = (banner: any) => {
  if (!banner.is_active) return 'bg-neutral-100 text-neutral-500'
  if (banner.ends_at && new Date(banner.ends_at) < new Date()) return 'bg-red-50 text-red-600'
  if (banner.starts_at && new Date(banner.starts_at) > new Date()) return 'bg-yellow-50 text-yellow-700'
  return 'bg-green-50 text-green-700'
}

onMounted(fetchBanners)
useSeoMeta({ title: 'Banner Management | Admin' })
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="font-serif text-heading-2 text-aura-black">{{ t('admin.banners.title') }}</h1>
        <p class="text-body-sm text-neutral-500 mt-1">Quản lý các banner hiển thị trên trang chủ (Hero Slider). Kéo thứ tự để thay đổi vị trí slide.</p>
      </div>
      <button @click="openCreateModal" class="btn-primary flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        {{ t('admin.banners.addBanner') }}
      </button>
    </div>

    <!-- Info box -->
    <div class="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 flex items-start gap-3">
      <svg class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      <p class="text-body-sm text-amber-800">Banner sẽ hiển thị theo thứ tự từ trên xuống dưới. Slide 1 hiển thị đầu tiên khi khách truy cập trang chủ. Dùng nút <strong>↑ ↓</strong> để thay đổi thứ tự.</p>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-16">
      <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto"></div>
    </div>

    <!-- Banner List -->
    <div v-else class="space-y-4">
      <div
        v-for="(banner, index) in banners"
        :key="banner.id"
        class="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      >
        <div class="flex">
          <!-- Slide Number -->
          <div class="w-20 bg-neutral-50 flex flex-col items-center justify-center border-r border-neutral-200 shrink-0 py-4">
            <span class="text-xs text-neutral-400 uppercase tracking-wider font-medium">Slide</span>
            <span class="text-2xl font-bold text-aura-black mt-1">{{ index + 1 }}</span>
            <!-- Reorder buttons -->
            <div class="flex flex-col gap-1 mt-3">
              <button
                @click="moveBanner(index, 'up')"
                :disabled="index === 0"
                class="p-1 rounded hover:bg-neutral-200 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                title="Di chuyển lên"
              >
                <svg class="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
              </button>
              <button
                @click="moveBanner(index, 'down')"
                :disabled="index === banners.length - 1"
                class="p-1 rounded hover:bg-neutral-200 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                title="Di chuyển xuống"
              >
                <svg class="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </button>
            </div>
          </div>

          <!-- Image Preview -->
          <div class="w-64 shrink-0 bg-neutral-100 relative">
            <img
              v-if="banner.image_url"
              :src="getBannerImageSrc(banner)"
              :alt="banner.title"
              class="w-full h-full object-cover"
              style="min-height: 140px; max-height: 160px;"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-neutral-400 py-12">
              <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
          </div>

          <!-- Info -->
          <div class="flex-1 px-5 py-4 flex flex-col justify-between min-w-0">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-medium text-aura-black text-body truncate">{{ banner.title }}</h3>
                <span class="px-2 py-0.5 rounded-full text-xs font-medium shrink-0" :class="getStatusClass(banner)">
                  {{ getStatusText(banner) }}
                </span>
              </div>
              <p v-if="banner.subtitle" class="text-body-sm text-neutral-500 truncate">{{ banner.subtitle }}</p>
              <div class="flex items-center gap-4 mt-2 text-xs text-neutral-400">
                <span v-if="banner.link_url" class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                  {{ banner.link_url }}
                </span>
                <span v-if="banner.button_text" class="flex items-center gap-1">
                  Nút: "{{ banner.button_text }}"
                </span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-3 mt-3">
              <!-- Active Toggle -->
              <button
                @click="toggleActive(banner)"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                :class="banner.is_active ? 'bg-green-500' : 'bg-neutral-300'"
                :title="banner.is_active ? 'Đang bật - Click để tắt' : 'Đang tắt - Click để bật'"
              >
                <span
                  class="inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform"
                  :class="banner.is_active ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
              <span class="text-xs text-neutral-500">{{ banner.is_active ? 'Bật' : 'Tắt' }}</span>

              <div class="flex-1"></div>

              <!-- Edit -->
              <button
                @click="openEditModal(banner)"
                class="px-3 py-1.5 text-body-sm text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50 hover:border-neutral-400 transition-colors flex items-center gap-1.5"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                {{ t('common.edit') }}
              </button>
              <!-- Delete -->
              <button
                @click="deleteBanner(banner.id)"
                class="px-3 py-1.5 text-body-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors flex items-center gap-1.5"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                {{ t('common.delete') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="banners.length === 0" class="text-center py-16 bg-white rounded-xl border-2 border-dashed border-neutral-200">
        <svg class="w-16 h-16 mx-auto text-neutral-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        <p class="text-neutral-500 text-body mb-4">{{ t('admin.banners.noBanners') }}</p>
        <button @click="openCreateModal" class="btn-primary">
          + {{ t('admin.banners.addBanner') }}
        </button>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showModal = false">
        <div class="bg-white rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
          <div class="p-6 border-b border-neutral-200 flex items-center justify-between">
            <h2 class="font-serif text-heading-4">{{ editingBanner ? t('admin.banners.editBanner') : t('admin.banners.createBanner') }}</h2>
            <button @click="showModal = false" class="p-1 hover:bg-neutral-100 rounded-lg transition-colors">
              <svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <form @submit.prevent="submitForm" class="p-6 space-y-5">
            <!-- Title -->
            <div>
              <label class="input-label">{{ t('admin.form.title') }} *</label>
              <input v-model="formData.title" type="text" class="input-field" required placeholder="Ví dụ: Summer Collection 2024" />
            </div>

            <!-- Subtitle -->
            <div>
              <label class="input-label">{{ t('admin.form.subtitle') }}</label>
              <input v-model="formData.subtitle" type="text" class="input-field" placeholder="Mô tả ngắn cho banner" />
            </div>

            <!-- Image Upload -->
            <div>
              <label class="input-label">Ảnh banner *</label>
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
                <p class="text-body-sm text-neutral-600">Kéo thả ảnh vào đây hoặc <span class="text-aura-black font-medium underline">chọn ảnh</span></p>
                <p class="text-caption text-neutral-400 mt-1">JPEG, PNG, WebP — Tối đa 10MB — Khuyến nghị 1920×600px</p>
              </div>
              <div v-else class="relative rounded-lg overflow-hidden border border-neutral-200">
                <img :src="imagePreview" alt="Banner preview" class="w-full h-48 object-cover" />
                <div v-if="isUploading" class="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div class="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full"></div>
                </div>
                <button v-else type="button" @click="removeImage" class="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors" title="Xóa ảnh">✕</button>
              </div>
            </div>

            <!-- Link & Button Text -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="input-label">Đường dẫn khi click</label>
                <input v-model="formData.link_url" type="text" class="input-field" placeholder="/shop" />
              </div>
              <div>
                <label class="input-label">Văn bản nút</label>
                <input v-model="formData.button_text" type="text" class="input-field" placeholder="Shop Now" />
              </div>
            </div>

            <!-- Schedule -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="input-label">Ngày bắt đầu <span class="text-neutral-400 font-normal">(tùy chọn)</span></label>
                <input v-model="formData.starts_at" type="date" class="input-field" />
              </div>
              <div>
                <label class="input-label">Ngày kết thúc <span class="text-neutral-400 font-normal">(tùy chọn)</span></label>
                <input v-model="formData.ends_at" type="date" class="input-field" />
              </div>
            </div>

            <!-- Active toggle in form -->
            <div class="flex items-center gap-3 py-2">
              <button
                type="button"
                @click="formData.is_active = !formData.is_active"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                :class="formData.is_active ? 'bg-green-500' : 'bg-neutral-300'"
              >
                <span class="inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform" :class="formData.is_active ? 'translate-x-6' : 'translate-x-1'" />
              </button>
              <span class="text-body-sm">{{ formData.is_active ? 'Hiển thị ngay sau khi lưu' : 'Ẩn (không hiển thị trên trang chủ)' }}</span>
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
