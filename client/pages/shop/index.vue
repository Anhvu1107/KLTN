<script setup lang="ts">
/**
 * Shop Page
 * AURA ARCHIVE - Product listing with filters
 */

import { useI18n } from '#imports'
import { useCartStore } from '~/stores/cart'

const { t } = useI18n()
const config = useRuntimeConfig()
const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()

// Query params
const page = ref(Number(route.query.page) || 1)
const search = ref(route.query.search as string || '')
const category = ref(route.query.category as string || '')
const brand = ref(route.query.brand as string || '')
const minPrice = ref(route.query.minPrice as string || '')
const maxPrice = ref(route.query.maxPrice as string || '')
const sort = ref(route.query.sort as string || 'newest')

// Build URL params
const buildParams = () => {
  const params = new URLSearchParams()
  if (page.value > 1) params.set('page', String(page.value))
  if (search.value) params.set('search', search.value)
  if (category.value) params.set('category', category.value)
  if (brand.value) params.set('brand', brand.value)
  if (minPrice.value) params.set('minPrice', minPrice.value)
  if (maxPrice.value) params.set('maxPrice', maxPrice.value)
  if (sort.value !== 'newest') params.set('sort', sort.value)
  return params.toString()
}

// Fetch products
const { data, pending, refresh } = await useFetch<{
  success: boolean
  data: {
    products: any[]
    pagination: { total: number; page: number; limit: number; totalPages: number }
  }
}>(() => `${config.public.apiUrl}/products?${buildParams()}`, {
  watch: [page, category, brand, sort],
})

// Fetch brands and categories for filters
const { data: brandsData } = await useFetch<{ success: boolean; data: { brands: string[] } }>(
  `${config.public.apiUrl}/products/brands`
)
const { data: categoriesData } = await useFetch<{ success: boolean; data: { categories: string[] } }>(
  `${config.public.apiUrl}/products/categories`
)

const products = computed(() => data.value?.data?.products || [])
const pagination = computed(() => data.value?.data?.pagination || { total: 0, page: 1, totalPages: 1 })
const brands = computed(() => brandsData.value?.data?.brands || [])
const categories = computed(() => categoriesData.value?.data?.categories || [])

const sortOptions = computed(() => [
  { value: 'newest', label: t('shop.sortNewest') },
  { value: 'price_asc', label: t('shop.sortPriceLow') },
  { value: 'price_desc', label: t('shop.sortPriceHigh') },
  { value: 'name_asc', label: t('shop.sortNameAZ') },
])

// Apply filters
const applyFilters = () => {
  page.value = 1
  const query: any = {}
  if (search.value) query.search = search.value
  if (category.value) query.category = category.value
  if (brand.value) query.brand = brand.value
  if (minPrice.value) query.minPrice = minPrice.value
  if (maxPrice.value) query.maxPrice = maxPrice.value
  if (sort.value !== 'newest') query.sort = sort.value

  router.push({ query })
  refresh()
}

// Clear filters
const clearFilters = () => {
  search.value = ''
  category.value = ''
  brand.value = ''
  minPrice.value = ''
  maxPrice.value = ''
  sort.value = 'newest'
  page.value = 1
  router.push({ query: {} })
  refresh()
}

// Search handler
const handleSearch = () => {
  applyFilters()
}

// Price format
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

// Get variant status
const getVariantStatus = (product: any) => {
  return product.variants?.[0]?.status || 'SOLD'
}

useSeoMeta({
  title: () => `${t('shop.title')} | AURA ARCHIVE`,
  description: () => t('hero.subtitle'),
})
</script>

<template>
  <div class="section">
    <div class="container-aura">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="font-serif text-heading-1 text-aura-black mb-2">{{ t('shop.title') }}</h1>
        <p class="text-body text-neutral-600">{{ pagination.total }} {{ t('shop.products') }}</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <!-- Sidebar Filters -->
        <aside class="lg:col-span-1">
          <div class="sticky top-24 space-y-6">
            <!-- Search -->
            <div>
              <label class="input-label">{{ t('common.search') }}</label>
              <div class="relative">
                <input
                  v-model="search"
                  @keyup.enter="handleSearch"
                  type="text"
                  :placeholder="`${t('common.search')}...`"
                  class="input-field pr-10"
                />
                <button @click="handleSearch" class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-aura-black">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Category -->
            <div>
              <label class="input-label">{{ t('shop.category') }}</label>
              <select v-model="category" @change="applyFilters" class="input-field">
                <option value="">{{ t('shop.allCategories') }}</option>
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>

            <!-- Brand -->
            <div>
              <label class="input-label">{{ t('shop.brand') }}</label>
              <select v-model="brand" @change="applyFilters" class="input-field">
                <option value="">{{ t('shop.allBrands') }}</option>
                <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
              </select>
            </div>

            <!-- Price Range -->
            <div>
              <label class="input-label">{{ t('shop.priceRange') }}</label>
              <div class="flex gap-2">
                <input v-model="minPrice" type="number" :placeholder="t('shop.minPrice')" class="input-field w-1/2" />
                <input v-model="maxPrice" type="number" :placeholder="t('shop.maxPrice')" class="input-field w-1/2" />
              </div>
              <button @click="applyFilters" class="mt-2 text-body-sm text-neutral-600 hover:text-aura-black">
                {{ t('shop.applyPrice') }}
              </button>
            </div>

            <!-- Clear Filters -->
            <button @click="clearFilters" class="text-body-sm text-neutral-500 hover:text-aura-black underline">
              {{ t('shop.clearFilters') }}
            </button>
          </div>
        </aside>

        <!-- Products Grid -->
        <div class="lg:col-span-3">
          <!-- Sort -->
          <div class="flex justify-end mb-6">
            <select v-model="sort" @change="applyFilters" class="input-field w-48">
              <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <!-- Loading -->
          <div v-if="pending" class="text-center py-16">
            <p class="text-neutral-500">{{ t('common.loading') }}</p>
          </div>

          <!-- Empty -->
          <div v-else-if="products.length === 0" class="text-center py-16">
            <p class="text-neutral-500 mb-4">{{ t('common.noResults') }}</p>
            <button @click="clearFilters" class="btn-secondary">{{ t('shop.clearFilters') }}</button>
          </div>

          <!-- Products -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            <NuxtLink
              v-for="product in products"
              :key="product.id"
              :to="`/shop/${product.id}`"
              class="group"
            >
              <div class="aspect-product bg-neutral-100 rounded-sm overflow-hidden relative mb-4">
                <!-- Sold Badge -->
                <div v-if="getVariantStatus(product) === 'SOLD'" class="absolute top-3 left-3 z-10">
                  <span class="px-2 py-1 bg-neutral-900 text-white text-caption">{{ t('shop.sold') }}</span>
                </div>
                <!-- Sale Badge -->
                <div v-else-if="product.sale_price" class="absolute top-3 left-3 z-10">
                  <span class="px-2 py-1 bg-accent-burgundy text-white text-caption">{{ t('shop.sale') }}</span>
                </div>
                <!-- Placeholder -->
                <div class="w-full h-full flex items-center justify-center text-neutral-300 group-hover:scale-105 transition-transform duration-500">
                  <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>

              <!-- Info -->
              <p class="text-caption text-neutral-500 uppercase tracking-wider">{{ product.brand }}</p>
              <h3 class="text-body font-medium text-aura-black group-hover:underline">{{ product.name }}</h3>
              <div class="flex items-baseline gap-2 mt-1">
                <span v-if="product.sale_price" class="text-body text-accent-burgundy">
                  {{ formatPrice(product.sale_price) }}
                </span>
                <span 
                  :class="product.sale_price ? 'text-body-sm text-neutral-400 line-through' : 'text-body'"
                >
                  {{ formatPrice(product.base_price) }}
                </span>
              </div>
            </NuxtLink>
          </div>

          <!-- Pagination -->
          <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-12">
            <button
              v-for="p in pagination.totalPages"
              :key="p"
              @click="page = p; refresh()"
              class="w-10 h-10 flex items-center justify-center text-body-sm transition-colors"
              :class="p === pagination.page ? 'bg-aura-black text-white' : 'bg-neutral-100 hover:bg-neutral-200'"
            >
              {{ p }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
