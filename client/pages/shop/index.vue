<script setup lang="ts">
/**
 * Shop Page - Ralph Lauren Inspired
 * AURA ARCHIVE - Elegant product listing with refined filters
 */

import { useI18n } from '#imports'

const { t } = useI18n()
const config = useRuntimeConfig()
const route = useRoute()
const router = useRouter()

// Query params
const page = ref(Number(route.query.page) || 1)
const search = ref(route.query.search as string || '')
const category = ref(route.query.category as string || '')
const subcategory = ref(route.query.subcategory as string || '')
const brand = ref(route.query.brand as string || '')
const sort = ref(route.query.sort as string || 'newest')
const minPrice = ref(route.query.minPrice ? Number(route.query.minPrice) : null)
const maxPrice = ref(route.query.maxPrice ? Number(route.query.maxPrice) : null)
const size = ref(route.query.size as string || '')
const color = ref(route.query.color as string || '')

// Mobile filter toggle
const showFilters = ref(false)

// Build URL params
const buildParams = () => {
  const params = new URLSearchParams()
  params.set('page', String(page.value))
  params.set('limit', '12')
  if (search.value) params.set('search', search.value)
  if (category.value) params.set('category', category.value)
  if (subcategory.value) params.set('subcategory', subcategory.value)
  if (brand.value) params.set('brand', brand.value)
  if (sort.value) params.set('sort', sort.value)
  if (minPrice.value !== null) params.set('minPrice', String(minPrice.value))
  if (maxPrice.value !== null) params.set('maxPrice', String(maxPrice.value))
  if (size.value) params.set('size', size.value)
  if (color.value) params.set('color', color.value)
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
  watch: [page, category, subcategory, brand, sort, minPrice, maxPrice, size, color],
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

// API returns objects like {category: 'Pants', count: 1}, extract just the name
const brands = computed(() => {
  const raw = brandsData.value?.data?.brands || []
  return raw.map((b: any) => typeof b === 'string' ? b : b.brand).filter(Boolean)
})
const categories = computed(() => {
  const raw = categoriesData.value?.data?.categories || []
  return raw.map((c: any) => typeof c === 'string' ? c : c.category).filter(Boolean)
})

const sortOptions = computed(() => [
  { value: 'newest', label: t('shop.sortNewest') },
  { value: 'price_asc', label: t('shop.sortPriceLow') },
  { value: 'price_desc', label: t('shop.sortPriceHigh') },
  { value: 'name_asc', label: t('shop.sortAZ') },
])

// Subcategories with translations
const subcategories = computed(() => [
  { value: 'Women', label: t('shop.women') },
  { value: 'Men', label: t('shop.men') },
  { value: 'Unisex', label: t('shop.unisex') },
])

// Apply filters
const applyFilters = () => {
  page.value = 1
  const query: any = {}
  if (search.value) query.search = search.value
  if (category.value) query.category = category.value
  if (subcategory.value) query.subcategory = subcategory.value
  if (brand.value) query.brand = brand.value
  if (sort.value !== 'newest') query.sort = sort.value
  if (minPrice.value !== null) query.minPrice = minPrice.value
  if (maxPrice.value !== null) query.maxPrice = maxPrice.value
  if (size.value) query.size = size.value
  if (color.value) query.color = color.value

  router.push({ query })
  refresh()
}

// Clear filters
const clearFilters = () => {
  search.value = ''
  category.value = ''
  subcategory.value = ''
  brand.value = ''
  sort.value = 'newest'
  minPrice.value = null
  maxPrice.value = null
  size.value = ''
  color.value = ''
  page.value = 1
  router.push({ query: {} })
  refresh()
}

// Search handler
const handleSearch = () => {
  applyFilters()
}

// Price format
const { formatPrice } = useCurrency()

// Get variant status
const getVariantStatus = (product: any) => {
  return product.variants?.[0]?.status || 'SOLD'
}

// Get product image
const { getProductImage } = useImageUrl()

// Active filters count
const activeFiltersCount = computed(() => {
  let count = 0
  if (category.value) count++
  if (subcategory.value) count++
  if (brand.value) count++
  if (search.value) count++
  if (minPrice.value !== null || maxPrice.value !== null) count++
  return count
})

useSeoMeta({
  title: () => `${t('shop.title')} | AURA ARCHIVE`,
  description: () => t('hero.subtitle'),
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="bg-neutral-50 border-b border-neutral-200">
      <div class="container-aura py-12 lg:py-16 text-center">
        <h1 class="font-serif text-heading-1 lg:text-display-2 text-aura-black mb-3">{{ t('shop.title') }}</h1>
        <p class="text-body text-neutral-600">{{ pagination.total }} {{ t('shop.products') }}</p>
      </div>
    </div>

    <div class="container-aura py-8 lg:py-12">
      <!-- Top Bar: Sort & Filter Toggle -->
      <div class="flex items-center justify-between mb-8 pb-6 border-b border-neutral-200">
        <!-- Mobile Filter Button -->
        <button 
          @click="showFilters = !showFilters"
          class="lg:hidden flex items-center gap-2 text-body-sm uppercase tracking-wider text-aura-black"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {{ $t('shop.filters') }}
          <span v-if="activeFiltersCount" class="w-5 h-5 bg-accent-navy text-white text-caption flex items-center justify-center rounded-full">
            {{ activeFiltersCount }}
          </span>
        </button>

        <!-- Desktop: Active Filters -->
        <div class="hidden lg:flex items-center gap-4">
          <span class="text-body-sm text-neutral-500">{{ pagination.total }} {{ $t('shop.products') }}</span>
          <div v-if="activeFiltersCount > 0" class="flex items-center gap-2">
            <span class="text-body-sm text-neutral-400">|</span>
            <button 
              @click="clearFilters" 
              class="text-body-sm text-neutral-600 hover:text-aura-black underline underline-offset-2"
            >
              {{ $t('shop.clearFilters') }}
            </button>
          </div>
        </div>

        <!-- Sort Dropdown -->
        <div class="flex items-center gap-3">
          <span class="text-body-sm text-neutral-500 hidden sm:block">{{ $t('shop.sort') }}:</span>
          <select 
            v-model="sort" 
            @change="applyFilters" 
            class="text-body-sm bg-transparent border-0 text-aura-black cursor-pointer focus:outline-none focus:ring-0 pr-8"
          >
            <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
        <!-- Sidebar Filters (Desktop always visible, Mobile toggle) -->
        <aside 
          class="lg:col-span-1"
          :class="showFilters ? 'block' : 'hidden lg:block'"
        >
          <div class="sticky top-28 space-y-8">
            <!-- Search -->
            <div>
              <h3 class="text-caption uppercase tracking-[0.2em] text-neutral-500 mb-4">{{ t('common.search') }}</h3>
              <div class="relative">
                <input
                  v-model="search"
                  @keyup.enter="handleSearch"
                  type="text"
                  :placeholder="$t('shop.searchPlaceholder')"
                  class="w-full px-4 py-3 bg-transparent border border-neutral-300 text-body-sm placeholder-neutral-400 focus:outline-none focus:border-aura-black transition-colors"
                />
                <button @click="handleSearch" class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-aura-black">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Category -->
            <div>
              <h3 class="text-caption uppercase tracking-[0.2em] text-neutral-500 mb-4">{{ t('shop.category') }}</h3>
              <div class="space-y-2">
                <button 
                  @click="category = ''; applyFilters()"
                  class="block w-full text-left text-body-sm py-1 transition-colors"
                  :class="!category ? 'text-aura-black font-medium' : 'text-neutral-600 hover:text-aura-black'"
                >
                  {{ $t('shop.allCategories') }}
                </button>
                <button 
                  v-for="cat in categories" 
                  :key="cat"
                  @click="category = cat; applyFilters()"
                  class="block w-full text-left text-body-sm py-1 transition-colors"
                  :class="category === cat ? 'text-aura-black font-medium' : 'text-neutral-600 hover:text-aura-black'"
                >
                  {{ cat }}
                </button>
              </div>
            </div>

            <!-- Subcategory / Gender -->
            <div>
              <h3 class="text-caption uppercase tracking-[0.2em] text-neutral-500 mb-4">{{ $t('shop.collection') }}</h3>
              <div class="space-y-2">
                <button 
                  @click="subcategory = ''; applyFilters()"
                  class="block w-full text-left text-body-sm py-1 transition-colors"
                  :class="!subcategory ? 'text-aura-black font-medium' : 'text-neutral-600 hover:text-aura-black'"
                >
                  {{ $t('common.all') }}
                </button>
                <button 
                  v-for="sub in subcategories" 
                  :key="sub.value"
                  @click="subcategory = sub.value; applyFilters()"
                  class="block w-full text-left text-body-sm py-1 transition-colors"
                  :class="subcategory === sub.value ? 'text-aura-black font-medium' : 'text-neutral-600 hover:text-aura-black'"
                >
                  {{ sub.label }}
                </button>
              </div>
            </div>

            <!-- Brand -->
            <div>
              <h3 class="text-caption uppercase tracking-[0.2em] text-neutral-500 mb-4">{{ t('shop.brand') }}</h3>
              <div class="space-y-2 max-h-48 overflow-y-auto">
                <button 
                  @click="brand = ''; applyFilters()"
                  class="block w-full text-left text-body-sm py-1 transition-colors"
                  :class="!brand ? 'text-aura-black font-medium' : 'text-neutral-600 hover:text-aura-black'"
                >
                  {{ $t('shop.allBrands') }}
                </button>
                <button 
                  v-for="b in brands" 
                  :key="b"
                  @click="brand = b; applyFilters()"
                  class="block w-full text-left text-body-sm py-1 transition-colors"
                  :class="brand === b ? 'text-aura-black font-medium' : 'text-neutral-600 hover:text-aura-black'"
                >
                  {{ b }}
                </button>
              </div>
            </div>

            <!-- Price Range -->
            <div>
              <h3 class="text-caption uppercase tracking-[0.2em] text-neutral-500 mb-4">{{ t('shop.priceRange') }}</h3>
              <div class="space-y-3">
                <div class="flex gap-2 items-center">
                  <div class="flex-1">
                    <label class="text-caption text-neutral-500">{{ t('shop.minPrice') }}</label>
                    <input
                      v-model.number="minPrice"
                      type="number"
                      min="0"
                      placeholder="$0"
                      class="w-full px-3 py-2 border border-neutral-300 text-body-sm focus:outline-none focus:border-aura-black"
                    />
                  </div>
                  <span class="text-neutral-400 mt-5">—</span>
                  <div class="flex-1">
                    <label class="text-caption text-neutral-500">{{ t('shop.maxPrice') }}</label>
                    <input
                      v-model.number="maxPrice"
                      type="number"
                      min="0"
                      placeholder="$∞"
                      class="w-full px-3 py-2 border border-neutral-300 text-body-sm focus:outline-none focus:border-aura-black"
                    />
                  </div>
                </div>
                <button
                  @click="applyFilters()"
                  class="w-full py-2 bg-aura-black text-white text-body-sm uppercase tracking-wider hover:bg-neutral-800 transition-colors"
                >
                  {{ t('shop.applyPrice') }}
                </button>
                <button
                  v-if="minPrice !== null || maxPrice !== null"
                  @click="minPrice = null; maxPrice = null; applyFilters()"
                  class="w-full py-2 text-body-sm text-neutral-600 hover:text-aura-black transition-colors"
                >
                  {{ $t('shop.clearPrice') }}
                </button>
              </div>
            </div>
          </div>
        </aside>

        <!-- Products Grid -->
        <div class="lg:col-span-4">
          <!-- Loading -->
          <div v-if="pending" class="grid grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="i in 6" :key="i" class="animate-pulse">
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
            <p class="text-body text-neutral-500 mb-6">{{ $t('shop.adjustFilters') }}</p>
            <button @click="clearFilters" class="text-body-sm uppercase tracking-wider text-aura-black underline underline-offset-4">
              {{ $t('shop.clearFilters') }}
            </button>
          </div>

          <!-- Products -->
          <div v-else class="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
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
                  <span v-if="getVariantStatus(product) === 'SOLD'" class="px-3 py-1 bg-neutral-900 text-white text-caption uppercase tracking-wider">
                    {{ $t('shop.sold') }}
                  </span>
                  <span v-else-if="product.sale_price" class="px-3 py-1 bg-accent-burgundy text-white text-caption uppercase tracking-wider">
                    {{ $t('shop.sale') }}
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

                <!-- Quick View Overlay -->
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100">
                  <span class="px-6 py-2 bg-white text-aura-black text-caption uppercase tracking-wider">
                    {{ $t('shop.quickView') }}
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
            <!-- Previous -->
            <button
              @click="page = Math.max(1, page - 1); refresh()"
              :disabled="page === 1"
              class="w-10 h-10 flex items-center justify-center border border-neutral-300 text-neutral-600 hover:border-aura-black hover:text-aura-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <!-- Page Numbers -->
            <template v-for="p in pagination.totalPages" :key="p">
              <button
                v-if="p === 1 || p === pagination.totalPages || (p >= page - 1 && p <= page + 1)"
                @click="page = p; refresh()"
                class="w-10 h-10 flex items-center justify-center text-body-sm transition-colors"
                :class="p === pagination.page ? 'bg-aura-black text-white' : 'border border-neutral-300 text-neutral-600 hover:border-aura-black hover:text-aura-black'"
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

            <!-- Next -->
            <button
              @click="page = Math.min(pagination.totalPages, page + 1); refresh()"
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
    </div>
  </div>
</template>
