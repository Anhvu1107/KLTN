<script setup lang="ts">
/**
 * Admin AI Configuration Page
 * AURA ARCHIVE - Two tabs: Prompt (Câu lệnh) and Appearance (Giao diện)
 */

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { t } = useI18n()
const config = useRuntimeConfig()
const { getToken } = useAuthToken()

const activeTab = ref<'prompt' | 'appearance'>('prompt')
const isSaving = ref(false)
const saveMessage = ref('')
const isLoading = ref(true)
const isUploadingAvatar = ref(false)
const avatarInput = ref<HTMLInputElement | null>(null)

// ====== PROMPT TAB STATE ======
const promptData = ref({
  aiName: 'AURA Stylist',
  roleDesc: t('admin.aiConfig.roleDescPlaceholder', 'Tr\u1ee3 l\u00fd th\u1eddi trang c\u1ee7a b\u1ea1n'),
  systemPrompt: '',
  greetingMessage: '',
})

// ====== APPEARANCE TAB STATE ======
const appearance = ref({
  chatName: 'AURA Stylist',
  chatDescription: t('admin.aiConfig.chatDescPlaceholder', 'Tr\u1ee3 l\u00fd th\u1eddi trang c\u1ee7a b\u1ea1n'),
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

// Font options
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

// Dynamic Google Font loading
const loadedFonts = ref(new Set<string>())
const loadGoogleFont = (font: string) => {
  if (font === 'system-ui' || loadedFonts.value.has(font)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`
  document.head.appendChild(link)
  loadedFonts.value.add(font)
}

watch(() => appearance.value.fontFamily, (font) => {
  if (import.meta.client) loadGoogleFont(font)
})
watch(() => appearance.value.headerFontFamily, (font) => {
  if (import.meta.client) loadGoogleFont(font)
})

// ====== LOAD DATA ======
const loadData = async () => {
  isLoading.value = true
  try {
    const token = getToken()
    // Load system prompts
    const promptsResponse = await $fetch<{
      success: boolean
      data: { prompts: any[] }
    }>(`${config.public.apiUrl}/admin/system-prompts`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const prompts = promptsResponse.data?.prompts || []

    // STYLIST_PERSONA
    const persona = prompts.find((p: any) => p.key === 'STYLIST_PERSONA')
    if (persona) {
      promptData.value.systemPrompt = persona.content
    }

    // GREETING_MESSAGE
    const greeting = prompts.find((p: any) => p.key === 'GREETING_MESSAGE')
    if (greeting) {
      promptData.value.greetingMessage = greeting.content
    }

    // CHAT_APPEARANCE
    const appearanceData = prompts.find((p: any) => p.key === 'CHAT_APPEARANCE')
    if (appearanceData) {
      try {
        const parsed = JSON.parse(appearanceData.content)
        appearance.value = { ...appearance.value, ...parsed }
        // Sync name/desc to promptData
        promptData.value.aiName = parsed.chatName || promptData.value.aiName
        promptData.value.roleDesc = parsed.chatDescription || promptData.value.roleDesc
      } catch {
        // Ignore malformed appearance config and fall back to defaults.
      }
    }
  } catch (error) {
    console.error('Failed to load AI config:', error)
  } finally {
    isLoading.value = false
  }
}

// ====== SAVE PROMPT ======
const savePrompt = async () => {
  isSaving.value = true
  saveMessage.value = ''

  try {
    const token = getToken()

    // Save STYLIST_PERSONA
    await $fetch(`${config.public.apiUrl}/admin/system-prompts/STYLIST_PERSONA`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: { content: promptData.value.systemPrompt },
    })

    // Save GREETING_MESSAGE
    await $fetch(`${config.public.apiUrl}/admin/system-prompts/GREETING_MESSAGE`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: { content: promptData.value.greetingMessage },
    })

    // Also update appearance chatName/chatDescription
    appearance.value.chatName = promptData.value.aiName
    appearance.value.chatDescription = promptData.value.roleDesc
    await saveAppearanceData()

    saveMessage.value = t('admin.aiConfig.saved')
    setTimeout(() => { saveMessage.value = '' }, 3000)
  } catch (error: any) {
    saveMessage.value = error?.data?.message || t('admin.aiConfig.saveError')
  } finally {
    isSaving.value = false
  }
}

// ====== UPLOAD AVATAR ======
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
      }
    )

    if (response.data?.url) {
      appearance.value.avatarUrl = response.data.url
    }
  } catch (error: any) {
    console.error('Avatar upload failed:', error)
    saveMessage.value = error?.data?.message || t('admin.aiConfig.saveError')
    setTimeout(() => { saveMessage.value = '' }, 3000)
  } finally {
    isUploadingAvatar.value = false
    target.value = '' // Reset input
  }
}

// ====== SAVE APPEARANCE ======
const saveAppearanceData = async () => {
  const token = getToken()
  await $fetch(`${config.public.apiUrl}/admin/system-prompts/CHAT_APPEARANCE`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: { content: JSON.stringify(appearance.value) },
  })
}

const saveAppearance = async () => {
  isSaving.value = true
  saveMessage.value = ''

  try {
    await saveAppearanceData()
    saveMessage.value = t('admin.aiConfig.saved')
    setTimeout(() => { saveMessage.value = '' }, 3000)
  } catch (error: any) {
    saveMessage.value = error?.data?.message || t('admin.aiConfig.saveError')
  } finally {
    isSaving.value = false
  }
}

// Preview messages
const previewMessages = computed(() => [
  { role: 'assistant', content: promptData.value.greetingMessage || appearance.value.chatDescription },
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi there! How can I help you today?' },
])

onMounted(loadData)

useSeoMeta({
  title: `${t('admin.aiConfig.title')} | Admin`,
})
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="font-serif text-heading-2 text-aura-black">{{ t('admin.aiConfig.title') }}</h1>
        <p class="text-body-sm text-neutral-500 mt-1">{{ t('admin.aiConfig.desc') }}</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-0 border-b border-neutral-200 mb-6">
      <button
        @click="activeTab = 'prompt'"
        class="px-6 py-3 text-body-sm font-medium transition-colors relative"
        :class="activeTab === 'prompt'
          ? 'text-aura-black'
          : 'text-neutral-400 hover:text-neutral-600'"
      >
        {{ t('admin.aiConfig.tabPrompt') }}
        <span
          v-if="activeTab === 'prompt'"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-aura-black"
        ></span>
      </button>
      <button
        @click="activeTab = 'appearance'"
        class="px-6 py-3 text-body-sm font-medium transition-colors relative"
        :class="activeTab === 'appearance'
          ? 'text-aura-black'
          : 'text-neutral-400 hover:text-neutral-600'"
      >
        {{ t('admin.aiConfig.tabAppearance') }}
        <span
          v-if="activeTab === 'appearance'"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-aura-black"
        ></span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto"></div>
    </div>

    <div v-else-if="activeTab === 'prompt'" class="space-y-6">
      <!-- ====== TAB 1: PROMPT ====== -->
      <div class="card p-6">
        <!-- AI Name + Role Description -->
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

        <!-- System Prompt -->
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
          ></textarea>
        </div>

        <!-- Greeting Message -->
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
          ></textarea>
        </div>

        <!-- Tips -->
        <div class="bg-neutral-50 p-4 rounded-sm mb-6">
          <h3 class="font-medium text-neutral-700 text-body-sm mb-2">{{ t('admin.aiConfig.tipsTitle') }}</h3>
          <ul class="text-caption text-neutral-500 space-y-1">
            <li>• {{ t('admin.aiConfig.tip1') }}</li>
            <li>• {{ t('admin.aiConfig.tip2') }}</li>
            <li>• {{ t('admin.aiConfig.tip3') }}</li>
            <li>• {{ t('admin.aiConfig.tip4') }}</li>
          </ul>
        </div>

        <!-- Save Button -->
        <div class="flex items-center justify-end gap-3">
          <span v-if="saveMessage" class="text-body-sm" :class="saveMessage === t('admin.aiConfig.saved') ? 'text-green-600' : 'text-red-600'">
            {{ saveMessage }}
          </span>
          <button
            @click="savePrompt"
            :disabled="isSaving"
            class="btn-primary"
          >
            {{ isSaving ? t('admin.aiConfig.updating') : t('admin.aiConfig.update') }}
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="activeTab === 'appearance'" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- ====== TAB 2: APPEARANCE ====== -->
      <!-- Settings Panel -->
      <div class="card p-6 space-y-6">
        <!-- Chatbot Name -->
        <div>
          <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.chatbotName') }}</label>
          <input v-model="appearance.chatName" type="text" class="input-field" />
        </div>

        <!-- Chatbot Description -->
        <div>
          <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.chatbotDesc') }}</label>
          <input v-model="appearance.chatDescription" type="text" class="input-field" />
        </div>

        <!-- Greeting Message -->
        <div>
          <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.greetingMessage') }}</label>
          <textarea v-model="promptData.greetingMessage" rows="2" class="input-field text-body-sm"></textarea>
        </div>

        <!-- Font Family -->
        <div>
          <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.fontFamily') }}</label>
          <select v-model="appearance.fontFamily" class="input-field">
            <option v-for="f in fontOptions" :key="f.value" :value="f.value" :style="{ fontFamily: f.value }">{{ f.label }}</option>
          </select>
          <p class="text-caption text-neutral-400 mt-1">{{ t('admin.aiConfig.fontFamilyHint') }}</p>
        </div>

        <!-- Header Font Family -->
        <div>
          <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.headerFontFamily') }}</label>
          <select v-model="appearance.headerFontFamily" class="input-field">
            <option v-for="f in fontOptions" :key="f.value" :value="f.value" :style="{ fontFamily: f.value }">{{ f.label }}</option>
          </select>
          <p class="text-caption text-neutral-400 mt-1">{{ t('admin.aiConfig.headerFontFamilyHint') }}</p>
        </div>

        <!-- Avatar -->
        <div>
          <label class="block text-body-sm text-neutral-700 font-medium mb-2">{{ t('admin.aiConfig.avatar') }}</label>
          <div class="flex items-center gap-4">
            <div
              @click="triggerAvatarUpload"
              class="w-14 h-14 rounded-full overflow-hidden border-2 border-neutral-200 flex-shrink-0 flex items-center justify-center bg-neutral-100 cursor-pointer hover:border-neutral-400 transition-colors relative group"
            >
              <img v-if="appearance.avatarUrl" :src="appearance.avatarUrl" alt="Avatar" class="w-full h-full object-cover" />
              <span v-else class="text-lg font-serif text-neutral-400">A</span>
              <!-- Overlay -->
              <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <!-- Loading spinner -->
              <div v-if="isUploadingAvatar" class="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <div class="flex-1">
              <button
                @click="triggerAvatarUpload"
                :disabled="isUploadingAvatar"
                class="btn-secondary text-body-sm"
              >
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

        <!-- Header Colors -->
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

        <!-- Bot Message Colors -->
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

        <!-- User Message Colors -->
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

        <!-- Save Button -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t">
          <span v-if="saveMessage" class="text-body-sm" :class="saveMessage === t('admin.aiConfig.saved') ? 'text-green-600' : 'text-red-600'">
            {{ saveMessage }}
          </span>
          <button
            @click="saveAppearance"
            :disabled="isSaving"
            class="btn-primary"
          >
            {{ isSaving ? t('admin.aiConfig.updating') : t('admin.aiConfig.update') }}
          </button>
        </div>
      </div>

      <!-- Live Preview -->
      <div>
        <h3 class="text-body-sm font-medium text-neutral-700 mb-3">{{ t('admin.aiConfig.preview') }}</h3>
        <div class="w-full max-w-sm mx-auto rounded-lg shadow-elevated overflow-hidden border border-neutral-200" :style="{ fontFamily: appearance.fontFamily + ', sans-serif' }">
          <!-- Preview Header -->
          <div
            class="px-4 py-3 flex items-center gap-3"
            :style="{ backgroundColor: appearance.headerBgColor, color: appearance.headerTextColor }"
          >
            <div class="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden" style="background: rgba(255,255,255,0.15)">
              <img v-if="appearance.avatarUrl" :src="appearance.avatarUrl" alt="Avatar" class="w-full h-full object-cover" />
              <span v-else class="text-xs font-serif">A</span>
            </div>
            <div>
              <h3 class="text-sm font-medium" :style="{ color: appearance.headerTextColor, fontFamily: appearance.headerFontFamily + ', serif' }">{{ appearance.chatName }}</h3>
              <p class="text-xs" :style="{ color: appearance.headerTextColor, opacity: 0.7 }">{{ appearance.chatDescription }}</p>
            </div>
          </div>

          <!-- Preview Messages -->
          <div class="p-4 space-y-3 bg-white" style="min-height: 280px;">
            <div
              v-for="(msg, index) in previewMessages"
              :key="index"
              class="flex"
              :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[80%] px-3 py-2 rounded-lg text-sm"
                :style="{
                  backgroundColor: msg.role === 'user' ? appearance.userBgColor : appearance.botBgColor,
                  color: msg.role === 'user' ? appearance.userTextColor : appearance.botTextColor,
                }"
              >
                {{ msg.content }}
              </div>
            </div>
          </div>

          <!-- Preview Input -->
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
  </div>
</template>
