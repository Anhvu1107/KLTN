<script setup lang="ts">
/**
 * MarketingPopup
 * Displays the first active popup configured from admin for the current page.
 */

type PopupItem = {
  id: string
  title?: string
  content?: string
  image_url?: string
  button_text?: string
  button_link?: string
  position: 'center' | 'bottom-left' | 'bottom-right' | 'top'
  trigger_type: 'immediate' | 'delay' | 'scroll' | 'exit'
  trigger_value?: number
  show_once?: boolean
}

const config = useRuntimeConfig()
const route = useRoute()
const { sanitize } = useSanitizeHtml()

const activePopup = ref<PopupItem | null>(null)
const isVisible = ref(false)
const hasLoaded = ref(false)

let delayTimer: ReturnType<typeof setTimeout> | null = null
let removeScrollListener: (() => void) | null = null
let removeExitListener: (() => void) | null = null

const dismissedSessionIds = new Set<string>()

const seenStorageKey = (popupId: string) => `aura_popup_seen:${popupId}`

const resolvedImageUrl = computed(() => {
  const url = activePopup.value?.image_url
  if (!url) return ''
  return url.startsWith('http') ? url : `${config.public.apiUrl}${url}`
})

const sanitizedContent = computed(() => {
  if (!activePopup.value?.content) return ''
  return sanitize(activePopup.value.content)
})

const containerClass = computed(() => {
  switch (activePopup.value?.position) {
    case 'bottom-left':
      return 'items-end justify-start p-4 md:p-6'
    case 'bottom-right':
      return 'items-end justify-end p-4 md:p-6'
    case 'top':
      return 'items-start justify-center p-4 md:p-6 pt-20'
    case 'center':
    default:
      return 'items-center justify-center p-4 md:p-6'
  }
})

const cardClass = computed(() => {
  const base = 'w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5'

  if (activePopup.value?.position === 'center') {
    return `${base} max-h-[90vh]`
  }

  return `${base} max-w-md`
})

const clearTriggerHandlers = () => {
  if (delayTimer) {
    clearTimeout(delayTimer)
    delayTimer = null
  }

  removeScrollListener?.()
  removeScrollListener = null

  removeExitListener?.()
  removeExitListener = null
}

const shouldSkipPopup = (popup: PopupItem) => {
  if (!process.client) return false
  if (dismissedSessionIds.has(popup.id)) return true
  if (popup.show_once) {
    return localStorage.getItem(seenStorageKey(popup.id)) === '1'
  }
  return false
}

const rememberDismissal = (popup: PopupItem | null) => {
  if (!process.client || !popup) return

  dismissedSessionIds.add(popup.id)

  if (popup.show_once) {
    localStorage.setItem(seenStorageKey(popup.id), '1')
  }
}

const closePopup = () => {
  rememberDismissal(activePopup.value)
  isVisible.value = false
}

const showPopup = () => {
  if (!activePopup.value) return
  isVisible.value = true
}

const registerScrollTrigger = (thresholdPercent: number) => {
  const onScroll = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    if (maxScroll <= 0) return

    const percent = (window.scrollY / maxScroll) * 100
    if (percent >= thresholdPercent) {
      showPopup()
      removeScrollListener?.()
      removeScrollListener = null
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  removeScrollListener = () => window.removeEventListener('scroll', onScroll)
}

const registerExitTrigger = () => {
  const onMouseLeave = (event: MouseEvent) => {
    if (event.clientY > 0) return
    showPopup()
    removeExitListener?.()
    removeExitListener = null
  }

  document.addEventListener('mouseleave', onMouseLeave)
  removeExitListener = () => document.removeEventListener('mouseleave', onMouseLeave)
}

const schedulePopup = () => {
  clearTriggerHandlers()
  isVisible.value = false

  if (!activePopup.value) return

  const triggerType = activePopup.value.trigger_type || 'delay'
  const triggerValue = Number(activePopup.value.trigger_value || 0)

  if (triggerType === 'immediate') {
    delayTimer = setTimeout(showPopup, 100)
    return
  }

  if (triggerType === 'scroll') {
    registerScrollTrigger(Math.min(Math.max(triggerValue || 30, 1), 100))
    return
  }

  if (triggerType === 'exit') {
    registerExitTrigger()
    return
  }

  delayTimer = setTimeout(showPopup, Math.max(triggerValue || 3, 1) * 1000)
}

const loadPopup = async () => {
  clearTriggerHandlers()
  isVisible.value = false

  try {
    const response = await $fetch<{ success: boolean; data: { popups: PopupItem[] } }>(`${config.public.apiUrl}/popups`, {
      query: { path: route.path },
    })

    const nextPopup = (response.data?.popups || []).find((popup) => !shouldSkipPopup(popup)) || null
    activePopup.value = nextPopup
    hasLoaded.value = true
    schedulePopup()
  } catch (error) {
    console.error('Failed to load popup:', error)
    activePopup.value = null
    hasLoaded.value = true
  }
}

watch(() => route.fullPath, loadPopup)

onMounted(loadPopup)
onBeforeUnmount(clearTriggerHandlers)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="hasLoaded && activePopup && isVisible"
      class="fixed inset-0 z-[70] flex"
      :class="containerClass"
    >
      <div
        class="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        @click="closePopup"
      />

      <div class="relative" :class="cardClass">
        <button
          type="button"
          class="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-500 shadow-sm transition-colors hover:text-aura-black"
          aria-label="Close popup"
          @click="closePopup"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div v-if="resolvedImageUrl" class="aspect-[16/10] overflow-hidden bg-neutral-100">
          <img
            :src="resolvedImageUrl"
            :alt="activePopup.title || 'Popup image'"
            class="h-full w-full object-cover"
          />
        </div>

        <div class="space-y-4 p-5 md:p-6">
          <div v-if="activePopup.title" class="space-y-2">
            <p class="text-caption uppercase tracking-[0.25em] text-neutral-400">AURA ARCHIVE</p>
            <h3 class="font-serif text-heading-3 text-aura-black">
              {{ activePopup.title }}
            </h3>
          </div>

          <div
            v-if="sanitizedContent"
            class="popup-content text-body text-neutral-600"
            v-html="sanitizedContent"
          />

          <div class="flex flex-wrap items-center gap-3">
            <a
              v-if="activePopup.button_link"
              :href="activePopup.button_link"
              class="inline-flex items-center justify-center bg-aura-black px-5 py-3 text-caption uppercase tracking-[0.18em] text-white transition-colors hover:bg-neutral-800"
              @click="closePopup"
            >
              {{ activePopup.button_text || 'Xem ngay' }}
            </a>

            <button
              type="button"
              class="inline-flex items-center justify-center px-4 py-3 text-caption uppercase tracking-[0.18em] text-neutral-500 transition-colors hover:text-aura-black"
              @click="closePopup"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.popup-content :deep(p) {
  margin-bottom: 0.75rem;
}

.popup-content :deep(p:last-child) {
  margin-bottom: 0;
}

.popup-content :deep(a) {
  color: inherit;
  text-decoration: underline;
}
</style>
