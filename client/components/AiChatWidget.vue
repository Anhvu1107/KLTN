<script setup lang="ts">
/**
 * AI Chat Widget
 * AURA ARCHIVE - Floating chat button with AI stylist
 */

const config = useRuntimeConfig()

// State
const isOpen = ref(false)
const isLoading = ref(false)
const sessionId = ref('')
const inputMessage = ref('')
const messages = ref<{ role: 'user' | 'assistant'; content: string }[]>([])
const chatContainer = ref<HTMLElement | null>(null)

// Initialize with greeting
const initChat = async () => {
  if (messages.value.length > 0) return

  isLoading.value = true
  
  try {
    const response = await $fetch<{
      success: boolean
      message: string
      sessionId: string
    }>(`${config.public.apiUrl}/chat/greeting`)

    sessionId.value = response.sessionId
    messages.value.push({
      role: 'assistant',
      content: response.message,
    })
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      content: "Welcome to AURA ARCHIVE! I'm AURA, your personal stylist. How may I help you today?",
    })
  } finally {
    isLoading.value = false
  }
}

// Open chat
const openChat = () => {
  isOpen.value = true
  if (messages.value.length === 0) {
    initChat()
  }
}

// Close chat
const closeChat = () => {
  isOpen.value = false
}

// Send message
const sendMessage = async () => {
  const message = inputMessage.value.trim()
  if (!message || isLoading.value) return

  // Add user message
  messages.value.push({
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
      message: string
      sessionId: string
    }>(`${config.public.apiUrl}/chat`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: {
        message,
        sessionId: sessionId.value,
      },
    })

    sessionId.value = response.sessionId
    
    messages.value.push({
      role: 'assistant',
      content: response.message,
    })
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      content: "I apologize, but I'm having trouble connecting. Please try again.",
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
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
    >
      <!-- Header -->
      <div class="bg-aura-black text-aura-white px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center">
            <span class="text-caption font-serif">A</span>
          </div>
          <div>
            <h3 class="text-body-sm font-medium">AURA Stylist</h3>
            <p class="text-caption text-neutral-400">Your personal fashion assistant</p>
          </div>
        </div>
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

      <!-- Messages -->
      <div
        ref="chatContainer"
        class="flex-1 overflow-y-auto p-4 space-y-4"
      >
        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="flex"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[80%] px-4 py-2 rounded-lg"
            :class="msg.role === 'user' 
              ? 'bg-aura-black text-aura-white' 
              : 'bg-neutral-100 text-neutral-800'"
          >
            <p class="text-body-sm whitespace-pre-wrap">{{ msg.content }}</p>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="isLoading" class="flex justify-start">
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
            v-model="inputMessage"
            @keydown="handleKeydown"
            type="text"
            placeholder="Ask about fashion, styling..."
            class="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-body-sm focus:outline-none focus:border-neutral-300"
            :disabled="isLoading"
          />
          <button
            @click="sendMessage"
            :disabled="!inputMessage.trim() || isLoading"
            class="px-4 py-2 bg-aura-black text-aura-white rounded-lg text-body-sm hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
