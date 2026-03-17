<script setup lang="ts">
/**
 * GlobalDialog Component
 * AURA ARCHIVE - Premium modal dialog (replaces native alert/confirm)
 * Place once in admin layout, controlled via useDialog composable.
 */
import { useDialog } from '~/composables/useDialog'

const { state, close } = useDialog()

const iconMap: Record<string, string> = {
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  close: 'M6 18L18 6M6 6l12 12',
}

const resolvedIcon = computed(() => {
  if (state.options.icon) return iconMap[state.options.icon] || iconMap.warning
  // Default icon based on type
  const typeIconMap: Record<string, string> = {
    danger: iconMap.warning,
    warning: iconMap.warning,
    info: iconMap.info,
    success: iconMap.success,
  }
  return typeIconMap[state.options.type || 'info'] || iconMap.info
})

const iconColors = computed(() => {
  const map: Record<string, { bg: string; text: string }> = {
    danger: { bg: 'bg-red-100', text: 'text-red-600' },
    warning: { bg: 'bg-amber-100', text: 'text-amber-600' },
    info: { bg: 'bg-blue-100', text: 'text-blue-600' },
    success: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  }
  return map[state.options.type || 'info'] || map.info
})

const confirmBtnClass = computed(() => {
  const map: Record<string, string> = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    success: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
  }
  return map[state.options.type || 'info'] || map.info
})

const handleKeydown = (e: KeyboardEvent) => {
  if (!state.show) return
  if (e.key === 'Escape') close(false)
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="state.show" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
          @click="close(false)"
        />

        <!-- Modal -->
        <div class="dialog-panel relative bg-white rounded-2xl shadow-2xl w-full max-w-[420px] overflow-hidden">
          <!-- Top accent bar -->
          <div
            class="h-1"
            :class="{
              'bg-red-500': state.options.type === 'danger',
              'bg-amber-500': state.options.type === 'warning',
              'bg-blue-500': state.options.type === 'info',
              'bg-emerald-500': state.options.type === 'success',
            }"
          />

          <div class="p-6">
            <!-- Icon + Title -->
            <div class="flex items-start gap-4 mb-3">
              <div
                class="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                :class="[iconColors.bg]"
              >
                <svg class="w-5 h-5" :class="[iconColors.text]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="resolvedIcon" />
                </svg>
              </div>
              <div>
                <h3 class="text-[15px] font-bold text-neutral-900 leading-snug">{{ state.options.title }}</h3>
                <p class="text-[13px] text-neutral-500 mt-1.5 leading-relaxed">{{ state.options.message }}</p>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center justify-end gap-2.5 mt-6">
              <button
                v-if="state.mode === 'confirm'"
                @click="close(false)"
                class="px-4 py-2 text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-neutral-300"
              >
                {{ state.options.cancelText }}
              </button>
              <button
                @click="close(true)"
                class="px-4 py-2 text-[13px] font-medium text-white rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2"
                :class="[confirmBtnClass]"
              >
                {{ state.options.confirmText }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Enter */
.dialog-enter-active {
  transition: opacity 0.2s ease;
}
.dialog-enter-active .dialog-panel {
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
}
.dialog-enter-from {
  opacity: 0;
}
.dialog-enter-from .dialog-panel {
  opacity: 0;
  transform: scale(0.92) translateY(10px);
}

/* Leave */
.dialog-leave-active {
  transition: opacity 0.15s ease;
}
.dialog-leave-active .dialog-panel {
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.dialog-leave-to {
  opacity: 0;
}
.dialog-leave-to .dialog-panel {
  opacity: 0;
  transform: scale(0.95);
}
</style>
