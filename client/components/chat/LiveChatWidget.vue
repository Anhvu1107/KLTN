<script setup lang="ts">
/**
 * Live Chat Widget
 * AURA ARCHIVE - Zalo/Messenger chat integration
 */

const isOpen = ref(false)
const showOptions = ref(false)

// Contact links
const zaloLink = 'https://zalo.me/0123456789' // Replace with actual Zalo number
const messengerLink = 'https://m.me/auraarchive' // Replace with actual page

const toggleChat = () => {
  showOptions.value = !showOptions.value
}

const openZalo = () => {
  window.open(zaloLink, '_blank')
  showOptions.value = false
}

const openMessenger = () => {
  window.open(messengerLink, '_blank')
  showOptions.value = false
}
</script>

<template>
  <div class="fixed bottom-6 right-6 z-50">
    <!-- Chat Options -->
    <Transition name="slide-up">
      <div v-if="showOptions" class="absolute bottom-16 right-0 flex flex-col gap-3 mb-2">
        <!-- Zalo -->
        <button
          @click="openZalo"
          class="flex items-center gap-3 px-4 py-3 bg-white shadow-elevated rounded-full hover:shadow-lg transition-shadow"
        >
          <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <span class="text-white font-bold text-sm">Zalo</span>
          </div>
          <span class="text-body-sm text-neutral-700 pr-2">Chat Zalo</span>
        </button>

        <!-- Messenger -->
        <button
          @click="openMessenger"
          class="flex items-center gap-3 px-4 py-3 bg-white shadow-elevated rounded-full hover:shadow-lg transition-shadow"
        >
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.13.26.35.27.57l.05 1.78c.04.57.61.94 1.13.71l1.98-.87c.17-.08.36-.09.53-.05.91.25 1.87.38 2.9.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm6.53 7.48l-3.2 5.08c-.51.81-1.59 1.03-2.38.49l-2.55-1.91a.6.6 0 00-.72 0l-3.45 2.62c-.46.35-1.06-.18-.75-.67l3.2-5.08c.51-.81 1.59-1.03 2.38-.49l2.55 1.91c.22.17.53.17.72 0l3.45-2.62c.46-.35 1.06.18.75.67z"/>
            </svg>
          </div>
          <span class="text-body-sm text-neutral-700 pr-2">Messenger</span>
        </button>
      </div>
    </Transition>

    <!-- Main Button -->
    <button
      @click="toggleChat"
      class="w-14 h-14 bg-aura-black rounded-full shadow-elevated hover:shadow-lg transition-all flex items-center justify-center group"
      :class="{ 'rotate-45': showOptions }"
    >
      <svg 
        v-if="!showOptions" 
        class="w-6 h-6 text-white" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <svg 
        v-else 
        class="w-6 h-6 text-white transition-transform" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
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
