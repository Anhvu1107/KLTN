<script setup lang="ts">
/**
 * Mobile Buy Button
 * AURA ARCHIVE - Fixed bottom buy button for mobile product detail
 */

defineProps<{
  product: any
  selectedVariant: any
  isAvailable: boolean
}>()

const emit = defineEmits(['addToCart', 'buyNow'])

const { formatPrice } = useCurrency()
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white p-4 safe-area-bottom lg:hidden">
    <div class="flex items-center gap-3">
      <div class="flex-1">
        <p
          class="text-heading-4 font-medium"
          :class="product.sale_price ? 'text-accent-burgundy' : 'text-aura-black'"
        >
          {{ formatPrice(product.sale_price || product.base_price) }}
        </p>
        <p v-if="product.sale_price" class="text-body-sm text-neutral-400 line-through">
          {{ formatPrice(product.base_price) }}
        </p>
      </div>

      <button
        type="button"
        class="px-5 py-3 border border-aura-black text-aura-black text-body-sm font-medium disabled:opacity-50"
        :disabled="!isAvailable"
        @click="emit('addToCart')"
      >
        Them gio
      </button>
      <button
        type="button"
        class="px-5 py-3 bg-aura-black text-body-sm font-medium text-white disabled:opacity-50"
        :disabled="!isAvailable"
        @click="emit('buyNow')"
      >
        Mua ngay
      </button>
    </div>
  </div>
</template>

<style scoped>
.safe-area-bottom {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
</style>
