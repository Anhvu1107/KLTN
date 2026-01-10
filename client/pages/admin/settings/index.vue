<script setup lang="ts">
/**
 * Admin Settings Page
 * AURA ARCHIVE - System configuration management
 */

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const config = useRuntimeConfig()

const settings = ref<Record<string, any[]>>({})
const isLoading = ref(true)
const isSaving = ref(false)
const saveMessage = ref('')

const groupLabels: Record<string, string> = {
  general: 'Thông tin chung',
  contact: 'Thông tin liên hệ',
  social: 'Mạng xã hội',
  seo: 'SEO / Meta Tags',
  scripts: 'Script & Analytics',
}

// Fetch settings
const fetchSettings = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await $fetch<{ success: boolean; data: { settings: any } }>(
      `${config.public.apiUrl}/admin/settings`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    settings.value = response.data.settings
  } catch (error) {
    console.error('Failed to fetch settings:', error)
  } finally {
    isLoading.value = false
  }
}

// Save settings
const saveSettings = async () => {
  isSaving.value = true
  saveMessage.value = ''
  
  try {
    const token = localStorage.getItem('token')
    
    // Flatten all settings into array
    const allSettings = Object.values(settings.value)
      .flat()
      .map((s: any) => ({ key: s.key, value: s.value }))

    await $fetch(`${config.public.apiUrl}/admin/settings`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: { settings: allSettings },
    })

    saveMessage.value = 'Đã lưu cấu hình thành công!'
    setTimeout(() => { saveMessage.value = '' }, 3000)
  } catch (error) {
    console.error('Failed to save settings:', error)
    saveMessage.value = 'Lỗi khi lưu cấu hình'
  } finally {
    isSaving.value = false
  }
}

// Seed default settings
const seedDefaults = async () => {
  try {
    const token = localStorage.getItem('token')
    await $fetch(`${config.public.apiUrl}/admin/settings/seed`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    await fetchSettings()
  } catch (error) {
    console.error('Failed to seed settings:', error)
  }
}

onMounted(fetchSettings)

useSeoMeta({ title: 'Cấu hình hệ thống | Admin' })
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-serif text-heading-2 text-aura-black">Cấu hình hệ thống</h1>
      <div class="flex items-center gap-3">
        <span v-if="saveMessage" class="text-green-600 text-body-sm">{{ saveMessage }}</span>
        <button @click="saveSettings" :disabled="isSaving" class="btn-primary">
          {{ isSaving ? 'Đang lưu...' : 'Lưu thay đổi' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto"></div>
    </div>

    <!-- Settings Groups -->
    <div v-else class="space-y-8">
      <div 
        v-for="(groupSettings, group) in settings" 
        :key="group"
        class="bg-white rounded-sm border border-neutral-200 p-6"
      >
        <h2 class="font-serif text-heading-4 text-aura-black mb-6 pb-4 border-b">
          {{ groupLabels[group] || group }}
        </h2>

        <div class="space-y-4">
          <div v-for="setting in groupSettings" :key="setting.key" class="grid grid-cols-3 gap-4 items-start">
            <label class="text-body-sm text-neutral-700 pt-2">
              {{ setting.label || setting.key }}
              <p v-if="setting.description" class="text-caption text-neutral-500 mt-1">{{ setting.description }}</p>
            </label>
            
            <div class="col-span-2">
              <!-- Text input -->
              <input
                v-if="setting.type === 'text'"
                v-model="setting.value"
                type="text"
                class="input-field"
              />
              
              <!-- Textarea -->
              <textarea
                v-else-if="setting.type === 'textarea'"
                v-model="setting.value"
                rows="3"
                class="input-field"
              ></textarea>
              
              <!-- Image URL -->
              <div v-else-if="setting.type === 'image'" class="space-y-2">
                <input v-model="setting.value" type="url" class="input-field" placeholder="URL hình ảnh" />
                <div v-if="setting.value" class="w-20 h-20 bg-neutral-100 rounded overflow-hidden">
                  <img :src="setting.value" alt="" class="w-full h-full object-contain" />
                </div>
              </div>

              <!-- Boolean -->
              <div v-else-if="setting.type === 'boolean'" class="pt-2">
                <input v-model="setting.value" type="checkbox" class="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Seed Button -->
      <div v-if="Object.keys(settings).length === 0" class="text-center py-12">
        <p class="text-neutral-500 mb-4">Chưa có cấu hình nào</p>
        <button @click="seedDefaults" class="btn-secondary">
          Tạo cấu hình mặc định
        </button>
      </div>
    </div>
  </div>
</template>
