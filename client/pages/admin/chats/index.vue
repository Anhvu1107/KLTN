<script setup lang="ts">
/**
 * Admin Chat Management
 * AURA ARCHIVE - 3-column chat dashboard for managing AI conversations
 */

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

import { useSocket } from '~/composables/useSocket'
import { useDialog } from '~/composables/useDialog'
import { useAuthStore } from '~/stores/auth'

const { t, locale } = useI18n()
const config = useRuntimeConfig()
const authStore = useAuthStore()
const { confirm: showConfirm, alert: showAlert } = useDialog()
const token = computed(() => authStore.token)

// ====== STATE ======
const sessions = ref<any[]>([])
const selectedSession = ref<any>(null)
const messages = ref<any[]>([])
const sessionInfo = ref<any>(null)
const isLoadingSessions = ref(true)
const isLoadingMessages = ref(false)
const isSavingCustomer = ref(false)
const saveMessage = ref('')
const adminMessage = ref('')
const isSendingAdmin = ref(false)

// Search
const searchQuery = ref('')
const searchDebounce = ref<any>(null)

// Filter tabs
const activeFilter = ref('')

const tabs = computed(() => [
  { key: '', label: t('admin.chatManagement.tabAll') },
  { key: 'joined', label: t('admin.chatManagement.tabJoined') },
  { key: 'unread', label: t('admin.chatManagement.tabUnread') },
  { key: 'closed', label: t('admin.chatManagement.tabClosed') },
])

// Message search (in-chat) - client-side Ctrl+F style
const showMessageSearch = ref(false)
const messageSearchQuery = ref('')
const currentMatchIndex = ref(0)

// Chat container ref
const chatContainer = ref<HTMLElement | null>(null)

// Customer form
const customerForm = ref({
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  customer_address: '',
  customer_year: '',
  admin_note: '',
})

// ====== SOCKET.IO REAL-TIME ======
const { connect: connectSocket, joinAdmin, joinSession: joinSessionRoom, onNewMessage, onSessionUpdated, disconnect: disconnectSocket } = useSocket()

const setupAdminSocket = async () => {
  await connectSocket()
  joinAdmin()
  
  // Listen for new messages (for the currently viewed session)
  onNewMessage((data: any) => {
    if (selectedSession.value && data.sessionId === selectedSession.value.session_id) {
      // Add message to current view
      const msg = data.message
      const lastMsg = messages.value[messages.value.length - 1]
      // Avoid duplicates
      if (!lastMsg || lastMsg.content !== msg.content || lastMsg.role !== msg.role) {
        messages.value.push(msg)
        scrollToBottom()
      }
    }
    // Refresh session list to update previews/counts
    fetchSessions(searchQuery.value, true)
  })
  
  // Listen for session updates
  onSessionUpdated((_session: any) => {
    fetchSessions(searchQuery.value, true)
  })
}

// ====== FETCH SESSIONS ======
const fetchSessions = async (search = '', silent = false) => {
  if (!silent) isLoadingSessions.value = true
  try {
    const response = await $fetch<{ success: boolean; data: any }>(
      `${config.public.apiUrl}/admin/chats`,
      {
        headers: { Authorization: `Bearer ${token.value}` },
        params: {
          search: search || undefined,
          limit: 50,
          filter: activeFilter.value || undefined,
        },
      }
    )
    sessions.value = response.data?.sessions || []
  } catch {
    console.error('Failed to fetch sessions:', e)
  } finally {
    if (!silent) isLoadingSessions.value = false
  }
}

// ====== FETCH MESSAGES (with real-time refresh) ======
const fetchMessages = async (sessionId: string, silent = false) => {
  if (!silent) isLoadingMessages.value = true
  try {
    const response = await $fetch<{ success: boolean; data: any }>(
      `${config.public.apiUrl}/admin/chats/${sessionId}`,
      {
        headers: { Authorization: `Bearer ${token.value}` },
      }
    )
    const newMessages = response.data?.messages || []
    
    // Only update and scroll if there are new messages
    const hadNewMessages = newMessages.length > messages.value.length
    messages.value = newMessages
    sessionInfo.value = response.data?.session || sessionInfo.value

    if (hadNewMessages) scrollToBottom()
  } catch (e: any) {
    console.error('Failed to fetch messages:', e)
  } finally {
    if (!silent) isLoadingMessages.value = false
  }
}

// ====== SELECT SESSION ======
const selectSession = async (session: any) => {
  selectedSession.value = session
  showMessageSearch.value = false
  messageSearchQuery.value = ''
  currentMatchIndex.value = 0

  // Fetch messages (with loading)
  await fetchMessages(session.session_id, false)

  // Fill customer form
  if (sessionInfo.value) {
    customerForm.value = {
      customer_name: sessionInfo.value.customer_name || `${sessionInfo.value.user?.first_name || ''} ${sessionInfo.value.user?.last_name || ''}`.trim() || '',
      customer_email: sessionInfo.value.customer_email || sessionInfo.value.user?.email || '',
      customer_phone: sessionInfo.value.customer_phone || sessionInfo.value.user?.phone || '',
      customer_address: sessionInfo.value.customer_address || sessionInfo.value.user?.address || '',
      customer_year: sessionInfo.value.customer_year || '',
      admin_note: sessionInfo.value.admin_note || '',
    }
  }

  // Mark as read locally
  session.is_read = true

  scrollToBottom()

  // Join this session's socket room for real-time messages
  joinSessionRoom(session.session_id)
  // Also start polling as fallback
  startMessagePolling(session.session_id)
}

// ====== FILTER TAB CHANGE ======
const setFilter = (filter: string) => {
  activeFilter.value = filter
  selectedSession.value = null
  messages.value = []
  sessionInfo.value = null
  fetchSessions(searchQuery.value)
}

// ====== ACTIONS ======
const toggleAiPause = async () => {
  if (!selectedSession.value) return
  try {
    const response = await $fetch<{ success: boolean; data: any }>(
      `${config.public.apiUrl}/admin/chats/${selectedSession.value.session_id}/pause-ai`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token.value}` },
      }
    )
    if (sessionInfo.value) {
      sessionInfo.value.is_ai_paused = response.data?.session?.is_ai_paused
    }
  } catch (e: any) {
    console.error('Failed to toggle AI pause:', e)
  }
}

const toggleJoinRoom = async () => {
  if (!selectedSession.value) return
  const action = sessionInfo.value?.admin_joined ? 'leave' : 'join'
  try {
    const response = await $fetch<{ success: boolean; data: any }>(
      `${config.public.apiUrl}/admin/chats/${selectedSession.value.session_id}/${action}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token.value}` },
      }
    )
    if (sessionInfo.value) {
      sessionInfo.value.admin_joined = response.data?.session?.admin_joined
    }
  } catch (e: any) {
    console.error('Failed to toggle room:', e)
  }
}

// ====== CLOSE / REOPEN SESSION ======
const closeSession = async () => {
  if (!selectedSession.value) return
  const ok = await showConfirm({ title: t('admin.chatManagement.confirmClose', '\u0110\u00f3ng \u0111o\u1ea1n chat'), message: t('admin.chatManagement.confirmCloseDesc', 'Phi\u00ean chat s\u1ebd b\u1ecb \u0111\u00f3ng. B\u1ea1n c\u00f3 th\u1ec3 m\u1edf l\u1ea1i sau n\u1ebfu c\u1ea7n.'), type: 'warning', confirmText: t('admin.chatManagement.closeSession', '\u0110\u00f3ng'), icon: 'close' })
  if (!ok) return
  try {
    await $fetch(
      `${config.public.apiUrl}/admin/chats/${selectedSession.value.session_id}/close`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token.value}` },
      }
    )
    if (sessionInfo.value) {
      sessionInfo.value.status = 'closed'
      sessionInfo.value.admin_joined = false
    }
    fetchSessions(searchQuery.value, true)
  } catch (e: any) {
    console.error('Failed to close session:', e)
  }
}

const reopenSession = async () => {
  if (!selectedSession.value) return
  try {
    await $fetch(
      `${config.public.apiUrl}/admin/chats/${selectedSession.value.session_id}/reopen`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token.value}` },
      }
    )
    if (sessionInfo.value) {
      sessionInfo.value.status = 'active'
    }
    fetchSessions(searchQuery.value, true)
  } catch (e: any) {
    console.error('Failed to reopen session:', e)
  }
}

// ====== DELETE SESSION ======
const isDeletingSession = ref(false)

const deleteSession = async () => {
  if (!selectedSession.value) return
  const ok = await showConfirm({ title: t('admin.chatManagement.confirmDeleteTitle', 'X\u00e1c nh\u1eadn x\u00f3a \u0111o\u1ea1n chat'), message: t('admin.chatManagement.confirmDeleteDesc', 'B\u1ea1n c\u00f3 ch\u1eafc ch\u1eafn mu\u1ed1n x\u00f3a v\u0129nh vi\u1ec5n to\u00e0n b\u1ed9 l\u1ecbch s\u1eed c\u1ee7a phi\u00ean chat n\u00e0y kh\u00f4ng? D\u1eef li\u1ec7u \u0111\u00e3 x\u00f3a s\u1ebd kh\u00f4ng th\u1ec3 kh\u00f4i ph\u1ee5c l\u1ea1i \u0111\u01b0\u1ee3c.'), type: 'danger', confirmText: t('admin.chatManagement.delete', 'X\u00f3a v\u0129nh vi\u1ec5n'), icon: 'trash' })
  if (!ok) return
  
  isDeletingSession.value = true
  try {
    await $fetch(
      `${config.public.apiUrl}/admin/chats/${selectedSession.value.session_id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token.value}` },
      }
    )
    selectedSession.value = null
    messages.value = []
    sessionInfo.value = null
    fetchSessions(searchQuery.value)
  } catch (e: any) {
    console.error('Failed to delete session:', e)
    showAlert({ title: t('notifications.error', 'L\u1ed7i'), message: t('admin.chatManagement.deleteFailed', 'X\u00f3a th\u1ea5t b\u1ea1i'), type: 'danger' })
  } finally {
    isDeletingSession.value = false
  }
}

// ====== ADMIN SEND MESSAGE ======
const sendAdminMsg = async () => {
  const content = adminMessage.value.trim()
  if (!content || !selectedSession.value || isSendingAdmin.value) return
  
  isSendingAdmin.value = true
  try {
    const response = await $fetch<{ success: boolean; data: any }>(
      `${config.public.apiUrl}/admin/chats/${selectedSession.value.session_id}/message`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}` },
        body: { content },
      }
    )
    // Add to local messages immediately
    if (response.data?.message) {
      messages.value.push(response.data.message)
    }
    adminMessage.value = ''
    scrollToBottom()
  } catch (e: any) {
    console.error('Failed to send admin message:', e)
  } finally {
    isSendingAdmin.value = false
  }
}

// ====== SEARCH MESSAGES (client-side, per-occurrence, diacritics-insensitive) ======
const removeDiacritics = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd').replace(/\u0110/g, 'D')
}

const allOccurrences = computed(() => {
  const q = removeDiacritics(messageSearchQuery.value.trim().toLowerCase())
  if (!q) return [] as { msgIndex: number; occIndex: number }[]
  const results: { msgIndex: number; occIndex: number }[] = []
  messages.value.forEach((msg, mi) => {
    if (!msg.content) return
    const text = removeDiacritics(msg.content.toLowerCase())
    let pos = 0
    let occIdx = 0
    while ((pos = text.indexOf(q, pos)) !== -1) {
      results.push({ msgIndex: mi, occIndex: occIdx })
      pos += q.length
      occIdx++
    }
  })
  return results
})

const totalMatches = computed(() => allOccurrences.value.length)

const currentOccurrence = computed(() => allOccurrences.value[currentMatchIndex.value] ?? null)

const matchingMessageIndices = computed(() => {
  return [...new Set(allOccurrences.value.map(o => o.msgIndex))]
})

const escapeHtml = (str: string) => {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const highlightText = (text: string, msgIndex: number) => {
  const q = removeDiacritics(messageSearchQuery.value.trim().toLowerCase())
  if (!q || !text) return escapeHtml(text || '')
  const normalizedText = removeDiacritics(text.toLowerCase())
  const cur = currentOccurrence.value
  const activeOccInThisMsg = (cur && cur.msgIndex === msgIndex) ? cur.occIndex : -1

  // Find all match positions in normalized text, then map back to original
  const matches: { start: number; end: number }[] = []
  let pos = 0
  while ((pos = normalizedText.indexOf(q, pos)) !== -1) {
    let origStart = 0, origEnd = 0
    for (let i = 0; i <= text.length; i++) {
      const normLen = removeDiacritics(text.substring(0, i).toLowerCase()).length
      if (normLen === pos) origStart = i
      if (normLen === pos + q.length) { origEnd = i; break }
    }
    matches.push({ start: origStart, end: origEnd })
    pos += q.length
  }

  if (matches.length === 0) return escapeHtml(text)

  // Build result string with highlights (escape all text segments)
  let result = ''
  let lastEnd = 0
  matches.forEach((m, idx) => {
    result += escapeHtml(text.substring(lastEnd, m.start))
    const matchedText = escapeHtml(text.substring(m.start, m.end))
    const isActive = idx === activeOccInThisMsg
    if (isActive) {
      result += `<mark class="bg-red-400 text-white rounded px-0.5 font-bold ring-2 ring-red-500">${matchedText}</mark>`
    } else {
      result += `<mark class="bg-orange-300 text-neutral-900 rounded px-0.5 font-semibold">${matchedText}</mark>`
    }
    lastEnd = m.end
  })
  result += escapeHtml(text.substring(lastEnd))
  return result
}

const scrollToMatch = (index: number) => {
  nextTick(() => {
    const occ = allOccurrences.value[index]
    if (!occ) return
    const el = document.getElementById(`chat-msg-${occ.msgIndex}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

const goToNextMatch = () => {
  if (totalMatches.value === 0) return
  currentMatchIndex.value = (currentMatchIndex.value + 1) % totalMatches.value
  scrollToMatch(currentMatchIndex.value)
}

const goToPrevMatch = () => {
  if (totalMatches.value === 0) return
  currentMatchIndex.value = (currentMatchIndex.value - 1 + totalMatches.value) % totalMatches.value
  scrollToMatch(currentMatchIndex.value)
}

const onSearchInput = () => {
  currentMatchIndex.value = 0
  if (totalMatches.value > 0) {
    scrollToMatch(0)
  }
}

// ====== SAVE CUSTOMER ======
const saveCustomerInfo = async () => {
  if (!selectedSession.value) return
  isSavingCustomer.value = true
  saveMessage.value = ''
  try {
    await $fetch(
      `${config.public.apiUrl}/admin/chats/${selectedSession.value.session_id}/customer`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token.value}` },
        body: customerForm.value,
      }
    )
    saveMessage.value = t('admin.chatManagement.saveSuccess')
    setTimeout(() => { saveMessage.value = '' }, 2000)
  } catch {
    saveMessage.value = t('admin.chatManagement.saveFailed')
  } finally {
    isSavingCustomer.value = false
  }
}

// ====== HELPERS ======
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

const formatRelativeTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return t('admin.chatManagement.justNow')
  if (minutes < 60) return t('admin.chatManagement.minutesAgo', { n: minutes })
  if (hours < 24) return t('admin.chatManagement.hoursAgo', { n: hours })
  if (days < 7) return t('admin.chatManagement.daysAgo', { n: days })
  return date.toLocaleDateString(locale.value === 'vi' ? 'vi-VN' : 'en-US')
}

const formatMessageTime = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString(locale.value === 'vi' ? 'vi-VN' : 'en-US', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

const getDisplayName = (session: any) => {
  if (session.customer_name) return session.customer_name
  if (session.user) return `${session.user.first_name || ''} ${session.user.last_name || ''}`.trim()
  return t('common.guest')
}

const getPreview = (session: any) => {
  const msg = session.last_message || ''
  return msg.length > 50 ? msg.substring(0, 50) + '...' : msg
}

const isSessionClosed = computed(() => sessionInfo.value?.status === 'closed')

// Debounced search
watch(searchQuery, (val) => {
  clearTimeout(searchDebounce.value)
  searchDebounce.value = setTimeout(() => fetchSessions(val), 300)
})

// ====== POLLING FALLBACK (safety net alongside socket) ======
let sessionPollTimer: ReturnType<typeof setInterval> | null = null
let messagePollTimer: ReturnType<typeof setInterval> | null = null

const startPolling = () => {
  // Session list: refresh every 2s
  sessionPollTimer = setInterval(() => {
    fetchSessions(searchQuery.value, true)
  }, 2000)
}

const startMessagePolling = (sid: string) => {
  stopMessagePolling()
  messagePollTimer = setInterval(() => {
    fetchMessages(sid, true)
  }, 1000)
}

const stopMessagePolling = () => {
  if (messagePollTimer) { clearInterval(messagePollTimer); messagePollTimer = null }
}

const stopAllPolling = () => {
  if (sessionPollTimer) { clearInterval(sessionPollTimer); sessionPollTimer = null }
  stopMessagePolling()
}

// Initial load + connect WebSocket + start polling fallback
onMounted(() => {
  fetchSessions()
  setupAdminSocket()
  startPolling()
})

// Cleanup on unmount
onUnmounted(() => {
  disconnectSocket()
  stopAllPolling()
})

useSeoMeta({
  title: () => t('admin.chatManagement.seoTitle'),
})
</script>

<template>
  <div class="flex h-[calc(100vh-64px)] bg-neutral-50 overflow-hidden">

    <!-- ===== LEFT: SESSION LIST ===== -->
    <div class="w-[340px] border-r border-neutral-200 bg-white flex flex-col shrink-0">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-neutral-200 bg-gradient-to-r from-orange-500 to-orange-600">
        <div class="flex items-center gap-2">
          <span class="text-white font-bold text-body-sm">{{ $t('admin.chatManagement.virtualAssistant') }}</span>
          <span class="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-bold">{{ $t('admin.chatManagement.live') }}</span>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="flex overflow-x-auto border-b border-neutral-200 bg-neutral-50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="setFilter(tab.key)"
          class="flex-1 whitespace-nowrap px-3 py-2.5 text-[13px] font-medium transition-colors text-center"
          :class="activeFilter === tab.key
            ? 'text-orange-600 border-b-2 border-orange-500 bg-white'
            : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100'"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Search -->
      <div class="p-3 border-b border-neutral-100">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            :value="searchQuery"
            @input="searchQuery = ($event.target as HTMLInputElement).value"
            type="text"
            :placeholder="$t('admin.chatManagement.searchByName')"
            class="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-body-sm focus:outline-none focus:border-orange-300"
          />
        </div>
      </div>

      <!-- Session List -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="isLoadingSessions" class="p-4 text-center text-neutral-400 text-body-sm">
          {{ $t('admin.chatManagement.loading') }}
        </div>
        <div v-else-if="sessions.length === 0" class="p-4 text-center text-neutral-400 text-body-sm">
          {{ $t('admin.chatManagement.noConversations') }}
        </div>
        <div
          v-for="session in sessions"
          :key="session.id"
          @click="selectSession(session)"
          class="flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-neutral-50 transition-colors"
          :class="[
            selectedSession?.session_id === session.session_id
              ? 'bg-orange-50 border-l-4 border-l-orange-500'
              : 'hover:bg-neutral-50 border-l-4 border-l-transparent',
            session.status === 'closed' ? 'opacity-60' : '',
          ]"
        >
          <!-- Avatar with status dot -->
          <div class="relative shrink-0">
            <div class="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center">
              <svg class="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <!-- Read/Unread dot -->
            <span
              v-if="session.status !== 'closed'"
              class="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
              :class="session.is_read ? 'bg-green-500' : 'bg-blue-500'"
            />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <span class="font-medium text-body-sm text-neutral-800 truncate">
                {{ getDisplayName(session) }}
              </span>
              <div class="flex items-center gap-1 shrink-0">
                <span
                  v-if="session.status === 'closed'"
                  class="text-xs bg-neutral-200 text-neutral-500 px-1.5 py-0.5 rounded"
                >{{ $t('admin.chatManagement.closedBadge') }}</span>
                <span
                  v-if="session.is_ai_paused && session.status !== 'closed'"
                  class="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded"
                >✋</span>
              </div>
            </div>
            <p class="text-caption text-neutral-500 truncate mt-0.5">
              Bot: {{ getPreview(session) }}
            </p>
            <p class="text-xs text-neutral-400 mt-0.5">
              {{ formatRelativeTime(session.last_activity) }}
            </p>
          </div>

          <!-- Join indicator -->
          <div v-if="session.admin_joined && session.status !== 'closed'" class="shrink-0">
            <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Active count -->
      <div class="px-4 py-2 border-t border-neutral-200 bg-neutral-50">
        <p class="text-caption text-neutral-500">
          {{ sessions.filter(s => !s.is_read).length }} {{ $t('admin.chatManagement.unread') }} · {{ sessions.length }} {{ $t('admin.chatManagement.total') }}
        </p>
      </div>
    </div>

    <!-- ===== CENTER: CHAT DETAIL ===== -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- No session selected -->
      <div v-if="!selectedSession" class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <svg class="w-16 h-16 mx-auto text-neutral-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          <p class="text-neutral-400 text-body">{{ $t('admin.chatManagement.selectConversation') }}</p>
        </div>
      </div>

      <template v-else>
        <!-- Chat view -->
        <!-- Chat Header -->
        <div class="px-4 py-3 border-b border-neutral-200 bg-white flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">
              <svg class="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div>
              <h3 class="font-medium text-body-sm text-neutral-800">
                {{ getDisplayName(selectedSession) }}
                <span v-if="!selectedSession.user" class="text-neutral-400">{{ $t('admin.chatManagement.demo') }}</span>
                <span v-if="isSessionClosed" class="ml-1 text-xs bg-neutral-200 text-neutral-500 px-1.5 py-0.5 rounded">{{ $t('admin.chatManagement.closedBadge') }}</span>
              </h3>
              <p class="text-xs text-neutral-400">
                {{ messages.length }} {{ $t('admin.chatManagement.messages') }}
                <span v-if="sessionInfo?.is_ai_paused && !isSessionClosed" class="text-yellow-600"> · {{ $t('admin.chatManagement.aiPaused') }}</span>
                <span v-if="sessionInfo?.admin_joined && !isSessionClosed" class="text-green-600"> · {{ $t('admin.chatManagement.joined') }}</span>
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-1">
            <!-- Search in messages -->
            <button
              @click="showMessageSearch = !showMessageSearch; if(!showMessageSearch) { messageSearchQuery = ''; currentMatchIndex = 0 }"
              class="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              :class="showMessageSearch ? 'bg-orange-100 text-orange-600' : 'text-neutral-500'"
              :title="$t('admin.chatManagement.searchMessagesTooltip')"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </button>

            <template v-if="!isSessionClosed">
              <!-- Pause AI -->
              <button
                @click="toggleAiPause"
                class="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                :class="sessionInfo?.is_ai_paused ? 'bg-red-100 text-red-600' : 'text-neutral-500'"
                :title="sessionInfo?.is_ai_paused ? $t('admin.chatManagement.resumeAi') : $t('admin.chatManagement.pauseAi')"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10.5 2C7.46 2 5 4.46 5 7.5S7.46 13 10.5 13H11v7h2v-7h.5c3.04 0 5.5-2.46 5.5-5.5S16.54 2 13.5 2h-3zM11 11H9.5C8.12 11 7 9.88 7 8.5S8.12 6 9.5 6H11v5zm4.5 0H13V6h1.5C15.88 6 17 7.12 17 8.5S15.88 11 15.5 11z"/>
                </svg>
              </button>

              <!-- Join/Leave Room -->
              <button
                @click="toggleJoinRoom"
                class="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                :class="sessionInfo?.admin_joined ? 'bg-green-100 text-green-600' : 'text-neutral-500'"
                :title="sessionInfo?.admin_joined ? $t('admin.chatManagement.leaveRoom') : $t('admin.chatManagement.joinRoom')"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="!sessionInfo?.admin_joined" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                  <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </button>

              <!-- Close Session -->
              <button
                @click="closeSession"
                class="p-2 hover:bg-red-50 rounded-lg transition-colors text-neutral-400 hover:text-red-500"
                :title="$t('admin.chatManagement.closeSession')"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </template>

            <!-- Reopen Session (only for closed) -->
            <button
              v-else
              @click="reopenSession"
              class="p-2 hover:bg-green-50 rounded-lg transition-colors text-neutral-400 hover:text-green-500"
              :title="$t('admin.chatManagement.reopenSession', 'M\u1edf l\u1ea1i \u0111o\u1ea1n chat')"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
            <!-- Delete Session (only for closed) -->
            <button
              v-if="isSessionClosed"
              @click="deleteSession"
              :disabled="isDeletingSession"
              class="p-2 hover:bg-red-50 rounded-lg transition-colors text-neutral-400 hover:text-red-500 disabled:opacity-50"
              :title="$t('admin.chatManagement.deleteSession', 'X\u00f3a v\u0129nh vi\u1ec5n')"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Closed session banner -->
        <div v-if="isSessionClosed" class="px-4 py-2 bg-neutral-100 border-b border-neutral-200 shrink-0">
          <p class="text-body-sm text-neutral-500 text-center">{{ $t('admin.chatManagement.sessionClosed') }}</p>
        </div>

        <!-- Message Search Bar -->
        <div v-if="showMessageSearch" class="px-4 py-2 bg-orange-50 border-b border-orange-200 shrink-0">
          <div class="flex items-center gap-2">
            <input
              v-model="messageSearchQuery"
              @input="onSearchInput"
              @keydown.enter.exact="goToNextMatch"
              @keydown.shift.enter="goToPrevMatch"
              type="text"
              :placeholder="$t('admin.chatManagement.searchMessages')"
              class="flex-1 px-3 py-1.5 bg-white border border-orange-200 rounded-lg text-body-sm focus:outline-none focus:border-orange-400"
            />
            <span class="text-body-sm text-orange-600 whitespace-nowrap font-medium min-w-[3rem] text-center">
              {{ totalMatches > 0 ? `${currentMatchIndex + 1}/${totalMatches}` : '0/0' }}
            </span>
            <button
              @click="goToPrevMatch"
              :disabled="totalMatches === 0"
              class="p-1.5 hover:bg-orange-100 rounded-lg transition-colors text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous (Shift+Enter)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
            </button>
            <button
              @click="goToNextMatch"
              :disabled="totalMatches === 0"
              class="p-1.5 hover:bg-orange-100 rounded-lg transition-colors text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next (Enter)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
          </div>
        </div>

        <!-- Messages Area -->
        <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50">
          <div v-if="isLoadingMessages" class="text-center py-8 text-neutral-400">
            {{ $t('admin.chatManagement.loadingMessages') }}
          </div>
          <template v-else>
            <div
              v-for="(msg, msgIndex) in messages"
              :key="msg.id"
              :id="`chat-msg-${msgIndex}`"
              class="flex transition-all duration-300"
              :class="[
                msg.role === 'USER' || msg.role === 'user' ? 'justify-start' : 'justify-end',
                matchingMessageIndices.includes(msgIndex) ? 'ring-2 ring-orange-300 rounded-lg p-1' : '',
                currentOccurrence?.msgIndex === msgIndex ? 'ring-2 ring-orange-500 bg-orange-50/50 rounded-lg p-1' : ''
              ]"
            >
              <!-- User message (left) -->
              <div v-if="msg.role === 'USER' || msg.role === 'user'" class="flex items-end gap-2 max-w-[70%]">
                <div class="w-8 h-8 rounded-full bg-neutral-300 flex items-center justify-center shrink-0">
                  <svg class="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <div>
                  <div class="bg-white px-4 py-2.5 rounded-2xl rounded-bl-sm shadow-sm border border-neutral-100">
                    <p v-if="messageSearchQuery.trim()" class="text-body-sm text-neutral-800 whitespace-pre-wrap" v-html="highlightText(msg.content, msgIndex)"></p>
                    <p v-else class="text-body-sm text-neutral-800 whitespace-pre-wrap">{{ msg.content }}</p>
                  </div>
                  <p class="text-xs text-neutral-400 mt-1 ml-1">{{ formatMessageTime(msg.created_at || msg.createdAt) }}</p>
                </div>
              </div>

              <div v-else class="flex items-end gap-2 max-w-[70%]">
                <!-- AI message (right) -->
                <div>
                  <div class="bg-gradient-to-br from-orange-400 to-orange-500 px-4 py-2.5 rounded-2xl rounded-br-sm shadow-sm">
                    <p v-if="messageSearchQuery.trim()" class="text-body-sm text-white whitespace-pre-wrap" v-html="highlightText(msg.content, msgIndex)"></p>
                    <p v-else class="text-body-sm text-white whitespace-pre-wrap">{{ msg.content }}</p>
                  </div>
                  <p class="text-xs text-neutral-400 mt-1 text-right mr-1">{{ formatMessageTime(msg.created_at || msg.createdAt) }}</p>
                </div>
                <div class="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                  <span class="text-white text-xs font-bold">AI</span>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Admin input (only when joined AND session is active) -->
        <div v-if="sessionInfo?.admin_joined && !isSessionClosed" class="border-t border-neutral-200 p-3 bg-white shrink-0">
          <p class="text-xs text-green-600 mb-2">{{ $t('admin.chatManagement.joinedRoom') }}</p>
          <div class="flex gap-2">
            <input
              v-model="adminMessage"
              @keydown.enter="sendAdminMsg"
              type="text"
              :placeholder="$t('admin.chatManagement.enterMessage')"
              class="flex-1 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-body-sm focus:outline-none focus:border-orange-300"
              :disabled="isSendingAdmin"
            />
            <button
              @click="sendAdminMsg"
              :disabled="!adminMessage.trim() || isSendingAdmin"
              class="px-5 py-2.5 bg-orange-500 text-white rounded-lg text-body-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {{ isSendingAdmin ? '...' : $t('admin.chatManagement.send') }}
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- ===== RIGHT: INFO PANEL ===== -->
    <div v-if="selectedSession" class="w-80 border-l border-neutral-200 bg-white flex flex-col shrink-0 overflow-y-auto">
      <!-- AI Suggestions -->
      <div class="border-b border-neutral-200">
        <button class="w-full px-4 py-3 flex items-center justify-between text-body-sm font-medium text-neutral-700 hover:bg-neutral-50">
          <span>{{ $t('admin.chatManagement.aiSuggestions') }}</span>
        </button>
        <div class="px-4 pb-4">
          <p class="text-body-sm text-neutral-400 text-center py-3">{{ $t('admin.chatManagement.noData') }}</p>
        </div>
      </div>

      <!-- Customer Info -->
      <div class="flex-1 p-4">
        <h3 class="text-body-sm font-medium text-neutral-700 mb-4 flex items-center gap-2">
          <span>{{ $t('admin.chatManagement.customerInfo') }}</span>
        </h3>

        <div class="space-y-3">
          <div>
            <label class="block text-caption text-neutral-500 mb-1 uppercase tracking-wider">{{ $t('admin.chatManagement.customerName') }}</label>
            <input
              v-model="customerForm.customer_name"
              type="text"
              class="w-full px-3 py-2 border border-neutral-200 rounded-lg text-body-sm focus:outline-none focus:border-orange-300 bg-orange-50"
              :disabled="isSessionClosed"
            />
          </div>
          <div>
            <label class="block text-caption text-neutral-500 mb-1 uppercase tracking-wider">{{ $t('admin.chatManagement.email') }}</label>
            <input
              v-model="customerForm.customer_email"
              type="email"
              class="w-full px-3 py-2 border border-neutral-200 rounded-lg text-body-sm focus:outline-none focus:border-orange-300"
              :disabled="isSessionClosed"
            />
          </div>
          <div>
            <label class="block text-caption text-neutral-500 mb-1 uppercase tracking-wider">{{ $t('admin.chatManagement.phone') }}</label>
            <input
              v-model="customerForm.customer_phone"
              type="text"
              class="w-full px-3 py-2 border border-neutral-200 rounded-lg text-body-sm focus:outline-none focus:border-orange-300"
              :disabled="isSessionClosed"
            />
          </div>
          <div>
            <label class="block text-caption text-neutral-500 mb-1 uppercase tracking-wider">{{ $t('admin.chatManagement.address') }}</label>
            <textarea
              v-model="customerForm.customer_address"
              rows="2"
              class="w-full px-3 py-2 border border-neutral-200 rounded-lg text-body-sm focus:outline-none focus:border-orange-300 resize-none"
              :disabled="isSessionClosed"
            />
          </div>
          <div>
            <label class="block text-caption text-neutral-500 mb-1 uppercase tracking-wider">{{ $t('admin.chatManagement.year') }}</label>
            <input
              v-model="customerForm.customer_year"
              type="text"
              class="w-full px-3 py-2 border border-neutral-200 rounded-lg text-body-sm focus:outline-none focus:border-orange-300"
              :disabled="isSessionClosed"
            />
          </div>
          <div>
            <label class="block text-caption text-neutral-500 mb-1 uppercase tracking-wider">{{ $t('admin.chatManagement.note') }}</label>
            <textarea
              v-model="customerForm.admin_note"
              rows="3"
              class="w-full px-3 py-2 border border-neutral-200 rounded-lg text-body-sm focus:outline-none focus:border-orange-300 resize-none"
              :disabled="isSessionClosed"
            />
          </div>
        </div>

        <!-- Save button (only for active sessions) -->
        <div v-if="!isSessionClosed" class="mt-4">
          <p v-if="saveMessage" class="text-body-sm text-green-600 mb-2 text-center">{{ saveMessage }}</p>
          <button
            @click="saveCustomerInfo"
            :disabled="isSavingCustomer"
            class="w-full py-2.5 bg-blue-500 text-white rounded-lg text-body-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {{ isSavingCustomer ? $t('admin.chatManagement.saving') : $t('admin.chatManagement.save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Right panel placeholder when no session -->
    <div v-else class="w-80 border-l border-neutral-200 bg-white flex items-center justify-center shrink-0">
      <p class="text-neutral-300 text-body-sm">{{ $t('admin.chatManagement.selectConversationShort') }}</p>
    </div>
  </div>
</template>
