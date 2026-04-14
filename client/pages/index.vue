<script setup lang="ts">
/**
 * Homepage - AURA ARCHIVE (Bright & Elegant)
 * Luxury fashion homepage with light, airy design
 */

const config = useRuntimeConfig()

type BannerResponse = {
  success: boolean
  data: { banners: any[] }
}

type ProductListResponse = {
  success: boolean
  data: {
    products: any[]
    pagination?: { total: number; page: number; limit: number; totalPages: number }
  }
}

type SettingsResponse = {
  success: boolean
  data: { settings: Record<string, string> }
}

type ProductBrandsResponse = {
  success: boolean
  data: { brands: Array<string | { brand?: string; count?: number | string }> }
}

type HomepageBrand = {
  name: string
  count: number
}

const createEmptyBannerResponse = (): BannerResponse => ({
  success: true,
  data: { banners: [] },
})

const createEmptyProductResponse = (): ProductListResponse => ({
  success: true,
  data: { products: [] },
})

const createEmptySettingsResponse = (): SettingsResponse => ({
  success: true,
  data: { settings: {} },
})

const createEmptyBrandsResponse = (): ProductBrandsResponse => ({
  success: true,
  data: { brands: [] },
})

// Fetch all banners (SSR)
const { data: bannersData } = await useFetch<BannerResponse>(`${config.public.apiUrl}/banners`, {
  timeout: 5000,
  default: createEmptyBannerResponse,
})

const { data: featuredProducts } = useFetch<ProductListResponse>(
  `${config.public.apiUrl}/products/new-arrivals?limit=4`,
  {
    server: false,
    lazy: true,
    timeout: 5000,
    default: createEmptyProductResponse,
  }
)

const { data: bestSellersData } = useFetch<ProductListResponse>(
  `${config.public.apiUrl}/products/best-sellers?limit=4`,
  {
    server: false,
    lazy: true,
    timeout: 5000,
    default: createEmptyProductResponse,
  }
)

const { data: saleProductsData } = useFetch<ProductListResponse>(
  `${config.public.apiUrl}/products/sale?limit=4`,
  {
    server: false,
    lazy: true,
    timeout: 5000,
    default: createEmptyProductResponse,
  }
)

const { data: settingsData } = await useFetch<SettingsResponse>(`${config.public.apiUrl}/settings`, {
  timeout: 5000,
  default: createEmptySettingsResponse,
})

const { data: brandsData } = await useFetch<ProductBrandsResponse>(`${config.public.apiUrl}/products/brands`, {
  timeout: 5000,
  default: createEmptyBrandsResponse,
})

// Helper: resolve banner image URL
const { getImageUrl } = useImageUrl()

const parseJsonSetting = <T>(raw: string | null | undefined, fallback: T): T => {
  if (!raw) return fallback

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const normalizeHomepageBrands = (rawBrands: Array<string | { brand?: string; count?: number | string }>): HomepageBrand[] => {
  const brandMap = new Map<string, HomepageBrand>()

  for (const item of rawBrands) {
    const name = (typeof item === 'string' ? item : item?.brand || '').trim()

    if (!name) continue

    const rawCount = typeof item === 'string' ? 0 : Number(item?.count || 0)
    const count = Number.isFinite(rawCount) ? rawCount : 0
    const normalized = name.toLowerCase()
    const existing = brandMap.get(normalized)

    if (existing) {
      existing.count = Math.max(existing.count, count)
      continue
    }

    brandMap.set(normalized, { name, count })
  }

  return Array.from(brandMap.values())
}

// Get banners by section
const allBanners = computed(() => bannersData.value?.data?.banners || [])
const getBannersBySection = (section: string) => allBanners.value.filter((b: any) => b.section === section)
const getBannerBySection = (section: string) => allBanners.value.find((b: any) => b.section === section) || null
const publicSettings = computed(() => settingsData.value?.data?.settings || {})

const heroBanners = computed(() => getBannersBySection('hero'))
const heroBanner = computed(() => heroBanners.value[0] || null)
const currentHeroBanner = ref<any | null>(null)
const displayedHeroBanner = computed(() => currentHeroBanner.value || heroBanner.value)

const handleHeroBannerChange = (banner: any) => {
  currentHeroBanner.value = banner
}

const collectionWomenImage = computed(() => getImageUrl(getBannerBySection('collection_women')?.image_url))
const collectionMenImage = computed(() => getImageUrl(getBannerBySection('collection_men')?.image_url))

// Dynamic homepage categories
const homepageCategories = computed(() => getBannersBySection('homepage_categories'))
const homepageBrands = computed(() => normalizeHomepageBrands(brandsData.value?.data?.brands || []))

// Fetch animation config from site settings
const animationConfig = computed(() =>
  parseJsonSetting<Record<string, string>>(publicSettings.value.banner_animation_config, {})
)

const getAnimType = (section: string): 'none' | 'slide' | 'fade' => {
  return (animationConfig.value[section] as any) || 'none'
}

const products = computed(() => featuredProducts.value?.data?.products || [])
const bestSellers = computed(() => bestSellersData.value?.data?.products || [])
const saleProducts = computed(() => saleProductsData.value?.data?.products || [])

// Format price
const { formatPrice } = useCurrency()

// Newsletter form handler
const { success: notifySuccess } = useNotification()
const handleNewsletterSubmit = () => {
  notifySuccess('Cảm ơn bạn đã đăng ký nhận bản tin!')
}

// Get product image
const { getProductImage } = useImageUrl()

useSeoMeta({
  title: 'AURA ARCHIVE | Luxury Resell Fashion',
  description: 'Discover curated pre-owned luxury fashion. Authenticated designer pieces from the world\'s finest brands.',
})
</script>

<template>
  <div>
    <!-- Hero Section - Light & Elegant -->
    <section class="relative min-h-[90vh] flex items-center bg-gradient-to-br from-neutral-100 via-aura-cream to-neutral-50">
      <!-- Decorative elements -->
      <div class="absolute inset-0 overflow-hidden">
        <div class="absolute top-20 right-20 w-96 h-96 bg-accent-gold/5 rounded-full blur-3xl" />
        <div class="absolute bottom-20 left-20 w-80 h-80 bg-accent-burgundy/5 rounded-full blur-3xl" />
      </div>
      
      <!-- Hero Content -->
      <div class="relative z-10 container-aura py-20">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <!-- Left: Text Content -->
          <div class="text-center lg:text-left">
            <span class="inline-block text-caption uppercase tracking-[0.4em] text-accent-burgundy mb-6">
              {{ $t('home.archiveCollection') }}
            </span>
            <h1 class="font-serif text-display-2 lg:text-display-1 text-aura-black mb-8 leading-[1.1]">
              {{ $t('hero.title') }}
            </h1>
            <p class="text-body-lg text-neutral-600 mb-12 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              {{ $t('hero.subtitle') }}
            </p>
            
            <!-- Buttons -->
            <div class="flex flex-wrap gap-4 justify-center lg:justify-start">
              <NuxtLink 
                to="/shop" 
                class="inline-flex items-center px-10 py-4 bg-aura-black text-white text-caption uppercase tracking-[0.15em] hover:bg-neutral-800 transition-all duration-300"
              >
                {{ $t('hero.cta') }}
              </NuxtLink>
              <NuxtLink 
                to="/about" 
                class="inline-flex items-center px-10 py-4 border border-aura-black text-aura-black text-caption uppercase tracking-[0.15em] hover:bg-aura-black hover:text-white transition-all duration-300"
              >
                {{ $t('about.story') }}
              </NuxtLink>
            </div>
          </div>

          <!-- Right: Featured Image from Banner -->
          <div class="hidden lg:block">
            <div class="relative pb-12">
              <div class="bg-white rounded-sm overflow-hidden shadow-elevated group">
                <!-- Multiple banners: use slider -->
                <BannerSlider
                  v-if="heroBanners.length > 0"
                  :banners="heroBanners"
                  :animation="getAnimType('hero')"
                  @change="handleHeroBannerChange"
                />
                <!-- Fallback placeholder -->
                <div v-else class="w-full aspect-[3/4] flex items-center justify-center text-neutral-400">
                  <div class="text-center p-8">
                    <svg class="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p class="text-body-sm">{{ $t('home.featuredCollection') }}</p>
                  </div>
                </div>
              </div>
              <!-- Decorative badge -->
              <div class="absolute bottom-0 left-0 z-30 max-w-[18rem] -translate-x-6 bg-aura-white shadow-medium p-6 rounded-sm">
                <p class="text-caption uppercase tracking-wider text-neutral-500 mb-1">{{ displayedHeroBanner?.title || $t('home.newArrivals') }}</p>
                <p class="font-serif text-heading-4 text-aura-black">{{ displayedHeroBanner?.subtitle || $t('home.season') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Scroll indicator -->
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg class="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>

    <!-- Featured Brands Bar -->
    <HomeBrandTicker :brands="homepageBrands" />

    <!-- Collection Banners (2-column layout) -->
    <section class="py-20 lg:py-28 bg-white">
      <div class="container-aura">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <!-- Women's Collection -->
          <NuxtLink 
            to="/shop?subcategory=Women" 
            class="group relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-rose-50 to-neutral-100"
          >
            <img v-if="collectionWomenImage" :src="collectionWomenImage" alt="Women's Collection" class="absolute inset-0 w-full h-full object-cover" />
            <div class="absolute inset-0 bg-aura-black/0 group-hover:bg-aura-black/10 transition-all duration-500" />
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <span class="text-caption uppercase tracking-[0.3em] text-accent-burgundy mb-3" :class="collectionWomenImage ? 'text-white/80' : ''">{{ $t('home.collection') }}</span>
              <h2 class="font-serif text-heading-1 mb-4" :class="collectionWomenImage ? 'text-white' : 'text-aura-black'">{{ $t('home.women') }}</h2>
              <span class="text-body-sm uppercase tracking-wider underline underline-offset-4" :class="collectionWomenImage ? 'text-white/80 group-hover:text-white' : 'text-neutral-600 group-hover:text-aura-black'" style="transition: color 0.3s">
                {{ $t('home.shopNow') }}
              </span>
            </div>
          </NuxtLink>

          <!-- Men's Collection -->
          <NuxtLink 
            to="/shop?subcategory=Men" 
            class="group relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-slate-100 to-neutral-100"
          >
            <img v-if="collectionMenImage" :src="collectionMenImage" alt="Men's Collection" class="absolute inset-0 w-full h-full object-cover" />
            <div class="absolute inset-0 bg-aura-black/0 group-hover:bg-aura-black/10 transition-all duration-500" />
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <span class="text-caption uppercase tracking-[0.3em] text-accent-navy mb-3" :class="collectionMenImage ? 'text-white/80' : ''">{{ $t('home.collection') }}</span>
              <h2 class="font-serif text-heading-1 mb-4" :class="collectionMenImage ? 'text-white' : 'text-aura-black'">{{ $t('home.men') }}</h2>
              <span class="text-body-sm uppercase tracking-wider underline underline-offset-4" :class="collectionMenImage ? 'text-white/80 group-hover:text-white' : 'text-neutral-600 group-hover:text-aura-black'" style="transition: color 0.3s">
                {{ $t('home.shopNow') }}
              </span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Featured Products (New Arrivals) -->
    <section class="py-20 lg:py-28 bg-neutral-50">
      <div class="container-aura">
        <!-- Section Header -->
        <div class="text-center mb-16">
          <span class="text-caption uppercase tracking-[0.3em] text-accent-burgundy mb-4 block">{{ $t('home.newIn') }}</span>
          <h2 class="font-serif text-heading-1 text-aura-black">{{ $t('home.newArrivals') }}</h2>
        </div>

        <!-- Products Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          <NuxtLink 
            v-for="product in products.slice(0, 4)" 
            :key="product.id"
            :to="`/shop/${product.id}`"
            class="group"
          >
            <!-- Product Image -->
            <div class="relative aspect-product bg-white overflow-hidden mb-4 shadow-soft group-hover:shadow-medium transition-shadow duration-300">
              <img 
                v-if="getProductImage(product)"
                :src="getProductImage(product)"
                :alt="product.name"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-neutral-300 bg-neutral-100">
                <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <!-- Product Info -->
            <div class="text-center">
              <p class="text-caption text-neutral-500 uppercase tracking-wider mb-1">{{ product.brand }}</p>
              <h3 class="text-body text-aura-black mb-2 line-clamp-1">{{ product.name }}</h3>
              <p class="text-body font-medium text-aura-black">
                <span v-if="product.sale_price" class="text-accent-burgundy mr-2">{{ formatPrice(product.sale_price) }}</span>
                <span :class="product.sale_price ? 'text-neutral-400 line-through text-body-sm' : ''">
                  {{ formatPrice(product.base_price) }}
                </span>
              </p>
            </div>
          </NuxtLink>

          <!-- Placeholder cards if no products -->
          <div 
            v-for="i in (4 - products.length)" 
            :key="'placeholder-' + i"
            v-show="products.length < 4"
            class="group"
          >
            <div class="relative aspect-product bg-neutral-100 mb-4 shadow-soft" />
            <div class="text-center">
              <p class="text-caption text-neutral-400 uppercase tracking-wider mb-1">{{ $t('common.brand') }}</p>
              <h3 class="text-body text-neutral-400 mb-2">{{ $t('common.productName') }}</h3>
              <p class="text-body text-neutral-400">$0</p>
            </div>
          </div>
        </div>

        <!-- View All Button -->
        <div class="text-center mt-16">
          <NuxtLink 
            to="/new-arrivals" 
            class="inline-flex items-center px-10 py-4 border border-aura-black text-aura-black text-caption uppercase tracking-[0.15em] hover:bg-aura-black hover:text-white transition-all duration-300"
          >
            {{ $t('home.viewAll') }}
            <svg class="w-4 h-4 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Best Sellers -->
    <section v-if="bestSellers.length > 0" class="py-20 lg:py-28 bg-white">
      <div class="container-aura">
        <!-- Section Header -->
        <div class="text-center mb-16">
          <span class="text-caption uppercase tracking-[0.3em] text-accent-gold mb-4 block">{{ $t('home.mostPopular') }}</span>
          <h2 class="font-serif text-heading-1 text-aura-black">{{ $t('home.bestSellers') }}</h2>
        </div>

        <!-- Products Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          <NuxtLink 
            v-for="product in bestSellers" 
            :key="product.id"
            :to="`/shop/${product.id}`"
            class="group"
          >
            <!-- Product Image -->
            <div class="relative aspect-product bg-neutral-100 overflow-hidden mb-4 shadow-soft group-hover:shadow-medium transition-shadow duration-300">
              <img 
                v-if="getProductImage(product)"
                :src="getProductImage(product)"
                :alt="product.name"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-neutral-300">
                <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <!-- View count badge -->
              <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-caption text-neutral-600">
                {{ product.view_count || 0 }} {{ $t('home.views') }}
              </div>
            </div>
            <!-- Product Info -->
            <div class="text-center">
              <p class="text-caption text-neutral-500 uppercase tracking-wider mb-1">{{ product.brand }}</p>
              <h3 class="text-body text-aura-black mb-2 line-clamp-1">{{ product.name }}</h3>
              <p class="text-body font-medium text-aura-black">
                <span v-if="product.sale_price" class="text-accent-burgundy mr-2">{{ formatPrice(product.sale_price) }}</span>
                <span :class="product.sale_price ? 'text-neutral-400 line-through text-body-sm' : ''">
                  {{ formatPrice(product.base_price) }}
                </span>
              </p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- On Sale -->
    <section v-if="saleProducts.length > 0" class="py-20 lg:py-28 bg-gradient-to-br from-red-50 to-rose-50">
      <div class="container-aura">
        <!-- Section Header -->
        <div class="text-center mb-16">
          <span class="text-caption uppercase tracking-[0.3em] text-accent-burgundy mb-4 block">{{ $t('home.limitedTime') }}</span>
          <h2 class="font-serif text-heading-1 text-aura-black">{{ $t('home.onSale') }}</h2>
        </div>

        <!-- Products Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          <NuxtLink 
            v-for="product in saleProducts" 
            :key="product.id"
            :to="`/shop/${product.id}`"
            class="group"
          >
            <!-- Product Image -->
            <div class="relative aspect-product bg-white overflow-hidden mb-4 shadow-soft group-hover:shadow-medium transition-shadow duration-300">
              <img 
                v-if="getProductImage(product)"
                :src="getProductImage(product)"
                :alt="product.name"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-neutral-300">
                <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <!-- Sale badge -->
              <div class="absolute top-3 left-3 bg-accent-burgundy text-white px-3 py-1 text-caption uppercase tracking-wider">
                {{ $t('home.sale') }}
              </div>
            </div>
            <!-- Product Info -->
            <div class="text-center">
              <p class="text-caption text-neutral-500 uppercase tracking-wider mb-1">{{ product.brand }}</p>
              <h3 class="text-body text-aura-black mb-2 line-clamp-1">{{ product.name }}</h3>
              <p class="text-body font-medium">
                <span class="text-accent-burgundy mr-2">{{ formatPrice(product.sale_price) }}</span>
                <span class="text-neutral-400 line-through text-body-sm">{{ formatPrice(product.base_price) }}</span>
              </p>
            </div>
          </NuxtLink>
        </div>

        <!-- View All -->
        <div class="text-center mt-12">
          <NuxtLink to="/sale" class="text-body uppercase tracking-wider text-accent-burgundy underline underline-offset-4 hover:text-aura-black transition-colors">
            {{ $t('home.viewAllSale') }} →
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Category Cards (dynamic from admin) -->
    <section v-if="homepageCategories.length" class="py-20 lg:py-28 bg-neutral-50">
      <div class="container-aura">
        <div class="text-center mb-16">
          <h2 class="font-serif text-heading-1 text-aura-black">{{ $t('home.categories') }}</h2>
        </div>
        
        <div class="grid grid-cols-1 gap-6 lg:gap-8" :class="homepageCategories.length === 2 ? 'md:grid-cols-2' : homepageCategories.length >= 3 ? 'md:grid-cols-3' : ''">
          <NuxtLink
            v-for="cat in homepageCategories"
            :key="cat.id"
            :to="cat.link_url || '/shop'"
            class="group relative aspect-square overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-50"
          >
            <img v-if="cat.image_url" :src="getImageUrl(cat.image_url)" :alt="cat.title" class="absolute inset-0 w-full h-full object-cover" />
            <div v-if="cat.image_url" class="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all duration-300" />
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <h3 class="font-serif text-heading-2 mb-3" :class="cat.image_url ? 'text-white' : 'text-aura-black'">{{ cat.title }}</h3>
              <span class="text-caption uppercase tracking-wider underline underline-offset-4" :class="cat.image_url ? 'text-white/80 group-hover:text-white' : 'text-neutral-600 group-hover:text-aura-black'" style="transition: color 0.3s">
                {{ cat.button_text || $t('home.shopNow') }}
              </span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Value Propositions -->
    <section class="py-20 lg:py-28 bg-neutral-50">
      <div class="container-aura">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-16">
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-white shadow-soft flex items-center justify-center">
              <svg class="w-8 h-8 text-accent-burgundy" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 class="font-serif text-heading-4 text-aura-black mb-3">{{ $t('home.authenticated') }}</h3>
            <p class="text-body text-neutral-600 leading-relaxed">{{ $t('home.authenticatedDesc') }}</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-white shadow-soft flex items-center justify-center">
              <svg class="w-8 h-8 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h3 class="font-serif text-heading-4 text-aura-black mb-3">{{ $t('home.curated') }}</h3>
            <p class="text-body text-neutral-600 leading-relaxed">{{ $t('home.curatedDesc') }}</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-white shadow-soft flex items-center justify-center">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <h3 class="font-serif text-heading-4 text-aura-black mb-3">{{ $t('home.sustainable') }}</h3>
            <p class="text-body text-neutral-600 leading-relaxed">{{ $t('home.sustainableDesc') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Newsletter CTA (Light version) -->
    <section class="py-24 lg:py-32 bg-gradient-to-br from-neutral-100 to-aura-cream">
      <div class="container-aura text-center max-w-2xl mx-auto">
        <span class="text-caption uppercase tracking-[0.3em] text-accent-burgundy mb-4 block">{{ $t('home.stayUpdated') }}</span>
        <h2 class="font-serif text-heading-1 text-aura-black mb-6">{{ $t('footer.newsletter') }}</h2>
        <p class="text-body-lg text-neutral-600 mb-10 leading-relaxed">
          {{ $t('footer.newsletterText') }}
        </p>
        <form @submit.prevent="handleNewsletterSubmit" class="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
          <input
            type="email"
            :placeholder="$t('footer.emailPlaceholder')"
            class="flex-1 px-6 py-4 bg-white border border-neutral-300 text-aura-black placeholder-neutral-400 focus:border-aura-black focus:outline-none transition-colors"
          />
          <button 
            type="submit" 
            class="px-10 py-4 bg-aura-black text-white font-medium uppercase tracking-wider text-caption hover:bg-neutral-800 transition-colors"
          >
            {{ $t('footer.subscribe') }}
          </button>
        </form>
      </div>
    </section>
  </div>
</template>
