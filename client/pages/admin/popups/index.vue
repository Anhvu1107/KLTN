<script setup lang="ts">
/**
 * Admin Popups Page
 * AURA ARCHIVE - Marketing popup management
 */

import { useI18n } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { t } = useI18n()
const config = useRuntimeConfig()
const getToken = () => process.client ? localStorage.getItem('token') : null
const popups = ref<any[]>([])
const isLoading = ref(true)
const showModal = ref(false)
const editingPopup = ref<any>(null)

const formData = ref({
  name: '',
  title: '',
  content: '',
  image_url: '',
  button_text: 'Xem ngay',
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
    const token = localStorage.getItem('token')
    const response = await $fetch<{ success: boolean; data: { popups: any[] } }>(
      `${config.public.apiUrl}/admin/popups`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    popups.value = response.data.popups
  } catch (error) {
    console.error('Failed to fetch popups:', error)
  } finally {
    isLoading.value = false
  }
}

const openCreate = () => {
  editingPopup.value = null
  formData.value = { name: '', title: '', content: '', image_url: '', button_text: 'Xem ngay', button_link: '', position: 'center', trigger_type: 'delay', trigger_value: 3, is_active: true, starts_at: '', ends_at: '' }
  showModal.value = true
}

const openEdit = (popup: any) => {
  editingPopup.value = popup
  formData.value = { ...popup, starts_at: popup.starts_at?.split('T')[0] || '', ends_at: popup.ends_at?.split('T')[0] || '' }
  showModal.value = true
}

const savePopup = async () => {
  const token = localStorage.getItem('token')
  const url = editingPopup.value
    ? `${config.public.apiUrl}/admin/popups/${editingPopup.value.id}`
    : `${config.public.apiUrl}/admin/popups`
  
  await $fetch(url, {
    method: editingPopup.value ? 'PUT' : 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData.value,
  })
  showModal.value = false
  await fetchPopups()
}

const deletePopup = async (id: string) => {
  if (!confirm(t('admin.deleteConfirm'))) return
  const token = getToken()
  await $fetch(`${config.public.apiUrl}/admin/popups/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  await fetchPopups()
}

onMounted(fetchPopups)
useSeoMeta({ title: 'Popup Manager | Admin' })
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-serif text-heading-2 text-aura-black">{{ t('admin.popups.title') }}</h1>
<<<<<<< HEAD
      <button @click="openCreate" class="btn-primary">+ {{ t('admin.popups.add') }}</button>
=======
      <button @click="openCreate" class="btn-primary">+ {{ t('admin.popups.addPopup') }}</button>
>>>>>>> newtab
    </div>

    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto"></div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="popup in popups" :key="popup.id" class="bg-white border rounded-sm p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-medium">{{ popup.name }}</h3>
          <span :class="popup.is_active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'" class="px-2 py-1 text-caption rounded">
            {{ popup.is_active ? t('common.active') : t('common.inactive') }}
          </span>
        </div>
        <p class="text-body-sm text-neutral-600 mb-2">{{ popup.title }}</p>
        <p class="text-caption text-neutral-500 mb-4">{{ t('admin.popups.trigger') }}: {{ popup.trigger_type }} ({{ popup.trigger_value }}s)</p>
        <div class="flex gap-2">
          <button @click="openEdit(popup)" class="flex-1 py-2 border text-body-sm hover:border-aura-black">{{ t('common.edit') }}</button>
          <button @click="deletePopup(popup.id)" class="px-4 py-2 border text-red-600 text-body-sm hover:border-red-500">{{ t('common.delete') }}</button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="bg-white rounded-sm w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-6">
<<<<<<< HEAD
          <h2 class="font-serif text-heading-4 mb-6">{{ editingPopup ? t('admin.popups.edit') : t('admin.popups.create') }}</h2>
=======
          <h2 class="font-serif text-heading-4 mb-6">{{ editingPopup ? t('admin.popups.editPopup') : t('admin.popups.createPopup') }}</h2>
>>>>>>> newtab
          <form @submit.prevent="savePopup" class="space-y-4">
            <div><label class="input-label">Name *</label><input v-model="formData.name" class="input-field" required /></div>
            <div><label class="input-label">Title</label><input v-model="formData.title" class="input-field" /></div>
            <div><label class="input-label">Content</label><textarea v-model="formData.content" rows="3" class="input-field"></textarea></div>
            <div><label class="input-label">Image URL</label><input v-model="formData.image_url" class="input-field" /></div>
            <div class="grid grid-cols-2 gap-4">
              <div><label class="input-label">Button Text</label><input v-model="formData.button_text" class="input-field" /></div>
              <div><label class="input-label">Button Link</label><input v-model="formData.button_link" class="input-field" /></div>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="input-label">Trigger</label>
                <select v-model="formData.trigger_type" class="input-field">
                  <option value="delay">Delay</option>
                  <option value="scroll">Scroll</option>
                  <option value="exit">Exit Intent</option>
                </select>
              </div>
              <div><label class="input-label">Value (s/%)</label><input v-model.number="formData.trigger_value" type="number" class="input-field" /></div>
              <div>
                <label class="input-label">Position</label>
                <select v-model="formData.position" class="input-field">
                  <option value="center">Center</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <input v-model="formData.is_active" type="checkbox" id="active" class="w-4 h-4" />
              <label for="active">Active</label>
            </div>
            <div class="flex justify-end gap-3 pt-4">
              <button type="button" @click="showModal = false" class="px-4 py-2 text-neutral-600">{{ t('common.cancel') }}</button>
              <button type="submit" class="btn-primary">{{ t('common.save') }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
