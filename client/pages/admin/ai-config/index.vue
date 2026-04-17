<script setup lang="ts">
/**
 * Admin AI Configuration Page
 * AURA ARCHIVE - Prompt, appearance, and voice experience settings.
 */

import type { CharacterPreset, VoiceConfig } from '~/utils/voice-config'
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
const VOICE_CONFIG_UPDATED_KEY = 'aura_voice_config_updated_at'

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
const isPreviewingVoice = ref(false)
const voicePreviewError = ref('')
const activeVoicePreview = ref<HTMLAudioElement | null>(null)
const isAutoSavingVoice = ref(false)
const hasLoadedVoiceConfig = ref(false)
let voiceAutoSaveTimer: ReturnType<typeof setTimeout> | null = null

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

const isPositiveSaveMessage = computed(() =>
  saveMessage.value === t('admin.aiConfig.saved') || saveMessage.value.startsWith('✅'),
)

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
    hasLoadedVoiceConfig.value = true
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
  const normalizedVoiceConfig = normalizeVoiceConfig(voiceConfig.value)
  const normalizedContent = JSON.stringify(normalizedVoiceConfig)
  if (normalizedContent !== JSON.stringify(voiceConfig.value)) {
    voiceConfig.value = normalizedVoiceConfig
  }

  await $fetch(`${config.public.apiUrl}/admin/system-prompts/VOICE_CONFIG`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: {
      content: normalizedContent,
      name: 'Voice Experience Config',
      description: 'Voice chat configuration (JSON). Controls voice, Live2D character, and realtime call behavior.',
    },
  })

  if (import.meta.client) {
    localStorage.setItem(VOICE_CONFIG_UPDATED_KEY, String(Date.now()))
  }
}

const queueVoiceAutoSave = () => {
  if (!hasLoadedVoiceConfig.value || activeTab.value !== 'voice') return
  if (voiceAutoSaveTimer) clearTimeout(voiceAutoSaveTimer)

  voiceAutoSaveTimer = setTimeout(async () => {
    voiceAutoSaveTimer = null
    isAutoSavingVoice.value = true
    try {
      await saveVoiceData()
      saveMessage.value = '✅ Đã tự lưu cấu hình voice'
      clearSaveMessageLater()
    } catch (error) {
      saveFailure(error)
    } finally {
      isAutoSavingVoice.value = false
    }
  }, 800)
}

watch(
  voiceConfig,
  () => {
    queueVoiceAutoSave()
  },
  { deep: true },
)

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
  if (voiceAutoSaveTimer) {
    clearTimeout(voiceAutoSaveTimer)
    voiceAutoSaveTimer = null
  }
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

const getPresetUiKey = (preset: CharacterPreset) =>
  `${preset.isCustom ? 'custom' : 'builtin'}:${preset.value}:${preset.modelUrl}`

const isPresetSelected = (preset: CharacterPreset) =>
  voiceConfig.value.characterId === preset.value
  && voiceConfig.value.live2dModelUrl === preset.modelUrl

const isPresetAvailable = (preset: CharacterPreset) => preset.isAvailable !== false

const applyCharacterPreset = (preset: CharacterPreset) => {
  if (!isPresetAvailable(preset)) {
    saveMessage.value = 'Model này đang thiếu file trên server. Hãy xóa hoặc upload lại ZIP.'
    clearSaveMessageLater()
    return
  }

  voiceConfig.value = normalizeVoiceConfig({
    ...voiceConfig.value,
    characterId: preset.value,
    live2dModelUrl: preset.modelUrl,
  })
  queueVoiceAutoSave()
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

const voicePreviewText = computed(() => {
  const characterName = voiceConfig.value.characterName?.trim() || 'AURA'
  const configuredGreeting = promptData.value.greetingMessage?.trim()
  if (configuredGreeting) {
    return configuredGreeting.slice(0, 240)
  }
  return `${characterName} xin chào, mình sẽ giúp bạn tìm món đồ phù hợp với phong cách hôm nay.`
})

const normalizeVoicePreviewError = (message?: string) => {
  const raw = String(message || '').trim()

  if (/quota|rate[-_\s]?limit|too many requests|resource_exhausted|exceeded/i.test(raw)) {
    return 'Gemini đang chạm giới hạn dùng thử. Hãy thử lại sau hoặc đổi API key/model.'
  }

  if (/api key|permission|unauthorized|forbidden/i.test(raw)) {
    return 'API key voice chưa hợp lệ. Hãy kiểm tra lại cấu hình Gemini.'
  }

  return raw || 'Không thể nghe thử giọng nói lúc này.'
}

// --- Voice Preview Cache ---
const voicePreviewCache = new Map<string, { base64: string; mimeType: string }>()

const stopVoicePreview = () => {
  isPreviewingVoice.value = false
  if (!activeVoicePreview.value) return

  activeVoicePreview.value.pause()
  activeVoicePreview.value.currentTime = 0
  activeVoicePreview.value = null
}

const previewSelectedVoice = async () => {
  if (!import.meta.client || !voiceConfig.value.voiceName) return

  stopVoicePreview()
  isPreviewingVoice.value = true
  voicePreviewError.value = ''

  try {
    const cacheKey = `${voiceConfig.value.voiceName}|${voicePreviewText.value}`
    let audioBase64: string | undefined
    let mimeType: string | undefined

    if (voicePreviewCache.has(cacheKey)) {
      // Use cached audio
      const cached = voicePreviewCache.get(cacheKey)!
      audioBase64 = cached.base64
      mimeType = cached.mimeType
    } else {
      // Fetch fresh preview from Gemini
      const token = getToken()
      const response = await $fetch<{
        success: boolean
        data?: {
          audioBase64?: string
          mimeType?: string
        }
      }>(`${config.public.apiUrl}/admin/voice-preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          voiceName: voiceConfig.value.voiceName,
          text: voicePreviewText.value,
        },
      })

      audioBase64 = response.data?.audioBase64
      mimeType = response.data?.mimeType || 'audio/wav'

      if (!audioBase64) {
        throw new Error('Không nhận được audio preview từ server')
      }

      // Store in memory cache
      voicePreviewCache.set(cacheKey, { base64: audioBase64, mimeType })
    }

    const previewAudio = new Audio(`data:${mimeType};base64,${audioBase64}`)
    activeVoicePreview.value = previewAudio

    previewAudio.onended = () => {
      if (activeVoicePreview.value === previewAudio) {
        activeVoicePreview.value = null
      }
      isPreviewingVoice.value = false
    }

    previewAudio.onerror = () => {
      if (activeVoicePreview.value === previewAudio) {
        activeVoicePreview.value = null
      }
      voicePreviewError.value = 'Không thể phát đoạn nghe thử của giọng này.'
      isPreviewingVoice.value = false
    }

    await previewAudio.play()
  } catch (error: any) {
    voicePreviewError.value = normalizeVoicePreviewError(error?.data?.message || error?.message)
    isPreviewingVoice.value = false
  }
}

// ---------------------------------------------------------------------------
// Custom characters management (admin-uploaded via ZIP)
// ---------------------------------------------------------------------------
const customCharacters = ref<CharacterPreset[]>([])
const showAddCharDialog = ref(false)
const isUploadingChar = ref(false)
const newCharForm = ref({ label: '', description: '', tags: '' })
const newCharFile = ref<File | null>(null)
const charFileInput = ref<HTMLInputElement | null>(null)
const pendingDeleteCharacter = ref<CharacterPreset | null>(null)
const isDeletingCharacter = ref(false)

/** Merged list: built-in + custom */
const allPresets = computed<CharacterPreset[]>(() => [
  ...CHARACTER_PRESETS,
  ...customCharacters.value,
])

const selectedCharacterPreset = computed(() =>
  allPresets.value.find(isPresetSelected)
  || allPresets.value.find(option => option.modelUrl === voiceConfig.value.live2dModelUrl)
  || allPresets.value.find(option => option.value === voiceConfig.value.characterId)
  || CHARACTER_PRESETS[0],
)

const fetchCustomCharacters = async () => {
  try {
    const res = await $fetch<{ success: boolean; characters: CharacterPreset[] }>(
      `${config.public.apiUrl}/live2d/characters?t=${Date.now()}`,
      {
        cache: 'no-store',
      },
    )
    if (res?.characters) {
      customCharacters.value = res.characters.map(c => ({ ...c, isCustom: true }))
    }
  } catch {
    // Silently fail – built-in presets always available
  }
}

const handleCharFileSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) newCharFile.value = file
}

const requestDeleteCustomCharacter = (preset: CharacterPreset) => {
  if (!preset.isCustom || isDeletingCharacter.value) return
  pendingDeleteCharacter.value = preset
}

const cancelDeleteCustomCharacter = () => {
  if (isDeletingCharacter.value) return
  pendingDeleteCharacter.value = null
}

const confirmDeleteCustomCharacter = async () => {
  const preset = pendingDeleteCharacter.value
  if (!preset) return

  isDeletingCharacter.value = true
  try {
    await $fetch(`${config.public.apiUrl}/live2d/characters/${encodeURIComponent(preset.value)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })

    if (isPresetSelected(preset)) {
      applyCharacterPreset(CHARACTER_PRESETS[0])
      await saveVoiceData()
    }

    await fetchCustomCharacters()
    pendingDeleteCharacter.value = null
    saveMessage.value = '✅ Đã xóa nhân vật'
    clearSaveMessageLater()
  } catch (err: any) {
    saveMessage.value = `❌ ${err?.data?.message || err?.message || 'Xóa thất bại'}`
    clearSaveMessageLater()
  } finally {
    isDeletingCharacter.value = false
  }
}

const uploadNewCharacter = async () => {
  if (!newCharForm.value.label || !newCharFile.value) return

  isUploadingChar.value = true
  try {
    const formData = new FormData()
    formData.append('label', newCharForm.value.label)
    formData.append('description', newCharForm.value.description)
    formData.append('tags', newCharForm.value.tags)
    formData.append('model', newCharFile.value)

    await $fetch(`${config.public.apiUrl}/live2d/characters`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    })

    // Reset form
    newCharForm.value = { label: '', description: '', tags: '' }
    newCharFile.value = null
    showAddCharDialog.value = false

    // Reload list
    await fetchCustomCharacters()
    saveMessage.value = '✅ Đã thêm nhân vật mới!'
    clearSaveMessageLater()
  } catch (err: any) {
    saveMessage.value = `❌ ${err?.data?.message || 'Upload thất bại'}`
    clearSaveMessageLater()
  } finally {
    isUploadingChar.value = false
  }
}

const voicePreviewGreeting = computed(() =>
  promptData.value.greetingMessage || t('admin.aiConfig.greetingPlaceholder'),
)

onMounted(() => {
  loadData()
  fetchCustomCharacters()
})

onBeforeUnmount(() => {
  if (voiceAutoSaveTimer) {
    clearTimeout(voiceAutoSaveTimer)
    voiceAutoSaveTimer = null
  }
  stopVoicePreview()
})

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
            :class="isPositiveSaveMessage ? 'text-green-600' : 'text-red-600'"
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
            :class="isPositiveSaveMessage ? 'text-green-600' : 'text-red-600'"
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
          <div class="flex items-center gap-2">
            <span class="text-caption text-neutral-400 bg-neutral-100 px-2.5 py-1 rounded-full">
              {{ allPresets.length }} nhân vật
            </span>
            <button
              type="button"
              class="text-caption font-medium text-white bg-aura-black hover:bg-neutral-800 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              @click="showAddCharDialog = true"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
              Thêm nhân vật
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <div
            v-for="preset in allPresets"
            :key="getPresetUiKey(preset)"
            role="button"
            tabindex="0"
            class="character-card group relative rounded-xl border-2 overflow-hidden transition-all duration-300 text-left"
            :class="[
              isPresetSelected(preset)
                ? 'border-aura-black shadow-elevated ring-1 ring-aura-black/20 scale-[1.02]'
                : 'border-neutral-200 hover:border-neutral-400 hover:shadow-md',
              isPresetAvailable(preset) ? '' : 'border-red-200 bg-red-50/30',
            ]"
            @click="applyCharacterPreset(preset)"
            @keydown.enter.prevent="applyCharacterPreset(preset)"
            @keydown.space.prevent="applyCharacterPreset(preset)"
          >
            <!-- Thumbnail (auto-rendered from actual model) -->
            <div class="aspect-square overflow-hidden bg-gradient-to-b from-neutral-100 to-neutral-50 relative">
              <Live2DSnapshot
                :model-url="preset.modelUrl"
                :width="220"
                :height="220"
                fit-mode="mascot"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <!-- Selected Badge -->
              <div
                v-if="isPresetSelected(preset)"
                class="absolute z-20 top-1.5 right-1.5 w-5 h-5 rounded-full bg-aura-black text-white flex items-center justify-center shadow-sm"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <!-- Delete button for custom characters -->
              <button
                v-if="preset.isCustom"
                type="button"
                class="absolute z-30 top-1.5 left-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                title="Xóa nhân vật"
                @click.stop.prevent="requestDeleteCustomCharacter(preset)"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <!-- Custom badge -->
              <div v-if="preset.isCustom" class="absolute z-10 bottom-1.5 left-1.5 text-[8px] font-bold text-white bg-emerald-500 px-1.5 py-0.5 rounded-full">
                CUSTOM
              </div>
              <div
                v-if="preset.isAvailable === false"
                class="absolute z-10 bottom-1.5 right-1.5 text-[8px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full"
              >
                MISSING FILE
              </div>
              <!-- Hover overlay -->
              <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            <!-- Info -->
            <div class="p-2.5">
              <p class="text-body-sm font-semibold text-aura-black group-hover:text-neutral-900 truncate">
                {{ preset.label }}
              </p>
              <p class="text-[10px] text-neutral-400 mt-0.5 line-clamp-2 leading-tight min-h-[24px]">
                {{ preset.description }}
              </p>
              <p v-if="preset.isAvailable === false" class="mt-1 text-[10px] font-medium text-red-500">
                File upload khong con ton tai tren server
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
          </div>
        </div>
      </div>

      <!-- Add Character Dialog -->
      <Teleport to="body">
        <div v-if="showAddCharDialog" class="fixed inset-0 z-[100] flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showAddCharDialog = false" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in">
            <h3 class="text-lg font-serif font-semibold text-aura-black mb-4">Thêm nhân vật Live2D</h3>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-neutral-700 mb-1">Tên nhân vật *</label>
                <input v-model="newCharForm.label" type="text" class="input-field" placeholder="Ví dụ: Sakura" />
              </div>

              <div>
                <label class="block text-sm font-medium text-neutral-700 mb-1">Mô tả</label>
                <input v-model="newCharForm.description" type="text" class="input-field" placeholder="Mô tả ngắn về nhân vật" />
              </div>

              <div>
                <label class="block text-sm font-medium text-neutral-700 mb-1">Tags (cách nhau bằng dấu phẩy)</label>
                <input v-model="newCharForm.tags" type="text" class="input-field" placeholder="cute, female, anime" />
              </div>

              <div>
                <label class="block text-sm font-medium text-neutral-700 mb-1">File model (.zip) *</label>
                <p class="text-xs text-neutral-400 mb-2">
                  ZIP chứa thư mục model Live2D (bao gồm .model3.json, .moc3, textures, motions)
                </p>
                <input
                  ref="charFileInput"
                  type="file"
                  accept=".zip"
                  class="block w-full text-sm text-neutral-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200 file:cursor-pointer file:transition-colors"
                  @change="handleCharFileSelect"
                />
                <p v-if="newCharFile" class="mt-1 text-xs text-emerald-600">
                  ✓ {{ newCharFile.name }} ({{ (newCharFile.size / 1024 / 1024).toFixed(1) }} MB)
                </p>
              </div>
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-800 transition-colors"
                @click="showAddCharDialog = false"
              >
                Hủy
              </button>
              <button
                type="button"
                class="px-5 py-2 text-sm font-medium text-white bg-aura-black hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-40"
                :disabled="!newCharForm.label || !newCharFile || isUploadingChar"
                @click="uploadNewCharacter"
              >
                {{ isUploadingChar ? 'Đang tải lên...' : 'Thêm nhân vật' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Delete Character Dialog -->
      <Teleport to="body">
        <div v-if="pendingDeleteCharacter" class="fixed inset-0 z-[110] flex items-center justify-center px-4">
          <div class="absolute inset-0 bg-neutral-950/70 backdrop-blur-md" @click="cancelDeleteCustomCharacter" />
          <div class="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/15 bg-neutral-950 text-white shadow-[0_28px_90px_rgba(0,0,0,0.45)]">
            <div class="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-red-500/20 blur-3xl" />
            <div class="absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

            <div class="relative p-6">
              <div class="mb-5 flex items-start gap-4">
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/15 text-red-200 ring-1 ring-red-300/20">
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 9v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs uppercase tracking-[0.28em] text-white/40">Confirm delete</p>
                  <h3 class="mt-1 font-serif text-2xl leading-tight">Xóa nhân vật Live2D?</h3>
                </div>
              </div>

              <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p class="text-sm text-white/70">
                  Bạn đang xóa
                  <span class="font-semibold text-white">{{ pendingDeleteCharacter.label }}</span>.
                  File model đã upload cũng sẽ bị gỡ khỏi server.
                </p>
                <p class="mt-2 text-xs leading-relaxed text-white/40">
                  Nếu nhân vật này đang được chọn cho AI ngoài website, hệ thống sẽ tự chuyển về AURA Classic để tránh lỗi mất model.
                </p>
              </div>

              <div class="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  class="rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                  :disabled="isDeletingCharacter"
                  @click="cancelDeleteCustomCharacter"
                >
                  Giữ lại
                </button>
                <button
                  type="button"
                  class="rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-400 disabled:cursor-wait disabled:opacity-60"
                  :disabled="isDeletingCharacter"
                  @click="confirmDeleteCustomCharacter"
                >
                  {{ isDeletingCharacter ? 'Đang xóa...' : 'Xóa nhân vật' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

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
              <div class="mb-2 flex items-center justify-between gap-3">
                <label class="block text-body-sm text-neutral-700 font-medium">{{ t('admin.aiConfig.voiceName') }}</label>
                <button
                  type="button"
                  class="text-caption font-medium text-aura-black hover:text-neutral-600 disabled:text-neutral-300 transition-colors"
                  :disabled="isPreviewingVoice"
                  @click="previewSelectedVoice"
                >
                  {{ isPreviewingVoice ? 'Đang phát...' : 'Nghe thử lại' }}
                </button>
              </div>
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
              <p v-if="isPreviewingVoice" class="text-caption text-emerald-600 mt-1">
                Đang phát thử giọng {{ selectedVoiceOption.value }} · {{ selectedVoiceOption.tone }}
              </p>
              <p v-else-if="voicePreviewError" class="text-caption text-red-500 mt-1">
                {{ voicePreviewError }}
              </p>
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

          <!-- Dynamic Scale & Offset Controls -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <label class="block text-body-sm text-neutral-700 font-medium mb-2">Tỷ lệ Zoom (Scale)</label>
              <div class="flex items-center gap-3">
                <input
                  v-model.number="voiceConfig.live2dScale"
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  class="flex-1"
                />
                <span class="text-body-sm font-mono w-8">{{ voiceConfig.live2dScale }}x</span>
              </div>
            </div>
            
            <div>
              <label class="block text-body-sm text-neutral-700 font-medium mb-2">Vị trí Dọc (Offset Y)</label>
              <div class="flex items-center gap-3">
                <input
                  v-model.number="voiceConfig.live2dOffsetY"
                  type="range"
                  min="-400"
                  max="400"
                  step="10"
                  class="flex-1"
                />
                <span class="text-body-sm font-mono w-12">{{ voiceConfig.live2dOffsetY }}px</span>
              </div>
            </div>
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
            <span v-if="isAutoSavingVoice" class="text-caption text-neutral-400">Đang tự lưu...</span>
            <span
              v-if="saveMessage"
              class="text-body-sm"
              :class="isPositiveSaveMessage ? 'text-green-600' : 'text-red-600'"
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
              <div class="rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.24),_transparent_55%),linear-gradient(180deg,_rgba(255,255,255,0.03),_rgba(255,255,255,0.01))] min-h-[360px] px-5 py-6 flex flex-col items-center justify-center">
                <!-- Character live preview -->
                <div class="h-80 w-56 rounded-[28px] border border-white/10 bg-white/[0.04] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <Live2DCanvasPreview
                    v-if="voiceConfig.live2dModelUrl"
                    :key="`${voiceConfig.live2dModelUrl}-${voiceConfig.live2dScale}-${voiceConfig.live2dOffsetY}`"
                    :model-url="voiceConfig.live2dModelUrl"
                    fit-mode="mascot"
                    :live2d-scale="voiceConfig.live2dScale"
                    :live2d-offset-y="voiceConfig.live2dOffsetY"
                    :width="224"
                    :height="320"
                    class="w-full h-full"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center">
                    <span class="text-5xl font-serif">{{ voiceConfig.characterName.slice(0, 1) || 'A' }}</span>
                  </div>
                </div>
                <p class="mt-4 text-sm font-medium text-white/85">{{ selectedCharacterPreset.label }}</p>
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
              <p
                v-if="selectedCharacterPreset.isAvailable === false"
                class="mt-2 text-center text-xs text-red-300"
              >
                Preset nay dang thieu file tren server. Hay xoa hoac upload lai ZIP.
              </p>
              <p class="mt-2 text-center text-xs text-white/35">{{ voiceConfig.hintText }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
