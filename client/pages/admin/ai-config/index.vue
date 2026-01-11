<script setup lang="ts">
import { useI18n } from '#imports'

definePageMeta({
  layout: 'default',
  middleware: ['admin'],
})

const { t } = useI18n()

const config = useRuntimeConfig()
const token = localStorage.getItem('token')

// Fetch system prompts
const { data: promptsData, pending, refresh } = await useFetch<{
  success: boolean
  data: { prompts: any[] }
}>(`${config.public.apiUrl}/admin/system-prompts`, {
  headers: { Authorization: `Bearer ${token}` },
})

const prompts = computed(() => promptsData.value?.data?.prompts || [])

// Edit state
const editingPrompt = ref<any>(null)
const editContent = ref('')
const isSaving = ref(false)
const saveMessage = ref('')

// Start editing
const startEdit = (prompt: any) => {
  editingPrompt.value = prompt
  editContent.value = prompt.content
  saveMessage.value = ''
}

// Cancel editing
const cancelEdit = () => {
  editingPrompt.value = null
  editContent.value = ''
  saveMessage.value = ''
}

// Save changes
const saveChanges = async () => {
  if (!editingPrompt.value) return

  isSaving.value = true
  saveMessage.value = ''

  try {
    await $fetch(`${config.public.apiUrl}/admin/system-prompts/${editingPrompt.value.key}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: { content: editContent.value },
    })

    saveMessage.value = 'Saved successfully!'
    await refresh()
    
    // Update local state
    editingPrompt.value.content = editContent.value

    setTimeout(() => {
      cancelEdit()
    }, 1500)
  } catch (error: any) {
    saveMessage.value = error?.data?.message || 'Failed to save'
  } finally {
    isSaving.value = false
  }
}

useSeoMeta({
  title: 'AI Configuration | AURA ARCHIVE Admin',
})
</script>

<template>
  <div class="section bg-neutral-50 min-h-screen">
    <div class="container-aura max-w-4xl">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="font-serif text-heading-2 text-aura-black">{{ t('admin.aiConfig.title') }}</h1>
          <p class="text-body text-neutral-600 mt-2">{{ t('admin.aiConfig.desc') }}</p>
        </div>
        <NuxtLink to="/admin/dashboard" class="text-body-sm text-neutral-600 hover:text-aura-black">
          ← {{ t('common.backTo') }} Dashboard
        </NuxtLink>
      </div>

      <!-- Loading State -->
      <div v-if="pending" class="card p-8 text-center">
        <p class="text-neutral-500">{{ t('common.loading') }}</p>
      </div>

      <!-- Prompts List -->
      <div v-else class="space-y-6">
        <div v-for="prompt in prompts" :key="prompt.id" class="card p-6">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h2 class="font-serif text-heading-4 text-aura-black">{{ prompt.name || prompt.key }}</h2>
              <p class="text-body-sm text-neutral-500 mt-1">{{ prompt.description }}</p>
              <p class="text-caption text-neutral-400 mt-2">
                Key: <code class="bg-neutral-100 px-2 py-1 rounded">{{ prompt.key }}</code>
                • Version: {{ prompt.version }}
              </p>
            </div>
            <button
              v-if="editingPrompt?.id !== prompt.id"
              @click="startEdit(prompt)"
              class="text-body-sm text-neutral-600 hover:text-aura-black px-4 py-2 border border-neutral-200 rounded-sm hover:border-neutral-300 transition-colors"
            >
              {{ t('common.edit') }}
            </button>
          </div>

          <!-- View Mode -->
          <div v-if="editingPrompt?.id !== prompt.id">
            <div class="bg-neutral-50 p-4 rounded-sm">
              <pre class="text-body-sm text-neutral-700 whitespace-pre-wrap font-sans">{{ prompt.content }}</pre>
            </div>
          </div>

          <!-- Edit Mode -->
          <div v-else class="space-y-4">
            <textarea
              v-model="editContent"
              rows="12"
              class="input-field font-mono text-body-sm"
              placeholder="Enter the AI persona content..."
            ></textarea>

            <div class="flex items-center justify-between">
              <span
                v-if="saveMessage"
                :class="saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'"
                class="text-body-sm"
              >
                {{ saveMessage }}
              </span>
              <span v-else></span>

              <div class="flex gap-3">
                <button
                  @click="cancelEdit"
                  :disabled="isSaving"
                  class="btn-ghost"
                >
                  {{ t('common.cancel') }}
                </button>
                <button
                  @click="saveChanges"
                  :disabled="isSaving || !editContent.trim()"
                  class="btn-primary"
                  :class="{ 'opacity-70': isSaving }"
                >
                  {{ isSaving ? t('common.saving') : t('admin.saveChanges') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Instructions -->
      <div class="mt-8 p-6 bg-blue-50 rounded-sm">
        <h3 class="font-medium text-blue-900 mb-2">💡 {{ t('admin.aiConfig.tipsTitle') }}</h3>
        <ul class="text-body-sm text-blue-800 space-y-1">
          <li>• {{ t('admin.aiConfig.tip1') }}</li>
          <li>• {{ t('admin.aiConfig.tip2') }}</li>
          <li>• {{ t('admin.aiConfig.tip3') }}</li>
          <li>• {{ t('admin.aiConfig.tip4') }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>
