<script setup lang="ts">
/**
 * Admin Edit Product Page
 * AURA ARCHIVE - Edit existing product
 */

import { useDialog } from '~/composables/useDialog'
import { useProductSizeLabel } from '~/composables/useProductSizeLabel'
import { DEFAULT_SIZE_GROUPS, getSizesForCategory, normalizeSizeGroups, type SizeGroups } from '~/utils/productSizeGroups'

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const { confirm: showConfirm } = useDialog()
const sizeGroups = ref<SizeGroups>(normalizeSizeGroups(DEFAULT_SIZE_GROUPS))
const { formatSizeLabel } = useProductSizeLabel()

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
  is_new_arrival: false,
})

// Variants data (array for multi-variant support)
interface VariantData {
  id: number | null
  size: string
  customSize?: string
  color: string
  customColor?: string
  material: string
  customMaterial?: string
  status: string
  isNew?: boolean
  isDeleted?: boolean
  quantity?: number // For bulk-adding new variants
}

const variants = ref<VariantData[]>([])

// Images
const productImages = ref<string[]>([])
const imageFileInput = ref<HTMLInputElement | null>(null)
const isImageDragging = ref(false)
const isImageUploading = ref(false)
const imageError = ref('')

const getToken = () => {
  if (import.meta.client) {
    return localStorage.getItem('token') || ''
  }
  return ''
}

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

const uploadImages = async (files: FileList) => {
  if (!files || files.length === 0) return
  if ((productImages.value?.length || 0) + files.length > 5) {
    imageError.value = t('admin.productForm.maxImages', 'T\u1ed1i \u0111a 5 \u1ea3nh')
    return
  }

  isImageUploading.value = true
  imageError.value = ''

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
      productImages.value.push(...response.data.urls)
    }
  } catch (err: any) {
    imageError.value = err?.data?.message || t('notifications.uploadFailed', 'Upload th\u1ea5t b\u1ea1i')
  } finally {
    isImageUploading.value = false
    if (imageFileInput.value) imageFileInput.value.value = ''
  }
}

const handleImageFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) uploadImages(target.files)
}

const handleImageDrop = (event: DragEvent) => {
  isImageDragging.value = false
  if (event.dataTransfer?.files) uploadImages(event.dataTransfer.files)
}

const removeProductImage = (index: number) => {
  productImages.value.splice(index, 1)
}

// Helper functions for variants
const createEmptyVariant = (): VariantData => ({
  id: null,
  size: getSizesForCategory(sizeGroups.value, getActiveCategory())[0] || 'Other',
  customSize: '',
  color: 'Black',
  customColor: '',
  material: 'Cotton',
  customMaterial: '',
  status: 'AVAILABLE',
  isNew: true,
  quantity: 1,
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

const duplicateVariant = (index: number) => {
  const source = variants.value[index]
  if (!source) return
  
  variants.value.push({
    ...createEmptyVariant(),
    size: source.size,
    customSize: source.customSize,
    color: source.color,
    customColor: source.customColor,
    material: source.material,
    customMaterial: source.customMaterial,
    status: 'AVAILABLE',
    quantity: 1, // Ready to bulk create if they change this to N
  })
}

// "Other" label (translated)
const otherLabel = computed(() => t('common.other', 'Other'))

// Categories (translated) — same as new.vue
const categories = computed(() => [
  { value: 'Tops', label: t('categories.tops') },
  { value: 'Pants', label: t('categories.pants') },
  { value: 'Outerwear', label: t('categories.outerwear') },
  { value: 'Shoes', label: t('categories.shoes') },
  { value: 'Bags', label: t('categories.bags') },
  { value: 'Accessories', label: t('categories.accessories') },
  { value: 'Dresses', label: t('categories.dresses') },
  { value: 'Jewelry', label: t('categories.jewelry', 'Trang s\u1ee9c') },
  { value: 'Watches', label: t('categories.watches', '\u0110\u1ed3ng h\u1ed3') },
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
const statuses = computed(() => [
  { value: 'AVAILABLE', label: t('shop.available') },
  { value: 'RESERVED', label: t('shop.reserved') },
  { value: 'SOLD', label: t('shop.sold') },
])
const subcategories = computed(() => [
  { value: 'Men', label: t('home.men') },
  { value: 'Women', label: t('home.women') },
  { value: 'Unisex', label: t('categories.unisex') },
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

// Custom input for "Other" option
const customCategory = ref('')
const customSubcategory = ref('')
const customCondition = ref('')

const getActiveCategory = () => (form.category === 'Other' ? customCategory.value.trim() : form.category)

const sizes = computed(() => {
  const categorySizes = getSizesForCategory(sizeGroups.value, getActiveCategory())

  return [
    ...categorySizes.map((size) => ({ value: size, label: formatSizeLabel(size) })),
    { value: 'Other', label: otherLabel.value },
  ]
})

// Watch for "Other" selection - reset custom value when not Other
watch(() => form.category, (newVal) => {
  if (newVal !== 'Other') customCategory.value = ''
})
watch(() => form.subcategory, (newVal) => {
  if (newVal !== 'Other') customSubcategory.value = ''
})
watch(() => form.condition_text, (newVal) => {
  if (newVal !== 'Other') customCondition.value = ''
})

const syncVariantsForCurrentCategory = () => {
  const availableSizes = getSizesForCategory(sizeGroups.value, getActiveCategory())

  variants.value.forEach((variant) => {
    const actualSize = variant.size === 'Other'
      ? (variant.customSize || '').trim()
      : variant.size

    if (!actualSize) {
      variant.size = availableSizes[0] || 'Other'
      variant.customSize = ''
      return
    }

    if (availableSizes.includes(actualSize)) {
      variant.size = actualSize
      variant.customSize = ''
      return
    }

    if (variant.isNew && !variant.customSize) {
      variant.size = availableSizes[0] || 'Other'
      variant.customSize = variant.size === 'Other' ? actualSize : ''
      return
    }

    variant.size = 'Other'
    variant.customSize = actualSize
  })
}

watch(
  [() => form.category, customCategory, sizeGroups],
  () => {
    syncVariantsForCurrentCategory()
  },
  { deep: true }
)



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
      
      // Handle category: check if DB value matches dropdown options
      const catMatch = categories.value.some(c => c.value === product.category)
      if (catMatch) {
        form.category = product.category
      } else if (product.category) {
        form.category = 'Other'
        customCategory.value = product.category
      }
      
      // Handle subcategory
      const subMatch = subcategories.value.some(s => s.value === product.subcategory)
      if (subMatch) {
        form.subcategory = product.subcategory
      } else if (product.subcategory) {
        form.subcategory = 'Other'
        customSubcategory.value = product.subcategory
      } else {
        form.subcategory = 'Unisex'
      }
      
      form.base_price = product.base_price
      form.sale_price = product.sale_price
      
      // Handle condition: check if DB value matches dropdown options  
      const condMatch = conditions.value.some(c => c.value === product.condition_text)
      if (condMatch) {
        form.condition_text = product.condition_text
      } else if (product.condition_text) {
        form.condition_text = 'Other'
        customCondition.value = product.condition_text
      }
      
      form.condition_description = product.condition_description || ''
      form.is_active = product.is_active
      form.is_new_arrival = product.is_new_arrival || false

      const activeCategory = form.category === 'Other' ? customCategory.value.trim() : form.category
      const availableSizes = getSizesForCategory(sizeGroups.value, activeCategory)

      // Populate variants (all variants)
      if (product.variants && product.variants.length > 0) {
        variants.value = product.variants.map((v: any) => {
          const isKnownSize = !v.size || availableSizes.includes(v.size)
          const isKnownColor = !v.color || colors.value.some(c => c.value === v.color)
          const isKnownMaterial = !v.material || materials.value.some(m => m.value === v.material)

          return {
            id: v.id,
            size: isKnownSize ? (v.size || availableSizes[0] || 'Other') : 'Other',
            customSize: !isKnownSize ? v.size : '',
            color: isKnownColor ? (v.color || 'Black') : 'Other',
            customColor: !isKnownColor ? v.color : '',
            material: isKnownMaterial ? (v.material || 'Cotton') : 'Other',
            customMaterial: !isKnownMaterial ? v.material : '',
            status: v.status,
            isNew: false,
            isDeleted: false,
            quantity: 1,
          }
        })
      } else {
        // Add empty variant if none exists
        variants.value = [createEmptyVariant()]
      }

      syncVariantsForCurrentCategory()

      // Populate images
      productImages.value = product.images || []
    }
  } catch (error: any) {
    errorMessage.value = error.data?.message || t('notifications.loadError')
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

    // Resolve "Other" custom values
    const actualCategory = form.category === 'Other' ? customCategory.value : form.category
    const actualSubcategory = form.subcategory === 'Other' ? customSubcategory.value : form.subcategory
    const actualCondition = form.condition_text === 'Other' ? customCondition.value : form.condition_text

    // Update product
    await $fetch(`${config.public.apiUrl}/admin/products/${productId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        name: form.name,
        brand: form.brand,
        description: form.description,
        category: actualCategory,
        subcategory: actualSubcategory,
        base_price: form.base_price,
        sale_price: form.sale_price || null,
        condition_text: actualCondition,
        condition_description: form.condition_description,
        is_active: form.is_active,
        is_new_arrival: form.is_new_arrival,
        images: productImages.value,
      },
    })

    // Handle variants
    for (const v of variants.value) {
      const actualSize = v.size === 'Other' ? v.customSize : v.size
      const actualColor = v.color === 'Other' ? v.customColor : v.color
      const actualMaterial = v.material === 'Other' ? v.customMaterial : v.material

      if (v.isDeleted && v.id) {
        // Delete existing variant
        await $fetch(`${config.public.apiUrl}/admin/variants/${v.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      } else if (v.isNew && !v.isDeleted) {
        // Create new variant
        const qty = v.quantity || 1;
        for (let i = 0; i < qty; i++) {
          await $fetch(`${config.public.apiUrl}/admin/products/${productId}/variants`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: { size: actualSize, color: actualColor, material: actualMaterial, status: v.status },
          })
        }
      } else if (v.id && !v.isDeleted) {
        // Update existing variant
        await $fetch(`${config.public.apiUrl}/admin/variants/${v.id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: { size: actualSize, color: actualColor, material: actualMaterial, status: v.status },
        })
      }
    }

    successMessage.value = t('admin.productUpdated')
    
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error: any) {
    errorMessage.value = error.data?.message || t('notifications.updateError')
  } finally {
    isSaving.value = false
  }
}

// Delete product
const deleteProduct = async () => {
  const ok = await showConfirm({ title: t('admin.deleteConfirm'), message: t('admin.deleteConfirmDesc', 'Hành động này không thể hoàn tác. Bạn có chắc chắn?'), type: 'danger', confirmText: t('common.delete'), icon: 'trash' })
  if (!ok) return

  try {
    isDeleting.value = true
    const token = getToken()

    await $fetch(`${config.public.apiUrl}/admin/products/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    router.push('/admin/products')
  } catch (error: any) {
    errorMessage.value = error.data?.message || t('notifications.deleteError')
  } finally {
    isDeleting.value = false
  }
}

onMounted(async () => {
  await fetchProductAttributes()
  await fetchProduct()
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
        <h2 class="font-serif text-heading-4 text-aura-black mb-6">{{ $t('admin.basicInfo') }}</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="input-label">{{ $t('admin.productForm.productName') }} *</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="input-field"
              :placeholder="$t('admin.productForm.productNamePlaceholder')"
            />
          </div>
          
          <div>
            <label class="input-label">{{ $t('admin.productForm.brand') }} *</label>
            <input
              v-model="form.brand"
              type="text"
              required
              class="input-field"
              :placeholder="$t('admin.productForm.selectBrand')"
            />
          </div>

          <div>
            <label class="input-label">{{ $t('shop.category') }} *</label>
            <select v-model="form.category" class="input-field select-animated">
              <option v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
            </select>
            <input 
              v-if="form.category === 'Other'" 
              v-model="customCategory" 
              type="text" 
              class="input-field mt-2" 
              :placeholder="t('admin.productForm.enterNew', 'Nh\u1eadp gi\u00e1 tr\u1ecb m\u1edbi...')"
            />
          </div>

          <div>
            <label class="input-label">{{ $t('admin.subcategory') }}</label>
            <select v-model="form.subcategory" class="input-field select-animated">
              <option v-for="sub in subcategories" :key="sub.value" :value="sub.value">{{ sub.label }}</option>
            </select>
            <input 
              v-if="form.subcategory === 'Other'" 
              v-model="customSubcategory" 
              type="text" 
              class="input-field mt-2" 
              :placeholder="t('admin.productForm.enterNew', 'Nh\u1eadp gi\u00e1 tr\u1ecb m\u1edbi...')"
            />
          </div>

          <div class="md:col-span-2">
            <label class="input-label">{{ $t('admin.productForm.description') }}</label>
            <textarea
              v-model="form.description"
              rows="4"
              class="input-field"
              :placeholder="$t('admin.productForm.descriptionPlaceholder')"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Product Images -->
      <div class="bg-white p-6 rounded-sm shadow-card">
        <h2 class="font-serif text-heading-4 text-aura-black mb-6">{{ $t('admin.productImages') }}</h2>
        
        <!-- Upload Area -->
        <div
          @drop.prevent="handleImageDrop"
          @dragover.prevent="isImageDragging = true"
          @dragleave="isImageDragging = false"
          class="border-2 border-dashed rounded-sm p-6 text-center transition-colors cursor-pointer mb-4"
          :class="{
            'border-aura-black bg-neutral-50': isImageDragging,
            'border-neutral-300 hover:border-neutral-400': !isImageDragging,
            'opacity-50 pointer-events-none': (productImages?.length || 0) >= 5 || isImageUploading,
          }"
          @click="imageFileInput?.click()"
        >
          <svg v-if="!isImageUploading" class="w-10 h-10 mx-auto text-neutral-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <svg v-else class="w-10 h-10 mx-auto text-neutral-400 mb-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p class="text-body-sm text-neutral-600">
            {{ isImageUploading ? $t('common.uploading') : $t('admin.dragDropImages', 'K\u00e9o th\u1ea3 ho\u1eb7c nh\u1ea5n \u0111\u1ec3 t\u1ea3i \u1ea3nh') }}
          </p>
          <p class="text-caption text-neutral-400 mt-1">
            {{ $t('admin.imageLimits', { remaining: 5 - (productImages?.length || 0), max: 5 }, `C\u00f2n ${5 - (productImages?.length || 0)}/5 \u1ea3nh`) }}
          </p>
        </div>

        <input
          ref="imageFileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          class="hidden"
          @change="handleImageFileSelect"
        />

        <!-- Image Error -->
        <div v-if="imageError" class="text-body-sm text-red-600 mb-4">{{ imageError }}</div>

        <!-- Image Previews -->
        <div v-if="productImages && productImages.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            v-for="(img, index) in productImages"
            :key="index"
            class="relative aspect-square bg-neutral-100 rounded-sm overflow-hidden group"
          >
            <img
              :src="img.startsWith('http') ? img : `${config.public.apiUrl.replace('/api/v1', '')}${img}`"
              :alt="`Product image ${index + 1}`"
              class="w-full h-full object-cover"
            />
            <button
              type="button"
              @click="removeProductImage(index)"
              class="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div class="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-caption py-1 px-2">
              {{ index === 0 ? $t('admin.mainImage', '\u1ea2nh ch\u00ednh') : `#${index + 1}` }}
            </div>
          </div>
        </div>
      </div>

      <!-- Pricing -->
      <div class="bg-white p-6 rounded-sm shadow-card">
        <h2 class="font-serif text-heading-4 text-aura-black mb-6">{{ $t('admin.pricing') }}</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="input-label">{{ $t('admin.productForm.basePrice') }} *</label>
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
            <label class="input-label">{{ $t('admin.productForm.salePrice') }} ({{ $t('admin.productForm.optional') }})</label>
            <input
              v-model.number="form.sale_price"
              type="number"
              min="0"
              step="0.01"
              class="input-field"
            />
          </div>
        </div>
      </div>

      <!-- Condition -->
      <div class="bg-white p-6 rounded-sm shadow-card">
        <h2 class="font-serif text-heading-4 text-aura-black mb-6">{{ $t('admin.conditionInfo') }}</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="input-label">{{ $t('admin.productForm.condition') }} *</label>
            <select v-model="form.condition_text" class="input-field select-animated">
              <option v-for="cond in conditions" :key="cond.value" :value="cond.value">{{ cond.label }}</option>
            </select>
            <input 
              v-if="form.condition_text === 'Other'" 
              v-model="customCondition" 
              type="text" 
              class="input-field mt-2" 
              :placeholder="t('admin.productForm.enterNew', 'Nh\u1eadp gi\u00e1 tr\u1ecb m\u1edbi...')"
            />
          </div>
          
          <div>
            <label class="input-label">{{ $t('admin.conditionDetails') }}</label>
            <input
              v-model="form.condition_description"
              type="text"
              class="input-field"
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
              <div class="flex items-center gap-3">
                <button
                  v-if="!v.isNew"
                  type="button"
                  @click="duplicateVariant(variants.indexOf(v))"
                  class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  :title="t('admin.duplicateDesc', 'Nh\u00e2n b\u1ea3n b\u1ea3n ghi n\u00e0y')"
                >
                  {{ $t('admin.duplicate', 'Nhân bản') }}
                </button>
                <button
                  v-if="activeVariants.length > 1"
                  type="button"
                  @click="removeVariant(variants.indexOf(v))"
                  class="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  {{ $t('common.remove') || 'Remove' }}
                </button>
              </div>
            </div>
            
            <div :class="['grid grid-cols-1 gap-4', v.isNew ? 'md:grid-cols-5' : 'md:grid-cols-4']">
              <div>
                <label class="input-label text-sm">{{ $t('admin.productForm.size') }}</label>
                <select v-model="v.size" class="input-field select-animated">
                  <option v-for="s in sizes" :key="s.value" :value="s.value">{{ s.label }}</option>
                </select>
                <input 
                  v-if="v.size === 'Other'" 
                  v-model="v.customSize" 
                  type="text" 
                  class="input-field mt-2" 
                  :placeholder="t('admin.productForm.enterNew', 'Nh\u1eadp gi\u00e1 tr\u1ecb m\u1edbi...')"
                />
              </div>
              
              <div>
                <label class="input-label text-sm">{{ $t('admin.productForm.color') }}</label>
                <select v-model="v.color" class="input-field select-animated">
                  <option v-for="c in colors" :key="c.value" :value="c.value">{{ c.label }}</option>
                </select>
                <input 
                  v-if="v.color === 'Other'" 
                  v-model="v.customColor" 
                  type="text" 
                  class="input-field mt-2" 
                  :placeholder="t('admin.productForm.enterNew', 'Nh\u1eadp gi\u00e1 tr\u1ecb m\u1edbi...')"
                />
              </div>

              <div>
                <label class="input-label text-sm">{{ $t('admin.productForm.material') }}</label>
                <select v-model="v.material" class="input-field select-animated">
                  <option v-for="m in materials" :key="m.value" :value="m.value">{{ m.label }}</option>
                </select>
                <input 
                  v-if="v.material === 'Other'" 
                  v-model="v.customMaterial" 
                  type="text" 
                  class="input-field mt-2" 
                  :placeholder="t('admin.productForm.enterNew', 'Nh\u1eadp gi\u00e1 tr\u1ecb m\u1edbi...')"
                />
              </div>

              <div>
                <label class="input-label text-sm">{{ $t('common.status') }} *</label>
                <select v-model="v.status" class="input-field select-animated">
                  <option v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
                </select>
              </div>
              
              <div v-if="v.isNew">
                <label class="input-label text-sm">{{ $t('admin.quantity', 'Số lượng') }}</label>
                <input
                  v-model.number="v.quantity"
                  type="number"
                  min="1"
                  class="input-field"
                  :title="$t('admin.duplicateDesc', 'T\u1ea1o nhi\u1ec1u b\u1ea3n sao cho s\u1ea3n ph\u1ea9m n\u00e0y')"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Product Toggles -->
        <div class="mt-6 pt-4 border-t border-neutral-100 space-y-3">
          <label class="flex items-center gap-2">
            <input
              v-model="form.is_active"
              type="checkbox"
              class="w-4 h-4"
            />
            <span class="text-body-sm">{{ $t('admin.productActive') }}</span>
          </label>
          <label class="flex items-center gap-2">
            <input
              v-model="form.is_new_arrival"
              type="checkbox"
              class="w-4 h-4"
            />
            <span class="text-body-sm">{{ $t('admin.productNewArrival') }}</span>
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
