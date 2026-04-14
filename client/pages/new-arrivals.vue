<script setup lang="ts">
/**
 * New Arrivals Page
 * AURA ARCHIVE - Products manually flagged as new arrivals
 */

const { t } = useI18n()
const config = useRuntimeConfig()

// Pagination
const page = ref(1)

// Fetch new arrivals
const { data, pending } = await useFetch<{
  success: boolean
  data: {
    products: any[]
    pagination: { total: number; page: number; limit: number; totalPages: number }
  }
}>(() => `${config.public.apiUrl}/products/new-arrivals?page=${page.value}&limit=12`, {
  watch: [page],
})

const products = computed(() => data.value?.data?.products || [])
const pagination = computed(() => data.value?.data?.pagination || { total: 0, page: 1, totalPages: 1 })

// Fetch banner
const { data: bannerData } = await useFetch<{ success: boolean; data: { banners: any[] } }>(
  `${config.public.apiUrl}/banners?section=page_new_arrivals`
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
  title: () => `${t('nav.newArrivals')} | AURA ARCHIVE`,
  description: () => t('home.newArrivalsDesc'),
})
</script>

<template>
  <div>
    <!-- Hero Banner -->
    <div class="relative overflow-hidden border-b border-neutral-200" :class="pageBannerImage ? 'text-white' : 'bg-gradient-to-b from-neutral-100 to-white'">
      <img v-if="pageBannerImage" :src="pageBannerImage" alt="New Arrivals" class="absolute inset-0 w-full h-full object-cover" />
      <div v-if="pageBannerImage" class="absolute inset-0 bg-black/40" />
      <div class="relative container-aura py-16 lg:py-24 text-center">
        <span class="text-caption uppercase tracking-[0.2em] mb-4 block" :class="pageBannerImage ? 'text-white/70' : 'text-accent-navy'">
          {{ t('home.newArrivals') }}
        </span>
        <h1 class="font-serif text-display-2 lg:text-display-1 mb-4" :class="pageBannerImage ? 'text-white' : 'text-aura-black'">
          {{ t('nav.newArrivals') }}
        </h1>
        <p class="text-body max-w-2xl mx-auto" :class="pageBannerImage ? 'text-white/80' : 'text-neutral-600'">
          {{ t('home.newArrivalsDesc') }}
        </p>
        <p v-if="pagination.total" class="text-body-sm mt-4" :class="pageBannerImage ? 'text-white/60' : 'text-neutral-500'">
          {{ pagination.total }} {{ t('shop.products') }}
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
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 class="font-serif text-heading-4 text-aura-black mb-2">{{ t('common.noResults') }}</h3>
        <p class="text-body text-neutral-500 mb-6">{{ t('home.checkBackNewArrivals') }}</p>
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
            <!-- Badges -->
            <div class="absolute top-3 left-3 z-10 flex flex-col gap-2">
              <span class="px-3 py-1 bg-accent-navy text-white text-caption uppercase tracking-wider">
                {{ t('nav.newArrivals') }}
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

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="flex justify-center items-center gap-2 mt-16">
        <button
          @click="page = Math.max(1, page - 1)"
          :disabled="page === 1"
          class="w-10 h-10 flex items-center justify-center border border-neutral-300 text-neutral-600 hover:border-aura-black hover:text-aura-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <template v-for="p in pagination.totalPages" :key="p">
          <button
            v-if="p === 1 || p === pagination.totalPages || (p >= page - 1 && p <= page + 1)"
            @click="page = p"
            class="w-10 h-10 flex items-center justify-center text-body-sm transition-colors"
            :class="p === page ? 'bg-aura-black text-white' : 'border border-neutral-300 text-neutral-600 hover:border-aura-black hover:text-aura-black'"
          >
            {{ p }}
          </button>
          <span 
            v-else-if="p === page - 2 || p === page + 2"
            class="text-neutral-400"
          >
            ...
          </span>
        </template>

        <button
          @click="page = Math.min(pagination.totalPages, page + 1)"
          :disabled="page === pagination.totalPages"
          class="w-10 h-10 flex items-center justify-center border border-neutral-300 text-neutral-600 hover:border-aura-black hover:text-aura-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
