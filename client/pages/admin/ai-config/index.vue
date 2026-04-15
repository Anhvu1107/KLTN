<script setup lang="ts">
/**
 * Admin AI Configuration Page
 * AURA ARCHIVE - Prompt, appearance, and voice experience settings.
 */

import type { VoiceConfig } from '~/utils/voice-config'
import {
  CHARACTER_PRESETS,
  LIVE_MODEL_OPTIONS,
  VOICE_NAME_OPTIONS,
  cloneDefaultVoiceConfig,
  normalizeVoiceConfig,
} from '~/utils/voice-config'

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

type TabKey = 'prompt' | 'appearance' | 'voice'
type StoredPrompt = {
  key: string
  content: string
}

const { t } = useI18n()
const config = useRuntimeConfig()
const { getToken } = useAuthToken()

const activeTab = ref<TabKey>('prompt')
const isSaving = ref(false)
const saveMessage = ref('')
const isLoading = ref(true)
const isUploadingAvatar = ref(false)
const avatarInput = ref<HTMLInputElement | null>(null)

const promptData = ref({
  aiName: 'AURA Stylist',
  roleDesc: t('admin.aiConfig.roleDescPlaceholder', 'Trợ lý thời trang của bạn'),
  systemPrompt: '',
  greetingMessage: '',
})

const appearance = ref({
  chatName: 'AURA Stylist',
  chatDescription: t('admin.aiConfig.chatDescPlaceholder', 'Trợ lý thời trang của bạn'),
  avatarUrl: '',
  fontFamily: 'Inter',
  headerFontFamily: 'Playfair Display',
  headerBgColor: '#1a1a1a',
  headerTextColor: '#ffffff',
  botBgColor: '#f5f5f5',
  botTextColor: '#262626',
  userBgColor: '#1a1a1a',
  userTextColor: '#ffffff',
})

const voiceConfig = ref<VoiceConfig>(cloneDefaultVoiceConfig())

const fontOptions = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Outfit', label: 'Outfit' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Lora', label: 'Lora' },
  { value: 'Source Sans 3', label: 'Source Sans 3' },
  { value: 'system-ui', label: 'System Default' },
]

const loadedFonts = ref(new Set<string>())
const loadGoogleFont = (font: string) => {
  if (!font || font === 'system-ui' || loadedFonts.value.has(font)) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`
  document.head.appendChild(link)
  loadedFonts.value.add(font)
}

const parseStoredJson = <T,>(content: string | undefined, fallback: T): T => {
  if (!content) return fallback

  try {
    return JSON.parse(content) as T
  } catch {
    return fallback
  }
}

const clearSaveMessageLater = () => {
  setTimeout(() => {
    saveMessage.value = ''
  }, 3000)
}

const saveSuccess = () => {
  saveMessage.value = t('admin.aiConfig.saved')
  clearSaveMessageLater()
}

const saveFailure = (error: any) => {
  saveMessage.value = error?.data?.message || t('admin.aiConfig.saveError')
}

watch(() => appearance.value.fontFamily, (font) => {
  if (import.meta.client) {
    loadGoogleFont(font)
  }
})

watch(() => appearance.value.headerFontFamily, (font) => {
  if (import.meta.client) {
    loadGoogleFont(font)
  }
})

const loadData = async () => {
  isLoading.value = true

  try {
    const token = getToken()
    const response = await $fetch<{
      success: boolean
      data: { prompts: StoredPrompt[] }
    }>(`${config.public.apiUrl}/admin/system-prompts`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const prompts = response.data?.prompts || []

    const persona = prompts.find(prompt => prompt.key === 'STYLIST_PERSONA')
    if (persona) {
      promptData.value.systemPrompt = persona.content
    }

    const greeting = prompts.find(prompt => prompt.key === 'GREETING_MESSAGE')
    if (greeting) {
      promptData.value.greetingMessage = greeting.content
    }

    const appearancePrompt = prompts.find(prompt => prompt.key === 'CHAT_APPEARANCE')
    if (appearancePrompt) {
      const parsedAppearance = parseStoredJson(appearancePrompt.content, {})
      appearance.value = { ...appearance.value, ...parsedAppearance }
      promptData.value.aiName = appearance.value.chatName || promptData.value.aiName
      promptData.value.roleDesc = appearance.value.chatDescription || promptData.value.roleDesc
    }

    const voicePrompt = prompts.find(prompt => prompt.key === 'VOICE_CONFIG')
    voiceConfig.value = normalizeVoiceConfig(
      voicePrompt ? parseStoredJson<Partial<VoiceConfig>>(voicePrompt.content, {}) : {},
    )
  } catch (error) {
    console.error('Failed to load AI config:', error)
  } finally {
    isLoading.value = false
  }
}

const saveAppearanceData = async () => {
  const token = getToken()
  await $fetch(`${config.public.apiUrl}/admin/system-prompts/CHAT_APPEARANCE`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: {
      content: JSON.stringify(appearance.value),
      name: 'Chat Appearance',
      description: 'Chat widget appearance configuration (JSON). Controls chatbot name, description, and colors.',
    },
  })
}

const saveVoiceData = async () => {
  const token = getToken()
  voiceConfig.value = normalizeVoiceConfig(voiceConfig.value)

  await $fetch(`${config.public.apiUrl}/admin/system-prompts/VOICE_CONFIG`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: {
      content: JSON.stringify(voiceConfig.value),
      name: 'Voice Experience Config',
      description: 'Voice chat configuration (JSON). Controls voice, Live2D character, and realtime call behavior.',
    },
  })
}

const savePrompt = async () => {
  isSaving.value = true
  saveMessage.value = ''

  try {
    const token = getToken()

    await $fetch(`${config.public.apiUrl}/admin/system-prompts/STYLIST_PERSONA`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: { content: promptData.value.systemPrompt },
    })

    await $fetch(`${config.public.apiUrl}/admin/system-prompts/GREETING_MESSAGE`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: { content: promptData.value.greetingMessage },
    })

    appearance.value.chatName = promptData.value.aiName
    appearance.value.chatDescription = promptData.value.roleDesc
    await saveAppearanceData()

    saveSuccess()
  } catch (error) {
    saveFailure(error)
  } finally {
    isSaving.value = false
  }
}

const saveAppearance = async () => {
  isSaving.value = true
  saveMessage.value = ''

  try {
    await saveAppearanceData()
    saveSuccess()
  } catch (error) {
    saveFailure(error)
  } finally {
    isSaving.value = false
  }
}

const saveVoice = async () => {
  isSaving.value = true
  saveMessage.value = ''

  try {
    await saveVoiceData()
    saveSuccess()
  } catch (error) {
    saveFailure(error)
  } finally {
    isSaving.value = false
  }
}

const triggerAvatarUpload = () => {
  avatarInput.value?.click()
}

const handleAvatarUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  isUploadingAvatar.value = true

  try {
    const formData = new FormData()
    formData.append('avatar', file)

    const response = await $fetch<{ success: boolean; data: { url: string } }>(
      `${config.public.apiUrl}/admin/upload/avatar`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      },
    )

    if (response.data?.url) {
      appearance.value.avatarUrl = response.data.url
    }
  } catch (error) {
    console.error('Avatar upload failed:', error)
    saveFailure(error)
    clearSaveMessageLater()
  } finally {
    isUploadingAvatar.value = false
    target.value = ''
  }
}

const applyCharacterPreset = (characterId: string) => {
  const preset = CHARACTER_PRESETS.find(option => option.value === characterId)
  if (!preset) return

  voiceConfig.value = normalizeVoiceConfig({
    ...voiceConfig.value,
    characterId: preset.value,
    live2dModelUrl: preset.modelUrl,
  })
}



const previewMessages = computed(() => [
  { role: 'assistant', content: promptData.value.greetingMessage || appearance.value.chatDescription },
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi there! How can I help you today?' },
])

const selectedVoiceOption = computed(() =>
  VOICE_NAME_OPTIONS.find(option => option.value === voiceConfig.value.voiceName) || VOICE_NAME_OPTIONS[0],
)

const selectedLiveModel = computed(() =>
  LIVE_MODEL_OPTIONS.find(option => option.value === voiceConfig.value.liveModel) || LIVE_MODEL_OPTIONS[0],
)

const selectedCharacterPreset = computed(() =>
  CHARACTER_PRESETS.find(option => option.value === voiceConfig.value.characterId) || CHARACTER_PRESETS[0],
)

const voicePreviewGreeting = computed(() =>
  promptData.value.greetingMessage || t('admin.aiConfig.greetingPlaceholder'),
)

onMounted(loadData)

useSeoMeta({
  title: `${t('admin.aiConfig.title')} | Admin`,
})
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="font-serif text-heading-2 text-aura-black">{{ t('admin.aiConfig.title') }}</h1>
        <p class="text-body-sm text-neutral-500 mt-1">{{ t('admin.aiConfig.desc') }}</p>
      </div>
    </div>

    <div class="flex gap-0 border-b border-neutral-200 mb-6 overflow-x-auto">
      <button
        @click="activeTab = 'prompt'"
        class="px-6 py-3 text-body-sm font-medium transition-colors relative whitespace-nowrap"
        :class="activeTab === 'prompt' ? 'text-aura-black' : 'text-neutral-400 hover:text-neutral-600'"
      >
        {{ t('admin.aiConfig.tabPrompt') }}
        <span v-if="activeTab === 'prompt'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-aura-black" />
      </button>
      <button
        @click="activeTab = 'appearance'"
        class="px-6 py-3 text-body-sm font-medium transition-colors relative whitespace-nowrap"
        :class="activeTab === 'appearance' ? 'text-aura-black' : 'text-neutral-400 hover:text-neutral-600'"
      >
        {{ t('admin.aiConfig.tabAppearance') }}
        <span v-if="activeTab === 'appearance'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-aura-black" />
      </button>
      <button
        @click="activeTab = 'voice'"
        class="px-6 py-3 text-body-sm font-medium transition-colors relative whitespace-nowrap"
        :class="activeTab === 'voice' ? 'text-aura-black' : 'text-neutral-400 hover:text-neutral-600'"
      >
        {{ t('admin.aiConfig.tabVoice') }}
        <span v-if="activeTab === 'voice'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-aura-black" />
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto" />
    </div>

    <div v-else-if="activeTab === 'prompt'" class="space-y-6">
      <div class="card p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label class="block text-body-sm text-neutral-700 font-medium mb-2">
              {{ t('admin.aiConfig.aiName') }}
            </label>
            <input
              v-model="promptData.aiName"
              type="text"
              class="input-field"
              placeholder="AURA Stylist"
            />
            <p class="text-caption text-neutral-400 mt-1">{{ t('admin.aiConfig.aiNameDesc') }}</p>
          </div>

          <div>
            <label class="block text-body-sm text-neutral-700 font-medium mb-2">
              {{ t('admin.aiConfig.roleDesc') }}
            </label>
            <input
              v-model="promptData.roleDesc"
              type="text"
              class="input-field"
              :placeholder="t('admin.aiConfig.roleDescPlaceholder')"
            />
            <p class="text-caption text-neutral-400 mt-1">{{ t('admin.aiConfig.roleDescHint') }}</p>
          </div>
        </div>

        <div class="mb-6">
          <label class="block text-body-sm text-neutral-700 font-medium mb-2">
            {{ t('admin.aiConfig.systemPrompt') }}
          </label>
          <p class="text-caption text-neutral-400 mb-2">{{ t('admin.aiConfig.systemPromptDesc') }}</p>
          <textarea
            v-model="promptData.systemPrompt"
            rows="14"
            class="input-field font-mono text-body-sm"
            :placeholder="t('admin.aiConfig.promptPlaceholder')"
          />
        </div>

        <div class="mb-6">
          <label class="block text-body-sm text-neutral-700 font-medium mb-2">
            {{ t('admin.aiConfig.greetingMessage') }}
          </label>
          <p class="text-caption text-neutral-400 mb-2">{{ t('admin.aiConfig.greetingMessageDesc') }}</p>
          <textarea
            v-model="promptData.greetingMessage"
            rows="3"
            class="input-field text-body-sm"
            :placeholder="t('admin.aiConfig.greetingPlaceholder')"
          />
        </div>

        <div class="bg-neutral-50 p-4 rounded-sm mb-6">
          <h3 class="font-medium text-neutral-700 text-body-sm mb-2">{{ t('admin.aiConfig.tipsTitle') }}</h3>
          <ul class="text-caption text-neutral-500 space-y-1">
            <li>• {{ t('admin.aiConfig.tip1') }}</li>
            <li>• {{ t('admin.aiConfig.tip2') }}</li>
            <li>• {{ t('admin.aiConfig.tip3') }}</li>
            <li>• {{ t('admin.aiConfig.tip4') }}</li>
          </ul>
        </div>

        <div class="flex items-center justify-end gap-3">
          <span
            v-if="saveMessage"
            class="text-body-sm"
            :class="saveMessage === t('admin.aiConfig.saved') ? 'text-green-600' : 'text-red-600'"
          >
            {{ saveMessage }}
          </span>
          <button @click="savePrompt" :disabled="isSaving" class="btn-primary">
            {{ isSaving ? t('admin.aiConfig.updating') : t('admin.aiConfig.update') }}
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="activeTab === 'appearance'" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card p-6 space-y-6">
        <div>
          <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.chatbotName') }}</label>
          <input v-model="appearance.chatName" type="text" class="input-field" />
        </div>

        <div>
          <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.chatbotDesc') }}</label>
          <input v-model="appearance.chatDescription" type="text" class="input-field" />
        </div>

        <div>
          <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.greetingMessage') }}</label>
          <textarea v-model="promptData.greetingMessage" rows="2" class="input-field text-body-sm" />
        </div>

        <div>
          <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.fontFamily') }}</label>
          <select v-model="appearance.fontFamily" class="input-field">
            <option
              v-for="font in fontOptions"
              :key="font.value"
              :value="font.value"
              :style="{ fontFamily: font.value }"
            >
              {{ font.label }}
            </option>
          </select>
          <p class="text-caption text-neutral-400 mt-1">{{ t('admin.aiConfig.fontFamilyHint') }}</p>
        </div>

        <div>
          <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.headerFontFamily') }}</label>
          <select v-model="appearance.headerFontFamily" class="input-field">
            <option
              v-for="font in fontOptions"
              :key="font.value"
              :value="font.value"
              :style="{ fontFamily: font.value }"
            >
              {{ font.label }}
            </option>
          </select>
          <p class="text-caption text-neutral-400 mt-1">{{ t('admin.aiConfig.headerFontFamilyHint') }}</p>
        </div>

        <div>
          <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.avatar') }}</label>
          <div class="flex items-center gap-4">
            <div
              @click="triggerAvatarUpload"
              class="w-14 h-14 rounded-full overflow-hidden border-2 border-neutral-200 flex-shrink-0 flex items-center justify-center bg-neutral-100 cursor-pointer hover:border-neutral-400 transition-colors relative group"
            >
              <img v-if="appearance.avatarUrl" :src="appearance.avatarUrl" alt="Avatar" class="w-full h-full object-cover" />
              <span v-else class="text-lg font-serif text-neutral-400">A</span>
              <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div v-if="isUploadingAvatar" class="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            </div>

            <div class="flex-1">
              <button @click="triggerAvatarUpload" :disabled="isUploadingAvatar" class="btn-secondary text-body-sm">
                {{ isUploadingAvatar ? t('admin.aiConfig.uploading') : t('admin.aiConfig.uploadAvatar') }}
              </button>
              <p class="text-caption text-neutral-400 mt-1">{{ t('admin.aiConfig.avatarHint') }}</p>
            </div>

            <input
              ref="avatarInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="handleAvatarUpload"
            />
          </div>
        </div>

        <div>
          <h4 class="text-body-sm font-medium text-neutral-700 mb-3">{{ t('admin.aiConfig.headerColor') }}</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-caption text-neutral-500 mb-1 block">{{ t('admin.aiConfig.headerColor') }}</label>
              <div class="flex items-center gap-2">
                <input v-model="appearance.headerBgColor" type="color" class="w-10 h-10 rounded border border-neutral-200 cursor-pointer" />
                <input v-model="appearance.headerBgColor" type="text" class="input-field flex-1 text-caption font-mono" />
              </div>
            </div>
            <div>
              <label class="text-caption text-neutral-500 mb-1 block">{{ t('admin.aiConfig.headerTextColor') }}</label>
              <div class="flex items-center gap-2">
                <input v-model="appearance.headerTextColor" type="color" class="w-10 h-10 rounded border border-neutral-200 cursor-pointer" />
                <input v-model="appearance.headerTextColor" type="text" class="input-field flex-1 text-caption font-mono" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 class="text-body-sm font-medium text-neutral-700 mb-3">{{ t('admin.aiConfig.botMsgBg') }}</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-caption text-neutral-500 mb-1 block">{{ t('admin.aiConfig.botMsgBg') }}</label>
              <div class="flex items-center gap-2">
                <input v-model="appearance.botBgColor" type="color" class="w-10 h-10 rounded border border-neutral-200 cursor-pointer" />
                <input v-model="appearance.botBgColor" type="text" class="input-field flex-1 text-caption font-mono" />
              </div>
            </div>
            <div>
              <label class="text-caption text-neutral-500 mb-1 block">{{ t('admin.aiConfig.botMsgText') }}</label>
              <div class="flex items-center gap-2">
                <input v-model="appearance.botTextColor" type="color" class="w-10 h-10 rounded border border-neutral-200 cursor-pointer" />
                <input v-model="appearance.botTextColor" type="text" class="input-field flex-1 text-caption font-mono" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 class="text-body-sm font-medium text-neutral-700 mb-3">{{ t('admin.aiConfig.userMsgBg') }}</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-caption text-neutral-500 mb-1 block">{{ t('admin.aiConfig.userMsgBg') }}</label>
              <div class="flex items-center gap-2">
                <input v-model="appearance.userBgColor" type="color" class="w-10 h-10 rounded border border-neutral-200 cursor-pointer" />
                <input v-model="appearance.userBgColor" type="text" class="input-field flex-1 text-caption font-mono" />
              </div>
            </div>
            <div>
              <label class="text-caption text-neutral-500 mb-1 block">{{ t('admin.aiConfig.userMsgText') }}</label>
              <div class="flex items-center gap-2">
                <input v-model="appearance.userTextColor" type="color" class="w-10 h-10 rounded border border-neutral-200 cursor-pointer" />
                <input v-model="appearance.userTextColor" type="text" class="input-field flex-1 text-caption font-mono" />
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t">
          <span
            v-if="saveMessage"
            class="text-body-sm"
            :class="saveMessage === t('admin.aiConfig.saved') ? 'text-green-600' : 'text-red-600'"
          >
            {{ saveMessage }}
          </span>
          <button @click="saveAppearance" :disabled="isSaving" class="btn-primary">
            {{ isSaving ? t('admin.aiConfig.updating') : t('admin.aiConfig.update') }}
          </button>
        </div>
      </div>

      <div>
        <h3 class="text-body-sm font-medium text-neutral-700 mb-3">{{ t('admin.aiConfig.preview') }}</h3>
        <div
          class="w-full max-w-sm mx-auto rounded-lg shadow-elevated overflow-hidden border border-neutral-200"
          :style="{ fontFamily: appearance.fontFamily + ', sans-serif' }"
        >
          <div
            class="px-4 py-3 flex items-center gap-3"
            :style="{ backgroundColor: appearance.headerBgColor, color: appearance.headerTextColor }"
          >
            <div class="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden" style="background: rgba(255,255,255,0.15)">
              <img v-if="appearance.avatarUrl" :src="appearance.avatarUrl" alt="Avatar" class="w-full h-full object-cover" />
              <span v-else class="text-xs font-serif">A</span>
            </div>
            <div>
              <h3 class="text-sm font-medium" :style="{ color: appearance.headerTextColor, fontFamily: appearance.headerFontFamily + ', serif' }">
                {{ appearance.chatName }}
              </h3>
              <p class="text-xs" :style="{ color: appearance.headerTextColor, opacity: 0.7 }">
                {{ appearance.chatDescription }}
              </p>
            </div>
          </div>

          <div class="p-4 space-y-3 bg-white" style="min-height: 280px;">
            <div
              v-for="(message, index) in previewMessages"
              :key="index"
              class="flex"
              :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[80%] px-3 py-2 rounded-lg text-sm"
                :style="{
                  backgroundColor: message.role === 'user' ? appearance.userBgColor : appearance.botBgColor,
                  color: message.role === 'user' ? appearance.userTextColor : appearance.botTextColor,
                }"
              >
                {{ message.content }}
              </div>
            </div>
          </div>

          <div class="border-t p-3 bg-white">
            <div class="flex gap-2">
              <input
                type="text"
                disabled
                :placeholder="t('admin.aiConfig.inputPlaceholder')"
                class="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm"
              />
              <button
                disabled
                class="px-4 py-2 rounded-lg text-sm"
                :style="{ backgroundColor: appearance.headerBgColor, color: appearance.headerTextColor }"
              >
                {{ t('admin.aiConfig.send') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="space-y-6">
      <!-- Character Picker Section -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-5">
          <div>
            <h3 class="text-body-sm font-semibold text-aura-black">{{ t('admin.aiConfig.voiceCharacterPreset') }}</h3>
            <p class="text-caption text-neutral-400 mt-0.5">Chọn nhân vật Live2D để đại diện AI Stylist</p>
          </div>
          <span class="text-caption text-neutral-400 bg-neutral-100 px-2.5 py-1 rounded-full">
            {{ CHARACTER_PRESETS.length }} nhân vật
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <button
            v-for="preset in CHARACTER_PRESETS"
            :key="preset.value"
            type="button"
            class="character-card group relative rounded-xl border-2 overflow-hidden transition-all duration-300 text-left"
            :class="voiceConfig.characterId === preset.value
              ? 'border-aura-black shadow-elevated ring-1 ring-aura-black/20 scale-[1.02]'
              : 'border-neutral-200 hover:border-neutral-400 hover:shadow-md'"
            @click="applyCharacterPreset(preset.value)"
          >
            <!-- Thumbnail (auto-rendered from actual model) -->
            <div class="aspect-square overflow-hidden bg-gradient-to-b from-neutral-100 to-neutral-50 relative">
              <AiLive2DSnapshot
                :model-url="preset.modelUrl"
                :size="200"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <!-- Selected Badge -->
              <div
                v-if="voiceConfig.characterId === preset.value"
                class="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-aura-black text-white flex items-center justify-center shadow-sm"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <!-- Hover overlay -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            <!-- Info -->
            <div class="p-2.5">
              <p class="text-body-sm font-semibold text-aura-black group-hover:text-neutral-900 truncate">
                {{ preset.label }}
              </p>
              <p class="text-[10px] text-neutral-400 mt-0.5 line-clamp-2 leading-tight min-h-[24px]">
                {{ preset.description }}
              </p>
              <div class="flex gap-1 mt-1.5 flex-wrap">
                <span
                  v-for="tag in preset.tags.slice(0, 2)"
                  :key="tag"
                  class="text-[9px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Voice Settings + Preview -->
      <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_360px] gap-6">
        <div class="card p-6 space-y-6">
          <!-- Character Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.voiceCharacterName') }}</label>
              <input v-model="voiceConfig.characterName" type="text" class="input-field" />
            </div>
            <div>
              <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.voiceCharacterSubtitle') }}</label>
              <input v-model="voiceConfig.characterSubtitle" type="text" class="input-field" />
            </div>
          </div>

          <!-- Voice & Model -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.voiceName') }}</label>
              <select v-model="voiceConfig.voiceName" class="input-field">
                <option
                  v-for="voice in VOICE_NAME_OPTIONS"
                  :key="voice.value"
                  :value="voice.value"
                >
                  {{ voice.value }} · {{ voice.tone }}
                </option>
              </select>
              <p class="text-caption text-neutral-400 mt-1">{{ t('admin.aiConfig.voiceNameHint') }}</p>
            </div>

            <div>
              <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.voiceModel') }}</label>
              <select v-model="voiceConfig.liveModel" class="input-field">
                <option
                  v-for="option in LIVE_MODEL_OPTIONS"
                  :key="option.value || 'default'"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
              <p class="text-caption text-neutral-400 mt-1">{{ selectedLiveModel.description }}</p>
            </div>
          </div>

          <!-- Temperature + Idle -->
          <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_160px_160px] gap-6">
            <div>
              <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.voiceTemperature') }}</label>
              <input
                v-model.number="voiceConfig.temperature"
                type="range"
                min="0"
                max="1"
                step="0.05"
                class="w-full"
              />
              <p class="text-caption text-neutral-400 mt-1">{{ t('admin.aiConfig.voiceTemperatureHint') }}</p>
            </div>
            <div>
              <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.voiceTemperatureValue') }}</label>
              <input
                v-model.number="voiceConfig.temperature"
                type="number"
                min="0"
                max="1"
                step="0.05"
                class="input-field"
              />
            </div>
            <div>
              <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.voiceIdleSeconds') }}</label>
              <input
                v-model.number="voiceConfig.idleReminderSeconds"
                type="number"
                min="0"
                max="600"
                step="5"
                class="input-field"
              />
              <p class="text-caption text-neutral-400 mt-1">{{ t('admin.aiConfig.voiceIdleSecondsHint') }}</p>
            </div>
          </div>

          <!-- Model URL (advanced) -->
          <div>
            <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.voiceModelUrl') }}</label>
            <input
              v-model="voiceConfig.live2dModelUrl"
              type="text"
              class="input-field font-mono text-body-sm"
              placeholder="/live2d/office_f/office_f.model3.json"
            />
            <p class="text-caption text-neutral-400 mt-1">{{ t('admin.aiConfig.voiceModelUrlHint') }}</p>
          </div>

          <!-- Hint Text -->
          <div>
            <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.voiceHintText') }}</label>
            <textarea
              v-model="voiceConfig.hintText"
              rows="2"
              class="input-field text-body-sm"
            />
            <p class="text-caption text-neutral-400 mt-1">{{ t('admin.aiConfig.voiceHintTextHint') }}</p>
          </div>

          <div class="rounded-sm border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p class="text-body-sm text-neutral-700 font-medium">{{ t('admin.aiConfig.voiceGreetingSource') }}</p>
            <p class="text-caption text-neutral-500 mt-1">{{ t('admin.aiConfig.voiceGreetingSourceHint') }}</p>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t">
            <span
              v-if="saveMessage"
              class="text-body-sm"
              :class="saveMessage === t('admin.aiConfig.saved') ? 'text-green-600' : 'text-red-600'"
            >
              {{ saveMessage }}
            </span>
            <button @click="saveVoice" :disabled="isSaving" class="btn-primary">
              {{ isSaving ? t('admin.aiConfig.updating') : t('admin.aiConfig.update') }}
            </button>
          </div>
        </div>

        <!-- Preview Panel -->
        <div>
          <h3 class="text-body-sm font-medium text-neutral-700 mb-3">{{ t('admin.aiConfig.preview') }}</h3>
          <div class="rounded-[28px] bg-neutral-950 text-white shadow-elevated overflow-hidden sticky top-6">
            <div class="px-6 pt-6 text-center">
              <p class="text-2xl font-serif tracking-[0.3em]">{{ voiceConfig.characterName }}</p>
              <p class="text-sm text-white/60 mt-2">{{ voiceConfig.characterSubtitle }}</p>
            </div>

            <div class="px-6 py-5">
              <div class="rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.24),_transparent_55%),linear-gradient(180deg,_rgba(255,255,255,0.03),_rgba(255,255,255,0.01))] min-h-[280px] px-5 py-6 flex flex-col items-center justify-center">
                <!-- Character thumbnail in preview -->
                <div class="w-24 h-24 rounded-full border border-white/15 bg-white/5 overflow-hidden flex items-center justify-center">
                  <AiLive2DSnapshot
                    v-if="selectedCharacterPreset.modelUrl"
                    :model-url="selectedCharacterPreset.modelUrl"
                    :size="96"
                    class="w-full h-full object-cover"
                  />
                  <span v-else class="text-3xl font-serif">{{ voiceConfig.characterName.slice(0, 1) || 'A' }}</span>
                </div>
                <p class="mt-3 text-sm font-medium text-white/85">{{ selectedCharacterPreset.label }}</p>
                <p class="mt-0.5 text-[11px] text-white/45 text-center">{{ selectedCharacterPreset.description }}</p>

                <!-- Tags -->
                <div class="mt-3 flex flex-wrap gap-1.5 justify-center">
                  <span
                    v-for="tag in (selectedCharacterPreset.tags || [])"
                    :key="tag"
                    class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50"
                  >
                    {{ tag }}
                  </span>
                </div>

                <!-- Voice config badges -->
                <div class="mt-4 flex flex-wrap gap-2 justify-center">
                  <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px]">
                    {{ selectedVoiceOption.value }} · {{ selectedVoiceOption.tone }}
                  </span>
                  <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px]">
                    {{ selectedLiveModel.label }}
                  </span>
                  <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px]">
                    T={{ voiceConfig.temperature.toFixed(2) }}
                  </span>
                  <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px]">
                    Idle {{ voiceConfig.idleReminderSeconds }}s
                  </span>
                </div>
              </div>

              <div class="mt-4 rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                <p class="text-xs uppercase tracking-[0.2em] text-white/40">{{ t('admin.aiConfig.greetingMessage') }}</p>
                <p class="text-sm text-white/80 mt-2 leading-relaxed">{{ voicePreviewGreeting }}</p>
              </div>

              <p class="mt-3 text-center text-[11px] text-white/30 break-all font-mono">{{ voiceConfig.live2dModelUrl }}</p>
              <p class="mt-2 text-center text-xs text-white/35">{{ voiceConfig.hintText }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
