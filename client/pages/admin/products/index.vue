<script setup lang="ts">
/**
 * Admin Products List
 * AURA ARCHIVE - Products management table
 */

import { useDialog } from '~/composables/useDialog'

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { t } = useI18n()
const config = useRuntimeConfig()
const { confirm: showConfirm } = useDialog()

// Get token
const getToken = () => {
  if (process.client) {
    return localStorage.getItem('token')
  }
  return null
}

// State
const products = ref<any[]>([])
const pagination = ref<any>({})
const isLoading = ref(true)
const searchQuery = ref('')

// Fetch products
const fetchProducts = async () => {
  try {
    isLoading.value = true
    const token = getToken()
    
    const params = new URLSearchParams()
    if (searchQuery.value) params.set('search', searchQuery.value)

    const response = await $fetch<{
      success: boolean
      data: { products: any[]; pagination: any }
    }>(`${config.public.apiUrl}/admin/products?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    products.value = response.data?.products || []
    pagination.value = response.data?.pagination || {}
  } catch (error) {
    console.error('Failed to fetch products:', error)
  } finally {
    isLoading.value = false
  }
}

// Delete product
const deleteProduct = async (id: number) => {
  const ok = await showConfirm({ title: t('admin.deleteConfirm'), message: t('admin.deleteConfirmDesc', 'Hành động này không thể hoàn tác. Bạn có chắc chắn?'), type: 'danger', confirmText: t('common.delete'), icon: 'trash' })
  if (!ok) return

  try {
    const token = getToken()
    await $fetch(`${config.public.apiUrl}/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    await fetchProducts()
  } catch (error) {
    console.error('Failed to delete product:', error)
  }
}

// Format helpers
const { formatPrice } = useCurrency()

const getStatusClass = (status: string) => {
  switch (status) {
    case 'AVAILABLE':
      return 'bg-green-100 text-green-800'
    case 'RESERVED':
      return 'bg-yellow-100 text-yellow-800'
    case 'SOLD':
      return 'bg-neutral-200 text-neutral-600'
    default:
      return 'bg-neutral-100 text-neutral-600'
  }
}

const getVariantStatus = (product: any) => {
  if (!product.variants || product.variants.length === 0) return 'N/A'
  return product.variants[0].status
}

const statusLabel = (status: string) => {
  if (!status || status === 'N/A') return 'N/A'
  const map: Record<string, string> = {
    AVAILABLE: t('shop.available'),
    RESERVED: t('shop.reserved'),
    SOLD: t('shop.sold')
  }
  return map[status] || status
}

const categoryLabel = (category: string) => {
  if (!category) return ''
  const map: Record<string, string> = {
    'Tops': t('categories.tops'),
    'Pants': t('categories.pants'),
    'Outerwear': t('categories.outerwear'),
    'Shoes': t('categories.shoes'),
    'Bags': t('categories.bags'),
    'Accessories': t('categories.accessories'),
    'Dresses': t('categories.dresses'),
    'Jewelry': t('categories.jewelry', 'Trang sức'),
    'Watches': t('categories.watches', 'Đồng hồ')
  }
  return map[category] || category
}

// Search with debounce
let searchTimeout: NodeJS.Timeout
const onSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchProducts()
  }, 300)
}

onMounted(() => {
  fetchProducts()
})

useSeoMeta({
  title: 'Products | AURA ARCHIVE Admin',
})
</script>

<template>
  <div class="p-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="font-serif text-heading-2 text-aura-black">{{ t('admin.products') }}</h1>
        <p class="text-body text-neutral-600">{{ pagination.total || 0 }} {{ t('shop.products') }}</p>
      </div>
      <NuxtLink to="/admin/products/new" class="btn-primary">
        + {{ t('admin.addProduct') }}
      </NuxtLink>
    </div>

    <!-- Search -->
    <div class="mb-6">
      <input
        v-model="searchQuery"
        @input="onSearch"
        type="text"
        :placeholder="t('admin.searchProducts')"
        class="input-field max-w-md"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-16">
      <p class="text-neutral-500">{{ t('common.loading') }}</p>
    </div>

    <!-- Table -->
    <div v-else class="card overflow-hidden">
      <table class="w-full">
        <thead class="bg-neutral-50">
          <tr>
            <th class="text-left py-4 px-6 text-caption font-medium text-neutral-500 uppercase">{{ t('admin.reviews.product') }}</th>
            <th class="text-left py-4 px-6 text-caption font-medium text-neutral-500 uppercase">{{ t('shop.category') }}</th>
            <th class="text-left py-4 px-6 text-caption font-medium text-neutral-500 uppercase">{{ t('admin.pricing') }}</th>
            <th class="text-left py-4 px-6 text-caption font-medium text-neutral-500 uppercase">{{ t('common.status') }}</th>
            <th class="text-left py-4 px-6 text-caption font-medium text-neutral-500 uppercase">{{ t('common.active') }}</th>
            <th class="text-left py-4 px-6 text-caption font-medium text-neutral-500 uppercase">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.id" class="border-t border-neutral-100 hover:bg-neutral-50">
            <td class="py-4 px-6">
              <div>
                <p class="text-caption text-neutral-500">{{ product.brand }}</p>
                <p class="text-body-sm font-medium text-aura-black">{{ product.name }}</p>
              </div>
            </td>
            <td class="py-4 px-6 text-body-sm text-neutral-600">{{ categoryLabel(product.category) }}</td>
            <td class="py-4 px-6">
              <div>
                <span v-if="product.sale_price" class="text-body-sm text-accent-burgundy font-medium">
                  {{ formatPrice(product.sale_price) }}
                </span>
                <span v-else class="text-body-sm">{{ formatPrice(product.base_price) }}</span>
                <span v-if="product.sale_price" class="text-caption text-neutral-400 line-through ml-2">
                  {{ formatPrice(product.base_price) }}
                </span>
              </div>
            </td>
            <td class="py-4 px-6">
              <span
                :class="getStatusClass(getVariantStatus(product))"
                class="px-2 py-1 text-caption rounded-sm"
              >
                {{ statusLabel(getVariantStatus(product)) }}
              </span>
            </td>
            <td class="py-4 px-6">
              <span v-if="product.is_active" class="text-green-600">●</span>
              <span v-else class="text-neutral-400">○</span>
            </td>
            <td class="py-4 px-6">
              <div class="flex gap-2">
                <NuxtLink 
                  :to="`/admin/products/${product.id}`"
                  class="text-body-sm text-neutral-600 hover:text-aura-black"
                >
                  {{ t('common.edit') }}
                </NuxtLink>
                <button
                  @click="deleteProduct(product.id)"
                  class="text-body-sm text-red-500 hover:text-red-700"
                >
                  {{ t('common.delete') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="products.length === 0" class="text-center py-16">
        <p class="text-neutral-500 mb-4">{{ t('admin.noProducts') }}</p>
        <NuxtLink to="/admin/products/new" class="btn-primary">{{ t('admin.addFirstProduct') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>
