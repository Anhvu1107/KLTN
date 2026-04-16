<script setup lang="ts">
/**
 * CompareBar Component
 * AURA ARCHIVE - Floating bar showing products to compare
 */

import { useCompare } from '~/composables/useCompare'

const { products, count, clear, removeProduct } = useCompare()

// Format price
const { formatPrice } = useCurrency()
</script>

<template>
  <Transition name="slide-up">
    <div
      v-if="count > 0"
      class="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 shadow-lg"
    >
      <div class="container-aura py-4">
        <div class="flex items-center gap-4">
          <!-- Products -->
          <div class="flex-1 flex items-center gap-4 overflow-x-auto">
            <div
              v-for="product in products"
              :key="product.id"
              class="flex items-center gap-3 bg-neutral-50 rounded-sm p-2 pr-4 min-w-[200px]"
            >
              <!-- Image -->
              <div class="w-12 h-12 bg-neutral-100 rounded-sm overflow-hidden flex-shrink-0">
                <img
                  v-if="product.image"
                  :src="product.image"
                  :alt="product.name"
                  class="w-full h-full object-cover"
                />
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="text-caption text-neutral-500 truncate">{{ product.brand }}</p>
                <p class="text-body-sm text-aura-black truncate">{{ product.name }}</p>
                <p class="text-body-sm font-medium">
                  {{ formatPrice(product.salePrice || product.price) }}
                </p>
              </div>

              <!-- Remove -->
              <button
                type="button"
                @click="removeProduct(product.id)"
                class="text-neutral-400 hover:text-red-500 transition-colors"
                :aria-label="`Remove ${product.name} from compare`"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              @click="clear"
              class="text-body-sm text-neutral-500 hover:text-neutral-700"
            >
              {{ $t('common.clear') || 'Clear' }}
            </button>
            <NuxtLink
              to="/compare"
              class="btn-primary px-6 py-2"
            >
              {{ $t('shop.compareProducts') }} ({{ count }})
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
