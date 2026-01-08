<script setup lang="ts">
/**
 * Admin Products List
 * AURA ARCHIVE - Products management table
 */

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const config = useRuntimeConfig()
const token = localStorage.getItem('token')

// Fetch products
const { data, pending, refresh } = await useFetch<{
  success: boolean
  data: { products: any[]; pagination: any }
}>(`${config.public.apiUrl}/admin/products`, {
  headers: { Authorization: `Bearer ${token}` },
})

const products = computed(() => data.value?.data?.products || [])
const pagination = computed(() => data.value?.data?.pagination || {})

// Format helpers
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

const getStatusClass = (status: string) => {
  return status === 'AVAILABLE' 
    ? 'bg-green-100 text-green-800' 
    : 'bg-neutral-200 text-neutral-600'
}

useSeoMeta({
  title: 'Products | AURA ARCHIVE Admin',
})
</script>

<template>
  <div class="p-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="font-serif text-heading-2 text-aura-black">Products</h1>
        <p class="text-body text-neutral-600">{{ pagination.total || 0 }} total products</p>
      </div>
      <NuxtLink to="/admin/products/new" class="btn-primary">
        + Add Product
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="text-center py-16">
      <p class="text-neutral-500">Loading products...</p>
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-sm shadow-card overflow-hidden">
      <table class="w-full">
        <thead class="bg-neutral-50">
          <tr>
            <th class="text-left py-4 px-6 text-caption font-medium text-neutral-500 uppercase">Product</th>
            <th class="text-left py-4 px-6 text-caption font-medium text-neutral-500 uppercase">Category</th>
            <th class="text-left py-4 px-6 text-caption font-medium text-neutral-500 uppercase">Price</th>
            <th class="text-left py-4 px-6 text-caption font-medium text-neutral-500 uppercase">Status</th>
            <th class="text-left py-4 px-6 text-caption font-medium text-neutral-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.id" class="border-t border-neutral-100">
            <td class="py-4 px-6">
              <div>
                <p class="text-caption text-neutral-500">{{ product.brand }}</p>
                <p class="text-body-sm font-medium text-aura-black">{{ product.name }}</p>
              </div>
            </td>
            <td class="py-4 px-6 text-body-sm text-neutral-600">{{ product.category }}</td>
            <td class="py-4 px-6">
              <span v-if="product.sale_price" class="text-body-sm text-accent-burgundy">
                {{ formatPrice(product.sale_price) }}
              </span>
              <span v-else class="text-body-sm">{{ formatPrice(product.base_price) }}</span>
            </td>
            <td class="py-4 px-6">
              <span
                v-for="variant in product.variants"
                :key="variant.id"
                :class="getStatusClass(variant.status)"
                class="px-2 py-1 text-caption rounded-sm"
              >
                {{ variant.status }}
              </span>
            </td>
            <td class="py-4 px-6">
              <NuxtLink 
                :to="`/admin/products/${product.id}`"
                class="text-body-sm text-neutral-600 hover:text-aura-black"
              >
                Edit
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="products.length === 0" class="text-center py-16">
        <p class="text-neutral-500 mb-4">No products yet</p>
        <NuxtLink to="/admin/products/new" class="btn-primary">Add First Product</NuxtLink>
      </div>
    </div>
  </div>
</template>
