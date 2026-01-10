<script setup lang="ts">
/**
 * Payment Success Page
 * AURA ARCHIVE - Order payment successful
 */

const route = useRoute()

const orderId = computed(() => route.query.orderId as string || '')

useSeoMeta({ title: 'Thanh toán thành công | AURA ARCHIVE' })
</script>

<template>
  <div class="section">
    <div class="container-aura max-w-lg text-center">
      <!-- Success Icon -->
      <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
        <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 class="font-serif text-heading-1 text-aura-black mb-4">Thanh toán thành công!</h1>
      
      <p class="text-body-lg text-neutral-600 mb-2">
        Cảm ơn bạn đã đặt hàng tại AURA ARCHIVE
      </p>
      
      <p v-if="orderId" class="text-body text-neutral-500 mb-8">
        Mã đơn hàng: <span class="font-medium text-aura-black">#{{ orderId.slice(0, 8).toUpperCase() }}</span>
      </p>

      <p class="text-body text-neutral-600 mb-8">
        Chúng tôi sẽ gửi email xác nhận đơn hàng và cập nhật trạng thái giao hàng cho bạn.
      </p>

      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <NuxtLink to="/account/orders" class="btn-primary">
          Xem đơn hàng
        </NuxtLink>
        <NuxtLink to="/shop" class="btn-secondary">
          Tiếp tục mua sắm
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
