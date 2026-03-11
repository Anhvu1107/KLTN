<script setup lang="ts">
/**
 * Compare Products Page
 * AURA ARCHIVE - Side by side product comparison
 */

import { useCompare } from '~/composables/useCompare'
import { useCurrency } from '~/composables/useCurrency' // Added this import

const { t } = useI18n()
const { products, removeProduct, clear } = useCompare()

// Format price
const { formatPrice } = useCurrency()

// Comparison attributes
const attributes = computed(() => [
  { key: 'brand', label: t('shop.brand') || 'Brand' },
  { key: 'category', label: t('shop.category') || 'Category' },
  { key: 'condition', label: t('shop.condition') || 'Condition' },
  { key: 'size', label: t('shop.size') || 'Size' },
  { key: 'color', label: t('shop.color') || 'Color' },
  { key: 'material', label: t('shop.material') || 'Material' },
])

useSeoMeta({
  title: () => `${t('shop.compareProducts') || 'Compare Products'} | AURA ARCHIVE`,
})
</script>

<template>
  <div class="section">
    <div class="container-aura">
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="font-serif text-heading-1 text-aura-black mb-4">
          {{ $t('shop.compareProducts') || 'Compare Products' }}
        </h1>
        <p v-if="products.length > 0" class="text-body text-neutral-600">
          {{ products.length }} {{ $t('shop.products') || 'products' }}
        </p>
      </div>

      <!-- Empty State -->
      <div v-if="products.length === 0" class="text-center py-20">
        <svg class="w-20 h-20 mx-auto text-neutral-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h2 class="font-serif text-heading-3 text-aura-black mb-2">
          {{ $t('common.noResults') || 'No products to compare' }}
        </h2>
        <p class="text-body text-neutral-500 mb-6">
          {{ $t('shop.addProductsToCompare') }}
        </p>
        <NuxtLink to="/shop" class="btn-primary">
          {{ $t('common.shop') || 'Shop Now' }}
        </NuxtLink>
      </div>

      <!-- Comparison Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[600px]">
          <!-- Product Images & Names -->
          <thead>
            <tr>
              <th class="w-40"></th>
              <th 
                v-for="product in products" 
                :key="product.id"
                class="p-4 text-center align-top"
              >
                <div class="relative">
                  <!-- Remove button -->
                  <button
                    type="button"
                    @click="removeProduct(product.id)"
                    class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    :aria-label="`Remove ${product.name}`"
                  >
                    ×
                  </button>

                  <!-- Image -->
                  <NuxtLink :to="`/shop/${product.id}`" class="block">
                    <div class="aspect-product bg-neutral-100 rounded-sm overflow-hidden mb-4 mx-auto max-w-[200px]">
                      <img
                        v-if="product.image"
                        :src="product.image"
                        :alt="product.name"
                        class="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                    <h3 class="text-body font-medium text-aura-black hover:underline">
                      {{ product.name }}
                    </h3>
                  </NuxtLink>
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            <!-- Price -->
            <tr class="border-t border-neutral-200">
              <td class="p-4 text-body-sm text-neutral-500 font-medium uppercase">
                {{ $t('shop.priceRange') || 'Price' }}
              </td>
              <td 
                v-for="product in products" 
                :key="product.id"
                class="p-4 text-center"
              >
                <div class="flex items-baseline justify-center gap-2">
                  <span v-if="product.salePrice" class="text-body font-medium text-accent-burgundy">
                    {{ formatPrice(product.salePrice) }}
                  </span>
                  <span 
                    :class="product.salePrice ? 'text-body-sm text-neutral-400 line-through' : 'text-body font-medium text-aura-black'"
                  >
                    {{ formatPrice(product.price) }}
                  </span>
                </div>
              </td>
            </tr>

            <!-- Dynamic Attributes -->
            <tr 
              v-for="attr in attributes" 
              :key="attr.key"
              class="border-t border-neutral-100"
            >
              <td class="p-4 text-body-sm text-neutral-500 font-medium uppercase">
                {{ attr.label }}
              </td>
              <td 
                v-for="product in products" 
                :key="product.id"
                class="p-4 text-center text-body"
              >
                {{ (product as any)[attr.key] || '—' }}
              </td>
            </tr>

            <!-- Actions -->
            <tr class="border-t border-neutral-200">
              <td class="p-4"></td>
              <td 
                v-for="product in products" 
                :key="product.id"
                class="p-4 text-center"
              >
                <NuxtLink
                  :to="`/shop/${product.id}`"
                  class="btn-primary w-full"
                >
                  {{ $t('shop.details') || 'View Details' }}
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Clear All -->
        <div class="text-center mt-8">
          <button
            type="button"
            @click="clear"
            class="text-body-sm text-neutral-500 hover:text-neutral-700 underline"
          >
            {{ $t('common.clear') || 'Clear All' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
