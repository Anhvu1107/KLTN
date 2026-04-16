<script setup lang="ts">
/**
 * Admin Popups Page
 * AURA ARCHIVE - Marketing popup management with intuitive UX
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
const popups = ref<any[]>([])
const isLoading = ref(true)
const showModal = ref(false)
const editingPopup = ref<any>(null)
const formError = ref('')
const isSubmitting = ref(false)
const isUploading = ref(false)
const imagePreview = ref('')
const popupFileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

const formData = ref({
  name: '',
  title: '',
  content: '',
  image_url: '',
  button_text: '',
  button_link: '',
  position: 'center',
  trigger_type: 'delay',
  trigger_value: 3,
  is_active: true,
  starts_at: '',
  ends_at: '',
})

const fetchPopups = async () => {
  try {
    const token = getToken()
    const response = await $fetch<{ success: boolean; data: { popups: any[] } }>(
      `${config.public.apiUrl}/admin/popups`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    popups.value = response.data.popups || []
  } catch (error) {
    console.error('Failed to fetch popups:', error)
  } finally {
    isLoading.value = false
  }
}

const openCreate = () => {
  editingPopup.value = null
  formError.value = ''
  imagePreview.value = ''
  formData.value = { name: '', title: '', content: '', image_url: '', button_text: t('common.viewNow'), button_link: '', position: 'center', trigger_type: 'delay', trigger_value: 3, is_active: true, starts_at: '', ends_at: '' }
  showModal.value = true
}

const openEdit = (popup: any) => {
  editingPopup.value = popup
  formError.value = ''
  formData.value = { ...popup, starts_at: popup.starts_at?.split('T')[0] || '', ends_at: popup.ends_at?.split('T')[0] || '' }
  if (popup.image_url) {
    imagePreview.value = popup.image_url.startsWith('http') ? popup.image_url : `${config.public.apiUrl}${popup.image_url}`
  } else {
    imagePreview.value = ''
  }
  showModal.value = true
}

const savePopup = async () => {
  formError.value = ''
  if (!formData.value.name.trim()) { formError.value = t('admin.popups.nameRequired'); return }
  isSubmitting.value = true
  try {
    const token = getToken()
    const url = editingPopup.value
      ? `${config.public.apiUrl}/admin/popups/${editingPopup.value.id}`
      : `${config.public.apiUrl}/admin/popups`
    await $fetch(url, {
      method: editingPopup.value ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { ...formData.value, starts_at: formData.value.starts_at || null, ends_at: formData.value.ends_at || null },
    })
    showModal.value = false
    await fetchPopups()
  } catch (error: any) {
    formError.value = error.data?.message || t('notifications.updateError')
  } finally {
    isSubmitting.value = false
  }
}

const deletePopup = async (id: string) => {
  const ok = await showConfirm({ title: t('admin.deleteConfirm'), message: t('admin.deleteConfirmDesc'), type: 'danger', confirmText: t('common.delete'), icon: 'trash' })
  if (!ok) return
  try {
    const token = getToken()
    await $fetch(`${config.public.apiUrl}/admin/popups/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    await fetchPopups()
  } catch (error) {
    console.error('Failed to delete popup:', error)
  }
}

const toggleActive = async (popup: any) => {
  try {
    const token = getToken()
    await $fetch(`${config.public.apiUrl}/admin/popups/${popup.id}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}` },
      body: { ...popup, is_active: !popup.is_active },
    })
    popup.is_active = !popup.is_active
  } catch (error) {
    console.error('Failed to toggle popup:', error)
  }
}

// Image upload handlers
const handlePopupImageUpload = async (file: File) => {
  if (!file) return
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) { formError.value = t('admin.popups.imageFormats'); return }
  if (file.size > 10 * 1024 * 1024) { formError.value = t('admin.popups.imageFormats'); return }
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
    formError.value = error.data?.message || t('notifications.uploadFailed')
    imagePreview.value = ''
  } finally {
    isUploading.value = false
  }
}
const onPopupFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) handlePopupImageUpload(input.files[0])
}
const onPopupDragOver = (e: DragEvent) => { e.preventDefault(); isDragging.value = true }
const onPopupDragLeave = () => { isDragging.value = false }
const onPopupDrop = (e: DragEvent) => {
  e.preventDefault(); isDragging.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) handlePopupImageUpload(e.dataTransfer.files[0])
}
const removePopupImage = () => {
  imagePreview.value = ''
  formData.value.image_url = ''
  if (popupFileInput.value) popupFileInput.value.value = ''
}

// Helpers
const getTriggerDetail = (popup: any) => {
  if (popup.trigger_type === 'delay') return t('admin.popups.triggerDetail.delay', { value: popup.trigger_value })
  if (popup.trigger_type === 'scroll') return t('admin.popups.triggerDetail.scroll', { value: popup.trigger_value })
  if (popup.trigger_type === 'exit') return t('admin.popups.triggerDetail.exit')
  return t('admin.popups.triggerDetail.immediate')
}

const getPositionLabel = (pos: string) => {
  const labels: Record<string, string> = {
    center: t('admin.popups.positionLabel.center'),
    'bottom-left': t('admin.popups.positionLabel.bottom-left'),
    'bottom-right': t('admin.popups.positionLabel.bottom-right'),
    top: t('admin.popups.positionLabel.top'),
  }
  return labels[pos] || pos
}

const getStatusText = (popup: any) => {
  if (!popup.is_active) return t('admin.popups.status.off')
  if (popup.ends_at && new Date(popup.ends_at) < new Date()) return t('admin.popups.status.expired')
  if (popup.starts_at && new Date(popup.starts_at) > new Date()) return t('admin.popups.status.scheduled')
  return t('admin.popups.status.active')
}

const getStatusClass = (popup: any) => {
  if (!popup.is_active) return 'bg-neutral-100 text-neutral-500'
  if (popup.ends_at && new Date(popup.ends_at) < new Date()) return 'bg-red-50 text-red-600'
  if (popup.starts_at && new Date(popup.starts_at) > new Date()) return 'bg-yellow-50 text-yellow-700'
  return 'bg-green-50 text-green-700'
}

onMounted(fetchPopups)
useSeoMeta({ title: 'Popup Manager | Admin' })
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="font-serif text-heading-2 text-aura-black">{{ t('admin.popups.title') }}</h1>
        <p class="text-body-sm text-neutral-500 mt-1">{{ t('admin.popups.subtitle') }}</p>
      </div>
      <button @click="openCreate" class="btn-primary flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        {{ t('admin.popups.addPopup') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-16">
      <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto"></div>
    </div>

    <!-- Popup Cards -->
    <div v-else class="space-y-4">
      <div
        v-for="popup in popups"
        :key="popup.id"
        class="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      >
        <div class="flex">
          <!-- Visual indicator -->
          <div class="w-2 shrink-0" :class="popup.is_active ? 'bg-green-500' : 'bg-neutral-300'"></div>

          <!-- Content -->
          <div class="flex-1 px-5 py-4">
            <!-- Top row: name + status -->
            <div class="flex items-center gap-3 mb-2">
              <h3 class="font-medium text-aura-black text-body">{{ popup.name }}</h3>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="getStatusClass(popup)">
                {{ getStatusText(popup) }}
              </span>
            </div>

            <!-- Title & Content preview -->
            <p v-if="popup.title" class="text-body-sm text-neutral-600 mb-1">📝 {{ popup.title }}</p>
            <p v-if="popup.content" class="text-xs text-neutral-400 mb-3 line-clamp-1">{{ popup.content }}</p>

            <!-- Info chips -->
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">
                {{ getTriggerDetail(popup) }}
              </span>
              <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-50 text-neutral-600 rounded-full">
                {{ getPositionLabel(popup.position) }}
              </span>
              <span v-if="popup.button_text" class="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-50 text-neutral-600 rounded-full">
                {{ t('admin.popups.buttonText') }}: "{{ popup.button_text }}"
              </span>
              <span v-if="popup.button_link" class="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-50 text-neutral-600 rounded-full">
                🔗 {{ popup.button_link }}
              </span>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-3 mt-4 pt-3 border-t border-neutral-100">
              <!-- Active Toggle -->
              <button
                @click="toggleActive(popup)"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                :class="popup.is_active ? 'bg-green-500' : 'bg-neutral-300'"
                :title="popup.is_active ? t('admin.popups.toggle.onTitle') : t('admin.popups.toggle.offTitle')"
              >
                <span class="inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform" :class="popup.is_active ? 'translate-x-6' : 'translate-x-1'" />
              </button>
              <span class="text-xs text-neutral-500">{{ popup.is_active ? t('admin.popups.toggle.onText') : t('admin.popups.toggle.offText') }}</span>

              <div class="flex-1"></div>

              <button @click="openEdit(popup)" class="px-3 py-1.5 text-body-sm text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50 hover:border-neutral-400 transition-colors flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                {{ t('common.edit') }}
              </button>
              <button @click="deletePopup(popup.id)" class="px-3 py-1.5 text-body-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                {{ t('common.delete') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="popups.length === 0" class="text-center py-16 bg-white rounded-xl border-2 border-dashed border-neutral-200">
        <svg class="w-16 h-16 mx-auto text-neutral-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
        <p class="text-neutral-500 text-body mb-4">{{ t('admin.popups.empty', 'Chưa có popup nào') }}</p>
        <button @click="openCreate" class="btn-primary">+ {{ t('admin.popups.addPopup') }}</button>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showModal = false">
        <div class="bg-white rounded-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
          <!-- Header -->
          <div class="p-6 border-b border-neutral-200 flex items-center justify-between">
            <h2 class="font-serif text-heading-4">{{ editingPopup ? t('admin.popups.editPopup') : t('admin.popups.createPopup') }}</h2>
            <button @click="showModal = false" class="p-1 hover:bg-neutral-100 rounded-lg transition-colors">
              <svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <form @submit.prevent="savePopup" class="p-6 space-y-5">
            <!-- Section: Basic info -->
            <div class="space-y-4">
              <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{{ t('admin.popups.basicInfo') }}</p>
              <div>
                <label class="input-label">{{ t('admin.popups.popupName') }} * <span class="font-normal text-neutral-400">{{ t('admin.popups.adminOnly') }}</span></label>
                <input v-model="formData.name" type="text" class="input-field" required />
              </div>
              <div>
                <label class="input-label">{{ t('admin.popups.popupTitle') }} <span class="font-normal text-neutral-400">{{ t('admin.popups.customerVisible') }}</span></label>
                <input v-model="formData.title" type="text" class="input-field" />
              </div>
              <div>
                <label class="input-label">{{ t('admin.popups.content') }}</label>
                <textarea v-model="formData.content" rows="3" class="input-field"></textarea>
              </div>
              <div>
                <label class="input-label">{{ t('admin.popups.popupImage') }} <span class="font-normal text-neutral-400">{{ t('admin.popups.optional') }}</span></label>
                <input ref="popupFileInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onPopupFileChange" />
                <div
                  v-if="!imagePreview && !formData.image_url"
                  class="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
                  :class="isDragging ? 'border-aura-black bg-neutral-50' : 'border-neutral-300 hover:border-neutral-400'"
                  @click="popupFileInput?.click()"
                  @dragover="onPopupDragOver"
                  @dragleave="onPopupDragLeave"
                  @drop="onPopupDrop"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 mx-auto text-neutral-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p class="text-body-sm text-neutral-600">{{ t('admin.popups.dragDropHint') }} <span class="text-aura-black font-medium underline">{{ t('admin.popups.chooseImage') }}</span></p>
                  <p class="text-caption text-neutral-400 mt-1">{{ t('admin.popups.imageFormats') }}</p>
                </div>
                <div v-else class="relative rounded-lg overflow-hidden border border-neutral-200">
                  <img :src="imagePreview || `${config.public.apiUrl}${formData.image_url}`" alt="Popup preview" class="w-full h-40 object-cover" />
                  <div v-if="isUploading" class="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div class="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full"></div>
                  </div>
                  <button v-else type="button" @click="removePopupImage" class="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors" :title="t('admin.popups.removeImage')">✕</button>
                </div>
              </div>
            </div>

            <!-- Section: Button -->
            <div class="space-y-4 pt-2">
              <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{{ t('admin.popups.cta') }}</p>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="input-label">{{ t('admin.popups.buttonText') }}</label>
                  <input v-model="formData.button_text" type="text" class="input-field" />
                </div>
                <div>
                  <label class="input-label">{{ t('admin.popups.buttonLink') }}</label>
                  <input v-model="formData.button_link" type="text" class="input-field" />
                </div>
              </div>
            </div>

            <!-- Section: Trigger -->
            <div class="space-y-4 pt-2">
              <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{{ t('admin.popups.whenToShow') }}</p>
              <div class="grid grid-cols-1 gap-2">
                <label
                  v-for="opt in [
                    { value: 'delay', icon: '⏱️', label: t('admin.popups.triggerLabel.delay'), desc: t('admin.popups.triggerDesc.delay') },
                    { value: 'scroll', icon: '📜', label: t('admin.popups.triggerLabel.scroll'), desc: t('admin.popups.triggerDesc.scroll') },
                    { value: 'exit', icon: '🚪', label: t('admin.popups.triggerLabel.exit'), desc: t('admin.popups.triggerDesc.exit') },
                    { value: 'immediate', icon: '⚡', label: t('admin.popups.triggerLabel.immediate'), desc: t('admin.popups.triggerDesc.immediate') },
                  ]"
                  :key="opt.value"
                  class="flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors"
                  :class="formData.trigger_type === opt.value ? 'border-aura-black bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'"
                >
                  <input type="radio" v-model="formData.trigger_type" :value="opt.value" class="mt-0.5" />
                  <div>
                    <span class="text-body-sm font-medium">{{ opt.icon }} {{ opt.label }}</span>
                    <p class="text-xs text-neutral-400 mt-0.5">{{ opt.desc }}</p>
                  </div>
                </label>
              </div>
              <!-- Conditional value input -->
              <div v-if="formData.trigger_type === 'delay'" class="flex items-center gap-2 pl-1">
                <label class="text-body-sm text-neutral-600">{{ t('admin.popups.showAfter') }}</label>
                <input v-model.number="formData.trigger_value" type="number" min="1" max="60" class="input-field w-20 text-center" />
                <span class="text-body-sm text-neutral-600">{{ t('admin.popups.seconds') }}</span>
              </div>
              <div v-if="formData.trigger_type === 'scroll'" class="flex items-center gap-2 pl-1">
                <label class="text-body-sm text-neutral-600">{{ t('admin.popups.showWhenScroll') }}</label>
                <input v-model.number="formData.trigger_value" type="number" min="1" max="100" class="input-field w-20 text-center" />
                <span class="text-body-sm text-neutral-600">{{ t('admin.popups.pagePercent') }}</span>
              </div>
            </div>

            <!-- Section: Position -->
            <div class="space-y-4 pt-2">
              <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{{ t('admin.popups.displayPosition') }}</p>
              <div class="grid grid-cols-2 gap-2">
                <label
                  v-for="pos in [
                    { value: 'center', icon: '📍', label: t('admin.popups.positionLabel.center') },
                    { value: 'bottom-right', icon: '↘️', label: t('admin.popups.positionLabel.bottom-right') },
                    { value: 'bottom-left', icon: '↙️', label: t('admin.popups.positionLabel.bottom-left') },
                    { value: 'top', icon: '⬆️', label: t('admin.popups.positionLabel.top') },
                  ]"
                  :key="pos.value"
                  class="flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors"
                  :class="formData.position === pos.value ? 'border-aura-black bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'"
                >
                  <input type="radio" v-model="formData.position" :value="pos.value" />
                  <span class="text-body-sm">{{ pos.icon }} {{ pos.label }}</span>
                </label>
              </div>
            </div>

            <!-- Section: Schedule -->
            <div class="space-y-4 pt-2">
              <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{{ t('admin.popups.schedule') }} <span class="font-normal">{{ t('admin.popups.optional') }}</span></p>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="input-label">{{ t('admin.popups.startDate') }}</label>
                  <input v-model="formData.starts_at" type="date" class="input-field" />
                </div>
                <div>
                  <label class="input-label">{{ t('admin.popups.endDate') }}</label>
                  <input v-model="formData.ends_at" type="date" class="input-field" />
                </div>
              </div>
            </div>

            <!-- Active toggle -->
            <div class="flex items-center gap-3 pt-2">
              <button
                type="button"
                @click="formData.is_active = !formData.is_active"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                :class="formData.is_active ? 'bg-green-500' : 'bg-neutral-300'"
              >
                <span class="inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform" :class="formData.is_active ? 'translate-x-6' : 'translate-x-1'" />
              </button>
              <span class="text-body-sm">{{ formData.is_active ? t('admin.popups.toggleActiveDesc') : t('admin.popups.toggleInactiveDesc') }}</span>
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
