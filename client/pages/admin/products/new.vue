<script setup lang="ts">
/**
 * Admin - Add New Product
 * AURA ARCHIVE - Form to create new product with variant and image upload
 */

import { useProductSizeLabel } from '~/composables/useProductSizeLabel'
import { DEFAULT_SIZE_GROUPS, getSizesForCategory, normalizeSizeGroups, type SizeGroups } from '~/utils/productSizeGroups'

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { t } = useI18n()
const config = useRuntimeConfig()
const router = useRouter()
const { getToken } = useAuthToken()
const sizeGroups = ref<SizeGroups>(normalizeSizeGroups(DEFAULT_SIZE_GROUPS))
const { formatSizeLabel } = useProductSizeLabel()

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
  is_new_arrival: false,
  // Variant fields
  size: 'M',
  color: 'Black',
  material: 'Cotton',
  quantity: 1,
})

const isSubmitting = ref(false)
const isUploading = ref(false)
const error = ref('')
const success = ref('')

// File input ref
const fileInput = ref<HTMLInputElement | null>(null)

const otherLabel = computed(() => t('common.other', 'Other'))

const fetchProductAttributes = async () => {
  try {
    const response = await $fetch<{
      success: boolean
      data: {
        attributes?: {
          size_groups?: SizeGroups
          categories?: Array<{ value: string }>
        }
      }
    }>(`${config.public.apiUrl}/settings/product-attributes`)

    if (response.success) {
      sizeGroups.value = normalizeSizeGroups(
        response.data.attributes?.size_groups,
        response.data.attributes?.categories || []
      )
    }
  } catch {
    sizeGroups.value = normalizeSizeGroups(DEFAULT_SIZE_GROUPS)
  }
}

const brands = computed(() => [
  { value: 'Rick Owens', label: 'Rick Owens' },
  { value: 'Acronym', label: 'Acronym' },
  { value: 'Comme des Garcons', label: t('brands.cdg', 'Comme des Gar\u00e7ons') },
  { value: 'Ralph Lauren', label: 'Ralph Lauren' },
  { value: 'Prada', label: 'Prada' },
  { value: 'Balenciaga', label: 'Balenciaga' },
  { value: 'Maison Margiela', label: 'Maison Margiela' },
  { value: 'Yohji Yamamoto', label: 'Yohji Yamamoto' },
  { value: 'Fear of God', label: 'Fear of God' },
  { value: 'Off-White', label: 'Off-White' },
  { value: 'Gucci', label: 'Gucci' },
  { value: 'Louis Vuitton', label: 'Louis Vuitton' },
  { value: 'Chanel', label: 'Chanel' },
  { value: 'Hermes', label: t('brands.hermes', 'Herm\u00e8s') },
  { value: 'Dior', label: 'Dior' },
  { value: 'Other', label: otherLabel.value },
])

const categories = computed(() => [
  { value: 'Tops', label: t('categories.tops') },
  { value: 'Pants', label: t('categories.pants') },
  { value: 'Outerwear', label: t('categories.outerwear') },
  { value: 'Shoes', label: t('categories.shoes') },
  { value: 'Bags', label: t('categories.bags') },
  { value: 'Accessories', label: t('categories.accessories') },
  { value: 'Dresses', label: t('categories.dresses') },
  { value: 'Jewelry', label: t('categories.jewelry', 'Trang sức') },
  { value: 'Watches', label: t('categories.watches', 'Đồng hồ') },
  { value: 'Other', label: otherLabel.value },
])

const colors = computed(() => [
  { value: 'Black', label: t('colors.black') },
  { value: 'White', label: t('colors.white') },
  { value: 'Grey', label: t('colors.grey') },
  { value: 'Navy', label: t('colors.navy') },
  { value: 'Olive', label: t('colors.olive') },
  { value: 'Burgundy', label: t('colors.burgundy') },
  { value: 'Cream', label: t('colors.cream') },
  { value: 'Brown', label: t('colors.brown') },
  { value: 'Multi', label: t('colors.multi') },
  { value: 'Gold', label: t('colors.gold', 'Gold') },
  { value: 'Silver', label: t('colors.silver', 'Silver') },
  { value: 'Other', label: otherLabel.value },
])

const materials = computed(() => [
  { value: 'Leather', label: t('materials.leather') },
  { value: 'Cotton', label: t('materials.cotton') },
  { value: 'Wool', label: t('materials.wool') },
  { value: 'Nylon', label: t('materials.nylon') },
  { value: 'Silk', label: t('materials.silk') },
  { value: 'Cashmere', label: t('materials.cashmere') },
  { value: 'Polyester', label: t('materials.polyester') },
  { value: 'Linen', label: t('materials.linen') },
  { value: 'Mixed', label: t('materials.mixed') },
  { value: 'Canvas', label: t('materials.canvas', 'Canvas') },
  { value: 'Metal', label: t('materials.metal', 'Metal') },
  { value: 'Other', label: otherLabel.value },
])

const subcategories = computed(() => [
  { value: 'Men', label: t('home.men') },
  { value: 'Women', label: t('home.women') },
  { value: 'Unisex', label: t('categories.unisex') },
  { value: 'Other', label: otherLabel.value },
])

const conditions = computed(() => [
  { value: '10/10 - New with tags', label: t('conditions.newWithTags') },
  { value: '9/10 - Like New', label: t('conditions.likeNew') },
  { value: '8/10 - Excellent', label: t('conditions.excellent') },
  { value: '7/10 - Good', label: t('conditions.good') },
  { value: 'Vintage', label: t('conditions.vintage') },
  { value: 'Other', label: otherLabel.value },
])

// Custom input for "Other" option
const customBrand = ref('')
const customCategory = ref('')
const customSubcategory = ref('')
const customCondition = ref('')
const customSize = ref('')
const customColor = ref('')
const customMaterial = ref('')

const getActiveCategory = () => (form.category === 'Other' ? customCategory.value.trim() : form.category)

const sizes = computed(() => {
  const categorySizes = getSizesForCategory(sizeGroups.value, getActiveCategory())

  return [
    ...categorySizes.map((size) => ({ value: size, label: formatSizeLabel(size) })),
    { value: 'Other', label: otherLabel.value },
  ]
})

// Watch for "Other" selection - reset custom value when not Other
watch(() => form.brand, (newVal) => {
  if (newVal !== 'Other') customBrand.value = ''
})
watch(() => form.category, (newVal) => {
  if (newVal !== 'Other') customCategory.value = ''
})
watch(() => form.subcategory, (newVal) => {
  if (newVal !== 'Other') customSubcategory.value = ''
})
watch(() => form.conditionText, (newVal) => {
  if (newVal !== 'Other') customCondition.value = ''
})
watch(() => form.size, (newVal) => {
  if (newVal !== 'Other') customSize.value = ''
})
watch(() => form.color, (newVal) => {
  if (newVal !== 'Other') customColor.value = ''
})
watch(() => form.material, (newVal) => {
  if (newVal !== 'Other') customMaterial.value = ''
})
watch(
  [() => form.category, customCategory, sizeGroups],
  () => {
    const availableSizes = getSizesForCategory(sizeGroups.value, getActiveCategory())

    if (form.size !== 'Other' && !availableSizes.includes(form.size)) {
      form.size = availableSizes[0] || 'Other'
    }
  },
  { deep: true }
)

// Handle file selection
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (!files || files.length === 0) return
  if (form.images.length + files.length > 5) {
    error.value = t('admin.productForm.maxImages', 'Maximum 5 images allowed')
    return
  }

  isUploading.value = true
  error.value = ''

  try {
    const formData = new FormData()
    
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i])
    }

    const response = await $fetch<{
      success: boolean
      data: { urls: string[] }
    }>(`${config.public.apiUrl}/admin/upload/product-images`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    })

    if (response.success) {
      form.images.push(...response.data.urls)
    }
  } catch (err: any) {
    error.value = err?.data?.message || t('notifications.uploadFailed', 'Failed to upload images')
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
  // Get actual brand/category values (use custom if 'Other' was selected)
  const actualBrand = form.brand === 'Other' ? customBrand.value : form.brand
  const actualCategory = form.category === 'Other' ? customCategory.value : form.category
  const actualSubcategory = form.subcategory === 'Other' ? customSubcategory.value : form.subcategory
  const actualCondition = form.conditionText === 'Other' ? customCondition.value : form.conditionText

  if (!form.name || !actualBrand || !form.basePrice) {
    error.value = t('common.errorFillRequired', 'Please fill all required fields')
    return
  }

  // Get actual variant values (use custom if 'Other' was selected)
  const actualSize = form.size === 'Other' ? customSize.value : form.size
  const actualColor = form.color === 'Other' ? customColor.value : form.color
  const actualMaterial = form.material === 'Other' ? customMaterial.value : form.material

  isSubmitting.value = true
  error.value = ''

  try {
    const response = await $fetch<{ success: boolean; data: { product: any } }>(`${config.public.apiUrl}/admin/products`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: {
        product: {
          name: form.name,
          brand: actualBrand,
          category: actualCategory,
          subcategory: actualSubcategory,
          base_price: form.basePrice,
          sale_price: form.salePrice || null,
          condition_text: actualCondition,
          condition_description: form.conditionDescription,
          description: form.description,
          images: form.images,
          is_new_arrival: form.is_new_arrival,
        },
        variant: {
          size: actualSize,
          color: actualColor,
          material: actualMaterial,
        },
      },
    })

    if (response.success && form.quantity > 1) {
      const productId = response.data.product.id;
      for (let i = 1; i < form.quantity; i++) {
        await $fetch(`${config.public.apiUrl}/admin/products/${productId}/variants`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: {
            size: actualSize,
            color: actualColor,
            material: actualMaterial,
          },
        });
      }
    }

    success.value = t('common.createSuccess', 'Product created successfully!')
    
    setTimeout(() => {
      router.push('/admin/products')
    }, 1500)
  } catch (err: any) {
    error.value = err?.data?.message || t('notifications.updateError', 'Failed to create product')
  } finally {
    isSubmitting.value = false
  }
}

useSeoMeta({
  title: 'Add Product | AURA ARCHIVE Admin',
})

onMounted(() => {
  fetchProductAttributes()
})
</script>

<template>
  <div class="p-8">
    <div class="max-w-3xl">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="font-serif text-heading-2 text-aura-black">{{ t('admin.productForm.addNew') }}</h1>
          <p class="text-body text-neutral-600 mt-1">{{ t('admin.productForm.createDescription') }}</p>
        </div>
        <NuxtLink to="/admin/products" class="text-body-sm text-neutral-600 hover:text-aura-black">
          ← {{ t('admin.productForm.backToProducts') }}
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
          <h2 class="font-serif text-heading-4 text-aura-black mb-6">{{ t('admin.productForm.productImages') }}</h2>
          
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
                &#215;
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
              <span class="text-caption text-neutral-400 mt-1">{{ isUploading ? t('common.uploading') : t('common.add') }}</span>
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
            {{ t('admin.productForm.imageUploadHint') }}
          </p>
        </div>

        <!-- Product Info -->
        <div class="bg-white p-6 rounded-sm shadow-card">
          <h2 class="font-serif text-heading-4 text-aura-black mb-6">{{ t('admin.productForm.productInfo') }}</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="input-label">{{ t('admin.productForm.productName') }} *</label>
              <input v-model="form.name" type="text" class="input-field" :placeholder="t('admin.productForm.productNamePlaceholder')" />
            </div>

            <div>
              <label class="input-label">{{ t('admin.productForm.brand') }} *</label>
              <select v-model="form.brand" class="input-field select-animated">
                <option value="">{{ t('admin.productForm.selectBrand') }}</option>
                <option v-for="b in brands" :key="b.value" :value="b.value">{{ b.label }}</option>
              </select>
              <input 
                v-if="form.brand === 'Other'" 
                v-model="customBrand" 
                type="text" 
                class="input-field mt-2" 
                :placeholder="t('admin.productForm.enterNew', 'Nhập giá trị mới...')"
              />
            </div>

            <div>
              <label class="input-label">{{ t('shop.category') }} *</label>
              <select v-model="form.category" class="input-field select-animated">
                <option v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
              </select>
              <input 
                v-if="form.category === 'Other'" 
                v-model="customCategory" 
                type="text" 
                class="input-field mt-2" 
                :placeholder="t('admin.productForm.enterNew', 'Nhập giá trị mới...')"
              />
            </div>

            <div>
              <label class="input-label">{{ t('admin.productForm.subcategory') }}</label>
              <select v-model="form.subcategory" class="input-field select-animated">
                <option v-for="sub in subcategories" :key="sub.value" :value="sub.value">{{ sub.label }}</option>
              </select>
              <input 
                v-if="form.subcategory === 'Other'" 
                v-model="customSubcategory" 
                type="text" 
                class="input-field mt-2" 
                :placeholder="t('admin.productForm.enterNew', 'Nhập giá trị mới...')"
              />
            </div>

            <div>
              <label class="input-label">{{ t('admin.productForm.condition') }} *</label>
              <select v-model="form.conditionText" class="input-field select-animated">
                <option v-for="cond in conditions" :key="cond.value" :value="cond.value">{{ cond.label }}</option>
              </select>
              <input 
                v-if="form.conditionText === 'Other'" 
                v-model="customCondition" 
                type="text" 
                class="input-field mt-2" 
                :placeholder="t('admin.productForm.enterNew', 'Nhập giá trị mới...')"
              />
            </div>

            <div>
              <label class="input-label">{{ t('admin.productForm.basePrice') }} *</label>
              <input v-model.number="form.basePrice" type="number" min="0" class="input-field" placeholder="0" />
            </div>

            <div>
              <label class="input-label">{{ t('admin.productForm.salePrice') }}</label>
              <input v-model.number="form.salePrice" type="number" min="0" class="input-field" :placeholder="t('admin.productForm.optional')" />
            </div>

            <div class="md:col-span-2">
              <label class="input-label">{{ t('admin.productForm.description') }}</label>
              <textarea v-model="form.description" rows="4" class="input-field" :placeholder="t('admin.productForm.descriptionPlaceholder')"></textarea>
            </div>
          </div>
        </div>

        <!-- Variant Info -->
        <div class="bg-white p-6 rounded-sm shadow-card">
          <h2 class="font-serif text-heading-4 text-aura-black mb-6">{{ t('admin.productForm.variantDetails') }}</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="input-label">{{ t('admin.productForm.size') }} *</label>
              <select v-model="form.size" class="input-field select-animated">
                <option v-for="s in sizes" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
              <input 
                v-if="form.size === 'Other'" 
                v-model="customSize" 
                type="text" 
                class="input-field mt-2" 
                :placeholder="t('admin.productForm.enterNew', 'Nhập giá trị mới...')"
              />
            </div>

            <div>
              <label class="input-label">{{ t('admin.productForm.color') }} *</label>
              <select v-model="form.color" class="input-field select-animated">
                <option v-for="color in colors" :key="color.value" :value="color.value">{{ color.label }}</option>
              </select>
              <input 
                v-if="form.color === 'Other'" 
                v-model="customColor" 
                type="text" 
                class="input-field mt-2" 
                :placeholder="t('admin.productForm.enterNew', 'Nhập giá trị mới...')"
              />
            </div>

            <div>
              <label class="input-label">{{ t('admin.productForm.material') }}</label>
              <select v-model="form.material" class="input-field select-animated">
                <option v-for="mat in materials" :key="mat.value" :value="mat.value">{{ mat.label }}</option>
              </select>
              <input 
                v-if="form.material === 'Other'" 
                v-model="customMaterial" 
                type="text" 
                class="input-field mt-2" 
                :placeholder="t('admin.productForm.enterNew', 'Nhập giá trị mới...')"
              />
            </div>

            <div class="md:col-span-3 border-t border-neutral-100 pt-4 mt-2">
              <label class="input-label">{{ t('admin.quantity', 'Số lượng') }}</label>
              <div class="flex items-center gap-2">
                <input v-model.number="form.quantity" type="number" min="1" class="input-field max-w-[150px]" />
                <span class="text-caption text-neutral-500">{{ t('admin.productForm.skuNote', 'Sẽ tạo ra bấy nhiêu mã SKU độc lập') }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Product Options -->
        <div class="bg-white p-6 rounded-sm shadow-card">
          <label class="flex items-center gap-2">
            <input
              v-model="form.is_new_arrival"
              type="checkbox"
              class="w-4 h-4"
            />
            <span class="text-body-sm">{{ t('admin.productNewArrival') }}</span>
          </label>
        </div>

        <!-- Submit -->
        <div class="flex gap-4">
          <button
            type="submit"
            :disabled="isSubmitting || isUploading"
            class="btn-primary"
            :class="{ 'opacity-70': isSubmitting || isUploading }"
          >
            {{ isSubmitting ? t('common.creating') : t('admin.productForm.createProduct') }}
          </button>
          <NuxtLink to="/admin/products" class="btn-secondary">
            {{ t('common.cancel') }}
          </NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Enhanced select dropdown animation */
.select-animated {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23374151'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1.25rem;
  padding-right: 2.5rem;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}

.select-animated:hover {
  border-color: #1a1a1a;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.select-animated:focus {
  border-color: #1a1a1a;
  box-shadow: 0 0 0 3px rgba(26, 26, 26, 0.1);
  outline: none;
}

/* Smooth input animation for "Other" custom inputs */
.input-field {
  transition: all 0.2s ease-in-out;
}

.input-field:focus {
  border-color: #1a1a1a;
  box-shadow: 0 0 0 3px rgba(26, 26, 26, 0.1);
}

/* Animation for appearing custom input */
.mt-2 {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Hover effect on option (works in some browsers) */
.select-animated option:hover {
  background-color: #f5f5f5;
}
</style>
