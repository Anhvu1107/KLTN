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
import { useDialog } from '~/composables/useDialog'

const { t } = useI18n()
const route = useRoute()
const config = useRuntimeConfig()
const cartStore = useCartStore()
const authStore = useAuthStore()
const { getImageUrl } = useImageUrl()
const { formatSizeLabel } = useProductSizeLabel()
const { alert: showDialog } = useDialog()

const productId = route.params.id as string

// Fetch product
const { data, pending, error } = await useFetch<{
  success: boolean
  data: { product: any }
}>(`${config.public.apiUrl}/products/${productId}`)

const product = computed(() => data.value?.data?.product)

const getVariantStock = (v: any) => {
  const stock = Number(v?.stock_quantity)
  return Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0
}

const isVariantAvailable = (v: any) => v?.status === 'AVAILABLE' && getVariantStock(v) > 0

// --- Variant grouping & selection ---

type VariantOption = {
  value: string
  label: string
}

const productVariants = computed<any[]>(() => {
  return Array.isArray(product.value?.variants) ? product.value.variants : []
})

const normalizeVariantValue = (value: unknown) => {
  if (value === null || value === undefined) return ''
  return String(value)
}

const uniqueVariantOptions = (variants: any[], key: 'size' | 'color' | 'material'): VariantOption[] => {
  const options = new Map<string, string>()

  for (const v of variants) {
    const value = normalizeVariantValue(v?.[key])
    if (!options.has(value)) {
      options.set(value, value)
    }
  }

  return [...options.entries()].map(([value, label]) => ({ value, label }))
}

const selectedSize = ref('')
const selectedColor = ref('')
const selectedMaterial = ref('')

const allSizeOptions = computed(() => uniqueVariantOptions(productVariants.value, 'size'))
const allSizes = computed(() => allSizeOptions.value.map(option => option.value))

const isSizeOptionAvailable = (size: string) => {
  return productVariants.value.some(v => normalizeVariantValue(v.size) === size && isVariantAvailable(v))
}

const availableSizes = computed(() => allSizes.value.filter(isSizeOptionAvailable))

// Selected size — default to first available size
watch([availableSizes, allSizes], ([sizes, all]) => {
  const nextSizes = sizes.length ? sizes : all

  if (!nextSizes.length) {
    selectedSize.value = ''
    return
  }

  if (!nextSizes.includes(selectedSize.value)) {
    selectedSize.value = nextSizes[0]
  }
}, { immediate: true })

// Whether this product has multiple sizes (show selector or not)
const hasMultipleSizes = computed(() => allSizes.value.length > 1)

const sizeVariants = computed(() => {
  return productVariants.value.filter(v => normalizeVariantValue(v.size) === selectedSize.value)
})

const colorOptions = computed(() => uniqueVariantOptions(sizeVariants.value, 'color'))
const hasMultipleColors = computed(() => colorOptions.value.length > 1)

const isColorOptionAvailable = (color: string) => {
  return sizeVariants.value.some(v => normalizeVariantValue(v.color) === color && isVariantAvailable(v))
}

watch([colorOptions, selectedSize], () => {
  const colors = colorOptions.value.map(option => option.value)

  if (!colors.length) {
    selectedColor.value = ''
    return
  }

  if (!colors.includes(selectedColor.value) || !isColorOptionAvailable(selectedColor.value)) {
    selectedColor.value = colors.find(isColorOptionAvailable) || colors[0]
  }
}, { immediate: true })

const colorVariants = computed(() => {
  return sizeVariants.value.filter(v => normalizeVariantValue(v.color) === selectedColor.value)
})

const materialOptions = computed(() => uniqueVariantOptions(colorVariants.value, 'material'))
const hasMultipleMaterials = computed(() => materialOptions.value.length > 1)

const isMaterialOptionAvailable = (material: string) => {
  return colorVariants.value.some(v => normalizeVariantValue(v.material) === material && isVariantAvailable(v))
}

watch([materialOptions, selectedSize, selectedColor], () => {
  const materials = materialOptions.value.map(option => option.value)

  if (!materials.length) {
    selectedMaterial.value = ''
    return
  }

  if (!materials.includes(selectedMaterial.value) || !isMaterialOptionAvailable(selectedMaterial.value)) {
    selectedMaterial.value = materials.find(isMaterialOptionAvailable) || materials[0]
  }
}, { immediate: true })

const selectedVariants = computed(() => {
  return productVariants.value.filter(v =>
    normalizeVariantValue(v.size) === selectedSize.value &&
    normalizeVariantValue(v.color) === selectedColor.value &&
    normalizeVariantValue(v.material) === selectedMaterial.value
  )
})

const selectedAvailableVariants = computed(() => selectedVariants.value.filter(isVariantAvailable))
const availableQuantity = computed(() => selectedAvailableVariants.value.reduce((sum, v) => sum + getVariantStock(v), 0))

const variant = computed(() => selectedAvailableVariants.value[0] || selectedVariants.value[0] || productVariants.value[0])

// --- End variant grouping ---

// Add a helper for translating database values like colors and materials
const tValue = (dict: string, val: string) => {
  if (!val) return ''
  const keyMatch = val.toLowerCase().replace(/\s+/g, '')
  const fullPath = `${dict}.${keyMatch}`
  const translated = t(fullPath)
  return translated === fullPath ? val : translated
}

const formatOptionLabel = (dict: string, option?: VariantOption | string) => {
  const val = typeof option === 'string' ? option : option?.label
  return val ? tValue(dict, val) : t('common.unknown')
}

// How many of the SELECTED SIZE are already in the cart?
const inCartCount = computed(() => {
  return selectedAvailableVariants.value.reduce((sum, v) => {
    const itemInCart = cartStore.items.find(i => i.id === v.id);
    return sum + (itemInCart ? Number(itemInCart.quantity || 0) : 0);
  }, 0)
})

// Max amount we can still add to cart (of selected size)
const maxCanAdd = computed(() => Math.max(0, availableQuantity.value - inCartCount.value))

// User selected quantity
const selectedQuantity = ref(1)

// Reset quantity when size changes or maxCanAdd changes
watch(maxCanAdd, (newMax) => {
  if (selectedQuantity.value > newMax) {
    selectedQuantity.value = Math.max(1, newMax)
  }
})

watch([selectedSize, selectedColor, selectedMaterial], () => {
  selectedQuantity.value = 1
})

// Check if item is fully in cart or sold out (for selected size)
const isFullyInCart = computed(() => maxCanAdd.value === 0 && availableQuantity.value > 0)
const isSold = computed(() => availableQuantity.value === 0)

const basePrice = computed(() => Number(product.value?.base_price || 0))
const salePrice = computed(() => product.value?.sale_price ? Number(product.value.sale_price) : null)
const selectedPriceAdjustment = computed(() => Number(variant.value?.price_adjustment || 0))
const displayBasePrice = computed(() => basePrice.value + selectedPriceAdjustment.value)
const displaySalePrice = computed(() => salePrice.value === null ? null : salePrice.value + selectedPriceAdjustment.value)

const getVariantPrice = (v: any) => {
  const productPrice = salePrice.value === null ? basePrice.value : salePrice.value
  return productPrice + Number(v?.price_adjustment || 0)
}

// Add to cart
const addedToCart = ref(false)

// Reviews ref for refreshing after submission
const reviewsRef = ref<{ refresh: () => void } | null>(null)

const addSelectedQuantityToCart = () => {
  if (isSold.value || maxCanAdd.value === 0) {
    showDialog({
      title: t('shop.soldOutTitle', 'Hết hàng'),
      message: t('shop.soldOutMessage', 'Sản phẩm đã hết hàng'),
      type: 'warning',
    })
    return 0
  }

  // Auth check
  if (!authStore.isAuthenticated) {
    navigateTo(`/auth/login?redirect=${route.fullPath}`)
    return 0
  }

  let remaining = Math.min(selectedQuantity.value, maxCanAdd.value)
  let added = 0

  for (const v of selectedAvailableVariants.value) {
    if (remaining <= 0) break

    const stock = getVariantStock(v)
    const inCart = Number(cartStore.items.find(i => i.id === v.id)?.quantity || 0)
    const canAdd = Math.max(0, stock - inCart)
    const quantity = Math.min(canAdd, remaining)

    if (quantity <= 0) continue

    cartStore.addToCart({
      id: v.id,
      productId: product.value.id,
      productName: product.value.name,
      productBrand: product.value.brand,
      productImage: getImageUrl(product.value.images?.[0]) || '',
      variantSize: v.size,
      variantColor: v.color,
      variantMaterial: v.material,
      price: getVariantPrice(v),
      quantity,
      stockQuantity: stock,
      stockStatus: v.status,
    })

    remaining -= quantity
    added += quantity
  }

  if (added === 0) {
    showDialog({
      title: t('shop.soldOutTitle', 'Hết hàng'),
      message: t('shop.soldOut', 'Đã đạt số lượng tối đa trong kho'),
      type: 'warning',
    })
  }

  return added
}

const handleAddToCart = () => {
  const added = addSelectedQuantityToCart()
  if (added > 0) {
    addedToCart.value = true
    setTimeout(() => {
      addedToCart.value = false
    }, 2000)
  }
}

// Buy Now - add to cart and go to checkout
const handleBuyNow = () => {
  const added = addSelectedQuantityToCart()
  if (added <= 0) return

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
            <span>{{ tValue('categories', product.category) }}</span>
          </nav>

          <!-- Brand -->
          <p class="text-caption text-neutral-500 uppercase tracking-widest mb-2">{{ product.brand }}</p>

          <!-- Name -->
          <h1 class="font-serif text-heading-2 text-aura-black mb-4">{{ product.name }}</h1>

          <!-- Price -->
          <div class="flex items-baseline gap-3 mb-6">
            <span v-if="displaySalePrice !== null" class="text-heading-3 text-accent-burgundy">
              {{ formatPrice(displaySalePrice) }}
            </span>
            <span 
              class="text-heading-3" 
              :class="displaySalePrice !== null ? 'text-neutral-400 line-through text-xl' : 'text-aura-black'"
            >
              {{ formatPrice(displayBasePrice) }}
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

          <!-- Size Selector (only show if product has multiple sizes) -->
          <div v-if="hasMultipleSizes" class="mb-6">
            <p class="text-caption text-neutral-500 uppercase mb-2">{{ t('shop.selectSize', 'Chọn kích thước') }}</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="size in allSizes"
                :key="size"
                @click="availableSizes.includes(size) ? selectedSize = size : null"
                :disabled="!availableSizes.includes(size)"
                class="min-w-[3rem] px-4 py-2.5 border text-body-sm font-medium rounded-sm transition-all duration-200"
                :class="{
                  'border-aura-black bg-aura-black text-white': selectedSize === size,
                  'border-neutral-300 hover:border-aura-black text-aura-black': selectedSize !== size && availableSizes.includes(size),
                  'border-neutral-200 text-neutral-300 cursor-not-allowed line-through': !availableSizes.includes(size),
                }"
              >
                {{ formatSizeLabel(size) }}
              </button>
            </div>
          </div>

          <!-- Variant Info -->
          <div v-if="variant" class="mb-6 space-y-3">
            <div class="space-y-4">
              <!-- Only show static size label when there's no multi-size selector -->
              <div v-if="!hasMultipleSizes">
                <p class="text-caption text-neutral-500 uppercase">{{ t('shop.size') }}</p>
                <p class="text-body font-medium">{{ formatSizeLabel(variant.size) }}</p>
              </div>

              <div v-if="colorOptions.length">
                <p class="text-caption text-neutral-500 uppercase mb-2">{{ t('shop.color') }}</p>
                <div v-if="hasMultipleColors" class="flex flex-wrap gap-2">
                  <button
                    v-for="color in colorOptions"
                    :key="color.value"
                    type="button"
                    @click="isColorOptionAvailable(color.value) ? selectedColor = color.value : null"
                    :disabled="!isColorOptionAvailable(color.value)"
                    class="min-w-[3rem] px-4 py-2 border text-body-sm font-medium rounded-sm transition-all duration-200"
                    :class="{
                      'border-aura-black bg-aura-black text-white': selectedColor === color.value && isColorOptionAvailable(color.value),
                      'border-neutral-300 hover:border-aura-black text-aura-black': selectedColor !== color.value && isColorOptionAvailable(color.value),
                      'border-neutral-200 text-neutral-300 cursor-not-allowed line-through': !isColorOptionAvailable(color.value),
                    }"
                  >
                    {{ formatOptionLabel('colors', color) }}
                  </button>
                </div>
                <p v-else class="text-body font-medium">{{ formatOptionLabel('colors', colorOptions[0]) }}</p>
              </div>

              <div v-if="materialOptions.length">
                <p class="text-caption text-neutral-500 uppercase mb-2">{{ t('shop.material') }}</p>
                <div v-if="hasMultipleMaterials" class="flex flex-wrap gap-2">
                  <button
                    v-for="material in materialOptions"
                    :key="material.value"
                    type="button"
                    @click="isMaterialOptionAvailable(material.value) ? selectedMaterial = material.value : null"
                    :disabled="!isMaterialOptionAvailable(material.value)"
                    class="min-w-[3rem] px-4 py-2 border text-body-sm font-medium rounded-sm transition-all duration-200"
                    :class="{
                      'border-aura-black bg-aura-black text-white': selectedMaterial === material.value && isMaterialOptionAvailable(material.value),
                      'border-neutral-300 hover:border-aura-black text-aura-black': selectedMaterial !== material.value && isMaterialOptionAvailable(material.value),
                      'border-neutral-200 text-neutral-300 cursor-not-allowed line-through': !isMaterialOptionAvailable(material.value),
                    }"
                  >
                    {{ formatOptionLabel('materials', material) }}
                  </button>
                </div>
                <p v-else class="text-body font-medium">{{ formatOptionLabel('materials', materialOptions[0]) }}</p>
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
            <p v-if="availableQuantity === 0" class="text-body-sm text-accent-burgundy font-medium">
              {{ t('shop.soldOutMessage', 'Sản phẩm đã hết hàng') }}
            </p>
            <p v-else-if="availableQuantity === 1" class="text-body-sm text-accent-burgundy font-medium flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-accent-burgundy"></span>
              {{ t('shop.onlyOneLeft', 'Chỉ còn duy nhất 1 sản phẩm!') }}
            </p>
            <p v-else-if="availableQuantity <= 3" class="text-body-sm text-orange-600 font-medium flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-orange-600"></span>
              {{ t('shop.onlyFewLeft', 'Chỉ còn vài sản phẩm!') }} ({{ availableQuantity }})
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
              <li><span class="text-neutral-500">{{ t('shop.category') }}:</span> {{ tValue('categories', product.category) }}</li>
              <li><span class="text-neutral-500">{{ t('shop.subcategory') }}:</span> {{ tValue('categories', product.subcategory) }}</li>
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
