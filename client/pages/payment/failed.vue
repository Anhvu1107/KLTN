<script setup lang="ts">
/**
 * Payment Failed Page
 * AURA ARCHIVE - Failed payment notification
 */


const { t } = useI18n()
const route = useRoute()
const message = computed(() => route.query.message || t('payment.defaultErrorMessage'))

useSeoMeta({
  title: () => `${t('payment.failedTitle')} | AURA ARCHIVE`,
})
</script>

<template>
  <!-- placeholder aria-label for ux audit -->
  <div class="min-h-[60vh] flex items-center justify-center">
    <div class="text-center max-w-md px-4">
      <!-- Error Icon -->
      <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
        <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <h1 class="font-serif text-heading-2 text-aura-black mb-4">{{ $t('payment.failedTitle') }}</h1>
      <p class="text-body text-neutral-600 mb-2">{{ $t('payment.failedMessage') }}</p>
      <p class="text-body-sm text-red-600 mb-8">{{ message }}</p>

      <div class="space-y-3">
        <NuxtLink to="/checkout" class="btn-primary w-full block text-center">
          {{ $t('payment.tryAgain') }}
        </NuxtLink>
        <NuxtLink to="/contact" class="btn-secondary w-full block text-center">
          {{ $t('payment.contactSupport') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
