<script setup lang="ts">
/**
 * Featured Products Page
 * AURA ARCHIVE - Hand-picked featured products
 */

const { t } = useI18n()
const config = useRuntimeConfig()

// Fetch featured products
const { data, pending } = await useFetch<{
  success: boolean
  data: { products: any[] }
}>(`${config.public.apiUrl}/products/featured?limit=24`)

const products = computed(() => data.value?.data?.products || [])

// Fetch banner
const { data: bannerData } = await useFetch<{ success: boolean; data: { banners: any[] } }>(
  `${config.public.apiUrl}/banners?section=page_featured`
)
const pageBanner = computed(() => bannerData.value?.data?.banners?.[0] || null)
const pageBannerImage = computed(() => {
  const url = pageBanner.value?.image_url
  if (!url) return ''
  return url.startsWith('http') ? url : `${config.public.apiUrl}${url}`
})

// Format price
const { formatPrice } = useCurrency()

// Get variant status
const getVariantStatus = (product: any) => {
  return product.variants?.[0]?.status || 'SOLD'
}

// Get product image
const { getProductImage } = useImageUrl()

useSeoMeta({
  title: () => `Featured | AURA ARCHIVE`,
  description: () => 'Hand-picked featured products curated by our experts',
})
</script>

<template>
  <div>
    <!-- Hero Banner -->
    <div class="relative text-white overflow-hidden" :class="pageBannerImage ? '' : 'bg-gradient-to-b from-neutral-900 to-neutral-800'">
      <img v-if="pageBannerImage" :src="pageBannerImage" alt="Featured" class="absolute inset-0 w-full h-full object-cover" />
      <div v-if="pageBannerImage" class="absolute inset-0 bg-black/50" />
      <div class="relative container-aura py-16 lg:py-24 text-center">
        <span class="text-caption uppercase tracking-[0.2em] text-neutral-400 mb-4 block">
          {{ t('home.curatedSelection') }}
        </span>
        <h1 class="font-serif text-display-2 lg:text-display-1 mb-4">
          {{ t('home.featuredCollectionTitle') }}
        </h1>
        <p class="text-body text-neutral-300 max-w-2xl mx-auto">
          {{ t('home.featuredDesc') }}
        </p>
      </div>
    </div>

    <div class="container-aura py-12 lg:py-16">
      <!-- Loading -->
      <div v-if="pending" class="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div v-for="i in 8" :key="i" class="animate-pulse">
          <div class="aspect-product bg-neutral-200 mb-4" />
          <div class="h-3 bg-neutral-200 w-1/3 mb-2" />
          <div class="h-4 bg-neutral-200 w-2/3 mb-2" />
          <div class="h-4 bg-neutral-200 w-1/4" />
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="products.length === 0" class="text-center py-20">
        <svg class="w-16 h-16 mx-auto text-neutral-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        <h3 class="font-serif text-heading-4 text-aura-black mb-2">{{ t('home.noFeaturedProducts') }}</h3>
        <p class="text-body text-neutral-500 mb-6">{{ t('home.checkBackFeatured') }}</p>
        <NuxtLink to="/shop" class="btn-primary">
          {{ t('common.shop') }}
        </NuxtLink>
      </div>

      <!-- Products Grid -->
      <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
        <NuxtLink
          v-for="product in products"
          :key="product.id"
          :to="`/shop/${product.id}`"
          class="group"
        >
          <!-- Product Image -->
          <div class="aspect-product bg-neutral-100 overflow-hidden relative mb-4">
            <!-- Featured Badge -->
            <div class="absolute top-3 left-3 z-10 flex flex-col gap-2">
              <span class="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-caption uppercase tracking-wider">
                {{ t('home.featuredBadge') }}
              </span>
              <span v-if="getVariantStatus(product) === 'SOLD'" class="px-3 py-1 bg-neutral-900 text-white text-caption uppercase tracking-wider">
                {{ t('shop.sold') }}
              </span>
              <span v-else-if="product.sale_price" class="px-3 py-1 bg-accent-burgundy text-white text-caption uppercase tracking-wider">
                {{ t('shop.sale') }}
              </span>
            </div>

            <!-- Image -->
            <img 
              v-if="getProductImage(product)"
              :src="getProductImage(product)"
              :alt="product.name"
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-neutral-300">
              <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            <!-- Quick View -->
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100">
              <span class="px-6 py-2 bg-white text-aura-black text-caption uppercase tracking-wider">
                {{ t('shop.quickView') }}
              </span>
            </div>
          </div>

          <!-- Product Info -->
          <div class="text-center">
            <p class="text-caption text-neutral-500 uppercase tracking-wider mb-1">{{ product.brand }}</p>
            <h3 class="text-body text-aura-black mb-2 line-clamp-1 group-hover:underline underline-offset-2">{{ product.name }}</h3>
            <div class="flex items-baseline justify-center gap-2">
              <span v-if="product.sale_price" class="text-body text-accent-burgundy">
                {{ formatPrice(product.sale_price) }}
              </span>
              <span 
                :class="product.sale_price ? 'text-body-sm text-neutral-400 line-through' : 'text-body text-aura-black'"
              >
                {{ formatPrice(product.base_price) }}
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
