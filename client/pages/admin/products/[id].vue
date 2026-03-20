<script setup lang="ts">
/**
 * Admin Edit Product Page
 * AURA ARCHIVE - Edit existing product
 */

import { useDialog } from '~/composables/useDialog'

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const { confirm: showConfirm } = useDialog()

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

// Helper functions for variants
const createEmptyVariant = (): VariantData => ({
  id: null,
  size: 'M',
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
const otherLabel = computed(() => locale.value === 'vi' ? 'Khác' : 'Other')

// Categories (translated)
const categories = computed(() => [
  { value: 'Bags', label: t('categories.bags') },
  { value: 'Clothing', label: t('categories.tops') },
  { value: 'Shoes', label: t('categories.shoes') },
  { value: 'Accessories', label: t('categories.accessories') },
  { value: 'Jewelry', label: locale.value === 'vi' ? 'Trang sức' : 'Jewelry' },
  { value: 'Watches', label: locale.value === 'vi' ? 'Đồng hồ' : 'Watches' },
  { value: 'Other', label: otherLabel.value },
])
const conditions = computed(() => [
  { value: 'New with Tags', label: t('conditions.newWithTags') },
  { value: 'Excellent', label: t('conditions.excellent') },
  { value: 'Very Good', label: t('conditions.likeNew') },
  { value: 'Good', label: t('conditions.good') },
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

const sizes = computed(() => [
  { value: 'XS', label: 'XS' },
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
  { value: 'XXL', label: 'XXL' },
  { value: 'One Size', label: locale.value === 'vi' ? 'Một cỡ' : 'One Size' },
  { value: 'Free Size', label: locale.value === 'vi' ? 'Tự do' : 'Free Size' },
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
  { value: 'Gold', label: locale.value === 'vi' ? 'Vàng' : 'Gold' },
  { value: 'Silver', label: locale.value === 'vi' ? 'Bạc' : 'Silver' },
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
  { value: 'Canvas', label: locale.value === 'vi' ? 'Vải canvas' : 'Canvas' },
  { value: 'Metal', label: locale.value === 'vi' ? 'Kim loại' : 'Metal' },
  { value: 'Other', label: otherLabel.value },
])

// Custom input for "Other" option
const customCategory = ref('')
const customSubcategory = ref('')
const customCondition = ref('')

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
      form.is_new_arrival = product.is_new_arrival || false

      // Populate variants (all variants)
      if (product.variants && product.variants.length > 0) {
        variants.value = product.variants.map((v: any) => {
          const isKnownSize = !v.size || sizes.value.some(s => s.value === v.size)
          const isKnownColor = !v.color || colors.value.some(c => c.value === v.color)
          const isKnownMaterial = !v.material || materials.value.some(m => m.value === v.material)

          return {
            id: v.id,
            size: isKnownSize ? (v.size || 'M') : 'Other',
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

// Format price for display
const { formatPrice } = useCurrency()

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
              :placeholder="locale === 'vi' ? 'Nhập tên danh mục mới...' : 'Enter new category...'"
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
              :placeholder="locale === 'vi' ? 'Nhập phân loại mới...' : 'Enter new subcategory...'"
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
        <AdminImageUpload v-model="productImages" :max-files="5" />
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
              :placeholder="locale === 'vi' ? 'Nhập tình trạng mới...' : 'Enter new condition...'"
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
                  title="Make a new restock copy of this item"
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
                  :placeholder="locale === 'vi' ? 'Nhập kích cỡ mới...' : 'Enter new size...'"
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
                  :placeholder="locale === 'vi' ? 'Nhập màu sắc mới...' : 'Enter new color...'"
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
                  :placeholder="locale === 'vi' ? 'Nhập chất liệu mới...' : 'Enter new material...'"
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
                  title="Tạo nhiều bản sao cho sản phẩm này"
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
