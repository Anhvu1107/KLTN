<script setup lang="ts">
/**
 * Admin Edit Product Page
 * AURA ARCHIVE - Edit existing product
 */

import { useI18n } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()

const productId = route.params.id
const isLoading = ref(true)
const isSaving = ref(false)
const isDeleting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Form data
const form = reactive({
  name: '',
  brand: '',
  description: '',
  category: 'Bags',
  subcategory: 'Unisex',
  base_price: 0,
  sale_price: null as number | null,
  condition_text: 'Excellent',
  condition_description: '',
  is_active: true,
})

// Variant data
const variant = reactive({
  id: null as number | null,
  size: '',
  color: '',
  material: '',
  status: 'AVAILABLE',
})

// Categories
const categories = ['Bags', 'Clothing', 'Shoes', 'Accessories', 'Jewelry', 'Watches']
const conditions = ['New with Tags', 'Excellent', 'Very Good', 'Good']
const statuses = ['AVAILABLE', 'RESERVED', 'SOLD']

// Get token
const getToken = () => {
  if (process.client) {
    return localStorage.getItem('token')
  }
  return null
}

// Fetch product data
const fetchProduct = async () => {
  try {
    isLoading.value = true
    const token = getToken()
    
    const response = await $fetch<{ success: boolean; data: { product: any } }>(
      `${config.public.apiUrl}/admin/products/${productId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (response.success) {
      const product = response.data.product
      
      // Populate form
      form.name = product.name
      form.brand = product.brand
      form.description = product.description || ''
      form.category = product.category
      form.subcategory = product.subcategory || 'Unisex'
      form.base_price = product.base_price
      form.sale_price = product.sale_price
      form.condition_text = product.condition_text
      form.condition_description = product.condition_description || ''
      form.is_active = product.is_active

      // Populate variant (first variant)
      if (product.variants && product.variants.length > 0) {
        const v = product.variants[0]
        variant.id = v.id
        variant.size = v.size || ''
        variant.color = v.color || ''
        variant.material = v.material || ''
        variant.status = v.status
      }
    }
  } catch (error: any) {
    errorMessage.value = error.data?.message || 'Failed to fetch product'
  } finally {
    isLoading.value = false
  }
}

// Save product
const saveProduct = async () => {
  try {
    isSaving.value = true
    errorMessage.value = ''
    successMessage.value = ''
    
    const token = getToken()

    // Update product
    await $fetch(`${config.public.apiUrl}/admin/products/${productId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        name: form.name,
        brand: form.brand,
        description: form.description,
        category: form.category,
        subcategory: form.subcategory,
        base_price: form.base_price,
        sale_price: form.sale_price || null,
        condition_text: form.condition_text,
        condition_description: form.condition_description,
        is_active: form.is_active,
      },
    })

    // Update variant status if changed
    if (variant.id) {
      await $fetch(`${config.public.apiUrl}/admin/products/${productId}/variants/${variant.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: { status: variant.status },
      })
    }

    successMessage.value = 'Product updated successfully!'
    
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error: any) {
    errorMessage.value = error.data?.message || 'Failed to update product'
  } finally {
    isSaving.value = false
  }
}

// Delete product
const deleteProduct = async () => {
  if (!confirm('Are you sure you want to delete this product?')) return

  try {
    isDeleting.value = true
    const token = getToken()

    await $fetch(`${config.public.apiUrl}/admin/products/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    router.push('/admin/products')
  } catch (error: any) {
    errorMessage.value = error.data?.message || 'Failed to delete product'
  } finally {
    isDeleting.value = false
  }
}

// Format price for display
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

onMounted(() => {
  fetchProduct()
})

useSeoMeta({
  title: 'Edit Product | AURA ARCHIVE Admin',
})
</script>

<template>
  <div class="p-8 max-w-4xl">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <NuxtLink to="/admin/products" class="text-caption text-neutral-500 hover:text-aura-black mb-2 block">
          ← Back to Products
        </NuxtLink>
        <h1 class="font-serif text-heading-2 text-aura-black">Edit Product</h1>
      </div>
      <button
        @click="deleteProduct"
        :disabled="isDeleting"
        class="btn-ghost text-red-600 hover:bg-red-50"
      >
        {{ isDeleting ? 'Deleting...' : 'Delete Product' }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-16">
      <p class="text-neutral-500">Loading product...</p>
    </div>

    <!-- Form -->
    <form v-else @submit.prevent="saveProduct" class="space-y-8">
      <!-- Messages -->
      <div v-if="successMessage" class="p-4 bg-green-50 text-green-800 rounded-sm">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="p-4 bg-red-50 text-red-800 rounded-sm">
        {{ errorMessage }}
      </div>

      <!-- Basic Info -->
      <div class="bg-white p-6 rounded-sm shadow-card">
        <h2 class="font-serif text-heading-4 text-aura-black mb-6">Basic Information</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="input-label">Product Name *</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="input-field"
              placeholder="e.g. Classic Flap Bag"
            />
          </div>
          
          <div>
            <label class="input-label">Brand *</label>
            <input
              v-model="form.brand"
              type="text"
              required
              class="input-field"
              placeholder="e.g. Chanel"
            />
          </div>

          <div>
            <label class="input-label">Category *</label>
            <select v-model="form.category" class="input-field">
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>

          <div>
            <label class="input-label">Subcategory</label>
            <select v-model="form.subcategory" class="input-field">
              <option value="Women">Women</option>
              <option value="Men">Men</option>
              <option value="Unisex">Unisex</option>
            </select>
          </div>

          <div class="md:col-span-2">
            <label class="input-label">Description</label>
            <textarea
              v-model="form.description"
              rows="4"
              class="input-field"
              placeholder="Product description..."
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Pricing -->
      <div class="bg-white p-6 rounded-sm shadow-card">
        <h2 class="font-serif text-heading-4 text-aura-black mb-6">Pricing</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="input-label">Base Price (USD) *</label>
            <input
              v-model.number="form.base_price"
              type="number"
              min="0"
              step="0.01"
              required
              class="input-field"
            />
          </div>
          
          <div>
            <label class="input-label">Sale Price (USD)</label>
            <input
              v-model.number="form.sale_price"
              type="number"
              min="0"
              step="0.01"
              class="input-field"
              placeholder="Leave empty if no sale"
            />
          </div>
        </div>
      </div>

      <!-- Condition -->
      <div class="bg-white p-6 rounded-sm shadow-card">
        <h2 class="font-serif text-heading-4 text-aura-black mb-6">Condition</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="input-label">Condition *</label>
            <select v-model="form.condition_text" class="input-field">
              <option v-for="cond in conditions" :key="cond" :value="cond">{{ cond }}</option>
            </select>
          </div>
          
          <div>
            <label class="input-label">Condition Details</label>
            <input
              v-model="form.condition_description"
              type="text"
              class="input-field"
              placeholder="e.g. Minor scratches on hardware"
            />
          </div>
        </div>
      </div>

      <!-- Variant / Inventory -->
      <div class="bg-white p-6 rounded-sm shadow-card">
        <h2 class="font-serif text-heading-4 text-aura-black mb-6">Inventory & Status</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label class="input-label">Size</label>
            <input
              v-model="variant.size"
              type="text"
              class="input-field"
              placeholder="e.g. Medium, 38, One Size"
            />
          </div>
          
          <div>
            <label class="input-label">Color</label>
            <input
              v-model="variant.color"
              type="text"
              class="input-field"
              placeholder="e.g. Black, Beige"
            />
          </div>

          <div>
            <label class="input-label">Material</label>
            <input
              v-model="variant.material"
              type="text"
              class="input-field"
              placeholder="e.g. Leather, Canvas"
            />
          </div>

          <div>
            <label class="input-label">Status *</label>
            <select v-model="variant.status" class="input-field">
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <div>
            <label class="input-label">Active</label>
            <div class="mt-2">
              <label class="flex items-center gap-2">
                <input
                  v-model="form.is_active"
                  type="checkbox"
                  class="w-4 h-4"
                />
                <span class="text-body-sm">Product is active and visible</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-4">
        <button
          type="submit"
          :disabled="isSaving"
          class="btn-primary"
        >
          {{ isSaving ? 'Saving...' : 'Save Changes' }}
        </button>
        <NuxtLink to="/admin/products" class="btn-secondary">
          Cancel
        </NuxtLink>
      </div>
    </form>
  </div>
</template>
