<script setup lang="ts">
/**
 * Admin Image Upload Component
 * AURA ARCHIVE - Reusable image upload with preview and drag-drop
 */


const props = defineProps<{
  modelValue: string[]
  maxFiles?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const { t } = useI18n()
const config = useRuntimeConfig()
const isUploading = ref(false)
const isDragging = ref(false)
const error = ref('')

const images = computed({
  get: () => props.modelValue || [],
  set: (value) => emit('update:modelValue', value),
})

const maxAllowed = computed(() => props.maxFiles || 5)
const remainingSlots = computed(() => maxAllowed.value - (images.value?.length || 0))

// Get token
const getToken = () => {
  if (process.client) {
    return localStorage.getItem('token')
  }
  return null
}

// Handle file selection
const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files) {
    uploadFiles(Array.from(input.files))
  }
}

// Handle drag and drop
const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
  
  if (event.dataTransfer?.files) {
    uploadFiles(Array.from(event.dataTransfer.files))
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

// Upload files to server
const uploadFiles = async (files: File[]) => {
  if (files.length === 0) return
  
  // Check remaining slots
  if (files.length > remainingSlots.value) {
    error.value = t('admin.maxImagesError', { max: maxAllowed.value })
    return
  }

  // Validate file types
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const invalidFiles = files.filter(f => !validTypes.includes(f.type))
  if (invalidFiles.length > 0) {
    error.value = t('admin.invalidImageType')
    return
  }

  isUploading.value = true
  error.value = ''

  try {
    const token = getToken()
    const formData = new FormData()
    files.forEach(file => formData.append('images', file))

    const response = await $fetch<{ success: boolean; data: { urls: string[] } }>(
      `${config.public.apiUrl}/admin/upload/product-images`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    )

    if (response.success) {
      images.value = [...images.value, ...response.data.urls]
    }
  } catch (err: any) {
    error.value = err.data?.message || t('admin.uploadError')
  } finally {
    isUploading.value = false
  }
}

// Remove image
const removeImage = (index: number) => {
  const newImages = [...images.value]
  newImages.splice(index, 1)
  images.value = newImages
}

// Get full URL for image (supports Cloudinary URLs and legacy local paths)
const getImageUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${config.public.apiUrl.replace('/api/v1', '')}${path}`
}
</script>

<template>
  <div class="space-y-4">
    <!-- Upload Area -->
    <div
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      class="border-2 border-dashed rounded-sm p-6 text-center transition-colors cursor-pointer"
      :class="{
        'border-aura-black bg-neutral-50': isDragging,
        'border-neutral-300 hover:border-neutral-400': !isDragging,
        'opacity-50 pointer-events-none': remainingSlots <= 0 || isUploading,
      }"
    >
      <input
        type="file"
        id="image-upload"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        :disabled="remainingSlots <= 0 || isUploading"
        @change="handleFileSelect"
        class="hidden"
      />
      <label for="image-upload" class="cursor-pointer block">
        <svg v-if="!isUploading" class="w-10 h-10 mx-auto text-neutral-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <svg v-else class="w-10 h-10 mx-auto text-neutral-400 mb-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p class="text-body-sm text-neutral-600">
          {{ isUploading ? t('admin.uploading') : t('admin.dragDropImages') }}
        </p>
        <p class="text-caption text-neutral-400 mt-1">
          {{ t('admin.imageLimits', { remaining: remainingSlots, max: maxAllowed }) }}
        </p>
      </label>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="text-body-sm text-red-600">
      {{ error }}
    </div>

    <!-- Image Previews -->
    <div v-if="images.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        v-for="(img, index) in images"
        :key="index"
        class="relative aspect-square bg-neutral-100 rounded-sm overflow-hidden group"
      >
        <img
          :src="getImageUrl(img)"
          :alt="`Product image ${index + 1}`"
          class="w-full h-full object-cover"
        />
        <button
          type="button"
          @click="removeImage(index)"
          class="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div class="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-caption py-1 px-2">
          {{ index === 0 ? t('admin.mainImage') : `#${index + 1}` }}
        </div>
      </div>
    </div>
  </div>
</template>
