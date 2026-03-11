<script setup lang="ts">
/**
 * AppModal Component
 * AURA ARCHIVE - Reusable confirmation modal
 */

interface Props {
  modelValue: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
  showCancel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  message: '',
  confirmText: '',
  cancelText: '',
  variant: 'info',
  loading: false,
  showCancel: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': []
  'cancel': []
}>()

const { t } = useI18n()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'danger':
      return 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    case 'warning':
      return 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500'
    default:
      return 'bg-accent-navy hover:bg-accent-navy/90 focus:ring-accent-navy'
  }
})

const variantIcon = computed(() => {
  switch (props.variant) {
    case 'danger':
      return '⚠️'
    case 'warning':
      return '⚡'
    default:
      return 'ℹ️'
  }
})

const close = () => {
  if (!props.loading) {
    isOpen.value = false
    emit('cancel')
  }
}

const confirm = () => {
  emit('confirm')
}

// Handle escape key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isOpen.value && !props.loading) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? 'modal-title' : undefined"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="close"
        />

        <!-- Modal -->
        <div
          class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all"
        >
          <!-- Icon -->
          <div class="text-3xl mb-4 text-center">
            {{ variantIcon }}
          </div>

          <!-- Title -->
          <h3
            v-if="title"
            id="modal-title"
            class="text-lg font-medium text-aura-black text-center mb-2"
          >
            {{ title }}
          </h3>

          <!-- Message -->
          <p
            v-if="message"
            class="text-body-sm text-neutral-600 text-center mb-6"
          >
            {{ message }}
          </p>

          <!-- Slot for custom content -->
          <slot />

          <!-- Actions -->
          <div class="flex gap-3 justify-center mt-6">
            <button
              v-if="showCancel"
              type="button"
              class="px-4 py-2 border border-neutral-300 rounded-sm text-body-sm hover:bg-neutral-50 transition-colors disabled:opacity-50"
              :disabled="loading"
              @click="close"
            >
              {{ cancelText || t('common.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 text-white rounded-sm text-body-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
              :class="variantClasses"
              :disabled="loading"
              @click="confirm"
            >
              <span v-if="loading" class="flex items-center gap-2">
                <span class="animate-spin">⟳</span>
                {{ t('common.loading') }}
              </span>
              <span v-else>
                {{ confirmText || t('common.confirm') }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
