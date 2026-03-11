<script setup lang="ts">
/**
 * AJAX Search Component
 * AURA ARCHIVE - Real-time search with product suggestions
 */

const config = useRuntimeConfig()
const router = useRouter()

const searchQuery = ref('')
const isOpen = ref(false)
const isLoading = ref(false)
const results = ref<any[]>([])

// Debounce search
let debounceTimer: NodeJS.Timeout

const handleSearch = () => {
  clearTimeout(debounceTimer)
  
  if (searchQuery.value.length < 2) {
    results.value = []
    isOpen.value = false
    return
  }

  isLoading.value = true
  isOpen.value = true

  debounceTimer = setTimeout(async () => {
    try {
      const response = await $fetch<{
        success: boolean
        data: { products: any[]; pagination: any }
      }>(`${config.public.apiUrl}/products?search=${encodeURIComponent(searchQuery.value)}&limit=5`)

      results.value = response.data?.products || []
    } catch (error) {
      console.error('Search error:', error)
      results.value = []
    } finally {
      isLoading.value = false
    }
  }, 300)
}

const { formatPrice } = useCurrency()

const { getProductImage } = useImageUrl()

const goToProduct = (product: any) => {
  isOpen.value = false
  searchQuery.value = ''
  router.push(`/shop/${product.id}`)
}

const goToSearch = () => {
  if (searchQuery.value.trim()) {
    isOpen.value = false
    router.push(`/shop?search=${encodeURIComponent(searchQuery.value)}`)
    searchQuery.value = ''
  }
}

// Close on outside click
const searchRef = ref<HTMLElement | null>(null)

onClickOutside(searchRef, () => {
  isOpen.value = false
})
</script>

<template>
  <div ref="searchRef" class="relative w-full max-w-md">
    <!-- Search Input -->
    <div class="relative">
      <input
        v-model="searchQuery"
        @input="handleSearch"
        @keydown.enter="goToSearch"
        @focus="searchQuery.length >= 2 && (isOpen = true)"
        type="text"
        placeholder="Tìm kiếm sản phẩm..."
        class="w-full py-3 pl-12 pr-4 bg-neutral-50 border border-neutral-200 rounded-sm text-body focus:outline-none focus:border-aura-black transition-colors"
      />
      <svg 
        class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      
      <!-- Loading spinner -->
      <div v-if="isLoading" class="absolute right-4 top-1/2 -translate-y-1/2">
        <div class="w-5 h-5 border-2 border-neutral-300 border-t-aura-black rounded-full animate-spin"></div>
      </div>
    </div>

    <!-- Results Dropdown -->
    <Transition name="dropdown">
      <div 
        v-if="isOpen && (results.length > 0 || isLoading)"
        class="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 shadow-elevated rounded-sm z-50 overflow-hidden"
      >
        <!-- Loading Skeletons -->
        <div v-if="isLoading && results.length === 0" class="p-4 space-y-3">
          <div v-for="i in 3" :key="i" class="flex gap-3 animate-pulse">
            <div class="w-12 h-12 bg-neutral-200 rounded-sm"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-neutral-200 rounded w-3/4"></div>
              <div class="h-3 bg-neutral-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>

        <!-- Results -->
        <div v-else>
          <button
            v-for="product in results"
            :key="product.id"
            @click="goToProduct(product)"
            class="w-full flex items-center gap-3 p-3 hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-0"
          >
            <!-- Image -->
            <div class="w-12 h-12 bg-neutral-100 rounded-sm overflow-hidden flex-shrink-0">
              <img
                v-if="getProductImage(product)"
                :src="getProductImage(product)"
                :alt="product.name"
                class="w-full h-full object-cover"
              />
            </div>
            <!-- Info -->
            <div class="flex-1 text-left">
              <p class="text-body-sm font-medium text-aura-black line-clamp-1">{{ product.name }}</p>
              <p class="text-caption text-neutral-500">{{ product.brand }}</p>
            </div>
            <!-- Price -->
            <div class="text-right">
              <p class="text-body-sm font-medium" :class="product.sale_price ? 'text-accent-burgundy' : 'text-aura-black'">
                {{ formatPrice(product.sale_price || product.base_price) }}
              </p>
              <p v-if="product.sale_price" class="text-caption text-neutral-400 line-through">
                {{ formatPrice(product.base_price) }}
              </p>
            </div>
          </button>

          <!-- View All -->
          <button
            @click="goToSearch"
            class="w-full py-3 text-body-sm text-center text-neutral-600 hover:text-aura-black hover:bg-neutral-50 transition-colors"
          >
            Xem tất cả kết quả →
          </button>
        </div>

        <!-- No results -->
        <div v-if="!isLoading && results.length === 0 && searchQuery.length >= 2" class="p-6 text-center">
          <p class="text-neutral-500">Không tìm thấy sản phẩm phù hợp</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
