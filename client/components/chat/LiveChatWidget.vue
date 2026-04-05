<script setup lang="ts">
/**
 * Live Chat Widget
 * AURA ARCHIVE - Zalo/Messenger chat integration
 */

const showOptions = ref(false)
const route = useRoute()
const isAdminPage = computed(() => route.path.startsWith('/admin'))

// Contact links — loaded from site settings, with safe defaults
const config = useRuntimeConfig()
const zaloLink = ref('')
const messengerLink = ref('')

// Load contact links from admin settings
const loadContactLinks = async () => {
  try {
    const res = await $fetch<{ success: boolean; data: any }>(
      `${config.public.apiUrl}/settings`
    )
    const settings = res.data?.settings || res.data || {}
    if (settings.zalo_link) zaloLink.value = settings.zalo_link
    if (settings.messenger_link) messengerLink.value = settings.messenger_link
  } catch {
    // Keep widget available even when settings are temporarily unavailable.
  }
}

onMounted(loadContactLinks)

const toggleChat = () => {
  showOptions.value = !showOptions.value
}

const openZalo = () => {
  if (!zaloLink.value) return
  window.open(zaloLink.value, '_blank')
  showOptions.value = false
}

const openMessenger = () => {
  if (!messengerLink.value) return
  window.open(messengerLink.value, '_blank')
  showOptions.value = false
}
</script>

<template>
  <div v-if="!isAdminPage" class="fixed bottom-6 left-6 z-50">
    <!-- Chat Options -->
    <Transition name="slide-up">
      <div v-if="showOptions" class="absolute bottom-16 left-0 flex flex-col gap-3 mb-2">
        <!-- Zalo -->
        <button
          v-if="zaloLink"
          @click="openZalo"
          class="flex items-center gap-3 px-4 py-3 bg-white border-2 border-neutral-300 shadow-elevated rounded-full hover:shadow-lg hover:border-blue-400 transition-all"
        >
          <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <span class="text-white font-bold text-sm">Zalo</span>
          </div>
          <span class="text-body-sm text-neutral-700 font-medium pr-2">Chat Zalo</span>
        </button>

        <!-- Messenger -->
        <button
          v-if="messengerLink"
          @click="openMessenger"
          class="flex items-center gap-3 px-4 py-3 bg-white border-2 border-neutral-300 shadow-elevated rounded-full hover:shadow-lg hover:border-blue-400 transition-all"
        >
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-600 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.13.26.35.27.57l.05 1.78c.04.57.61.94 1.13.71l1.98-.87c.17-.08.36-.09.53-.05.91.25 1.87.38 2.9.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm6.53 7.48l-3.2 5.08c-.51.81-1.59 1.03-2.38.49l-2.55-1.91a.6.6 0 00-.72 0l-3.45 2.62c-.46.35-1.06-.18-.75-.67l3.2-5.08c.51-.81 1.59-1.03 2.38-.49l2.55 1.91c.22.17.53.17.72 0l3.45-2.62c.46-.35 1.06.18.75.67z"/>
            </svg>
          </div>
          <span class="text-body-sm text-neutral-700 font-medium pr-2">Messenger</span>
        </button>

        <!-- No links configured -->
        <div v-if="!zaloLink && !messengerLink" class="px-4 py-3 bg-white border-2 border-neutral-200 rounded-full">
          <span class="text-body-sm text-neutral-400">Chưa cấu hình liên hệ</span>
        </div>
      </div>
    </Transition>

    <!-- Main Button — Phone icon (different from AI chat bubble on the right) -->
    <button
      @click="toggleChat"
      class="w-14 h-14 bg-green-500 rounded-full shadow-elevated hover:shadow-lg hover:bg-green-600 transition-all flex items-center justify-center"
      :class="{ 'rotate-45': showOptions }"
      aria-label="Liên hệ hỗ trợ"
    >
      <svg 
        v-if="!showOptions" 
        class="w-6 h-6 text-white" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
      <svg 
        v-else 
        class="w-6 h-6 text-white transition-transform" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
