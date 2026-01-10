<script setup lang="ts">
/**
 * Admin - Add New Product
 * AURA ARCHIVE - Form to create new product with variant and image upload
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
  images: [] as string[],
  // Variant fields
  size: 'M',
  color: 'Black',
  material: 'Cotton',
})

const isSubmitting = ref(false)
const isUploading = ref(false)
const error = ref('')
const success = ref('')

// File input ref
const fileInput = ref<HTMLInputElement | null>(null)

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

// Handle file selection
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (!files || files.length === 0) return
  if (form.images.length + files.length > 5) {
    error.value = 'Maximum 5 images allowed'
    return
  }

  isUploading.value = true
  error.value = ''

  try {
    const token = localStorage.getItem('token')
    const formData = new FormData()
    
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i])
    }

    const response = await $fetch<{
      success: boolean
      data: { urls: string[] }
    }>(`${config.public.apiUrl}/admin/upload/product-images`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    if (response.success) {
      form.images.push(...response.data.urls)
    }
  } catch (err: any) {
    error.value = err?.data?.message || 'Failed to upload images'
  } finally {
    isUploading.value = false
    // Reset file input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

// Remove image
const removeImage = (index: number) => {
  form.images.splice(index, 1)
}

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
          images: form.images,
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
        <!-- Product Images -->
        <div class="bg-white p-6 rounded-sm shadow-card">
          <h2 class="font-serif text-heading-4 text-aura-black mb-6">Product Images</h2>
          
          <!-- Image Preview Grid -->
          <div class="grid grid-cols-5 gap-4 mb-4">
            <div 
              v-for="(url, index) in form.images" 
              :key="index"
              class="relative aspect-square bg-neutral-100 rounded-sm overflow-hidden group"
            >
              <img :src="url" :alt="`Product image ${index + 1}`" class="w-full h-full object-cover" />
              <button
                type="button"
                @click="removeImage(index)"
                class="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                ×
              </button>
            </div>
            
            <!-- Upload Button -->
            <div 
              v-if="form.images.length < 5"
              class="aspect-square border-2 border-dashed border-neutral-300 rounded-sm flex flex-col items-center justify-center cursor-pointer hover:border-neutral-400 transition-colors"
              :class="{ 'opacity-50 cursor-not-allowed': isUploading }"
              @click="fileInput?.click()"
            >
              <svg v-if="!isUploading" class="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
              </svg>
              <svg v-else class="w-6 h-6 text-neutral-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span class="text-caption text-neutral-400 mt-1">{{ isUploading ? 'Uploading...' : 'Add' }}</span>
            </div>
          </div>
          
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            class="hidden"
            @change="handleFileSelect"
          />
          
          <p class="text-caption text-neutral-500">
            Upload up to 5 images. Accepted formats: JPEG, PNG, WebP. Max 5MB each.
          </p>
        </div>

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
            :disabled="isSubmitting || isUploading"
            class="btn-primary"
            :class="{ 'opacity-70': isSubmitting || isUploading }"
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
