<script setup lang="ts">
/**
 * AI Chat Widget
 * AURA ARCHIVE - Floating chat button with AI stylist
 */
import { marked } from 'marked'

// Configure marked for inline rendering (no wrapping <p> tags)
marked.setOptions({
  breaks: true,
})

const { sanitize } = useSanitizeHtml()

const autoLinkPaths = (text: string): string => {
  return text.replace(/(?<!\]\()(?<!\()(\/shop\/[\w-]+)/g, '[Xem sản phẩm]($1)')
}

const renderMarkdown = (text: string): string => {
  const linked = autoLinkPaths(text)
  const raw = marked.parse(linked, { async: false }) as string
  return sanitize(raw)
}

const config = useRuntimeConfig()
const { t, locale } = useI18n()
import { useSocket } from '~/composables/useSocket'

// Constants
const STORAGE_KEY = 'aura_chat_session_id'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

// State
const isOpen = ref(false)
const isLoading = ref(false)
const isWaitingForAdmin = ref(false)
const sessionId = ref('')
const inputMessage = ref('')
const messages = ref<ChatMessage[]>([])
const chatContainer = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
let hasSocketListener = false
let isMounted = true

// Appearance config (loaded from API)
const appearance = ref({
  chatName: 'AURA Stylist',
  chatDescription: 'Trợ lý thời trang của bạn',
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

// Dynamic Google Font loading
const loadGoogleFont = (font: string) => {
  if (!font || font === 'system-ui') return
  const id = `gfont-${font.replace(/ /g, '-')}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`
  document.head.appendChild(link)
}

// Load appearance config
const loadAppearance = async () => {
  try {
    const res = await $fetch<{ success: boolean; data: any }>(
      `${config.public.apiUrl}/chat/appearance`
    )
    if (res.data) {
      appearance.value = { ...appearance.value, ...res.data }
      if (import.meta.client && appearance.value.fontFamily) {
        loadGoogleFont(appearance.value.fontFamily)
      }
      if (import.meta.client && appearance.value.headerFontFamily) {
        loadGoogleFont(appearance.value.headerFontFamily)
      }
    }
  } catch (e) {
    console.warn('[AiChat] Failed to load appearance config, using defaults:', e)
  }
}

// Save sessionId to localStorage
const saveSessionId = (sid: string) => {
  if (import.meta.client && sid) {
    localStorage.setItem(STORAGE_KEY, sid)
  }
}

// Clear sessionId from localStorage
const clearSessionId = () => {
  if (import.meta.client) {
    localStorage.removeItem(STORAGE_KEY)
  }
}

// Get saved sessionId from localStorage
const getSavedSessionId = (): string | null => {
  if (import.meta.client) {
    return localStorage.getItem(STORAGE_KEY)
  }
  return null
}

const normalizeMessage = (message: ChatMessage): ChatMessage => ({
  role: message.role,
  content: message.content.trim(),
})

const isSameMessage = (left?: ChatMessage | null, right?: ChatMessage | null): boolean => {
  if (!left || !right) return false
  return left.role === right.role && left.content.trim() === right.content.trim()
}

const mapDbMessages = (dbMessages: { role: string; content: string }[]): ChatMessage[] =>
  dbMessages.map((message) =>
    normalizeMessage({
      role: message.role === 'USER' ? 'user' : 'assistant',
      content: message.content,
    })
  )

const pushUniqueMessage = (message: ChatMessage): boolean => {
  const normalized = normalizeMessage(message)
  const lastMessage = messages.value[messages.value.length - 1]

  if (isSameMessage(lastMessage, normalized)) {
    return false
  }

  messages.value.push(normalized)
  return true
}

const syncMessagesFromHistory = (dbMessages: { role: string; content: string }[]): boolean => {
  const serverMessages = mapDbMessages(dbMessages)
  const currentGreeting = messages.value[0]
  const shouldKeepGreeting = currentGreeting
    && currentGreeting.role === 'assistant'
    && !serverMessages.some((message) => isSameMessage(message, currentGreeting))

  const mergedMessages = [
    ...(shouldKeepGreeting ? [normalizeMessage(currentGreeting)] : []),
    ...serverMessages,
  ].filter((message, index, list) => index === 0 || !isSameMessage(message, list[index - 1]))

  const hasChanged = mergedMessages.length !== messages.value.length
    || mergedMessages.some((message, index) => !isSameMessage(message, messages.value[index]))

  if (hasChanged) {
    messages.value = mergedMessages
  }

  return hasChanged
}

// Load chat history from server
const loadChatHistory = async (sid: string): Promise<boolean> => {
  try {
    const token = localStorage.getItem('token')
    const response = await $fetch<{
      success: boolean
      data: { messages: { role: string; content: string }[] }
    }>(`${config.public.apiUrl}/chat/history/${sid}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const dbMessages = response.data?.messages || []
    if (dbMessages.length > 0) {
      sessionId.value = sid
      messages.value = mapDbMessages(dbMessages)
        .filter((message, index, list) => index === 0 || !isSameMessage(message, list[index - 1]))
      setupSocket(sid)
      startWidgetPolling()
      scrollToBottom()
      return true
    }
    return false
  } catch {
    return false
  }
}

// Initialize with greeting (new session)
const initChat = async () => {
  isLoading.value = true
  
  try {
    const response = await $fetch<{
      success: boolean
      message: string
      sessionId: string
    }>(`${config.public.apiUrl}/chat/greeting`)

    sessionId.value = response.sessionId
    saveSessionId(response.sessionId)
    pushUniqueMessage({
      role: 'assistant',
      content: response.message,
    })

    // Setup socket immediately so admin messages arrive even before user sends
    setupSocket(response.sessionId)
    startWidgetPolling()
  } catch (error) {
    pushUniqueMessage({
      role: 'assistant',
      content: t('chat.welcomeFallback', 'Chào mừng bạn đến AURA ARCHIVE! Tôi là AURA, stylist riêng của bạn. Tôi có thể giúp gì cho bạn hôm nay?'),
    })
  } finally {
    isLoading.value = false
  }
}

// Start a brand new conversation
const startNewChat = async () => {
  // Disconnect from current session
  hasSocketListener = false
  disconnectSocket()
  stopWidgetPolling()
  
  // Clear state
  clearSessionId()
  sessionId.value = ''
  messages.value = []
  isWaitingForAdmin.value = false
  
  // Initialize fresh
  await initChat()
}

// ====== WebSocket Real-time ======
const { connect, joinSession, onNewMessage, disconnect: disconnectSocket } = useSocket()

const setupSocket = async (sid: string) => {
  await connect()
  joinSession(sid)
  if (hasSocketListener) return
  onNewMessage((data: any) => {
    // Only handle messages for our session
    if (data.sessionId !== sessionId.value) return

    const msg = data.message
    const role = msg.role === 'USER' ? 'user' as const : 'assistant' as const

    if (role === 'assistant') {
      isWaitingForAdmin.value = false
    }

    if (pushUniqueMessage({ role, content: msg.content })) {
      scrollToBottom()
    }
  })
  hasSocketListener = true
}

// Open chat
const openChat = async () => {
  isOpen.value = true
  
  if (messages.value.length === 0) {
    await loadAppearance()
    
    // Try to resume previous session from localStorage
    const savedSid = getSavedSessionId()
    if (savedSid) {
      isLoading.value = true
      const restored = await loadChatHistory(savedSid)
      isLoading.value = false
      if (restored) return
    }
    
    // No saved session or restore failed — start new
    await initChat()
    return
  }
  
  if (sessionId.value) await setupSocket(sessionId.value)
}

// Close chat
const closeChat = () => {
  isOpen.value = false
  stopWidgetPolling()
}

// Polling fallback for when WebSocket fails
let widgetPollTimer: ReturnType<typeof setInterval> | null = null

const pollForNewMessages = async () => {
  if (!sessionId.value || isLoading.value || !isOpen.value) return
  try {
    const token = localStorage.getItem('token')
    const response = await $fetch<{
      success: boolean
      data: { messages: { role: string; content: string }[] }
    }>(`${config.public.apiUrl}/chat/history/${sessionId.value}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const dbMessages = response.data?.messages || []
    if (dbMessages.length > 0) {
      const previousLength = messages.value.length
      const didSync = syncMessagesFromHistory(dbMessages)

      if (didSync) {
        const hasNewAssistant = messages.value
          .slice(previousLength)
          .some((message) => message.role === 'assistant')

        if (hasNewAssistant) isWaitingForAdmin.value = false
        scrollToBottom()
      }
    }
  } catch (e) { /* ignore */ }
}

const startWidgetPolling = () => {
  if (!isMounted) return
  stopWidgetPolling()
  widgetPollTimer = setInterval(pollForNewMessages, 5000)
}
const stopWidgetPolling = () => {
  if (widgetPollTimer) { clearInterval(widgetPollTimer); widgetPollTimer = null }
}

onUnmounted(() => {
  isMounted = false
  hasSocketListener = false
  disconnectSocket()
  stopWidgetPolling()
})

// Send message
const sendMessage = async () => {
  const message = inputMessage.value.trim()
  if (!message || isLoading.value) return

  // Add user message
  pushUniqueMessage({
    role: 'user',
    content: message,
  })
  
  inputMessage.value = ''
  isLoading.value = true
  scrollToBottom()

  try {
    const token = localStorage.getItem('token')
    
    const response = await $fetch<{
      success: boolean
      message: string | null
      sessionId: string
      metadata?: { paused?: boolean }
    }>(`${config.public.apiUrl}/chat`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: {
        message,
        sessionId: sessionId.value,
      },
    })

    sessionId.value = response.sessionId
    saveSessionId(response.sessionId)
    
    // Connect to WebSocket for real-time updates
    setupSocket(response.sessionId)
    startWidgetPolling()
    
    if (response.metadata?.paused) {
      // AI is paused, admin will reply manually — show typing indicator
      isWaitingForAdmin.value = true
    } else if (response.message) {
      // Normal AI response
      pushUniqueMessage({
        role: 'assistant',
        content: response.message,
      })
    }
  } catch (error) {
    // Even on error, try to setup socket & polling so admin messages can arrive
    if (sessionId.value) {
      setupSocket(sessionId.value)
      startWidgetPolling()
    }
    pushUniqueMessage({
      role: 'assistant',
      content: t('chat.connectionError', 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại.'),
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
    nextTick(() => inputRef.value?.focus())
  }
}

// Scroll to bottom of chat
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// Handle enter key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

// Handle clicks on internal links in chat messages
const router = useRouter()
const handleChatClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.tagName === 'A') {
    const href = target.getAttribute('href')
    if (href && href.startsWith('/')) {
      e.preventDefault()
      closeChat()
      router.push(href)
    }
  }
}
</script>

<template>
  <!-- Chat Button -->
  <button
    v-if="!isOpen"
    @click="openChat"
    class="fixed bottom-6 right-6 w-14 h-14 bg-aura-black text-aura-white rounded-full shadow-elevated hover:bg-neutral-800 transition-all duration-300 hover:scale-105 z-50 flex items-center justify-center"
    aria-label="Open AI Stylist Chat"
  >
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  </button>

  <!-- Chat Window -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-4 scale-95"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 translate-y-4 scale-95"
  >
    <div
      v-if="isOpen"
      class="fixed bottom-6 right-6 w-96 h-[500px] max-h-[80vh] bg-aura-white rounded-lg shadow-elevated overflow-hidden z-50 flex flex-col"
      :style="{ fontFamily: appearance.fontFamily + ', sans-serif' }"
    >
      <!-- Header -->
      <div class="px-4 py-3 flex items-center justify-between" :style="{ backgroundColor: appearance.headerBgColor, color: appearance.headerTextColor }">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden" style="background: rgba(255,255,255,0.15)">
            <img v-if="appearance.avatarUrl" :src="appearance.avatarUrl" alt="Avatar" class="w-full h-full object-cover" />
            <span v-else class="text-caption font-serif">A</span>
          </div>
          <div>
            <h3 class="text-body-sm font-medium" :style="{ color: appearance.headerTextColor, fontFamily: appearance.headerFontFamily + ', serif' }">{{ appearance.chatName }}</h3>
            <p class="text-caption" :style="{ color: appearance.headerTextColor, opacity: 0.7 }">{{ appearance.chatDescription }}</p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button
            @click="startNewChat"
            class="p-1 hover:bg-neutral-700 rounded transition-colors"
            aria-label="New conversation"
            :title="t('chat.newConversation', 'Cuộc trò chuyện mới')"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            @click="closeChat"
            class="p-1 hover:bg-neutral-700 rounded transition-colors"
            aria-label="Close chat"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div
        ref="chatContainer"
        class="flex-1 overflow-y-auto p-4 space-y-4"
        @click="handleChatClick"
      >
        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="flex"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[80%] px-4 py-2 rounded-lg"
            :style="msg.role === 'user'
              ? { backgroundColor: appearance.userBgColor, color: appearance.userTextColor }
              : { backgroundColor: appearance.botBgColor, color: appearance.botTextColor }"
          >
            <div class="text-body-sm chat-markdown" v-html="renderMarkdown(msg.content)"></div>
          </div>
        </div>

        <!-- Loading / Waiting for reply indicator -->
        <div v-if="isLoading || isWaitingForAdmin" class="flex justify-start">
          <div class="bg-neutral-100 px-4 py-3 rounded-lg">
            <div class="flex gap-1">
              <span class="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
              <span class="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
              <span class="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="border-t border-neutral-200 p-3">
        <div class="flex gap-2">
          <input
            ref="inputRef"
            v-model="inputMessage"
            @keydown="handleKeydown"
            type="text"
            :placeholder="t('chat.inputPlaceholder', 'Hỏi về thời trang, phong cách...')"
            class="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-body-sm focus:outline-none focus:border-neutral-300"
            :disabled="isLoading"
          />
          <button
            @click="sendMessage"
            :disabled="!inputMessage.trim() || isLoading"
            class="px-4 py-2 rounded-lg text-body-sm transition-colors disabled:opacity-50"
            :style="{ backgroundColor: appearance.headerBgColor, color: appearance.headerTextColor }"
            :class="(!inputMessage.trim() || isLoading) ? 'cursor-not-allowed' : 'cursor-pointer'"
          >
            {{ t('chat.send', 'Gửi') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.chat-markdown :deep(p) {
  margin: 0 0 0.25rem 0;
  color: inherit !important;
}
.chat-markdown :deep(p:last-child) {
  margin-bottom: 0;
}
.chat-markdown :deep(strong) {
  font-weight: 700;
  color: inherit !important;
}
.chat-markdown :deep(em) {
  font-style: italic;
}
.chat-markdown :deep(ul),
.chat-markdown :deep(ol) {
  margin: 0.25rem 0;
  padding-left: 1.25rem;
}
.chat-markdown :deep(li) {
  margin-bottom: 0.125rem;
  color: inherit !important;
}
.chat-markdown :deep(a) {
  color: inherit;
  text-decoration: underline;
}
</style>
