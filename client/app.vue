<script setup lang="ts">
/**
 * App.vue - Root component
 * AURA ARCHIVE - Global page loading integration
 *
 * Luxury UX: Fast, elegant loading experience
 */

// Use Nuxt's built-in useLoadingIndicator
const { isLoading } = useLoadingIndicator()
const route = useRoute()
const { fetchSettings, seoTitle, seoDescription, faviconUrl } = useSiteSettings()

// Create reactive loading state
const isPageLoading = ref(false)
let showTimeout: ReturnType<typeof setTimeout> | null = null
let hideTimeout: ReturnType<typeof setTimeout> | null = null

// Timing constants for luxury UX
const SHOW_DELAY = 150    // Only show if loading takes > 150ms (avoid flash)
const MIN_DISPLAY = 250   // Show for at least 250ms once visible (smooth)

let loadStartTime = 0

const faviconHref = computed(() => faviconUrl.value || '/favicon.ico')
const faviconType = computed(() => {
  const cleanUrl = faviconHref.value.split('?')[0].toLowerCase()
  if (cleanUrl.endsWith('.ico')) return 'image/x-icon'
  if (cleanUrl.endsWith('.webp')) return 'image/webp'
  if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'image/jpeg'
  return 'image/png'
})

// Watch the native loading indicator
watch(isLoading, (loading) => {
  if (loading) {
    // Clear any pending hide timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout)
      hideTimeout = null
    }
    
    loadStartTime = Date.now()
    
    // Only show loading if it takes longer than SHOW_DELAY
    showTimeout = setTimeout(() => {
      isPageLoading.value = true
    }, SHOW_DELAY)
    
  } else {
    // Clear show timeout if loading finished quickly
    if (showTimeout) {
      clearTimeout(showTimeout)
      showTimeout = null
    }
    
    // If loader is visible, keep it for MIN_DISPLAY duration
    if (isPageLoading.value) {
      const elapsed = Date.now() - loadStartTime
      const remaining = Math.max(0, MIN_DISPLAY - elapsed + SHOW_DELAY)
      
      hideTimeout = setTimeout(() => {
        isPageLoading.value = false
        hideTimeout = null
      }, remaining)
    }
  }
})

// Provide loading state to layouts
provide('isPageLoading', isPageLoading)

onMounted(() => {
  fetchSettings()
})

useHead(() => ({
  title: seoTitle.value,
  meta: [
    { name: 'description', content: seoDescription.value },
  ],
  link: [
    { key: 'icon', rel: 'icon', type: faviconType.value, href: faviconHref.value },
    { key: 'shortcut-icon', rel: 'shortcut icon', type: faviconType.value, href: faviconHref.value },
    { key: 'apple-touch-icon', rel: 'apple-touch-icon', href: faviconHref.value },
  ],
}))

const layoutName = computed(() => {
  const layoutName = route.meta.layout

  if (layoutName === false) {
    return null
  }

  if (typeof layoutName === 'string') {
    return layoutName
  }

  return 'default'
})
</script>

<template>
  <NuxtPage v-if="layoutName === null" />
  <NuxtLayout v-else :name="layoutName">
    <NuxtPage />
  </NuxtLayout>
  <!-- Zalo/Messenger Widget (bottom-left) -->
  <ClientOnly>
    <LiveChatWidget />
  </ClientOnly>
  <!-- Global Toast Notifications (client-only to avoid hydration mismatch) -->
  <ClientOnly>
    <AppToast />
  </ClientOnly>
</template>
