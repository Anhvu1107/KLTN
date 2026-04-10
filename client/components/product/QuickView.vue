<script setup lang="ts">
/**
 * Quick View Modal
 * AURA ARCHIVE - Product quick view popup
 */

import { useProductSizeLabel } from '~/composables/useProductSizeLabel'

const props = defineProps<{
  product: any
  isOpen: boolean
}>()

const emit = defineEmits(['close', 'addToCart', 'buyNow'])

const selectedVariant = ref<any>(null)
const { formatSizeLabel } = useProductSizeLabel()

// Get variants
const variants = computed(() => props.product?.variants || [])
const sizes = computed(() => [...new Set(variants.value.map((v: any) => v.size))])
const colors = computed(() => [...new Set(variants.value.map((v: any) => v.color))])

const selectedSize = ref('')
const selectedColor = ref('')

// Update selected variant when size/color changes
watch([selectedSize, selectedColor], () => {
  if (selectedSize.value && selectedColor.value) {
    selectedVariant.value = variants.value.find(
      (v: any) => v.size === selectedSize.value && v.color === selectedColor.value
    )
  }
})

// Init with first available variant
watch(() => props.isOpen, (val) => {
  if (val && variants.value.length > 0) {
    const firstVariant = variants.value[0]
    selectedSize.value = firstVariant.size
    selectedColor.value = firstVariant.color
    selectedVariant.value = firstVariant
  }
})

const { formatPrice } = useCurrency()

const { getProductImage } = useImageUrl()

const handleAddToCart = () => {
  if (selectedVariant.value) {
    emit('addToCart', selectedVariant.value)
  }
}

const handleBuyNow = () => {
  if (selectedVariant.value) {
    emit('buyNow', selectedVariant.value)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="isOpen" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="emit('close')"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="emit('close')"></div>
        
        <!-- Modal Content -->
        <div class="relative bg-white max-w-3xl w-full max-h-[90vh] overflow-hidden rounded-sm shadow-2xl">
          <!-- Close Button -->
          <button 
            @click="emit('close')"
            class="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white rounded-full transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div class="grid md:grid-cols-2 gap-6 p-6 overflow-y-auto max-h-[90vh]">
            <!-- Product Image -->
            <div class="aspect-square bg-neutral-100 overflow-hidden">
              <img
                v-if="getProductImage(product)"
                :src="getProductImage(product)"
                :alt="product.name"
                class="w-full h-full object-cover"
              />
            </div>

            <!-- Product Info -->
            <div class="flex flex-col">
              <!-- Brand & Name -->
              <p class="text-caption text-neutral-500 uppercase tracking-wider mb-1">{{ product.brand }}</p>
              <h2 class="font-serif text-heading-3 text-aura-black mb-3">{{ product.name }}</h2>

              <!-- Price -->
              <div class="flex items-center gap-3 mb-6">
                <span 
                  class="text-heading-4 font-medium"
                  :class="product.sale_price ? 'text-accent-burgundy' : 'text-aura-black'"
                >
                  {{ formatPrice(product.sale_price || product.base_price) }}
                </span>
                <span v-if="product.sale_price" class="text-body text-neutral-400 line-through">
                  {{ formatPrice(product.base_price) }}
                </span>
              </div>

              <!-- Description -->
              <p class="text-body text-neutral-600 mb-6 line-clamp-3">
                {{ product.description }}
              </p>

              <!-- Size Selection -->
              <div class="mb-4">
                <p class="text-body-sm font-medium text-aura-black mb-2">{{ $t('shop.size') }}</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="size in sizes"
                    :key="size"
                    @click="selectedSize = size"
                    class="px-4 py-2 text-body-sm border transition-colors"
                    :class="selectedSize === size ? 'border-aura-black bg-aura-black text-white' : 'border-neutral-300 hover:border-aura-black'"
                  >
                    {{ formatSizeLabel(size) }}
                  </button>
                </div>
              </div>

              <!-- Color Selection -->
              <div class="mb-6">
                <p class="text-body-sm font-medium text-aura-black mb-2">{{ $t('shop.color') }}</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="color in colors"
                    :key="color"
                    @click="selectedColor = color"
                    class="px-4 py-2 text-body-sm border transition-colors"
                    :class="selectedColor === color ? 'border-aura-black bg-aura-black text-white' : 'border-neutral-300 hover:border-aura-black'"
                  >
                    {{ color }}
                  </button>
                </div>
              </div>

              <!-- Stock Status -->
              <div v-if="selectedVariant" class="mb-6">
                <span 
                  class="text-body-sm"
                  :class="selectedVariant.status === 'AVAILABLE' ? 'text-green-600' : 'text-red-600'"
                >
                  {{ selectedVariant.status === 'AVAILABLE' ? $t('shop.available') : $t('shop.soldOut') }}
                </span>
              </div>

              <!-- Actions -->
              <div class="flex gap-3 mt-auto">
                <button
                  @click="handleAddToCart"
                  :disabled="!selectedVariant || selectedVariant.status !== 'AVAILABLE'"
                  class="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ $t('shop.addToCart') }}
                </button>
                <button
                  @click="handleBuyNow"
                  :disabled="!selectedVariant || selectedVariant.status !== 'AVAILABLE'"
                  class="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ $t('shop.buyNow') }}
                </button>
              </div>

              <!-- View Detail Link -->
              <NuxtLink 
                :to="`/shop/${product.id}`"
                @click="emit('close')"
                class="text-center text-body-sm text-neutral-500 hover:text-aura-black mt-4 underline"
              >
                {{ $t('shop.viewProductDetail') }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: scale(0.95);
}
</style>
