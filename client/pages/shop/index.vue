<script setup lang="ts">
/**
 * Shop Page - Premium Luxury E-Commerce
 * AURA ARCHIVE - Inspired by SSENSE, Mr Porter, Farfetch
 * Elegant product listing with refined accordion filters
 */


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

// Mobile filter panel
const showFilters = ref(false)

// Accordion state - all open by default
const openSections = ref<Record<string, boolean>>({
  search: true,
  category: true,
  collection: true,
  brand: true,
  price: true,
})

// Brand search within filter
const brandSearch = ref('')

// Translate API category names to i18n
const translateCategory = (cat: string) => {
  const key = `categories.${cat.toLowerCase()}`
  const translated = t(key)
  // If translation key not found, t() returns the key itself
  return translated === key ? cat : translated
}

// Show more/less toggle for long lists
const VISIBLE_COUNT = 5
const brandShowAll = ref(false)
const categoryShowAll = ref(false)

const toggleSection = (key: string) => {
  openSections.value[key] = !openSections.value[key]
}

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

const brands = computed(() => {
  const raw = brandsData.value?.data?.brands || []
  return raw.map((b: any) => typeof b === 'string' ? b : b.brand).filter(Boolean)
})
const categories = computed(() => {
  const raw = categoriesData.value?.data?.categories || []
  return raw.map((c: any) => typeof c === 'string' ? c : c.category).filter(Boolean)
})

// Filtered brands based on search
const filteredBrands = computed(() => {
  if (!brandSearch.value) return brands.value
  return brands.value.filter((b: string) =>
    b.toLowerCase().includes(brandSearch.value.toLowerCase())
  )
})

// Visible brands/categories (show more/less)
const visibleBrands = computed(() => {
  if (brandShowAll.value || filteredBrands.value.length <= VISIBLE_COUNT) return filteredBrands.value
  return filteredBrands.value.slice(0, VISIBLE_COUNT)
})

const visibleCategories = computed(() => {
  if (categoryShowAll.value || categories.value.length <= VISIBLE_COUNT) return categories.value
  return categories.value.slice(0, VISIBLE_COUNT)
})

const sortOptions = computed(() => [
  { value: 'newest', label: t('shop.sortNewest') },
  { value: 'price_asc', label: t('shop.sortPriceLow') },
  { value: 'price_desc', label: t('shop.sortPriceHigh') },
  { value: 'name_asc', label: t('shop.sortAZ') },
])

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
  brandSearch.value = ''
  router.push({ query: {} })
  refresh()
}

// Remove individual filter
const removeFilter = (type: string) => {
  switch (type) {
    case 'search': search.value = ''; break
    case 'category': category.value = ''; break
    case 'subcategory': subcategory.value = ''; break
    case 'brand': brand.value = ''; break
    case 'price': minPrice.value = null; maxPrice.value = null; break
  }
  applyFilters()
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

// Active filters for chips
const activeFilters = computed(() => {
  const filters: { type: string; label: string; value: string }[] = []
  if (search.value) filters.push({ type: 'search', label: `"${search.value}"`, value: search.value })
  if (category.value) filters.push({ type: 'category', label: translateCategory(category.value), value: category.value })
  if (subcategory.value) {
    const sub = subcategories.value.find(s => s.value === subcategory.value)
    filters.push({ type: 'subcategory', label: sub?.label || subcategory.value, value: subcategory.value })
  }
  if (brand.value) filters.push({ type: 'brand', label: brand.value, value: brand.value })
  if (minPrice.value !== null || maxPrice.value !== null) {
    const label = `${minPrice.value ?? '0'} — ${maxPrice.value ?? '∞'}`
    filters.push({ type: 'price', label, value: 'price' })
  }
  return filters
})

const activeFiltersCount = computed(() => activeFilters.value.length)

// Close mobile filters on escape
const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape') showFilters.value = false
}
onMounted(() => window.addEventListener('keydown', handleEscape))
onUnmounted(() => window.removeEventListener('keydown', handleEscape))

// Lock body scroll when mobile filter is open
watch(showFilters, (val) => {
  if (val) document.body.style.overflow = 'hidden'
  else document.body.style.overflow = ''
})

useSeoMeta({
  title: () => `${t('shop.title')} | AURA ARCHIVE`,
  description: () => t('hero.subtitle'),
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="shop-header">
      <div class="container-aura py-10 lg:py-14 text-center">
        <h1 class="font-serif text-heading-2 lg:text-heading-1 text-aura-black tracking-tight">{{ t('shop.title') }}</h1>
        <p class="text-body-sm text-neutral-500 mt-2 tracking-wider uppercase">{{ pagination.total }} {{ t('shop.products') }}</p>
      </div>
    </div>

    <div class="container-aura py-6 lg:py-10">
      <!-- Top Bar: Sort & Filter Toggle -->
      <div class="shop-toolbar">
        <!-- Mobile Filter Button -->
        <button 
          @click="showFilters = true"
          class="lg:hidden shop-toolbar-btn"
        >
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {{ $t('shop.filters') }}
          <span v-if="activeFiltersCount" class="filter-count-badge">
            {{ activeFiltersCount }}
          </span>
        </button>

        <!-- Desktop: Active Filters + Count -->
        <div class="hidden lg:flex items-center gap-3">
          <span class="text-body-sm text-neutral-500 tracking-wide">{{ pagination.total }} {{ $t('shop.products') }}</span>
          <template v-if="activeFiltersCount > 0">
            <span class="text-neutral-300">|</span>
            <button 
              @click="clearFilters" 
              class="text-body-sm text-neutral-600 hover:text-aura-black transition-colors underline underline-offset-4 decoration-neutral-300 hover:decoration-aura-black"
            >
              {{ $t('shop.clearFilters') }}
            </button>
          </template>
        </div>

        <!-- Sort Dropdown -->
        <div class="flex items-center gap-3">
          <span class="text-caption text-neutral-400 uppercase tracking-widest hidden sm:block">{{ $t('shop.sort') }}</span>
          <select 
            v-model="sort" 
            @change="applyFilters" 
            class="shop-sort-select"
          >
            <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Active Filter Chips -->
      <div v-if="activeFilters.length > 0" class="filter-chips">
        <TransitionGroup name="chip">
          <button
            v-for="f in activeFilters"
            :key="f.type"
            @click="removeFilter(f.type)"
            class="filter-chip group"
          >
            {{ f.label }}
            <svg class="w-3 h-3 ml-2 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </TransitionGroup>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-0 lg:gap-10 xl:gap-14">
        <!-- =========================================
             SIDEBAR FILTERS — Premium Luxury Design
             Inspired by SSENSE / Mr Porter / Farfetch
             ========================================= -->

        <!-- Mobile Overlay Backdrop -->
        <Transition name="fade">
          <div 
            v-if="showFilters" 
            class="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-[2px]"
            @click="showFilters = false"
          />
        </Transition>

        <!-- Sidebar -->
        <aside 
          class="filter-sidebar"
          :class="showFilters ? 'filter-sidebar--open' : ''"
        >
          <!-- Mobile Header -->
          <div class="filter-sidebar-header lg:hidden">
            <div>
              <h2 class="font-serif text-heading-4 text-aura-black">{{ $t('shop.filters') }}</h2>
              <p v-if="activeFiltersCount > 0" class="text-caption text-neutral-400 mt-0.5">{{ activeFiltersCount }} active</p>
            </div>
            <button @click="showFilters = false" class="filter-close-btn">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="filter-sidebar-content">
            <!-- Search Section (always visible) -->
            <div class="filter-section">
              <div class="filter-section-header filter-section-header--static">
                <span>{{ t('common.search') }}</span>
              </div>
              <div class="filter-section-body">
                <div class="filter-search-wrapper">
                  <svg class="filter-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    v-model="search"
                    @keyup.enter="handleSearch"
                    type="text"
                    :placeholder="$t('shop.searchPlaceholder')"
                    class="filter-search-input"
                  />
                  <button v-if="search" @click="search = ''; handleSearch()" class="filter-search-clear">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Category Section -->
            <div class="filter-section">
              <button @click="toggleSection('category')" class="filter-section-header">
                <span>{{ t('shop.category') }}</span>
                <svg class="filter-chevron" :class="{ 'filter-chevron--open': openSections.category }" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7" /></svg>
              </button>
              <Transition name="accordion">
                <div v-show="openSections.category" class="filter-section-body">
                  <div class="filter-option-list">
                    <button 
                      @click="category = ''; applyFilters()"
                      class="filter-option"
                      :class="{ 'filter-option--active': !category }"
                    >
                      <span class="filter-option-label">{{ $t('shop.allCategories') }}</span>
                    </button>
                    <button 
                      v-for="cat in visibleCategories" 
                      :key="cat"
                      @click="category = cat; applyFilters()"
                      class="filter-option"
                      :class="{ 'filter-option--active': category === cat }"
                    >
                      <span class="filter-option-label">{{ translateCategory(cat) }}</span>
                    </button>
                  </div>
                  <button
                    v-if="categories.length > VISIBLE_COUNT"
                    @click="categoryShowAll = !categoryShowAll"
                    class="filter-show-toggle"
                  >
                    {{ categoryShowAll ? `— ${$t('shop.showLess')}` : `+ ${categories.length - VISIBLE_COUNT} more` }}
                  </button>
                </div>
              </Transition>
            </div>

            <!-- Collection / Gender Section -->
            <div class="filter-section">
              <button @click="toggleSection('collection')" class="filter-section-header">
                <span>{{ $t('shop.collection') }}</span>
                <svg class="filter-chevron" :class="{ 'filter-chevron--open': openSections.collection }" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7" /></svg>
              </button>
              <Transition name="accordion">
                <div v-show="openSections.collection" class="filter-section-body">
                  <div class="filter-option-list">
                    <button 
                      @click="subcategory = ''; applyFilters()"
                      class="filter-option"
                      :class="{ 'filter-option--active': !subcategory }"
                    >
                      <span class="filter-option-label">{{ $t('common.all') }}</span>
                    </button>
                    <button 
                      v-for="sub in subcategories" 
                      :key="sub.value"
                      @click="subcategory = sub.value; applyFilters()"
                      class="filter-option"
                      :class="{ 'filter-option--active': subcategory === sub.value }"
                    >
                      <span class="filter-option-label">{{ sub.label }}</span>
                    </button>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Brand Section -->
            <div class="filter-section">
              <button @click="toggleSection('brand')" class="filter-section-header">
                <span>{{ t('shop.brand') }}</span>
                <svg class="filter-chevron" :class="{ 'filter-chevron--open': openSections.brand }" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7" /></svg>
              </button>
              <Transition name="accordion">
                <div v-show="openSections.brand" class="filter-section-body">
                  <!-- Brand Search -->
                  <div v-if="brands.length > 5" class="filter-brand-search-wrap">
                    <svg class="filter-brand-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      v-model="brandSearch"
                      type="text"
                      :placeholder="$t('shop.searchBrand') || 'Search brand...'"
                      class="filter-brand-search"
                    />
                  </div>
                  <div class="filter-option-list">
                    <button 
                      @click="brand = ''; brandSearch = ''; applyFilters()"
                      class="filter-option"
                      :class="{ 'filter-option--active': !brand }"
                    >
                      <span class="filter-option-label">{{ $t('shop.allBrands') }}</span>
                    </button>
                    <button 
                      v-for="b in visibleBrands" 
                      :key="b"
                      @click="brand = b; applyFilters()"
                      class="filter-option"
                      :class="{ 'filter-option--active': brand === b }"
                    >
                      <span class="filter-option-label">{{ b }}</span>
                    </button>
                    <p v-if="filteredBrands.length === 0 && brandSearch" class="filter-no-results">
                      No brands found
                    </p>
                  </div>
                  <button
                    v-if="filteredBrands.length > VISIBLE_COUNT && !brandSearch"
                    @click="brandShowAll = !brandShowAll"
                    class="filter-show-toggle"
                  >
                    {{ brandShowAll ? `— ${$t('shop.showLess')}` : `+ ${filteredBrands.length - VISIBLE_COUNT} more` }}
                  </button>
                </div>
              </Transition>
            </div>

            <!-- Price Range Section -->
            <div class="filter-section filter-section--last">
              <button @click="toggleSection('price')" class="filter-section-header">
                <span>{{ t('shop.priceRange') }}</span>
                <svg class="filter-chevron" :class="{ 'filter-chevron--open': openSections.price }" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7" /></svg>
              </button>
              <Transition name="accordion">
                <div v-show="openSections.price" class="filter-section-body">
                  <div class="filter-price-row">
                    <div class="filter-price-field">
                      <label class="filter-price-label">Min</label>
                      <input
                        v-model.number="minPrice"
                        type="number"
                        min="0"
                        :placeholder="t('shop.minPrice')"
                        class="filter-price-input"
                      />
                    </div>
                    <span class="filter-price-divider">—</span>
                    <div class="filter-price-field">
                      <label class="filter-price-label">Max</label>
                      <input
                        v-model.number="maxPrice"
                        type="number"
                        min="0"
                        :placeholder="t('shop.maxPrice')"
                        class="filter-price-input"
                      />
                    </div>
                  </div>
                  <button
                    @click="applyFilters()"
                    class="filter-price-apply"
                  >
                    {{ t('shop.applyPrice') }}
                  </button>
                  <button
                    v-if="minPrice !== null || maxPrice !== null"
                    @click="minPrice = null; maxPrice = null; applyFilters()"
                    class="filter-price-clear"
                  >
                    {{ $t('shop.clearPrice') }}
                  </button>
                </div>
              </Transition>
            </div>
          </div>

          <!-- Mobile: Apply & Close Button -->
          <div class="filter-sidebar-footer lg:hidden">
            <button 
              @click="showFilters = false" 
              class="filter-apply-mobile-btn"
            >
              {{ $t('shop.showResults') || `Show ${pagination.total} Results` }}
            </button>
          </div>
        </aside>

        <!-- =========================================
             PRODUCTS GRID
             ========================================= -->
        <div class="lg:col-span-4">
          <!-- Loading Skeleton -->
          <div v-if="pending" class="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8 lg:gap-x-6 lg:gap-y-10">
            <div v-for="i in 6" :key="i" class="animate-pulse">
              <div class="aspect-product bg-neutral-100 mb-4 rounded-sm" />
              <div class="space-y-2 px-1">
                <div class="h-3 bg-neutral-100 w-1/3 rounded" />
                <div class="h-4 bg-neutral-100 w-2/3 rounded" />
                <div class="h-4 bg-neutral-100 w-1/4 rounded" />
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else-if="products.length === 0" class="text-center py-24">
            <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-neutral-50 flex items-center justify-center">
              <svg class="w-8 h-8 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 class="font-serif text-heading-4 text-aura-black mb-2">{{ t('common.noResults') }}</h3>
            <p class="text-body-sm text-neutral-500 mb-8 max-w-xs mx-auto">{{ $t('shop.adjustFilters') }}</p>
            <button @click="clearFilters" class="text-body-sm uppercase tracking-widest text-aura-black border-b border-aura-black pb-1 hover:text-neutral-600 hover:border-neutral-600 transition-colors">
              {{ $t('shop.clearFilters') }}
            </button>
          </div>

          <!-- Products -->
          <div v-else class="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8 lg:gap-x-6 lg:gap-y-10">
            <NuxtLink
              v-for="product in products"
              :key="product.id"
              :to="`/shop/${product.id}`"
              class="group product-card-item"
            >
              <!-- Product Image -->
              <div class="aspect-product bg-neutral-50 overflow-hidden relative mb-3">
                <!-- Badges -->
                <div class="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                  <span v-if="getVariantStatus(product) === 'SOLD'" class="product-badge product-badge--sold">
                    {{ $t('shop.sold') }}
                  </span>
                  <span v-else-if="product.sale_price" class="product-badge product-badge--sale">
                    {{ $t('shop.sale') }}
                  </span>
                </div>

                <!-- Image -->
                <img 
                  v-if="getProductImage(product)"
                  :src="getProductImage(product)"
                  :alt="product.name"
                  class="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-neutral-200">
                  <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.75" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>

                <!-- Hover overlay -->
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
              </div>

              <!-- Product Info -->
              <div class="px-0.5">
                <p class="text-caption text-neutral-400 uppercase tracking-[0.15em] mb-1">{{ product.brand }}</p>
                <h3 class="text-body-sm text-neutral-800 mb-1.5 line-clamp-1 group-hover:text-aura-black transition-colors">{{ product.name }}</h3>
                <div class="flex items-baseline gap-2">
                  <span v-if="product.sale_price" class="text-body-sm font-medium text-accent-burgundy">
                    {{ formatPrice(product.sale_price) }}
                  </span>
                  <span 
                    :class="product.sale_price ? 'text-caption text-neutral-400 line-through' : 'text-body-sm text-neutral-700'"
                  >
                    {{ formatPrice(product.base_price) }}
                  </span>
                </div>
              </div>
            </NuxtLink>
          </div>

          <!-- Pagination -->
          <div v-if="pagination.totalPages > 1" class="flex justify-center items-center gap-1.5 mt-16 lg:mt-20">
            <button
              @click="page = Math.max(1, page - 1); refresh()"
              :disabled="page === 1"
              class="pagination-btn"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <template v-for="p in pagination.totalPages" :key="p">
              <button
                v-if="p === 1 || p === pagination.totalPages || (p >= page - 1 && p <= page + 1)"
                @click="page = p; refresh()"
                class="pagination-btn"
                :class="p === pagination.page ? 'pagination-btn--active' : ''"
              >
                {{ p }}
              </button>
              <span 
                v-else-if="p === page - 2 || p === page + 2"
                class="text-neutral-300 px-1"
              >
                ···
              </span>
            </template>

            <button
              @click="page = Math.min(pagination.totalPages, page + 1); refresh()"
              :disabled="page === pagination.totalPages"
              class="pagination-btn"
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

<style scoped>
/* ============================================
   SHOP PAGE - Premium Luxury Filter Design
   Inspired by SSENSE, Mr Porter, Farfetch
   ============================================ */

/* Header */
.shop-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: linear-gradient(180deg, #FAFAF8 0%, #FFFFFF 100%);
}

/* Toolbar */
.shop-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 1.25rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.shop-toolbar-btn {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #0A0A0A;
  font-weight: 500;
  padding: 0.5rem 0;
  transition: opacity 0.3s;
}

.shop-toolbar-btn:hover {
  opacity: 0.6;
}

.shop-sort-select {
  font-size: 0.875rem;
  background: transparent;
  border: none;
  color: #0A0A0A;
  cursor: pointer;
  padding-right: 1.5rem;
  appearance: none;
  font-family: 'Inter', system-ui, sans-serif;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23404040' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M4 6l4 4 4-4'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0 center;
  background-size: 16px 12px;
}

.shop-sort-select:focus {
  outline: none;
}

/* Filter Count Badge */
.filter-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  background-color: #0A0A0A;
  color: white;
  font-size: 0.6rem;
  font-weight: 600;
  line-height: 1;
  padding: 0 5px;
}

/* ============================================
   FILTER CHIPS — Refined Active Filter Tags
   ============================================ */
.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.75rem;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #404040;
  background: transparent;
  border: 1px solid #D4D4D4;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.filter-chip:hover {
  border-color: #0A0A0A;
  color: #0A0A0A;
  background: rgba(10, 10, 10, 0.02);
}

/* Chip transitions */
.chip-enter-active,
.chip-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.chip-enter-from,
.chip-leave-to {
  opacity: 0;
  transform: scale(0.92) translateY(-4px);
}

/* ============================================
   FILTER SIDEBAR
   ============================================ */
.filter-sidebar {
  display: none;
}

@media (min-width: 1024px) {
  .filter-sidebar {
    display: block;
    grid-column: span 1;
    position: relative;
  }

  .filter-sidebar-content {
    position: sticky;
    top: 7rem;
  }
}

/* Mobile: slide-out panel */
@media (max-width: 1023px) {
  .filter-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 100%;
    max-width: 400px;
    background: #FAFAF8;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .filter-sidebar--open {
    transform: translateX(0);
  }

  .filter-sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 1.75rem;
    -webkit-overflow-scrolling: touch;
  }
}

.filter-sidebar-header {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 1.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
  background: #FAFAF8;
}

@media (max-width: 1023px) {
  .filter-sidebar-header {
    display: flex;
  }
}

.filter-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: #737373;
  transition: all 0.3s;
}

.filter-close-btn:hover {
  color: #0A0A0A;
  background: rgba(0, 0, 0, 0.04);
}

.filter-sidebar-footer {
  display: none;
  padding: 1.25rem 1.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
  background: #FAFAF8;
}

@media (max-width: 1023px) {
  .filter-sidebar-footer {
    display: flex;
  }
}

.filter-apply-mobile-btn {
  width: 100%;
  padding: 1rem;
  background: #0A0A0A;
  color: white;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.25em;
  font-weight: 500;
  transition: background-color 0.3s;
}

.filter-apply-mobile-btn:hover {
  background: #262626;
}

/* ============================================
   FILTER SECTIONS — Refined Accordion
   ============================================ */
.filter-section {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.filter-section--last {
  border-bottom: none;
}

.filter-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 1.125rem 0;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: #0A0A0A;
  cursor: pointer;
  transition: color 0.2s;
  text-align: left;
  font-family: 'Inter', system-ui, sans-serif;
}

.filter-section-header:hover {
  color: #525252;
}

.filter-section-header--static {
  cursor: default;
}

.filter-section-header--static:hover {
  color: #0A0A0A;
}

/* Thin chevron — rotates on open */
.filter-chevron {
  width: 14px;
  height: 14px;
  color: #A3A3A3;
  flex-shrink: 0;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.filter-chevron--open {
  transform: rotate(180deg);
}

/* Accordion animation */
.accordion-enter-active,
.accordion-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 500px;
  overflow: hidden;
}

.accordion-enter-from,
.accordion-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}

.filter-section-body {
  padding-bottom: 1.25rem;
}

/* ============================================
   FILTER OPTIONS — Pure Text, No Indicators
   Inspired by The Row / SSENSE minimalism
   ============================================ */
.filter-option-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.filter-option {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.4375rem 0 0.4375rem 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  border-left: 2px solid transparent;
}

.filter-option:hover {
  padding-left: 0.625rem;
  border-left-color: rgba(0, 0, 0, 0.1);
}

.filter-option--active {
  padding-left: 0.625rem;
  border-left-color: #0A0A0A;
}

.filter-option-label {
  font-size: 0.8125rem;
  color: #737373;
  transition: all 0.2s ease;
  line-height: 1.5;
}

.filter-option:hover .filter-option-label {
  color: #0A0A0A;
}

.filter-option--active .filter-option-label {
  color: #0A0A0A;
  font-weight: 500;
}

/* Show more / Show less toggle */
.filter-show-toggle {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.625rem 0 0.125rem 0.25rem;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  color: #A3A3A3;
  cursor: pointer;
  transition: color 0.2s;
  font-family: 'Inter', system-ui, sans-serif;
}

.filter-show-toggle:hover {
  color: #0A0A0A;
}

.filter-no-results {
  font-size: 0.75rem;
  color: #A3A3A3;
  padding: 0.75rem 0 0.25rem 0.25rem;
  font-style: italic;
}

/* ============================================
   SEARCH INPUT — Premium Integrated Design
   ============================================ */
.filter-search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.filter-search-icon {
  position: absolute;
  left: 0;
  width: 16px;
  height: 16px;
  color: #A3A3A3;
  pointer-events: none;
  transition: color 0.2s;
}

.filter-search-wrapper:focus-within .filter-search-icon {
  color: #0A0A0A;
}

.filter-search-input {
  width: 100%;
  padding: 0.625rem 2rem 0.625rem 1.75rem;
  font-size: 0.8125rem;
  background: transparent;
  border: none;
  border-bottom: 1px solid #E5E5E5;
  color: #0A0A0A;
  transition: border-color 0.3s;
  font-family: 'Inter', system-ui, sans-serif;
}

.filter-search-input:focus {
  outline: none;
  border-color: #0A0A0A;
}

.filter-search-input::placeholder {
  color: #A3A3A3;
  font-weight: 300;
}

.filter-search-clear {
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #A3A3A3;
  transition: all 0.2s;
}

.filter-search-clear:hover {
  color: #0A0A0A;
  background: rgba(0, 0, 0, 0.04);
}

/* ============================================
   BRAND SEARCH — Inline with Icon
   ============================================ */
.filter-brand-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
}

.filter-brand-search-icon {
  position: absolute;
  left: 0;
  width: 14px;
  height: 14px;
  color: #A3A3A3;
  pointer-events: none;
  transition: color 0.2s;
}

.filter-brand-search-wrap:focus-within .filter-brand-search-icon {
  color: #0A0A0A;
}

.filter-brand-search {
  width: 100%;
  padding: 0.5rem 0.5rem 0.5rem 1.5rem;
  font-size: 0.75rem;
  background: transparent;
  border: none;
  border-bottom: 1px solid #E5E5E5;
  color: #0A0A0A;
  transition: border-color 0.3s;
  font-family: 'Inter', system-ui, sans-serif;
}

.filter-brand-search:focus {
  outline: none;
  border-color: #0A0A0A;
}

.filter-brand-search::placeholder {
  color: #A3A3A3;
  font-weight: 300;
}


/* ============================================
   PRICE RANGE — Refined with Labels
   ============================================ */
.filter-price-row {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
  margin-bottom: 1rem;
}

.filter-price-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.filter-price-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #A3A3A3;
  font-weight: 500;
}

.filter-price-divider {
  color: #D4D4D4;
  font-size: 0.875rem;
  padding-bottom: 0.625rem;
  font-weight: 300;
}

.filter-price-input {
  width: 100%;
  padding: 0.625rem 0;
  font-size: 0.8125rem;
  border: none;
  border-bottom: 1px solid #E5E5E5;
  background: transparent;
  color: #0A0A0A;
  transition: border-color 0.3s;
  font-family: 'Inter', system-ui, sans-serif;
  -moz-appearance: textfield;
}

.filter-price-input::-webkit-outer-spin-button,
.filter-price-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.filter-price-input:focus {
  outline: none;
  border-color: #0A0A0A;
}

.filter-price-input::placeholder {
  color: #A3A3A3;
  font-size: 0.75rem;
  font-weight: 300;
}

.filter-price-apply {
  width: 100%;
  padding: 0.75rem;
  background: #0A0A0A;
  color: white;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-weight: 500;
  transition: all 0.3s;
  font-family: 'Inter', system-ui, sans-serif;
}

.filter-price-apply:hover {
  background: #262626;
}

.filter-price-clear {
  width: 100%;
  padding: 0.625rem;
  font-size: 0.7rem;
  color: #A3A3A3;
  text-align: center;
  transition: color 0.3s;
  margin-top: 0.25rem;
  letter-spacing: 0.05em;
}

.filter-price-clear:hover {
  color: #0A0A0A;
}

/* ============================================
   PRODUCT CARD
   ============================================ */
.product-card-item {
  display: block;
  transition: opacity 0.3s;
}

.product-badge {
  display: inline-block;
  padding: 0.25rem 0.625rem;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.product-badge--sold {
  background: #0A0A0A;
  color: white;
}

.product-badge--sale {
  background: #722F37;
  color: white;
}

/* ============================================
   PAGINATION
   ============================================ */
.pagination-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  font-size: 0.8125rem;
  color: #525252;
  border: 1px solid #E5E5E5;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.pagination-btn:hover:not(:disabled) {
  border-color: #0A0A0A;
  color: #0A0A0A;
}

.pagination-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.pagination-btn--active {
  background: #0A0A0A;
  color: white;
  border-color: #0A0A0A;
}

/* ============================================
   TRANSITIONS
   ============================================ */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

