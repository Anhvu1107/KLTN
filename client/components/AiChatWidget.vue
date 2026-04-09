<script setup lang="ts">
/**
 * AI Chat Widget
 * AURA ARCHIVE - Live2D Mascot + ChatBot panel + VoiceChat overlay
 */

const route = useRoute()
const isOpen = ref(false)
const isVoiceActive = ref(false)

const isProductDetailPath = (path: string) => /^\/shop\/[^/?#]+(?:[?#].*)?$/.test(path)
const shouldHideChatWindow = computed(() => isVoiceActive.value && isProductDetailPath(route.path))

const openVoiceChat = () => {
  isVoiceActive.value = true

  if (isProductDetailPath(route.path)) {
    isOpen.value = false
  }
}

watch(() => route.path, (path) => {
  if (isVoiceActive.value && isProductDetailPath(path)) {
    isOpen.value = false
  }
})
</script>

<template>
  <!-- Live2D Mascot (replaces old chat button) -->
  <ClientOnly>
    <Live2DMascot
      v-if="!isOpen && !isVoiceActive"
      @click="isOpen = true"
    />
  </ClientOnly>

  <!-- Chat Window -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-4 scale-95"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 translate-y-4 scale-95"
  >
    <div v-if="isOpen && !shouldHideChatWindow" class="fixed bottom-6 right-6 z-50">
      <ChatBot
        @close="isOpen = false"
        @open-voice="openVoiceChat"
      />
    </div>
  </Transition>

  <!-- Voice Chat Overlay (with Live2D model) -->
  <ClientOnly>
    <LazyVoiceChat
      v-if="isVoiceActive"
      :start-minimized="isOpen"
      @close="isVoiceActive = false"
    />
  </ClientOnly>
</template>
