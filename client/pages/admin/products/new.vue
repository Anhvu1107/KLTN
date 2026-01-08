<script setup lang="ts">
/**
 * Admin - Add New Product
 * AURA ARCHIVE - Form to create new product with variant
 */

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const config = useRuntimeConfig()
const router = useRouter()

// Form state
const form = reactive({
  name: '',
  brand: '',
  category: 'Tops',
  subcategory: 'Unisex',
  basePrice: 0,
  salePrice: null as number | null,
  conditionText: '9/10 - Like New',
  conditionDescription: '',
  description: '',
  // Variant fields
  size: 'M',
  color: 'Black',
  material: 'Cotton',
})

const isSubmitting = ref(false)
const error = ref('')
const success = ref('')

// Options
const brands = [
  'Rick Owens', 'Acronym', 'Comme des Garçons', 'Ralph Lauren', 'Prada',
  'Balenciaga', 'Maison Margiela', 'Yohji Yamamoto', 'Fear of God', 'Off-White'
]
const categories = ['Tops', 'Pants', 'Outerwear', 'Shoes', 'Bags', 'Accessories', 'Dresses']
const subcategories = ['Men', 'Women', 'Unisex']
const conditions = ['10/10 - New with tags', '9/10 - Like New', '8/10 - Excellent', '7/10 - Good', 'Vintage']
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']
const colors = ['Black', 'White', 'Grey', 'Navy', 'Olive', 'Burgundy', 'Cream', 'Brown', 'Multi']
const materials = ['Leather', 'Cotton', 'Wool', 'Nylon', 'Silk', 'Cashmere', 'Polyester', 'Linen', 'Mixed']

// Submit form
const handleSubmit = async () => {
  if (!form.name || !form.brand || !form.basePrice) {
    error.value = 'Please fill all required fields'
    return
  }

  isSubmitting.value = true
  error.value = ''

  try {
    const token = localStorage.getItem('token')
    
    await $fetch(`${config.public.apiUrl}/admin/products`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        product: {
          name: form.name,
          brand: form.brand,
          category: form.category,
          subcategory: form.subcategory,
          base_price: form.basePrice,
          sale_price: form.salePrice || null,
          condition_text: form.conditionText,
          condition_description: form.conditionDescription,
          description: form.description,
        },
        variant: {
          size: form.size,
          color: form.color,
          material: form.material,
        },
      },
    })

    success.value = 'Product created successfully!'
    
    setTimeout(() => {
      router.push('/admin/products')
    }, 1500)
  } catch (err: any) {
    error.value = err?.data?.message || 'Failed to create product'
  } finally {
    isSubmitting.value = false
  }
}

useSeoMeta({
  title: 'Add Product | AURA ARCHIVE Admin',
})
</script>

<template>
  <div class="p-8">
    <div class="max-w-3xl">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="font-serif text-heading-2 text-aura-black">Add New Product</h1>
          <p class="text-body text-neutral-600 mt-1">Create a new product listing with variant</p>
        </div>
        <NuxtLink to="/admin/products" class="text-body-sm text-neutral-600 hover:text-aura-black">
          ← Back to Products
        </NuxtLink>
      </div>

      <!-- Alerts -->
      <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm text-body-sm text-red-700">
        {{ error }}
      </div>
      <div v-if="success" class="mb-6 p-4 bg-green-50 border border-green-200 rounded-sm text-body-sm text-green-700">
        {{ success }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-8">
        <!-- Product Info -->
        <div class="bg-white p-6 rounded-sm shadow-card">
          <h2 class="font-serif text-heading-4 text-aura-black mb-6">Product Information</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="input-label">Product Name *</label>
              <input v-model="form.name" type="text" class="input-field" placeholder="e.g. Rick Owens Geobasket Sneakers" />
            </div>

            <div>
              <label class="input-label">Brand *</label>
              <select v-model="form.brand" class="input-field">
                <option value="">Select brand</option>
                <option v-for="brand in brands" :key="brand" :value="brand">{{ brand }}</option>
              </select>
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
                <option v-for="sub in subcategories" :key="sub" :value="sub">{{ sub }}</option>
              </select>
            </div>

            <div>
              <label class="input-label">Condition *</label>
              <select v-model="form.conditionText" class="input-field">
                <option v-for="cond in conditions" :key="cond" :value="cond">{{ cond }}</option>
              </select>
            </div>

            <div>
              <label class="input-label">Base Price ($) *</label>
              <input v-model.number="form.basePrice" type="number" min="0" class="input-field" placeholder="0" />
            </div>

            <div>
              <label class="input-label">Sale Price ($)</label>
              <input v-model.number="form.salePrice" type="number" min="0" class="input-field" placeholder="Optional" />
            </div>

            <div class="md:col-span-2">
              <label class="input-label">Description</label>
              <textarea v-model="form.description" rows="4" class="input-field" placeholder="Describe the product..."></textarea>
            </div>
          </div>
        </div>

        <!-- Variant Info -->
        <div class="bg-white p-6 rounded-sm shadow-card">
          <h2 class="font-serif text-heading-4 text-aura-black mb-6">Variant Details</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="input-label">Size *</label>
              <select v-model="form.size" class="input-field">
                <option v-for="size in sizes" :key="size" :value="size">{{ size }}</option>
              </select>
            </div>

            <div>
              <label class="input-label">Color *</label>
              <select v-model="form.color" class="input-field">
                <option v-for="color in colors" :key="color" :value="color">{{ color }}</option>
              </select>
            </div>

            <div>
              <label class="input-label">Material</label>
              <select v-model="form.material" class="input-field">
                <option v-for="mat in materials" :key="mat" :value="mat">{{ mat }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Submit -->
        <div class="flex gap-4">
          <button
            type="submit"
            :disabled="isSubmitting"
            class="btn-primary"
            :class="{ 'opacity-70': isSubmitting }"
          >
            {{ isSubmitting ? 'Creating...' : 'Create Product' }}
          </button>
          <NuxtLink to="/admin/products" class="btn-secondary">
            Cancel
          </NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>
