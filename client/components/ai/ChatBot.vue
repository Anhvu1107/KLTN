<script setup lang="ts">
/**
 * ChatBot Panel
 * AURA ARCHIVE - Chat window with AI stylist conversation
 */

const config = useRuntimeConfig()
const { t } = useI18n()
const router = useRouter()
const { buildAiCustomerContext } = useAiCustomerContext()
const cartStore = useCartStore()
const authStore = useAuthStore()
const { getImageUrl } = useImageUrl()
const { success: notifySuccess, warning: notifyWarning } = useNotification()
import { useSocket } from '~/composables/useSocket'

const emit = defineEmits<{
  close: []
  openVoice: []
}>()

// Constants
const STORAGE_KEY = 'aura_chat_session_id'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

// State
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

  // Check against last 3 messages to prevent duplicates from WebSocket/HTTP race conditions
  const recentMessages = messages.value.slice(-3)
  if (recentMessages.some((msg) => isSameMessage(msg, normalized))) {
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

// ====== WebSocket Real-time ======
const { connect, joinSession, onNewMessage, disconnect: disconnectSocket } = useSocket()

const setupSocket = async (sid: string) => {
  await connect()
  joinSession(sid)
  if (hasSocketListener) return
  onNewMessage((data: any) => {
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

    setupSocket(response.sessionId)
    startWidgetPolling()
  } catch {
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
  hasSocketListener = false
  disconnectSocket()
  stopWidgetPolling()

  clearSessionId()
  sessionId.value = ''
  messages.value = []
  isWaitingForAdmin.value = false

  await initChat()
}

// Polling fallback for when WebSocket fails
let widgetPollTimer: ReturnType<typeof setInterval> | null = null

const pollForNewMessages = async () => {
  if (!sessionId.value || isLoading.value) return
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
  } catch { /* ignore */ }
}

const startWidgetPolling = () => {
  if (!isMounted) return
  stopWidgetPolling()
  widgetPollTimer = setInterval(pollForNewMessages, 5000)
}
const stopWidgetPolling = () => {
  if (widgetPollTimer) { clearInterval(widgetPollTimer); widgetPollTimer = null }
}

// Auto-execute action links from AI response (add-to-cart, wishlist, etc.)
const autoExecuteActions = async (responseText: string) => {
  if (!responseText) return

  // Extract all action links from markdown: [text](/add-to-cart/slug), [text](/save-wishlist/slug), etc.
  const actionLinkRegex = /\[.*?\]\(\/(add-to-cart|save-wishlist|open-cart|checkout)\/([\w-]*)\)/g
  let match: RegExpExecArray | null

  while ((match = actionLinkRegex.exec(responseText)) !== null) {
    const action = match[1]
    const slug = match[2]

    try {
      if (action === 'add-to-cart' && slug) {
        if (!authStore.isAuthenticated) continue

        const res = await $fetch<{ success: boolean; data: { product: any } }>(
          `${config.public.apiUrl}/products/${slug}`
        )
        const product = res.data?.product
        if (!product) continue

        const variants = (Array.isArray(product.variants) ? product.variants : [])
          .filter((v: any) => v?.status === 'AVAILABLE')

        if (!variants.length) continue

        const variant = variants.find((v: any) => !cartStore.isInCart(v.id)) || null
        if (!variant) continue

        let image = ''
        try {
          const imgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images
          if (Array.isArray(imgs) && imgs.length) image = getImageUrl(imgs[0]) || imgs[0] || ''
        } catch {
          // Product images can be stored as either JSON or arrays; ignore malformed legacy values.
        }

        cartStore.addToCart({
          id: variant.id,
          productId: product.id,
          productName: product.name,
          productBrand: product.brand,
          productImage: image,
          variantSize: variant.size || '',
          variantColor: variant.color || '',
          price: parseFloat(product.sale_price || product.base_price || 0),
        })
        notifySuccess(`Đã thêm ${product.name} vào giỏ hàng!`)
      } else if (action === 'save-wishlist' && slug) {
        if (!authStore.isAuthenticated) continue

        const token = localStorage.getItem('token')
        const res = await $fetch<{ success: boolean; data: { product: any } }>(
          `${config.public.apiUrl}/products/${slug}`
        )
        const product = res.data?.product
        if (!product) continue

        await $fetch(`${config.public.apiUrl}/wishlist`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: { productId: product.id },
        })
        notifySuccess(`Đã lưu ${product.name} vào wishlist!`)
      }
    } catch {
      // silently fail for individual actions
    }
  }
}

// Send message
const sendMessage = async () => {
  const message = inputMessage.value.trim()
  if (!message || isLoading.value) return

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
        context: buildAiCustomerContext(),
      },
    })

    sessionId.value = response.sessionId
    saveSessionId(response.sessionId)

    setupSocket(response.sessionId)
    startWidgetPolling()

    if (response.metadata?.paused) {
      isWaitingForAdmin.value = true
    } else if (response.message) {
      pushUniqueMessage({
        role: 'assistant',
        content: response.message,
      })
      // Auto-execute action links (add-to-cart, wishlist, etc.)
      await autoExecuteActions(response.message)
    }
  } catch (error: any) {
    console.warn('[AiChat] sendMessage failed:', error)
    if (sessionId.value) {
      setupSocket(sessionId.value)
      startWidgetPolling()
    }
    const fallbackErrorMessage = error?.data?.message
      || error?.message
      || t('chat.connectionError', 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại.')
    pushUniqueMessage({
      role: 'assistant',
      content: fallbackErrorMessage,
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
const handleChatClick = async (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.tagName === 'A') {
    const href = target.getAttribute('href')
    if (!href || !href.startsWith('/')) return

    e.preventDefault()

    // Handle add-to-cart links
    if (href.startsWith('/add-to-cart/')) {
      const slug = href.replace('/add-to-cart/', '')
      if (!slug) return

      if (!authStore.isAuthenticated) {
        emit('close')
        router.push(`/auth/login?redirect=/shop/${slug}`)
        return
      }

      try {
        const res = await $fetch<{ success: boolean; data: { product: any } }>(
          `${config.public.apiUrl}/products/${slug}`
        )
        const product = res.data?.product
        if (!product) {
          notifyWarning('Không tìm thấy sản phẩm.')
          return
        }

        const variants = (Array.isArray(product.variants) ? product.variants : [])
          .filter((v: any) => v?.status === 'AVAILABLE')

        if (!variants.length) {
          notifyWarning('Sản phẩm hiện không còn hàng.')
          return
        }

        const variant = variants.find((v: any) => !cartStore.isInCart(v.id)) || null
        if (!variant) {
          notifyWarning('Sản phẩm đã có trong giỏ hàng.')
          return
        }

        let image = ''
        try {
          const imgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images
          if (Array.isArray(imgs) && imgs.length) image = getImageUrl(imgs[0]) || imgs[0] || ''
        } catch {
          // Product images can be stored as either JSON or arrays; ignore malformed legacy values.
        }

        cartStore.addToCart({
          id: variant.id,
          productId: product.id,
          productName: product.name,
          productBrand: product.brand,
          productImage: image,
          variantSize: variant.size || '',
          variantColor: variant.color || '',
          price: parseFloat(product.sale_price || product.base_price || 0),
        })
        notifySuccess(`Đã thêm ${product.name} vào giỏ hàng!`)
      } catch {
        notifyWarning('Không thể thêm sản phẩm vào giỏ.')
      }
      return
    }

    // Handle save-to-wishlist links
    if (href.startsWith('/save-wishlist/')) {
      const slug = href.replace('/save-wishlist/', '')
      if (!slug) return

      if (!authStore.isAuthenticated) {
        emit('close')
        router.push(`/auth/login?redirect=/shop/${slug}`)
        return
      }

      try {
        const token = localStorage.getItem('token')
        const res = await $fetch<{ success: boolean; data: { product: any } }>(
          `${config.public.apiUrl}/products/${slug}`
        )
        const product = res.data?.product
        if (!product) {
          notifyWarning('Không tìm thấy sản phẩm.')
          return
        }

        await $fetch(`${config.public.apiUrl}/wishlist`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: { productId: product.id },
        })
        notifySuccess(`Đã lưu ${product.name} vào wishlist!`)
      } catch {
        notifyWarning('Không thể lưu sản phẩm vào wishlist.')
      }
      return
    }

    // Handle open-cart link
    if (href === '/open-cart') {
      emit('close')
      router.push('/cart')
      return
    }

    // Handle checkout link
    if (href === '/checkout') {
      emit('close')
      const target = authStore.isAuthenticated ? '/checkout' : '/auth/login?redirect=/checkout'
      router.push(target)
      return
    }

    // Normal internal links — navigate
    emit('close')
    router.push(href)
  }
}

// Lifecycle
onMounted(async () => {
  await loadAppearance()

  const savedSid = getSavedSessionId()
  if (savedSid) {
    isLoading.value = true
    const restored = await loadChatHistory(savedSid)
    isLoading.value = false
    if (restored) return
  }

  await initChat()
})

onUnmounted(() => {
  isMounted = false
  hasSocketListener = false
  disconnectSocket()
  stopWidgetPolling()
})
</script>

<template>
  <div
    class="w-96 h-[500px] max-h-[80vh] bg-aura-white rounded-lg shadow-elevated overflow-hidden flex flex-col"
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
          @click="emit('close')"
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
      <ChatMessage
        v-for="(msg, index) in messages"
        :key="index"
        :role="msg.role"
        :content="msg.content"
        :appearance="appearance"
      />

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
        <!-- Voice Call Button -->
        <button
          @click="emit('openVoice')"
          class="p-2 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors flex-shrink-0"
          :title="t('chat.voiceCall', 'Gọi thoại với AURA')"
          aria-label="Voice call"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 10v2a7 7 0 01-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" stroke-width="1.5" />
            <line x1="8" y1="23" x2="16" y2="23" stroke-width="1.5" />
          </svg>
        </button>
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
</template>
