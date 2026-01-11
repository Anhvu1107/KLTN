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

// Variants data (array for multi-variant support)
interface VariantData {
  id: number | null
  size: string
  color: string
  material: string
  status: string
  isNew?: boolean
  isDeleted?: boolean
}

const variants = ref<VariantData[]>([])

// Images
const productImages = ref<string[]>([])

// Helper functions for variants
const createEmptyVariant = (): VariantData => ({
  id: null,
  size: '',
  color: '',
  material: '',
  status: 'AVAILABLE',
  isNew: true,
})

const addVariant = () => {
  variants.value.push(createEmptyVariant())
}

const removeVariant = (index: number) => {
  const variant = variants.value[index]
  if (variant.id) {
    // Mark existing variant for deletion
    variant.isDeleted = true
  } else {
    // Remove new unsaved variant immediately
    variants.value.splice(index, 1)
  }
}

const activeVariants = computed(() => 
  variants.value.filter(v => !v.isDeleted)
)

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

      // Populate variants (all variants)
      if (product.variants && product.variants.length > 0) {
        variants.value = product.variants.map((v: any) => ({
          id: v.id,
          size: v.size || '',
          color: v.color || '',
          material: v.material || '',
          status: v.status,
          isNew: false,
          isDeleted: false,
        }))
      } else {
        // Add empty variant if none exists
        variants.value = [createEmptyVariant()]
      }

      // Populate images
      productImages.value = product.images || []
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
        images: productImages.value,
      },
    })

    // Handle variants
    for (const v of variants.value) {
      if (v.isDeleted && v.id) {
        // Delete existing variant
        await $fetch(`${config.public.apiUrl}/admin/variants/${v.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      } else if (v.isNew && !v.isDeleted) {
        // Create new variant
        await $fetch(`${config.public.apiUrl}/admin/products/${productId}/variants`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: { size: v.size, color: v.color, material: v.material, status: v.status },
        })
      } else if (v.id && !v.isDeleted) {
        // Update existing variant
        await $fetch(`${config.public.apiUrl}/admin/variants/${v.id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: { size: v.size, color: v.color, material: v.material, status: v.status },
        })
      }
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
          ← {{ $t('common.backTo') }} {{ $t('admin.products') }}
        </NuxtLink>
        <h1 class="font-serif text-heading-2 text-aura-black">{{ $t('admin.editProduct') }}</h1>
      </div>
      <button
        @click="deleteProduct"
        :disabled="isDeleting"
        class="btn-ghost text-red-600 hover:bg-red-50"
      >
        {{ isDeleting ? $t('common.deleting') : $t('admin.deleteProduct') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-16">
      <p class="text-neutral-500">{{ $t('common.loading') }}</p>
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

      <!-- Product Images -->
      <div class="bg-white p-6 rounded-sm shadow-card">
        <h2 class="font-serif text-heading-4 text-aura-black mb-6">{{ $t('admin.productImages') }}</h2>
        <AdminImageUpload v-model="productImages" :max-files="5" />
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

      <!-- Variants / Inventory -->
      <div class="bg-white p-6 rounded-sm shadow-card">
        <div class="flex items-center justify-between mb-6">
          <h2 class="font-serif text-heading-4 text-aura-black">{{ $t('admin.variants') || 'Variants' }}</h2>
          <button
            type="button"
            @click="addVariant"
            class="btn-secondary text-sm flex items-center gap-1"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            {{ $t('admin.addVariant') || 'Add Variant' }}
          </button>
        </div>

        <!-- Variants List -->
        <div class="space-y-6">
          <div
            v-for="(v, index) in activeVariants"
            :key="v.id || `new-${index}`"
            class="border border-neutral-200 rounded-sm p-4"
          >
            <div class="flex items-center justify-between mb-4">
              <span class="text-body-sm font-medium text-neutral-600">
                {{ v.isNew ? $t('admin.newVariant') || 'New Variant' : `Variant #${v.id}` }}
              </span>
              <button
                v-if="activeVariants.length > 1"
                type="button"
                @click="removeVariant(variants.indexOf(v))"
                class="text-red-500 hover:text-red-700 text-sm"
              >
                {{ $t('common.remove') || 'Remove' }}
              </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label class="input-label text-sm">Size</label>
                <input
                  v-model="v.size"
                  type="text"
                  class="input-field"
                  placeholder="e.g. M, 38, OS"
                />
              </div>
              
              <div>
                <label class="input-label text-sm">Color</label>
                <input
                  v-model="v.color"
                  type="text"
                  class="input-field"
                  placeholder="e.g. Black"
                />
              </div>

              <div>
                <label class="input-label text-sm">Material</label>
                <input
                  v-model="v.material"
                  type="text"
                  class="input-field"
                  placeholder="e.g. Leather"
                />
              </div>

              <div>
                <label class="input-label text-sm">Status *</label>
                <select v-model="v.status" class="input-field">
                  <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Product Active Toggle -->
        <div class="mt-6 pt-4 border-t border-neutral-100">
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

      <!-- Actions -->
      <div class="flex gap-4">
        <button
          type="submit"
          :disabled="isSaving"
          class="btn-primary"
        >
          {{ isSaving ? $t('common.saving') : $t('admin.saveChanges') }}
        </button>
        <NuxtLink to="/admin/products" class="btn-secondary">
          {{ $t('common.cancel') }}
        </NuxtLink>
      </div>
    </form>
  </div>
</template>
