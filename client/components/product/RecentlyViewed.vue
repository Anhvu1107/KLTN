<script setup lang="ts">
/**
 * RecentlyViewed Component
 * AURA ARCHIVE - Display recently viewed products
 */

interface Props {
  excludeId?: string
  limit?: number
}

const props = withDefaults(defineProps<Props>(), {
  limit: 6,
})

import { useRecentlyViewed } from '~/composables/useRecentlyViewed'
const { getProducts } = useRecentlyViewed()

const products = computed(() => {
  return getProducts(props.excludeId).slice(0, props.limit)
})

// Format price
const { formatPrice } = useCurrency()
</script>

<template>
  <section v-if="products.length > 0" class="mt-16 pt-12 border-t border-neutral-200">
    <h2 class="font-serif text-heading-3 text-aura-black text-center mb-8">
      {{ $t('shop.recentlyViewed') }}
    </h2>

    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <NuxtLink
        v-for="product in products"
        :key="product.id"
        :to="`/shop/${product.id}`"
        class="group"
      >
        <!-- Image -->
        <div class="aspect-product bg-neutral-100 overflow-hidden mb-3">
          <img 
            v-if="product.image"
            :src="product.image"
            :alt="product.name"
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-neutral-300">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <!-- Info -->
        <div class="text-center">
          <p class="text-caption text-neutral-500 uppercase tracking-wider mb-1 truncate">
            {{ product.brand }}
          </p>
          <h3 class="text-body-sm text-aura-black truncate group-hover:underline">
            {{ product.name }}
          </h3>
          <div class="flex items-baseline justify-center gap-2 mt-1">
            <span v-if="product.salePrice" class="text-body-sm text-accent-burgundy">
              {{ formatPrice(product.salePrice) }}
            </span>
            <span 
              :class="product.salePrice ? 'text-caption text-neutral-400 line-through' : 'text-body-sm text-aura-black'"
            >
              {{ formatPrice(product.price) }}
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>
