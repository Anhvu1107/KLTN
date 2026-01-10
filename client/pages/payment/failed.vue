<script setup lang="ts">
/**
 * Payment Failed Page
 * AURA ARCHIVE - Order payment failed
 */

const route = useRoute()

const message = computed(() => route.query.message as string || 'Có lỗi xảy ra trong quá trình thanh toán')

useSeoMeta({ title: 'Thanh toán thất bại | AURA ARCHIVE' })
</script>

<template>
  <div class="section">
    <div class="container-aura max-w-lg text-center">
      <!-- Failed Icon -->
      <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
        <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <h1 class="font-serif text-heading-1 text-aura-black mb-4">Thanh toán thất bại</h1>
      
      <p class="text-body-lg text-neutral-600 mb-8">
        {{ message }}
      </p>

      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <NuxtLink to="/account/orders" class="btn-primary">
          Xem đơn hàng
        </NuxtLink>
        <NuxtLink to="/cart" class="btn-secondary">
          Quay lại giỏ hàng
        </NuxtLink>
      </div>

      <p class="text-body-sm text-neutral-500 mt-8">
        Nếu bạn cần hỗ trợ, vui lòng liên hệ chúng tôi qua email support@aura-archive.com
      </p>
    </div>
  </div>
</template>
