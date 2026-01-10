<script setup lang="ts">
/**
 * AppToast Component
 * AURA ARCHIVE - Toast notifications display
 */

const { notifications, remove } = useNotification()

const iconMap: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const colorMap: Record<string, string> = {
  success: 'bg-green-50 border-green-500 text-green-800',
  error: 'bg-red-50 border-red-500 text-red-800',
  warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
  info: 'bg-blue-50 border-blue-500 text-blue-800',
}

const iconColorMap: Record<string, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      <TransitionGroup name="toast">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="pointer-events-auto border-l-4 rounded-sm shadow-lg p-4 flex items-start gap-3"
          :class="colorMap[notification.type]"
          role="alert"
        >
          <!-- Icon -->
          <span
            class="flex-shrink-0 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
            :class="iconColorMap[notification.type]"
          >
            {{ iconMap[notification.type] }}
          </span>

          <!-- Message -->
          <p class="flex-1 text-body-sm">
            {{ notification.message }}
          </p>

          <!-- Close button -->
          <button
            type="button"
            class="flex-shrink-0 hover:opacity-70 transition-opacity"
            aria-label="Dismiss"
            @click="remove(notification.id)"
          >
            ✕
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.2s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
