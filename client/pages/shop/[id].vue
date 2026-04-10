<script setup lang="ts">
/**
 * Product Detail Page
 * AURA ARCHIVE - Shop product with Add to Cart and Wishlist functionality
 */

import { useCartStore } from '~/stores/cart'
import { useAuthStore } from '~/stores/auth'
import { useProductSizeLabel } from '~/composables/useProductSizeLabel'
import { useRecentlyViewed } from '~/composables/useRecentlyViewed'
import { useCompare } from '~/composables/useCompare'

const { t } = useI18n()
const route = useRoute()
const config = useRuntimeConfig()
const cartStore = useCartStore()
const authStore = useAuthStore()
const { getImageUrl } = useImageUrl()
const { formatSizeLabel } = useProductSizeLabel()

const productId = route.params.id as string

// Fetch product
const { data, pending, error } = await useFetch<{
  success: boolean
  data: { product: any }
}>(`${config.public.apiUrl}/products/${productId}`)

const product = computed(() => data.value?.data?.product)

const availableVariants = computed(() => product.value?.variants?.filter((v: any) => v.status === 'AVAILABLE') || [])
const availableQuantity = computed(() => availableVariants.value.length)

// Choose the first available variant to put in cart, or fallback to the first one if all are sold
const variant = computed(() => availableVariants.value[0] || product.value?.variants?.[0])

// Add a helper for translating database values like colors and materials
const tValue = (dict: string, val: string) => {
  if (!val) return ''
  const keyMatch = val.toLowerCase().replace(/\s+/g, '')
  const fullPath = `${dict}.${keyMatch}`
  const translated = t(fullPath)
  return translated === fullPath ? val : translated
}

// How many of these identical items are already in the cart?
const inCartCount = computed(() => {
  return availableVariants.value.filter((v: any) => cartStore.isInCart(v.id)).length
})

// Max amount we can still add to cart
const maxCanAdd = computed(() => availableQuantity.value - inCartCount.value)

// User selected quantity
const selectedQuantity = ref(1)

// Reset quantity when maxCanAdd changes to avoid invalid state
watch(maxCanAdd, (newMax) => {
  if (selectedQuantity.value > newMax) {
    selectedQuantity.value = Math.max(1, newMax)
  }
})

// Check if item is fully in cart or sold out
const isFullyInCart = computed(() => maxCanAdd.value === 0 && availableQuantity.value > 0)
const isSold = computed(() => availableQuantity.value === 0)

// Add to cart
const addedToCart = ref(false)

// Reviews ref for refreshing after submission
const reviewsRef = ref<{ refresh: () => void } | null>(null)

const handleAddToCart = () => {
  if (isSold.value || isFullyInCart.value || maxCanAdd.value === 0) return

  // Auth check
  if (!authStore.isAuthenticated) {
    navigateTo(`/auth/login?redirect=${route.fullPath}`)
    return
  }

  // Find variants to add
  const variantsToAdd = availableVariants.value
    .filter((v: any) => !cartStore.isInCart(v.id))
    .slice(0, selectedQuantity.value)

  let count = 0
  for (const v of variantsToAdd) {
    const success = cartStore.addToCart({
      id: v.id,
      productId: product.value.id,
      productName: product.value.name,
      productBrand: product.value.brand,
      productImage: getImageUrl(product.value.images?.[0]) || '',
      variantSize: v.size,
      variantColor: v.color,
      price: parseFloat(product.value.sale_price || product.value.base_price),
    })
    if (success) count++
  }

  if (count > 0) {
    addedToCart.value = true
    setTimeout(() => {
      addedToCart.value = false
    }, 2000)
  }
}

// Buy Now - add to cart and go to checkout
const handleBuyNow = () => {
  if (isSold.value || isFullyInCart.value || maxCanAdd.value === 0) return

  // Auth check
  if (!authStore.isAuthenticated) {
    navigateTo(`/auth/login?redirect=${route.fullPath}`)
    return
  }

  // Add selected quantity to cart
  const variantsToAdd = availableVariants.value
    .filter((v: any) => !cartStore.isInCart(v.id))
    .slice(0, selectedQuantity.value)

  for (const v of variantsToAdd) {
    cartStore.addToCart({
      id: v.id,
      productId: product.value.id,
      productName: product.value.name,
      productBrand: product.value.brand,
      productImage: getImageUrl(product.value.images?.[0]) || '',
      variantSize: v.size,
      variantColor: v.color,
      price: parseFloat(product.value.sale_price || product.value.base_price),
    })
  }

  // Navigate to checkout
  navigateTo('/checkout')
}

// Wishlist functionality
const isInWishlist = ref(false)
const isWishlistLoading = ref(false)

// Check wishlist status on mount
const checkWishlist = async () => {
  const token = localStorage.getItem('token')
  if (!token || !product.value) return

  try {
    const response = await $fetch<{
      success: boolean
      data: { items: any[] }
    }>(`${config.public.apiUrl}/wishlist`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    
    if (response.success) {
      isInWishlist.value = response.data.items.some(
        (item: any) => item.product_id === productId
      )
    }
  } catch {
    // User not logged in or error
  }
}

const toggleWishlist = async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    // Redirect to login
    navigateTo('/auth/login')
    return
  }

  isWishlistLoading.value = true

  try {
    if (isInWishlist.value) {
      // Remove from wishlist
      await $fetch(`${config.public.apiUrl}/wishlist/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      isInWishlist.value = false
    } else {
      // Add to wishlist
      await $fetch(`${config.public.apiUrl}/wishlist`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { productId },
      })
      isInWishlist.value = true
    }
  } catch (err: any) {
    console.error('Wishlist error:', err)
  } finally {
    isWishlistLoading.value = false
  }
}

// Check wishlist when product loads
watch(() => product.value, () => {
  if (product.value) {
    checkWishlist()
  }
}, { immediate: true })

// Track recently viewed products
const { addProduct: addToRecentlyViewed } = useRecentlyViewed()

watch(() => product.value, () => {
  if (product.value) {
    addToRecentlyViewed({
      id: product.value.id,
      name: product.value.name,
      brand: product.value.brand,
      image: getImageUrl(product.value.images?.[0]) || '',
      price: parseFloat(product.value.base_price),
      salePrice: product.value.sale_price ? parseFloat(product.value.sale_price) : undefined,
    })
  }
}, { immediate: true })

// Format helpers
const { formatPrice } = useCurrency()

const getImages = computed(() => {
  if (!product.value?.images) return []
  try {
    const images = typeof product.value.images === 'string' 
      ? JSON.parse(product.value.images) 
      : product.value.images
    return images.map((img: string) => getImageUrl(img) || img)
  } catch {
    return []
  }
})

// Active image for gallery
const activeImageIndex = ref(0)
const activeImage = computed(() => getImages.value[activeImageIndex.value] || null)

// Size Guide modal
const showSizeGuide = ref(false)

// Compare functionality
const { isInCompare, toggleProduct: toggleCompare, isFull: isCompareFull } = useCompare()
const productInCompare = computed(() => product.value ? isInCompare(product.value.id) : false)

const handleToggleCompare = () => {
  if (!product.value) return
  toggleCompare({
    id: product.value.id,
    name: product.value.name,
    brand: product.value.brand,
    image: getImageUrl(product.value.images?.[0]) || '',
    price: parseFloat(product.value.base_price),
    salePrice: product.value.sale_price ? parseFloat(product.value.sale_price) : undefined,
    category: product.value.category,
    condition: product.value.condition_text,
    size: variant.value?.size,
    color: variant.value?.color,
    material: variant.value?.material,
  })
}

useSeoMeta({
  title: () => product.value ? `${product.value.name} | AURA ARCHIVE` : 'Product | AURA ARCHIVE',
  description: () => product.value?.description?.substring(0, 160),
})
</script>

<template>
  <div class="section">
    <div class="container-aura">
      <!-- Loading -->
      <div v-if="pending" class="text-center py-16">
        <p class="text-neutral-500">{{ t('common.loading') }}</p>
      </div>

      <!-- Error -->
      <div v-else-if="error || !product" class="text-center py-16">
        <h1 class="font-serif text-heading-2 text-aura-black mb-4">{{ t('errors.notFound') }}</h1>
        <NuxtLink to="/shop" class="btn-primary">{{ t('common.back') }}</NuxtLink>
      </div>

      <!-- Product -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        <!-- Images -->
        <div class="space-y-4">
          <div class="aspect-product bg-neutral-100 rounded-sm overflow-hidden relative">
            <!-- Sold Badge -->
            <div v-if="isSold" class="absolute top-4 left-4 z-10">
              <span class="badge-sold">{{ t('shop.sold') }}</span>
            </div>
            
            <!-- Main image with zoom or placeholder -->
            <ImageZoom 
              v-if="activeImage" 
              :src="activeImage" 
              :alt="product.name"
              class="w-full h-full"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-neutral-400">
              <svg class="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          
          <!-- Thumbnail grid (only show if images exist) -->
          <div v-if="getImages.length > 1" class="grid grid-cols-4 gap-2">
            <button 
              v-for="(img, index) in getImages" 
              :key="index" 
              @click="activeImageIndex = Number(index)"
              class="aspect-square bg-neutral-100 rounded-sm overflow-hidden border-2 transition-colors"
              :class="activeImageIndex === Number(index) ? 'border-aura-black' : 'border-transparent hover:border-neutral-300'"
            >
              <img :src="img" :alt="`${product.name} ${Number(index) + 1}`" class="w-full h-full object-cover" />
            </button>
          </div>
        </div>

        <!-- Details -->
        <div class="lg:py-4">
          <!-- Breadcrumb -->
          <nav class="text-caption text-neutral-500 mb-4">
            <NuxtLink to="/shop" class="hover:text-aura-black">{{ t('common.shop') }}</NuxtLink>
            <span class="mx-2">/</span>
            <span>{{ product.category }}</span>
          </nav>

          <!-- Brand -->
          <p class="text-caption text-neutral-500 uppercase tracking-widest mb-2">{{ product.brand }}</p>

          <!-- Name -->
          <h1 class="font-serif text-heading-2 text-aura-black mb-4">{{ product.name }}</h1>

          <!-- Price -->
          <div class="flex items-baseline gap-3 mb-6">
            <span v-if="product.sale_price" class="text-heading-3 text-accent-burgundy">
              {{ formatPrice(product.sale_price) }}
            </span>
            <span 
              class="text-heading-3" 
              :class="product.sale_price ? 'text-neutral-400 line-through text-xl' : 'text-aura-black'"
            >
              {{ formatPrice(product.base_price) }}
            </span>
          </div>

          <!-- Condition -->
          <div class="mb-6 pb-6 border-b border-neutral-200">
            <p class="text-body-sm text-neutral-600">
              <span class="font-medium">{{ t('shop.condition') }}:</span> {{ product.condition_text }}
            </p>
            <p v-if="product.authenticity_verified" class="text-body-sm text-green-600 mt-1">
              ✓ {{ t('shop.authenticityVerified') }}
            </p>
          </div>

          <!-- Variant Info -->
          <div v-if="variant" class="mb-6 space-y-3">
            <div class="flex gap-8">
              <div>
                <p class="text-caption text-neutral-500 uppercase">{{ t('shop.size') }}</p>
                <p class="text-body font-medium">{{ formatSizeLabel(variant.size) }}</p>
              </div>
              <div v-if="variant.color">
                <p class="text-caption text-neutral-500 uppercase">{{ t('shop.color') }}</p>
                <p class="text-body font-medium">{{ tValue('colors', variant.color) }}</p>
              </div>
              <div v-if="variant.material">
                <p class="text-caption text-neutral-500 uppercase">{{ t('shop.material') }}</p>
                <p class="text-body font-medium">{{ tValue('materials', variant.material) }}</p>
              </div>
            </div>
            
            <!-- Size Guide Button -->
            <button
              type="button"
              @click="showSizeGuide = true"
              class="text-body-sm text-accent-navy hover:underline flex items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {{ t('shop.sizeGuide') }}
            </button>
          </div>

          <!-- Stock Status -->
          <div class="mb-6">
            <p v-if="availableQuantity === 0" class="text-body-sm text-neutral-500 font-medium">
              {{ t('shop.soldOutMessage', 'Sản phẩm đã hết hàng') }}
            </p>
            <p v-else-if="availableQuantity === 1" class="text-body-sm text-accent-burgundy font-medium flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-accent-burgundy"></span>
              {{ t('shop.onlyOneLeft', 'Chỉ còn duy nhất 1 sản phẩm!') }}
            </p>
            <p v-else-if="availableQuantity <= 3" class="text-body-sm text-orange-600 font-medium flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-orange-600"></span>
              {{ t('shop.onlyFewLeft', 'Chỉ còn vài sản phẩm!') }}
            </p>
            <p v-else class="text-body-sm text-green-600 font-medium flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              {{ t('shop.inStock', 'Còn hàng') }}: {{ availableQuantity }} {{ t('shop.products', 'sản phẩm') }}
            </p>
          </div>

          <!-- Quantity Selector (if more than 1 available) -->
          <div v-if="maxCanAdd > 1 && !isSold" class="mb-6 flex items-center gap-4">
            <span class="text-caption text-neutral-500 uppercase">{{ t('shop.quantity', 'Số lượng') }}</span>
            <div class="flex items-center border border-neutral-300 rounded-sm">
              <button 
                type="button"
                @click="selectedQuantity > 1 ? selectedQuantity-- : null"
                class="px-3 py-1 text-neutral-500 hover:text-aura-black transition-colors"
                :disabled="selectedQuantity <= 1"
                :class="{ 'opacity-50 cursor-not-allowed': selectedQuantity <= 1 }"
              >-</button>
              <span class="px-4 py-1 text-body font-medium select-none w-12 text-center">{{ selectedQuantity }}</span>
              <button 
                type="button"
                @click="selectedQuantity < maxCanAdd ? selectedQuantity++ : null"
                class="px-3 py-1 text-neutral-500 hover:text-aura-black transition-colors"
                :disabled="selectedQuantity >= maxCanAdd"
                :class="{ 'opacity-50 cursor-not-allowed': selectedQuantity >= maxCanAdd }"
              >+</button>
            </div>
            <span class="text-caption text-neutral-400 font-medium">{{ t('shop.maxQuantity', 'Tối đa:') }} {{ maxCanAdd }}</span>
          </div>

          <!-- Action Buttons -->
          <div class="mb-8 space-y-3">
            <!-- Add to Cart -->
            <button
              @click="handleAddToCart"
              :disabled="isSold || isFullyInCart"
              class="w-full py-4 text-body font-medium uppercase tracking-wider transition-all duration-300"
              :class="{
                'bg-neutral-200 text-neutral-500 cursor-not-allowed': isSold || (isFullyInCart && !addedToCart),
                'bg-green-600 text-white': addedToCart,
                'bg-aura-black text-aura-white hover:bg-neutral-800': !isSold && !isFullyInCart && !addedToCart,
              }"
            >
              <span v-if="isSold">{{ t('shop.soldOut') }}</span>
              <span v-else-if="addedToCart">✓ {{ t('shop.addedToCart') }}</span>
              <span v-else-if="isFullyInCart">{{ t('shop.alreadyInCart') }}</span>
              <span v-else>{{ t('shop.addToCart') }}</span>
            </button>

            <!-- Buy Now -->
            <button
              v-if="!isSold && !isFullyInCart"
              @click="handleBuyNow"
              class="w-full py-4 text-body font-medium uppercase tracking-wider bg-accent-navy text-white hover:bg-opacity-90 transition-all duration-300"
            >
              {{ t('shop.buyNow') || 'Buy Now' }}
            </button>

            <!-- Wishlist Button -->
            <button
              @click="toggleWishlist"
              :disabled="isWishlistLoading"
              class="w-full py-4 text-body font-medium uppercase tracking-wider border-2 transition-all duration-300 flex items-center justify-center gap-2"
              :class="{
                'border-red-500 bg-red-50 text-red-600': isInWishlist,
                'border-neutral-300 text-neutral-600 hover:border-neutral-400': !isInWishlist,
                'opacity-70': isWishlistLoading,
              }"
            >
              <!-- Heart Icon -->
              <svg class="w-5 h-5" :fill="isInWishlist ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span v-if="isWishlistLoading">...</span>
              <span v-else-if="isInWishlist">{{ t('shop.inWishlist') }}</span>
              <span v-else>{{ t('shop.addToWishlist') }}</span>
            </button>

            <!-- Compare Button -->
            <button
              @click="handleToggleCompare"
              :disabled="isCompareFull && !productInCompare"
              class="w-full py-3 text-body-sm font-medium uppercase tracking-wider border transition-all duration-300 flex items-center justify-center gap-2"
              :class="{
                'border-accent-navy bg-accent-navy/10 text-accent-navy': productInCompare,
                'border-neutral-300 text-neutral-600 hover:border-neutral-400': !productInCompare && !isCompareFull,
                'border-neutral-200 text-neutral-400 cursor-not-allowed': isCompareFull && !productInCompare,
              }"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span v-if="productInCompare">{{ t('shop.removeFromCompare') || 'Remove from Compare' }}</span>
              <span v-else-if="isCompareFull">{{ t('shop.compareFull') || 'Compare Full (4 max)' }}</span>
              <span v-else>{{ t('shop.compareProducts') }}</span>
            </button>

            <NuxtLink 
              v-if="inCartCount > 0 && !isSold" 
              to="/cart" 
              class="block text-center text-body-sm text-neutral-600 hover:text-aura-black"
            >
              {{ t('shop.viewCart') }} →
            </NuxtLink>
          </div>

          <!-- Description -->
          <div class="mb-8">
            <h3 class="text-body font-medium text-aura-black mb-3">{{ t('shop.description') }}</h3>
            <p class="text-body text-neutral-600 whitespace-pre-line">{{ product.description }}</p>
          </div>

          <!-- Details -->
          <div class="border-t border-neutral-200 pt-6">
            <h3 class="text-body font-medium text-aura-black mb-3">{{ t('shop.details') }}</h3>
            <ul class="space-y-2 text-body-sm text-neutral-600">
              <li><span class="text-neutral-500">{{ t('shop.sku') }}:</span> {{ variant?.sku || 'N/A' }}</li>
              <li><span class="text-neutral-500">{{ t('shop.category') }}:</span> {{ product.category }}</li>
              <li><span class="text-neutral-500">{{ t('shop.subcategory') }}:</span> {{ product.subcategory }}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Reviews Section -->
      <div v-if="product" class="mt-16">
        <!-- Review Form -->
        <ReviewForm 
          :product-id="productId"
          @submitted="reviewsRef?.refresh()"
          class="mb-8"
        />

        <!-- Reviews List -->
        <ProductReviews 
          ref="reviewsRef"
          :product-id="productId"
        />
      </div>

      <!-- Related Products -->
      <RelatedProducts v-if="product" :product-id="productId" />

      <!-- Recently Viewed -->
      <RecentlyViewed :exclude-id="productId" />
    </div>

    <!-- Size Guide Modal -->
    <SizeGuide 
      v-model="showSizeGuide" 
      :category="product?.category" 
    />
  </div>
</template>
