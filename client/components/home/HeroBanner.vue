<script setup lang="ts">
/**
 * GlobalPageLoader.vue
 * Full-screen loading overlay with spinning animation
 * AURA ARCHIVE luxury design aesthetic
 */

const { t } = useI18n()
</script>

<template>
  <Transition name="fade">
    <div class="global-loader">
      <!-- Backdrop with blur -->
      <div class="global-loader__backdrop" />
      
      <!-- Content -->
      <div class="global-loader__content">
        <!-- Spinning Circle -->
        <div class="global-loader__spinner">
          <div class="global-loader__ring" />
          <div class="global-loader__ring global-loader__ring--delayed" />
        </div>
        
        <!-- Loading Text -->
        <p class="global-loader__text">{{ t('common.pageLoading') }}</p>
        
        <!-- Brand -->
        <p class="global-loader__brand">AURA ARCHIVE</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.global-loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.global-loader__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
}

.global-loader__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

/* Spinner Container */
.global-loader__spinner {
  position: relative;
  width: 60px;
  height: 60px;
}

/* Spinning Ring */
.global-loader__ring {
  position: absolute;
  inset: 0;
  border: 3px solid transparent;
  border-top-color: #D4AF37; /* Gold */
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.global-loader__ring--delayed {
  inset: 6px;
  border-top-color: #0A0A0A; /* Black */
  animation-delay: 0.15s;
  animation-direction: reverse;
}

/* Loading Text */
.global-loader__text {
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  color: #0A0A0A;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  animation: pulse 1.5s ease-in-out infinite;
}

/* Brand Text */
.global-loader__brand {
  font-family: 'Playfair Display', serif;
  font-size: 0.75rem;
  font-weight: 400;
  color: #D4AF37;
  letter-spacing: 0.2em;
}

/* Animations */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Fade Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
