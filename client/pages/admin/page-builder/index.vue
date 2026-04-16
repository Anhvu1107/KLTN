<script setup lang="ts">
/**
 * Admin Page Builder
 * AURA ARCHIVE - Block-based page content editor with drag-and-drop
 */

import draggable from 'vuedraggable'


definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { t } = useI18n()
const config = useRuntimeConfig()
const getToken = () => process.client ? localStorage.getItem('token') : null

// State
const isLoading = ref(true)
const isSaving = ref(false)
const isPublishing = ref(false)
const showPreview = ref(false)
const showAddBlock = ref(false)
const saveMessage = ref('')
const saveMessageType = ref<'success' | 'error'>('success')
const currentLang = ref<'vi' | 'en'>('vi')
const hasUnsavedChanges = ref(false)

// Available pages
const pages = [
  { key: 'about', label: 'Giới thiệu', icon: '📖' },
  { key: 'contact', label: 'Liên hệ', icon: '📞' },
  { key: 'faqs', label: 'FAQ', icon: '❓' },
  { key: 'shipping', label: 'Vận chuyển', icon: '🚚' },
  { key: 'returns', label: 'Đổi trả', icon: '🔄' },
  { key: 'terms', label: 'Điều khoản', icon: '📋' },
  { key: 'privacy', label: 'Bảo mật', icon: '🔒' },
]
const currentPageKey = ref('about')
const contentData = ref<any>(null)

// Blocks
const blocks = ref<any[]>([])

// Block type definitions
const blockTypes = [
  { type: 'hero_text', label: 'Hero Text', icon: '🎯', desc: 'Tiêu đề lớn + mô tả' },
  { type: 'image_text', label: 'Ảnh + Text', icon: '🖼️', desc: '2 cột: ảnh bên trái/phải + nội dung' },
  { type: 'fullwidth_text', label: 'Full-width Text', icon: '📝', desc: 'Text toàn trang + nền sáng/tối' },
  { type: 'values_grid', label: 'Grid giá trị', icon: '📊', desc: 'Lưới các card icon + mô tả' },
  { type: 'cta', label: 'Call to Action', icon: '🔔', desc: 'Khu vực kêu gọi hành động với nút' },
  { type: 'video_embed', label: 'Video', icon: '🎬', desc: 'Nhúng video YouTube/Vimeo' },
  { type: 'testimonial', label: 'Lời nhận xét', icon: '💬', desc: 'Quote từ khách hàng/đối tác' },
  { type: 'team_grid', label: 'Đội ngũ', icon: '👥', desc: 'Grid thành viên + ảnh + vai trò' },
  { type: 'image_gallery', label: 'Gallery ảnh', icon: '🏞️', desc: 'Bộ sưu tập nhiều ảnh' },
  { type: 'stats_counter', label: 'Thống kê', icon: '📈', desc: 'Các con số ấn tượng' },
  { type: 'divider', label: 'Phân cách', icon: '➖', desc: 'Đường phân cách / khoảng trống' },
  { type: 'faq', label: 'FAQ', icon: '❓', desc: 'Câu hỏi thường gặp' },
]

// Default data for each block type
const getDefaultBlockData = (type: string) => {
  const defaults: Record<string, any> = {
    hero_text: {
      vi: { title: 'Tiêu đề', subtitle: 'Mô tả ngắn' },
      en: { title: 'Title', subtitle: 'Short description' },
    },
    image_text: {
      image_url: '',
      image_position: 'left',
      vi: { title: 'Tiêu đề', content: 'Nội dung...' },
      en: { title: 'Title', content: 'Content...' },
    },
    fullwidth_text: {
      theme: 'light',
      vi: { title: 'Tiêu đề', content: 'Nội dung...' },
      en: { title: 'Title', content: 'Content...' },
    },
    values_grid: {
      vi: { title: 'Giá trị cốt lõi' },
      en: { title: 'Core Values' },
      items: [
        { icon: 'shield', vi: { title: 'Giá trị 1', description: 'Mô tả...' }, en: { title: 'Value 1', description: 'Description...' } },
      ],
    },
    cta: {
      theme: 'light',
      button_link: '/contact',
      vi: { title: 'Tiêu đề CTA', description: 'Mô tả...', button_text: 'Liên hệ' },
      en: { title: 'CTA Title', description: 'Description...', button_text: 'Contact' },
    },
    video_embed: {
      video_url: '',
      vi: { title: '' },
      en: { title: '' },
    },
    testimonial: {
      items: [
        { avatar_url: '', vi: { name: 'Khách hàng', role: 'Vai trò', quote: 'Nhận xét...' }, en: { name: 'Customer', role: 'Role', quote: 'Quote...' } },
      ],
    },
    team_grid: {
      vi: { title: 'Đội ngũ của chúng tôi' },
      en: { title: 'Our Team' },
      members: [
        { photo_url: '', vi: { name: 'Tên', role: 'Chức vụ' }, en: { name: 'Name', role: 'Role' } },
      ],
    },
    image_gallery: {
      vi: { title: '' },
      en: { title: '' },
      columns: 3,
      images: [],
    },
    stats_counter: {
      vi: { title: '' },
      en: { title: '' },
      items: [
        { value: '100+', vi: { label: 'Sản phẩm' }, en: { label: 'Products' } },
      ],
    },
    divider: {
      height: 40,
      style: 'line',
    },
    faq: {
      vi: { title: 'Câu hỏi thường gặp' },
      en: { title: 'FAQ' },
      items: [
        { vi: { question: 'Câu hỏi?', answer: 'Trả lời...' }, en: { question: 'Question?', answer: 'Answer...' } },
      ],
    },
  }
  return JSON.parse(JSON.stringify(defaults[type] || {}))
}

// Image upload
const uploadImage = async (file: File): Promise<string> => {
  const token = getToken()
  const formData = new FormData()
  formData.append('banner', file)
  const response = await $fetch<{ success: boolean; data: { url: string } }>(
    `${config.public.apiUrl}/admin/upload/banner`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }
  )
  return response.data.url
}

// Fetch content
const fetchContent = async () => {
  isLoading.value = true
  try {
    const token = getToken()
    const response = await $fetch<{ success: boolean; data: { content: any } }>(
      `${config.public.apiUrl}/admin/page-content/${currentPageKey.value}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    contentData.value = response.data.content
    blocks.value = response.data.content?.blocks || []
    hasUnsavedChanges.value = false
  } catch (error) {
    console.error('Failed to fetch page content:', error)
    blocks.value = []
  } finally {
    isLoading.value = false
  }
}

// Save content
const saveContent = async () => {
  isSaving.value = true
  saveMessage.value = ''
  try {
    const token = getToken()
    const response = await $fetch<{ success: boolean; data: { content: any } }>(
      `${config.public.apiUrl}/admin/page-content/${currentPageKey.value}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: { blocks: blocks.value },
      }
    )
    contentData.value = response.data.content
    hasUnsavedChanges.value = false
    saveMessage.value = t('admin.pageBuilder.saveSuccess')
    saveMessageType.value = 'success'
    setTimeout(() => { saveMessage.value = '' }, 3000)
  } catch (error: any) {
    saveMessage.value = error.data?.message || t('admin.pageBuilder.saveError')
    saveMessageType.value = 'error'
  } finally {
    isSaving.value = false
  }
}

// Publish
const publishContent = async () => {
  if (!blocks.value.length) return
  isPublishing.value = true
  try {
    // Save first
    await saveContent()
    const token = getToken()
    const response = await $fetch<{ success: boolean; data: { content: any } }>(
      `${config.public.apiUrl}/admin/page-content/${currentPageKey.value}/publish`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    )
    contentData.value = response.data.content
    saveMessage.value = t('admin.pageBuilder.publishSuccess')
    saveMessageType.value = 'success'
    setTimeout(() => { saveMessage.value = '' }, 3000)
  } catch (error: any) {
    saveMessage.value = error.data?.message || t('admin.pageBuilder.publishError')
    saveMessageType.value = 'error'
  } finally {
    isPublishing.value = false
  }
}

// Unpublish
const unpublishContent = async () => {
  try {
    const token = getToken()
    const response = await $fetch<{ success: boolean; data: { content: any } }>(
      `${config.public.apiUrl}/admin/page-content/${currentPageKey.value}/unpublish`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    )
    contentData.value = response.data.content
    saveMessage.value = t('admin.pageBuilder.unpublishSuccess')
    saveMessageType.value = 'success'
    setTimeout(() => { saveMessage.value = '' }, 3000)
  } catch (error: any) {
    saveMessage.value = error.data?.message || 'Error'
    saveMessageType.value = 'error'
  }
}

// Add block
const addBlock = (type: string) => {
  blocks.value.push({
    id: crypto.randomUUID(),
    type,
    data: getDefaultBlockData(type),
  })
  showAddBlock.value = false
  hasUnsavedChanges.value = true
}

// Remove block
const removeBlock = (index: number) => {
  blocks.value.splice(index, 1)
  hasUnsavedChanges.value = true
}

// Duplicate block
const duplicateBlock = (index: number) => {
  const block = JSON.parse(JSON.stringify(blocks.value[index]))
  block.id = crypto.randomUUID()
  blocks.value.splice(index + 1, 0, block)
  hasUnsavedChanges.value = true
}

// Collapsed state per block
const collapsedBlocks = ref<Set<string>>(new Set())
const toggleCollapse = (id: string) => {
  if (collapsedBlocks.value.has(id)) {
    collapsedBlocks.value.delete(id)
  } else {
    collapsedBlocks.value.add(id)
  }
}

// Handle drag end
const onDragEnd = () => {
  hasUnsavedChanges.value = true
}

// Get block type info
const getBlockTypeInfo = (type: string) => blockTypes.find(b => b.type === type) || { label: type, icon: '📦' }

// Icon options for values grid
const iconOptions = ['shield', 'star', 'leaf', 'heart', 'check', 'globe', 'lightning', 'trophy', 'gem', 'clock']

// Switch page
const switchPage = (key: string) => {
  currentPageKey.value = key
  fetchContent()
}

// Handle file upload for block images
const handleBlockImageUpload = async (event: Event, block: any, field: string) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.[0]) return
  try {
    const url = await uploadImage(input.files[0])
    if (field.includes('.')) {
      const parts = field.split('.')
      let obj = block.data
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]]
      }
      obj[parts[parts.length - 1]] = url
    } else {
      block.data[field] = url
    }
    hasUnsavedChanges.value = true
  } catch (e) {
    console.error('Upload failed:', e)
  }
}

const getImageSrc = (url: string) => {
  if (!url) return ''
  return url.startsWith('http') ? url : `${config.public.apiUrl}${url}`
}

// Localized field helper — reads/writes the current lang's text fields
const getLangField = (data: any, field: string) => {
  return data?.[currentLang.value]?.[field] || ''
}
const setLangField = (data: any, field: string, value: string) => {
  if (!data[currentLang.value]) data[currentLang.value] = {}
  data[currentLang.value][field] = value
  hasUnsavedChanges.value = true
}

onMounted(() => {
  fetchContent()
})

// Auto-translate all blocks from VI → EN
const isTranslating = ref(false)
const translateBlocks = async () => {
  if (isTranslating.value) return
  isTranslating.value = true

  try {
    // Collect all VI text fields with their paths
    const textsToTranslate: string[] = []
    const pathMap: { blockIdx: number; path: string }[] = []

    blocks.value.forEach((block: any, blockIdx: number) => {
      const data = block.data
      // Block-level vi fields
      if (data.vi) {
        Object.keys(data.vi).forEach((field: string) => {
          const val = data.vi[field]
          if (typeof val === 'string' && val.trim()) {
            textsToTranslate.push(val)
            pathMap.push({ blockIdx, path: `vi.${field}` })
          }
        })
      }
      // Array-level items (values_grid, testimonial, stats_counter, faq)
      const arrayFields = ['items', 'members']
      arrayFields.forEach((arrField: string) => {
        if (Array.isArray(data[arrField])) {
          data[arrField].forEach((item: any, itemIdx: number) => {
            if (item.vi) {
              Object.keys(item.vi).forEach((field: string) => {
                const val = item.vi[field]
                if (typeof val === 'string' && val.trim()) {
                  textsToTranslate.push(val)
                  pathMap.push({ blockIdx, path: `${arrField}.${itemIdx}.vi.${field}` })
                }
              })
            }
          })
        }
      })
    })

    if (!textsToTranslate.length) {
      saveMessage.value = 'Không có nội dung VI để dịch'
      saveMessageType.value = 'error'
      setTimeout(() => { saveMessage.value = '' }, 3000)
      return
    }

    const token = getToken()
    const response = await $fetch<{ success: boolean; data: { translated: string[] } }>(
      `${config.public.apiUrl}/admin/page-content/translate`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { texts: textsToTranslate, from: 'vi', to: 'en' },
      }
    )

    const translated = response.data.translated

    // Apply translations to EN fields
    pathMap.forEach((mapping, idx) => {
      const block = blocks.value[mapping.blockIdx]
      // Convert vi path to en path
      const enPath = mapping.path.replace(/^vi\./, 'en.').replace(/\.vi\./, '.en.')

      const enParts = enPath.split('.')
      let obj: any = block.data
      for (let i = 0; i < enParts.length - 1; i++) {
        const key = enParts[i]
        if (obj[key] === undefined) obj[key] = isNaN(Number(enParts[i + 1])) ? {} : obj[key]
        if (!obj[key]) obj[key] = {}
        obj = obj[key]
      }
      obj[enParts[enParts.length - 1]] = translated[idx] || textsToTranslate[idx]
    })

    hasUnsavedChanges.value = true
    saveMessage.value = `✅ Đã dịch ${translated.length} trường sang tiếng Anh`
    saveMessageType.value = 'success'
    currentLang.value = 'en' // Switch to EN to show results
    setTimeout(() => { saveMessage.value = '' }, 4000)
  } catch (error: any) {
    saveMessage.value = error.data?.message || 'Dịch thất bại'
    saveMessageType.value = 'error'
  } finally {
    isTranslating.value = false
  }
}

useSeoMeta({ title: 'Page Builder | Admin' })
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="font-serif text-heading-2 text-aura-black">{{ t('admin.pageBuilder.title') }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ t('admin.pageBuilder.desc') }}</p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Status badge -->
        <span v-if="contentData?.is_published" class="px-3 py-1 text-xs bg-green-50 text-green-700 rounded-full font-medium">
          {{ t('admin.pageBuilder.published') }}
        </span>
        <span v-else class="px-3 py-1 text-xs bg-yellow-50 text-yellow-700 rounded-full font-medium">
          {{ t('admin.pageBuilder.draft') }}
        </span>

        <!-- Preview button -->
        <button v-if="blocks.length" @click="showPreview = !showPreview" class="px-4 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          {{ showPreview ? t('admin.pageBuilder.editor') : t('admin.pageBuilder.preview') }}
        </button>

        <!-- Save -->
        <button @click="saveContent" :disabled="isSaving || !blocks.length" class="px-4 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50">
          {{ isSaving ? t('common.saving') : t('admin.pageBuilder.saveDraft') }}
        </button>

        <!-- Publish / Unpublish -->
        <button v-if="!contentData?.is_published" @click="publishContent" :disabled="isPublishing || !blocks.length" class="btn-primary text-sm">
          {{ isPublishing ? t('common.saving') : t('admin.pageBuilder.publish') }}
        </button>
        <button v-else @click="unpublishContent" class="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
          {{ t('admin.pageBuilder.unpublish') }}
        </button>
      </div>
    </div>

    <!-- Save message -->
    <div v-if="saveMessage" class="mb-4 px-4 py-2 rounded-lg text-sm" :class="saveMessageType === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
      {{ saveMessage }}
    </div>

    <!-- Page selector + Language toggle -->
    <div class="flex items-center gap-4 mb-6">
      <!-- Page tabs -->
      <div class="flex gap-1 bg-neutral-100 rounded-lg p-1">
        <button v-for="page in pages" :key="page.key" @click="switchPage(page.key)"
          class="px-4 py-2 text-sm rounded-md transition-colors"
          :class="currentPageKey === page.key ? 'bg-white shadow-sm text-aura-black font-medium' : 'text-neutral-500 hover:text-aura-black'"
        >
          {{ page.icon }} {{ page.label }}
        </button>
      </div>

      <div class="flex-1" />

      <!-- Language toggle -->
      <div class="flex gap-1 bg-neutral-100 rounded-lg p-1">
        <button @click="currentLang = 'vi'" class="px-3 py-1.5 text-xs rounded-md transition-colors" :class="currentLang === 'vi' ? 'bg-white shadow-sm font-medium' : 'text-neutral-500'">
          🇻🇳 VI
        </button>
        <button @click="currentLang = 'en'" class="px-3 py-1.5 text-xs rounded-md transition-colors" :class="currentLang === 'en' ? 'bg-white shadow-sm font-medium' : 'text-neutral-500'">
          🇬🇧 EN
        </button>
      </div>

      <!-- Auto-translate button -->
      <button
        v-if="blocks.length"
        @click="translateBlocks"
        :disabled="isTranslating"
        class="px-3 py-1.5 text-xs rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        title="Dịch tự động VI → EN bằng AI"
      >
        <svg v-if="isTranslating" class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
        {{ isTranslating ? 'Đang dịch...' : '🤖 VI → EN' }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-16">
      <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto" />
    </div>

    <!-- Preview Mode -->
    <div v-else-if="showPreview" class="border border-neutral-200 rounded-xl overflow-hidden bg-white">
      <div class="bg-neutral-100 px-4 py-2 border-b border-neutral-200 flex items-center gap-2">
        <div class="w-3 h-3 rounded-full bg-red-400" />
        <div class="w-3 h-3 rounded-full bg-yellow-400" />
        <div class="w-3 h-3 rounded-full bg-green-400" />
        <span class="text-xs text-neutral-500 ml-2">{{ t('admin.pageBuilder.previewMode') }}</span>
      </div>
      <div class="preview-container">
        <template v-for="block in blocks" :key="block.id">
          <!-- Hero Text Preview -->
          <section v-if="block.type === 'hero_text'" class="py-16 bg-neutral-50">
            <div class="max-w-3xl mx-auto text-center px-6">
              <h1 class="font-serif text-4xl lg:text-5xl text-aura-black mb-6">{{ getLangField(block.data, 'title') }}</h1>
              <p class="text-lg text-neutral-600">{{ getLangField(block.data, 'subtitle') }}</p>
            </div>
          </section>

          <!-- Image Text Preview -->
          <section v-else-if="block.type === 'image_text'" class="py-16">
            <div class="max-w-6xl mx-auto px-6">
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center" :class="block.data.image_position === 'right' ? '' : ''">
                <div :class="block.data.image_position === 'right' ? 'order-2' : 'order-1'" class="aspect-[4/5] bg-neutral-100 rounded-sm overflow-hidden">
                  <img v-if="block.data.image_url" :src="getImageSrc(block.data.image_url)" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center text-neutral-300">
                    <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </div>
                </div>
                <div :class="block.data.image_position === 'right' ? 'order-1' : 'order-2'">
                  <h2 class="font-serif text-3xl text-aura-black mb-6">{{ getLangField(block.data, 'title') }}</h2>
                  <p class="text-neutral-600 leading-relaxed whitespace-pre-line">{{ getLangField(block.data, 'content') }}</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Full-width Text Preview -->
          <section v-else-if="block.type === 'fullwidth_text'" class="py-16" :class="block.data.theme === 'dark' ? 'bg-aura-black text-aura-white' : 'bg-white'">
            <div class="max-w-3xl mx-auto text-center px-6">
              <h2 class="font-serif text-3xl mb-6">{{ getLangField(block.data, 'title') }}</h2>
              <p class="text-lg leading-relaxed whitespace-pre-line" :class="block.data.theme === 'dark' ? 'text-neutral-300' : 'text-neutral-600'">{{ getLangField(block.data, 'content') }}</p>
            </div>
          </section>

          <!-- Values Grid Preview -->
          <section v-else-if="block.type === 'values_grid'" class="py-16">
            <div class="max-w-6xl mx-auto px-6">
              <h2 v-if="getLangField(block.data, 'title')" class="font-serif text-3xl text-aura-black text-center mb-12">{{ getLangField(block.data, 'title') }}</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div v-for="(item, i) in block.data.items" :key="i" class="text-center p-6">
                  <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-neutral-100 flex items-center justify-center">
                    <span class="text-2xl">{{ { shield: '🛡️', star: '⭐', leaf: '🌿', heart: '❤️', check: '✅', globe: '🌍', lightning: '⚡', trophy: '🏆', gem: '💎', clock: '⏰' }[item.icon] || '📦' }}</span>
                  </div>
                  <h3 class="font-serif text-lg text-aura-black mb-3">{{ item[currentLang]?.title }}</h3>
                  <p class="text-neutral-600 text-sm">{{ item[currentLang]?.description }}</p>
                </div>
              </div>
            </div>
          </section>

          <!-- CTA Preview -->
          <section v-else-if="block.type === 'cta'" class="py-16" :class="block.data.theme === 'dark' ? 'bg-aura-black text-aura-white' : 'bg-neutral-50'">
            <div class="max-w-3xl mx-auto text-center px-6">
              <h2 class="font-serif text-3xl mb-4">{{ getLangField(block.data, 'title') }}</h2>
              <p class="mb-8" :class="block.data.theme === 'dark' ? 'text-neutral-300' : 'text-neutral-600'">{{ getLangField(block.data, 'description') }}</p>
              <span class="inline-block px-8 py-3 bg-aura-black text-white rounded-sm font-medium">{{ getLangField(block.data, 'button_text') }}</span>
            </div>
          </section>

          <!-- Video Embed Preview -->
          <section v-else-if="block.type === 'video_embed'" class="py-16">
            <div class="max-w-4xl mx-auto px-6">
              <h2 v-if="getLangField(block.data, 'title')" class="font-serif text-3xl text-center mb-8">{{ getLangField(block.data, 'title') }}</h2>
              <div class="aspect-video bg-neutral-900 rounded-lg overflow-hidden">
                <iframe v-if="block.data.video_url" :src="block.data.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')" class="w-full h-full" frameborder="0" allowfullscreen />
                <div v-else class="w-full h-full flex items-center justify-center text-neutral-500">▶️ Video URL chưa được nhập</div>
              </div>
            </div>
          </section>

          <!-- Testimonial Preview -->
          <section v-else-if="block.type === 'testimonial'" class="py-16 bg-neutral-50">
            <div class="max-w-4xl mx-auto px-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div v-for="(item, i) in block.data.items" :key="i" class="bg-white p-8 rounded-lg shadow-sm">
                  <p class="text-neutral-600 italic mb-6 leading-relaxed">"{{ item[currentLang]?.quote }}"</p>
                  <div class="flex items-center gap-3">
                    <div v-if="item.avatar_url" class="w-10 h-10 rounded-full overflow-hidden bg-neutral-200">
                      <img :src="getImageSrc(item.avatar_url)" class="w-full h-full object-cover" />
                    </div>
                    <div v-else class="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-sm">👤</div>
                    <div>
                      <div class="font-medium text-sm">{{ item[currentLang]?.name }}</div>
                      <div class="text-xs text-neutral-500">{{ item[currentLang]?.role }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Team Grid Preview -->
          <section v-else-if="block.type === 'team_grid'" class="py-16">
            <div class="max-w-6xl mx-auto px-6">
              <h2 v-if="getLangField(block.data, 'title')" class="font-serif text-3xl text-center mb-12">{{ getLangField(block.data, 'title') }}</h2>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                <div v-for="(member, i) in block.data.members" :key="i" class="text-center">
                  <div class="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-neutral-100">
                    <img v-if="member.photo_url" :src="getImageSrc(member.photo_url)" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex items-center justify-center text-4xl">👤</div>
                  </div>
                  <h3 class="font-medium text-aura-black">{{ member[currentLang]?.name }}</h3>
                  <p class="text-sm text-neutral-500">{{ member[currentLang]?.role }}</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Stats Counter Preview -->
          <section v-else-if="block.type === 'stats_counter'" class="py-16 bg-aura-black text-white">
            <div class="max-w-6xl mx-auto px-6">
              <h2 v-if="getLangField(block.data, 'title')" class="font-serif text-3xl text-center mb-12">{{ getLangField(block.data, 'title') }}</h2>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div v-for="(item, i) in block.data.items" :key="i" class="text-center">
                  <div class="text-4xl font-bold mb-2">{{ item.value }}</div>
                  <div class="text-neutral-400 text-sm">{{ item[currentLang]?.label }}</div>
                </div>
              </div>
            </div>
          </section>

          <!-- Divider Preview -->
          <div v-else-if="block.type === 'divider'" :style="{ height: block.data.height + 'px' }" class="flex items-center px-6">
            <div v-if="block.data.style === 'line'" class="w-full max-w-6xl mx-auto border-t border-neutral-200" />
          </div>

          <!-- FAQ Preview -->
          <section v-else-if="block.type === 'faq'" class="py-16">
            <div class="max-w-3xl mx-auto px-6">
              <h2 v-if="getLangField(block.data, 'title')" class="font-serif text-3xl text-center mb-12">{{ getLangField(block.data, 'title') }}</h2>
              <div class="space-y-4">
                <div v-for="(item, i) in block.data.items" :key="i" class="border border-neutral-200 rounded-lg p-5">
                  <h3 class="font-medium text-aura-black mb-2">{{ item[currentLang]?.question }}</h3>
                  <p class="text-neutral-600 text-sm leading-relaxed">{{ item[currentLang]?.answer }}</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Image Gallery Preview -->
          <section v-else-if="block.type === 'image_gallery'" class="py-16">
            <div class="max-w-6xl mx-auto px-6">
              <h2 v-if="getLangField(block.data, 'title')" class="font-serif text-3xl text-center mb-12">{{ getLangField(block.data, 'title') }}</h2>
              <div class="grid gap-4" :style="{ gridTemplateColumns: `repeat(${block.data.columns || 3}, 1fr)` }">
                <div v-for="(img, i) in block.data.images" :key="i" class="aspect-square bg-neutral-100 rounded-lg overflow-hidden">
                  <img :src="getImageSrc(img.url)" class="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </section>
        </template>

        <div v-if="!blocks.length" class="py-20 text-center text-neutral-400">
          {{ t('admin.pageBuilder.noBlocks') }}
        </div>
      </div>
    </div>

    <!-- Editor Mode -->
    <div v-else>
      <!-- Draggable blocks -->
      <draggable
        v-model="blocks"
        item-key="id"
        handle=".drag-handle"
        ghost-class="opacity-30"
        animation="200"
        @end="onDragEnd"
      >
        <template #item="{ element: block, index }">
          <div class="mb-4 bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <!-- Block header -->
            <div class="flex items-center gap-3 px-4 py-3 bg-neutral-50 border-b border-neutral-200">
              <!-- Drag handle -->
              <div class="drag-handle cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm8-16a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z"/></svg>
              </div>

              <span class="text-lg">{{ getBlockTypeInfo(block.type).icon }}</span>
              <span class="font-medium text-sm text-aura-black">{{ getBlockTypeInfo(block.type).label }}</span>
              <span v-if="getLangField(block.data, 'title')" class="text-xs text-neutral-400 truncate max-w-[200px]">
                — {{ getLangField(block.data, 'title') }}
              </span>

              <div class="flex-1" />

              <!-- Collapse toggle -->
              <button @click="toggleCollapse(block.id)" class="p-1.5 hover:bg-neutral-200 rounded transition-colors">
                <svg class="w-4 h-4 transition-transform" :class="collapsedBlocks.has(block.id) ? '' : 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              <!-- Duplicate -->
              <button @click="duplicateBlock(index)" class="p-1.5 hover:bg-neutral-200 rounded transition-colors text-neutral-500" title="Duplicate">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              </button>

              <!-- Delete -->
              <button @click="removeBlock(index)" class="p-1.5 hover:bg-red-50 rounded transition-colors text-red-400 hover:text-red-600" title="Delete">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>

            <!-- Block content (collapsible) -->
            <div v-show="!collapsedBlocks.has(block.id)" class="p-5">
              <!-- HERO TEXT -->
              <template v-if="block.type === 'hero_text'">
                <div class="space-y-4">
                  <div>
                    <label class="input-label">{{ t('admin.pageBuilder.blockTitle') }}</label>
                    <input type="text" class="input-field" :value="getLangField(block.data, 'title')" @input="setLangField(block.data, 'title', ($event.target as HTMLInputElement).value)" />
                  </div>
                  <div>
                    <label class="input-label">{{ t('admin.pageBuilder.subtitle') }}</label>
                    <textarea class="input-field" rows="2" :value="getLangField(block.data, 'subtitle')" @input="setLangField(block.data, 'subtitle', ($event.target as HTMLTextAreaElement).value)" />
                  </div>
                </div>
              </template>

              <!-- IMAGE TEXT -->
              <template v-else-if="block.type === 'image_text'">
                <div class="space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="input-label">{{ t('admin.pageBuilder.image') }}</label>
                      <div class="border-2 border-dashed border-neutral-300 rounded-lg p-4 text-center">
                        <img v-if="block.data.image_url" :src="getImageSrc(block.data.image_url)" class="w-full h-32 object-cover rounded mb-2" />
                        <input type="file" accept="image/*" class="text-xs" @change="handleBlockImageUpload($event, block, 'image_url')" />
                      </div>
                    </div>
                    <div>
                      <label class="input-label">{{ t('admin.pageBuilder.imagePosition') }}</label>
                      <select v-model="block.data.image_position" class="input-field" @change="hasUnsavedChanges = true">
                        <option value="left">⬅️ Ảnh bên trái</option>
                        <option value="right">➡️ Ảnh bên phải</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label class="input-label">{{ t('admin.pageBuilder.blockTitle') }}</label>
                    <input type="text" class="input-field" :value="getLangField(block.data, 'title')" @input="setLangField(block.data, 'title', ($event.target as HTMLInputElement).value)" />
                  </div>
                  <div>
                    <label class="input-label">{{ t('admin.pageBuilder.content') }}</label>
                    <textarea class="input-field" rows="4" :value="getLangField(block.data, 'content')" @input="setLangField(block.data, 'content', ($event.target as HTMLTextAreaElement).value)" />
                  </div>
                </div>
              </template>

              <!-- FULLWIDTH TEXT -->
              <template v-else-if="block.type === 'fullwidth_text'">
                <div class="space-y-4">
                  <div>
                    <label class="input-label">{{ t('admin.pageBuilder.theme') }}</label>
                    <select v-model="block.data.theme" class="input-field" @change="hasUnsavedChanges = true">
                      <option value="light">☀️ Sáng</option>
                      <option value="dark">🌙 Tối</option>
                    </select>
                  </div>
                  <div>
                    <label class="input-label">{{ t('admin.pageBuilder.blockTitle') }}</label>
                    <input type="text" class="input-field" :value="getLangField(block.data, 'title')" @input="setLangField(block.data, 'title', ($event.target as HTMLInputElement).value)" />
                  </div>
                  <div>
                    <label class="input-label">{{ t('admin.pageBuilder.content') }}</label>
                    <textarea class="input-field" rows="4" :value="getLangField(block.data, 'content')" @input="setLangField(block.data, 'content', ($event.target as HTMLTextAreaElement).value)" />
                  </div>
                </div>
              </template>

              <!-- VALUES GRID -->
              <template v-else-if="block.type === 'values_grid'">
                <div class="space-y-4">
                  <div>
                    <label class="input-label">{{ t('admin.pageBuilder.sectionTitle') }}</label>
                    <input type="text" class="input-field" :value="getLangField(block.data, 'title')" @input="setLangField(block.data, 'title', ($event.target as HTMLInputElement).value)" />
                  </div>
                  <div v-for="(item, i) in block.data.items" :key="i" class="border border-neutral-200 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-3">
                      <span class="text-sm font-medium">Item {{ i + 1 }}</span>
                      <button @click="block.data.items.splice(i, 1); hasUnsavedChanges = true" class="text-red-400 hover:text-red-600 text-xs">✕ {{ t('common.delete') }}</button>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                      <div>
                        <label class="text-xs text-neutral-500">Icon</label>
                        <select v-model="item.icon" class="input-field text-sm" @change="hasUnsavedChanges = true">
                          <option v-for="icon in iconOptions" :key="icon" :value="icon">{{ { shield: '🛡️', star: '⭐', leaf: '🌿', heart: '❤️', check: '✅', globe: '🌍', lightning: '⚡', trophy: '🏆', gem: '💎', clock: '⏰' }[icon] }} {{ icon }}</option>
                        </select>
                      </div>
                      <div>
                        <label class="text-xs text-neutral-500">{{ t('admin.pageBuilder.blockTitle') }}</label>
                        <input type="text" class="input-field text-sm" :value="item[currentLang]?.title || ''" @input="if(!item[currentLang]) item[currentLang] = {}; item[currentLang].title = ($event.target as HTMLInputElement).value; hasUnsavedChanges = true" />
                      </div>
                      <div>
                        <label class="text-xs text-neutral-500">{{ t('admin.pageBuilder.description') }}</label>
                        <input type="text" class="input-field text-sm" :value="item[currentLang]?.description || ''" @input="if(!item[currentLang]) item[currentLang] = {}; item[currentLang].description = ($event.target as HTMLInputElement).value; hasUnsavedChanges = true" />
                      </div>
                    </div>
                  </div>
                  <button @click="block.data.items.push({ icon: 'star', vi: { title: '', description: '' }, en: { title: '', description: '' } }); hasUnsavedChanges = true" class="text-sm text-neutral-500 border border-dashed border-neutral-300 rounded-lg px-4 py-2 hover:border-neutral-400 hover:text-aura-black transition-colors">
                    + {{ t('admin.pageBuilder.addItem') }}
                  </button>
                </div>
              </template>

              <!-- CTA -->
              <template v-else-if="block.type === 'cta'">
                <div class="space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="input-label">{{ t('admin.pageBuilder.theme') }}</label>
                      <select v-model="block.data.theme" class="input-field" @change="hasUnsavedChanges = true">
                        <option value="light">☀️ Sáng</option>
                        <option value="dark">🌙 Tối</option>
                      </select>
                    </div>
                    <div>
                      <label class="input-label">{{ t('admin.pageBuilder.buttonLink') }}</label>
                      <input type="text" v-model="block.data.button_link" class="input-field" @input="hasUnsavedChanges = true" />
                    </div>
                  </div>
                  <div>
                    <label class="input-label">{{ t('admin.pageBuilder.blockTitle') }}</label>
                    <input type="text" class="input-field" :value="getLangField(block.data, 'title')" @input="setLangField(block.data, 'title', ($event.target as HTMLInputElement).value)" />
                  </div>
                  <div>
                    <label class="input-label">{{ t('admin.pageBuilder.description') }}</label>
                    <textarea class="input-field" rows="2" :value="getLangField(block.data, 'description')" @input="setLangField(block.data, 'description', ($event.target as HTMLTextAreaElement).value)" />
                  </div>
                  <div>
                    <label class="input-label">{{ t('admin.pageBuilder.buttonText') }}</label>
                    <input type="text" class="input-field" :value="getLangField(block.data, 'button_text')" @input="setLangField(block.data, 'button_text', ($event.target as HTMLInputElement).value)" />
                  </div>
                </div>
              </template>

              <!-- VIDEO EMBED -->
              <template v-else-if="block.type === 'video_embed'">
                <div class="space-y-4">
                  <div>
                    <label class="input-label">{{ t('admin.pageBuilder.blockTitle') }} ({{ t('admin.pageBuilder.optional') }})</label>
                    <input type="text" class="input-field" :value="getLangField(block.data, 'title')" @input="setLangField(block.data, 'title', ($event.target as HTMLInputElement).value)" />
                  </div>
                  <div>
                    <label class="input-label">Video URL (YouTube / Vimeo)</label>
                    <input type="text" v-model="block.data.video_url" class="input-field" placeholder="https://youtube.com/watch?v=..." @input="hasUnsavedChanges = true" />
                  </div>
                </div>
              </template>

              <!-- TESTIMONIAL -->
              <template v-else-if="block.type === 'testimonial'">
                <div class="space-y-4">
                  <div v-for="(item, i) in block.data.items" :key="i" class="border border-neutral-200 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-3">
                      <span class="text-sm font-medium">Testimonial {{ i + 1 }}</span>
                      <button @click="block.data.items.splice(i, 1); hasUnsavedChanges = true" class="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </div>
                    <div class="space-y-3">
                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <label class="text-xs text-neutral-500">{{ t('admin.pageBuilder.name') }}</label>
                          <input type="text" class="input-field text-sm" :value="item[currentLang]?.name || ''" @input="if(!item[currentLang]) item[currentLang] = {}; item[currentLang].name = ($event.target as HTMLInputElement).value; hasUnsavedChanges = true" />
                        </div>
                        <div>
                          <label class="text-xs text-neutral-500">{{ t('admin.pageBuilder.role') }}</label>
                          <input type="text" class="input-field text-sm" :value="item[currentLang]?.role || ''" @input="if(!item[currentLang]) item[currentLang] = {}; item[currentLang].role = ($event.target as HTMLInputElement).value; hasUnsavedChanges = true" />
                        </div>
                      </div>
                      <div>
                        <label class="text-xs text-neutral-500">{{ t('admin.pageBuilder.quote') }}</label>
                        <textarea class="input-field text-sm" rows="2" :value="item[currentLang]?.quote || ''" @input="if(!item[currentLang]) item[currentLang] = {}; item[currentLang].quote = ($event.target as HTMLTextAreaElement).value; hasUnsavedChanges = true" />
                      </div>
                      <div>
                        <label class="text-xs text-neutral-500">Avatar</label>
                        <input type="file" accept="image/*" class="text-xs" @change="handleBlockImageUpload($event, { data: item }, 'avatar_url')" />
                        <img v-if="item.avatar_url" :src="getImageSrc(item.avatar_url)" class="w-10 h-10 rounded-full object-cover mt-1" />
                      </div>
                    </div>
                  </div>
                  <button @click="block.data.items.push({ avatar_url: '', vi: { name: '', role: '', quote: '' }, en: { name: '', role: '', quote: '' } }); hasUnsavedChanges = true" class="text-sm text-neutral-500 border border-dashed border-neutral-300 rounded-lg px-4 py-2 hover:border-neutral-400 transition-colors">
                    + {{ t('admin.pageBuilder.addItem') }}
                  </button>
                </div>
              </template>

              <!-- TEAM GRID -->
              <template v-else-if="block.type === 'team_grid'">
                <div class="space-y-4">
                  <div>
                    <label class="input-label">{{ t('admin.pageBuilder.sectionTitle') }}</label>
                    <input type="text" class="input-field" :value="getLangField(block.data, 'title')" @input="setLangField(block.data, 'title', ($event.target as HTMLInputElement).value)" />
                  </div>
                  <div v-for="(member, i) in block.data.members" :key="i" class="border border-neutral-200 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-3">
                      <span class="text-sm font-medium">{{ t('admin.pageBuilder.member') }} {{ i + 1 }}</span>
                      <button @click="block.data.members.splice(i, 1); hasUnsavedChanges = true" class="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                      <div>
                        <label class="text-xs text-neutral-500">{{ t('admin.pageBuilder.name') }}</label>
                        <input type="text" class="input-field text-sm" :value="member[currentLang]?.name || ''" @input="if(!member[currentLang]) member[currentLang] = {}; member[currentLang].name = ($event.target as HTMLInputElement).value; hasUnsavedChanges = true" />
                      </div>
                      <div>
                        <label class="text-xs text-neutral-500">{{ t('admin.pageBuilder.role') }}</label>
                        <input type="text" class="input-field text-sm" :value="member[currentLang]?.role || ''" @input="if(!member[currentLang]) member[currentLang] = {}; member[currentLang].role = ($event.target as HTMLInputElement).value; hasUnsavedChanges = true" />
                      </div>
                      <div>
                        <label class="text-xs text-neutral-500">{{ t('admin.pageBuilder.photo') }}</label>
                        <input type="file" accept="image/*" class="text-xs" @change="handleBlockImageUpload($event, { data: member }, 'photo_url')" />
                        <img v-if="member.photo_url" :src="getImageSrc(member.photo_url)" class="w-10 h-10 rounded-full object-cover mt-1" />
                      </div>
                    </div>
                  </div>
                  <button @click="block.data.members.push({ photo_url: '', vi: { name: '', role: '' }, en: { name: '', role: '' } }); hasUnsavedChanges = true" class="text-sm text-neutral-500 border border-dashed border-neutral-300 rounded-lg px-4 py-2 hover:border-neutral-400 transition-colors">
                    + {{ t('admin.pageBuilder.addMember') }}
                  </button>
                </div>
              </template>

              <!-- IMAGE GALLERY -->
              <template v-else-if="block.type === 'image_gallery'">
                <div class="space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="input-label">{{ t('admin.pageBuilder.blockTitle') }} ({{ t('admin.pageBuilder.optional') }})</label>
                      <input type="text" class="input-field" :value="getLangField(block.data, 'title')" @input="setLangField(block.data, 'title', ($event.target as HTMLInputElement).value)" />
                    </div>
                    <div>
                      <label class="input-label">{{ t('admin.pageBuilder.columns') }}</label>
                      <select v-model="block.data.columns" class="input-field" @change="hasUnsavedChanges = true">
                        <option :value="2">2 cột</option>
                        <option :value="3">3 cột</option>
                        <option :value="4">4 cột</option>
                      </select>
                    </div>
                  </div>
                  <div class="grid grid-cols-4 gap-3">
                    <div v-for="(img, i) in block.data.images" :key="i" class="relative">
                      <img :src="getImageSrc(img.url)" class="w-full aspect-square object-cover rounded" />
                      <button @click="block.data.images.splice(i, 1); hasUnsavedChanges = true" class="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">✕</button>
                    </div>
                    <label class="aspect-square border-2 border-dashed border-neutral-300 rounded flex items-center justify-center cursor-pointer hover:border-neutral-400 transition-colors">
                      <span class="text-2xl text-neutral-400">+</span>
                      <input type="file" accept="image/*" class="hidden" @change="async (e: any) => { if(e.target.files?.[0]) { const url = await uploadImage(e.target.files[0]); block.data.images.push({ url }); hasUnsavedChanges = true } }" />
                    </label>
                  </div>
                </div>
              </template>

              <!-- STATS COUNTER -->
              <template v-else-if="block.type === 'stats_counter'">
                <div class="space-y-4">
                  <div>
                    <label class="input-label">{{ t('admin.pageBuilder.sectionTitle') }} ({{ t('admin.pageBuilder.optional') }})</label>
                    <input type="text" class="input-field" :value="getLangField(block.data, 'title')" @input="setLangField(block.data, 'title', ($event.target as HTMLInputElement).value)" />
                  </div>
                  <div v-for="(item, i) in block.data.items" :key="i" class="border border-neutral-200 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-sm font-medium">Stat {{ i + 1 }}</span>
                      <button @click="block.data.items.splice(i, 1); hasUnsavedChanges = true" class="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="text-xs text-neutral-500">{{ t('admin.pageBuilder.value') }}</label>
                        <input type="text" v-model="item.value" class="input-field text-sm" placeholder="100+" @input="hasUnsavedChanges = true" />
                      </div>
                      <div>
                        <label class="text-xs text-neutral-500">{{ t('admin.pageBuilder.label') }}</label>
                        <input type="text" class="input-field text-sm" :value="item[currentLang]?.label || ''" @input="if(!item[currentLang]) item[currentLang] = {}; item[currentLang].label = ($event.target as HTMLInputElement).value; hasUnsavedChanges = true" />
                      </div>
                    </div>
                  </div>
                  <button @click="block.data.items.push({ value: '0', vi: { label: '' }, en: { label: '' } }); hasUnsavedChanges = true" class="text-sm text-neutral-500 border border-dashed border-neutral-300 rounded-lg px-4 py-2 hover:border-neutral-400 transition-colors">
                    + {{ t('admin.pageBuilder.addItem') }}
                  </button>
                </div>
              </template>

              <!-- DIVIDER -->
              <template v-else-if="block.type === 'divider'">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="input-label">{{ t('admin.pageBuilder.height') }} (px)</label>
                    <input type="number" v-model.number="block.data.height" class="input-field" min="10" max="200" @input="hasUnsavedChanges = true" />
                  </div>
                  <div>
                    <label class="input-label">{{ t('admin.pageBuilder.dividerStyle') }}</label>
                    <select v-model="block.data.style" class="input-field" @change="hasUnsavedChanges = true">
                      <option value="line">─ Line</option>
                      <option value="space">Khoảng trống</option>
                    </select>
                  </div>
                </div>
              </template>

              <!-- FAQ -->
              <template v-else-if="block.type === 'faq'">
                <div class="space-y-4">
                  <div>
                    <label class="input-label">{{ t('admin.pageBuilder.sectionTitle') }}</label>
                    <input type="text" class="input-field" :value="getLangField(block.data, 'title')" @input="setLangField(block.data, 'title', ($event.target as HTMLInputElement).value)" />
                  </div>
                  <div v-for="(item, i) in block.data.items" :key="i" class="border border-neutral-200 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-sm font-medium">Q{{ i + 1 }}</span>
                      <button @click="block.data.items.splice(i, 1); hasUnsavedChanges = true" class="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </div>
                    <div class="space-y-3">
                      <div>
                        <label class="text-xs text-neutral-500">{{ t('admin.pageBuilder.question') }}</label>
                        <input type="text" class="input-field text-sm" :value="item[currentLang]?.question || ''" @input="if(!item[currentLang]) item[currentLang] = {}; item[currentLang].question = ($event.target as HTMLInputElement).value; hasUnsavedChanges = true" />
                      </div>
                      <div>
                        <label class="text-xs text-neutral-500">{{ t('admin.pageBuilder.answer') }}</label>
                        <textarea class="input-field text-sm" rows="2" :value="item[currentLang]?.answer || ''" @input="if(!item[currentLang]) item[currentLang] = {}; item[currentLang].answer = ($event.target as HTMLTextAreaElement).value; hasUnsavedChanges = true" />
                      </div>
                    </div>
                  </div>
                  <button @click="block.data.items.push({ vi: { question: '', answer: '' }, en: { question: '', answer: '' } }); hasUnsavedChanges = true" class="text-sm text-neutral-500 border border-dashed border-neutral-300 rounded-lg px-4 py-2 hover:border-neutral-400 transition-colors">
                    + {{ t('admin.pageBuilder.addItem') }}
                  </button>
                </div>
              </template>
            </div>
          </div>
        </template>
      </draggable>

      <!-- Add block button -->
      <div class="mt-4">
        <button v-if="!showAddBlock" @click="showAddBlock = true" class="w-full border-2 border-dashed border-neutral-300 rounded-xl py-6 text-neutral-500 hover:border-neutral-400 hover:text-aura-black transition-colors flex items-center justify-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          {{ t('admin.pageBuilder.addBlock') }}
        </button>

        <!-- Block type picker -->
        <div v-else class="border border-neutral-200 rounded-xl bg-white p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-medium text-sm">{{ t('admin.pageBuilder.selectBlockType') }}</h3>
            <button @click="showAddBlock = false" class="text-neutral-400 hover:text-neutral-600">✕</button>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <button v-for="bt in blockTypes" :key="bt.type" @click="addBlock(bt.type)" class="text-left p-4 border border-neutral-200 rounded-lg hover:border-aura-black hover:bg-neutral-50 transition-all group">
              <div class="text-2xl mb-2">{{ bt.icon }}</div>
              <div class="text-sm font-medium text-aura-black group-hover:text-aura-black">{{ bt.label }}</div>
              <div class="text-xs text-neutral-400 mt-1">{{ bt.desc }}</div>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!blocks.length && !showAddBlock" class="text-center py-8 text-neutral-400">
        <p class="text-sm">{{ t('admin.pageBuilder.emptyState') }}</p>
      </div>
    </div>
  </div>
</template>
