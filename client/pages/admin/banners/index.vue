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
    const token = localStorage.getItem('token')
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
  showModal.value = true
}

// Submit form
const submitForm = async () => {
  formError.value = ''
  isSubmitting.value = true

  try {
    const token = localStorage.getItem('token')
    const url = editingBanner.value
      ? `${config.public.apiUrl}/admin/banners/${editingBanner.value.id}`
      : `${config.public.apiUrl}/admin/banners`
    
    await $fetch(url, {
      method: editingBanner.value ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData.value,
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
    const token = localStorage.getItem('token')
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
        class="bg-white rounded-sm border border-neutral-200 overflow-hidden"
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
              <input v-model="formData.image_url" type="url" class="input-field" placeholder="https://..." required />
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
