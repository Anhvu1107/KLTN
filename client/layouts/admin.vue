<script setup lang="ts">
/**
 * Admin Layout
 * AURA ARCHIVE - Clean layout with content-area loading
 * 
 * Includes auth verification to prevent flash of content before middleware redirect
 */

import { useAuthStore } from '~/stores/auth'

// Inject loading state from app.vue
const isPageLoading = inject<Ref<boolean>>('isPageLoading', ref(false))

// Auth verification - don't show admin content until confirmed admin
const authStore = useAuthStore()
const isVerifying = ref(true)
const isAuthorized = ref(false)

onMounted(async () => {
  // Quick check for admin access
  if (process.client) {
    const token = localStorage.getItem('token')
    const persistedAuth = localStorage.getItem('auth')
    
    if (!token) {
      // No token, will be redirected by middleware
      return
    }
    
    // Check persisted user role
    if (persistedAuth) {
      try {
        const parsed = JSON.parse(persistedAuth)
        if (parsed.user?.role === 'ADMIN') {
          isAuthorized.value = true
          isVerifying.value = false
          return
        }
      } catch {
        // Invalid JSON
      }
    }
    
    // Fallback: check store
    if (authStore.isAdmin) {
      isAuthorized.value = true
      isVerifying.value = false
      return
    }
    
    // Decode JWT to check role
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.role === 'ADMIN') {
        isAuthorized.value = true
      }
    } catch {
      // Invalid token
    }
    
    isVerifying.value = false
  }
})
</script>

<template>
  <!-- Show blank screen while verifying, preventing flash of admin content -->
  <div v-if="isVerifying" class="min-h-screen flex items-center justify-center bg-neutral-50">
    <div class="text-center">
      <div class="content-loader__spinner mx-auto mb-4">
        <div class="content-loader__ring" />
        <div class="content-loader__ring content-loader__ring--delayed" />
      </div>
      <p class="text-sm text-neutral-500">{{ $t('common.loading') || 'Loading...' }}</p>
    </div>
  </div>
  
  <!-- Only show admin layout when verified as admin -->
  <div v-else-if="isAuthorized" class="min-h-screen flex bg-neutral-50">
    <!-- Sidebar Component - Always visible -->
    <AdminSidebar />

    <!-- Main Content -->
    <main class="flex-1 overflow-auto ml-64 relative">
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
          </div>
        </div>
      </Transition>
      
      <slot />
    </main>
  </div>
  
  <!-- Not authorized - show nothing while middleware redirects -->
  <div v-else class="min-h-screen bg-neutral-50" />

  <!-- Global Dialog (replaces native alert/confirm) -->
  <GlobalDialog />
</template>

<style scoped>
.content-loader {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(250, 250, 250, 0.95);
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
  width: 48px;
  height: 48px;
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
  font-size: 0.75rem;
  font-weight: 500;
  color: #0A0A0A;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  animation: pulse 1.5s ease-in-out infinite;
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

