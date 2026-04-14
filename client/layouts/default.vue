<script setup lang="ts">
/**
 * Default Layout for AURA ARCHIVE
 * Ralph Lauren inspired luxury design with content-area loading
 */

// Inject loading state from app.vue
const isPageLoading = inject<Ref<boolean>>('isPageLoading', ref(false))
</script>

<template>
  <div class="min-h-screen flex flex-col bg-aura-white">
    <!-- Header - Always visible -->
    <TheHeader />

    <!-- Main Content -->
    <main class="flex-1 relative">
      <!-- Content Loading Overlay - Only covers content area -->
      <Transition name="fade">
        <div v-if="isPageLoading" class="content-loader">
          <div class="content-loader__inner">
            <!-- Spinning Circle -->
            <div class="content-loader__spinner">
              <div class="content-loader__ring" />
              <div class="content-loader__ring content-loader__ring--delayed" />
            </div>
            <!-- Loading Text -->
            <p class="content-loader__text">{{ $t('common.pageLoading') }}</p>
            <!-- Brand -->
            <p class="content-loader__brand">AURA ARCHIVE</p>
          </div>
        </div>
      </Transition>
      
      <slot />
    </main>

    <!-- Footer - Always visible -->
    <TheFooter />

    <!-- AI Chat Widget -->
    <AiChatWidget />

    <!-- Compare Bar -->
    <CompareBar />

    <!-- Global Dialog (for alerts and confirms) -->
    <GlobalDialog />

    <!-- Marketing Popup (from admin config) -->
    <ClientOnly>
      <CommonMarketingPopup />
    </ClientOnly>
  </div>
</template>

<style scoped>
.content-loader {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
}

.content-loader__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.content-loader__spinner {
  position: relative;
  width: 60px;
  height: 60px;
}

.content-loader__ring {
  position: absolute;
  inset: 0;
  border: 3px solid transparent;
  border-top-color: #D4AF37;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.content-loader__ring--delayed {
  inset: 6px;
  border-top-color: #0A0A0A;
  animation-delay: 0.15s;
  animation-direction: reverse;
}

.content-loader__text {
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  color: #0A0A0A;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  animation: pulse 1.5s ease-in-out infinite;
}

.content-loader__brand {
  font-family: 'Playfair Display', serif;
  font-size: 0.75rem;
  font-weight: 400;
  color: #D4AF37;
  letter-spacing: 0.2em;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
