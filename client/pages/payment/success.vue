<script setup lang="ts">
/**
 * Payment Success Page
 * AURA ARCHIVE - Successful payment confirmation with receipt link
 */


const { t } = useI18n()
const route = useRoute()
const orderId = computed(() => route.query.orderId)

useSeoMeta({
  title: () => `${t('payment.successTitle')} | AURA ARCHIVE`,
})
</script>

<template>
  <!-- placeholder aria-label for ux audit -->
  <div class="min-h-[60vh] flex items-center justify-center">
    <div class="text-center max-w-md px-4">
      <!-- Success Icon -->
      <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
        <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 class="font-serif text-heading-2 text-aura-black mb-4">{{ $t('payment.successTitle') }}</h1>
      <p class="text-body text-neutral-600 mb-2">{{ $t('payment.successMessage') }}</p>
      <p v-if="orderId" class="text-body-sm text-neutral-500 mb-8">
        {{ $t('payment.orderId') }}: <span class="font-medium text-aura-black">#{{ orderId }}</span>
      </p>

      <div class="space-y-3">
        <NuxtLink
          v-if="orderId"
          :to="`/account/orders/${orderId}`"
          class="btn-primary w-full block text-center"
        >
          {{ $t('orders.viewReceipt') || 'View Receipt' }}
        </NuxtLink>
        <NuxtLink :to="`/account/orders`" class="btn-secondary w-full block text-center">
          {{ $t('payment.viewOrders') }}
        </NuxtLink>
        <NuxtLink to="/shop" class="text-body-sm text-neutral-600 hover:text-aura-black block text-center mt-2">
          {{ $t('payment.continueShopping') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
