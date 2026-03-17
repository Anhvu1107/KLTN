<script setup lang="ts">
/**
 * Admin Blogs Page
 * AURA ARCHIVE - Blog management with CRUD
 */

import { useDialog } from '~/composables/useDialog'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { t } = useI18n()
const config = useRuntimeConfig()
const getToken = () => process.client ? localStorage.getItem('token') : null
const { confirm: showConfirm } = useDialog()

// State
const blogs = ref<any[]>([])
const pagination = ref<any>({})
const isLoading = ref(true)
const showModal = ref(false)
const editingBlog = ref<any>(null)
const formError = ref('')
const isSubmitting = ref(false)

// Form data
const formData = ref({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  featured_image: '',
  category: 'News',
  tags: [] as string[],
  status: 'draft',
})

const categories = ['News', 'Fashion Tips', 'Style Guide', 'Behind the Scenes', 'Sustainability']
const statuses = ['draft', 'published', 'archived']

// Fetch blogs
const fetchBlogs = async () => {
  isLoading.value = true
  try {
    const token = getToken()
    const response = await $fetch<{ success: boolean; data: { blogs: any[]; pagination: any } }>(
      `${config.public.apiUrl}/admin/blogs`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    blogs.value = response.data.blogs
    pagination.value = response.data.pagination
  } catch (error) {
    console.error('Failed to fetch blogs:', error)
  } finally {
    isLoading.value = false
  }
}

// Generate slug from title
const generateSlug = () => {
  formData.value.slug = formData.value.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Open create modal
const openCreateModal = () => {
  editingBlog.value = null
  formData.value = {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image: '',
    category: 'News',
    tags: [],
    status: 'draft',
  }
  showModal.value = true
}

// Open edit modal
const openEditModal = (blog: any) => {
  editingBlog.value = blog
  formData.value = {
    title: blog.title,
    slug: blog.slug,
    excerpt: blog.excerpt || '',
    content: blog.content,
    featured_image: blog.featured_image || '',
    category: blog.category || 'News',
    tags: blog.tags || [],
    status: blog.status,
  }
  showModal.value = true
}

// Submit form
const submitForm = async () => {
  formError.value = ''
  isSubmitting.value = true

  try {
    const token = getToken()
    const url = editingBlog.value
      ? `${config.public.apiUrl}/admin/blogs/${editingBlog.value.id}`
      : `${config.public.apiUrl}/admin/blogs`
    
    await $fetch(url, {
      method: editingBlog.value ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData.value,
    })

    showModal.value = false
    await fetchBlogs()
  } catch (error: any) {
    formError.value = error.data?.message || t('notifications.saveError')
  } finally {
    isSubmitting.value = false
  }
}

// Delete blog
const deleteBlog = async (id: string) => {
  const ok = await showConfirm({ title: t('admin.deleteConfirm'), message: t('admin.deleteConfirmDesc', 'Hành động này không thể hoàn tác. Bạn có chắc chắn?'), type: 'danger', confirmText: t('common.delete'), icon: 'trash' })
  if (!ok) return

  try {
    const token = getToken()
    await $fetch(`${config.public.apiUrl}/admin/blogs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    await fetchBlogs()
  } catch (error) {
    console.error('Failed to delete blog:', error)
  }
}

// Format date
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('vi-VN')
}

// Get status class
const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-700',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-neutral-100 text-neutral-500',
  }
  return classes[status] || 'bg-neutral-100'
}

onMounted(fetchBlogs)

useSeoMeta({ title: () => `${t('admin.blogs.title')} | Admin` })
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-serif text-heading-2 text-aura-black">{{ t('admin.blogs.title') }}</h1>
      <button @click="openCreateModal" class="btn-primary">
        + {{ t('admin.blogs.addBlog') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto"></div>
    </div>

    <!-- Blogs Table -->
    <div v-else class="card overflow-hidden">
      <table class="w-full">
        <thead class="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th class="text-left px-4 py-3 text-caption uppercase tracking-wider text-neutral-500">{{ t('admin.blogs.titleColumn') }}</th>
            <th class="text-left px-4 py-3 text-caption uppercase tracking-wider text-neutral-500">{{ t('shop.category') }}</th>
            <th class="text-left px-4 py-3 text-caption uppercase tracking-wider text-neutral-500">{{ t('common.status') }}</th>
            <th class="text-left px-4 py-3 text-caption uppercase tracking-wider text-neutral-500">{{ t('admin.blogs.views') }}</th>
            <th class="text-left px-4 py-3 text-caption uppercase tracking-wider text-neutral-500">{{ t('orders.date') }}</th>
            <th class="text-right px-4 py-3 text-caption uppercase tracking-wider text-neutral-500">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="blog in blogs" :key="blog.id" class="border-b border-neutral-100 hover:bg-neutral-50">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <img 
                  v-if="blog.featured_image" 
                  :src="blog.featured_image" 
                  :alt="blog.title"
                  class="w-12 h-12 object-cover rounded-sm"
                />
                <div v-else class="w-12 h-12 bg-neutral-100 rounded-sm flex items-center justify-center text-neutral-400">
                  📝
                </div>
                <div>
                  <p class="font-medium text-aura-black">{{ blog.title }}</p>
                  <p class="text-caption text-neutral-500">{{ blog.slug }}</p>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 text-body-sm">{{ blog.category }}</td>
            <td class="px-4 py-3">
              <span :class="getStatusClass(blog.status)" class="px-2 py-1 text-caption rounded">
                {{ t(`admin.blogs.${blog.status}`) }}
              </span>
            </td>
            <td class="px-4 py-3 text-body-sm text-neutral-600">{{ blog.view_count || 0 }}</td>
            <td class="px-4 py-3 text-body-sm text-neutral-600">{{ formatDate(blog.published_at || blog.created_at) }}</td>
            <td class="px-4 py-3 text-right">
              <button @click="openEditModal(blog)" class="text-neutral-600 hover:text-aura-black mr-3">{{ t('common.edit') }}</button>
              <button @click="deleteBlog(blog.id)" class="text-red-600 hover:text-red-700">{{ t('common.delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="blogs.length === 0" class="text-center py-12 text-neutral-500">
        {{ t('admin.blogs.noBlogs') }}
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="bg-white rounded-sm w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6 border-b border-neutral-200">
            <h2 class="font-serif text-heading-4">{{ editingBlog ? t('admin.blogs.editBlog') : t('admin.blogs.createBlog') }}</h2>
          </div>

          <form @submit.prevent="submitForm" class="p-6 space-y-4">
            <div>
              <label class="input-label">{{ t('admin.blogs.titleColumn') }} *</label>
              <input v-model="formData.title" @blur="!editingBlog && generateSlug()" type="text" class="input-field" required />
            </div>

            <div>
              <label class="input-label">Slug *</label>
              <input v-model="formData.slug" type="text" class="input-field font-mono" required />
            </div>

            <div>
              <label class="input-label">{{ t('admin.blogs.excerpt') }}</label>
              <textarea v-model="formData.excerpt" rows="2" class="input-field"></textarea>
            </div>

            <div>
              <label class="input-label">{{ t('admin.blogs.content') }} *</label>
              <textarea v-model="formData.content" rows="8" class="input-field" required></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="input-label">{{ t('admin.blogs.featuredImage') }}</label>
                <input v-model="formData.featured_image" type="url" class="input-field" placeholder="https://..." />
              </div>
              <div>
                <label class="input-label">{{ t('shop.category') }}</label>
                <select v-model="formData.category" class="input-field">
                  <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>
            </div>

            <div>
              <label class="input-label">{{ t('common.status') }}</label>
              <select v-model="formData.status" class="input-field">
                <option v-for="s in statuses" :key="s" :value="s">{{ t(`admin.blogs.${s}`) }}</option>
              </select>
            </div>

            <p v-if="formError" class="text-red-600 text-body-sm">{{ formError }}</p>

            <div class="flex justify-end gap-3 pt-4">
              <button type="button" @click="showModal = false" class="px-4 py-2 text-body-sm text-neutral-600 hover:text-aura-black">
                {{ t('common.cancel') }}
              </button>
              <button type="submit" :disabled="isSubmitting" class="btn-primary">
                {{ isSubmitting ? t('common.saving') : t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
