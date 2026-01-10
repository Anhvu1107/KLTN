<script setup lang="ts">
/**
 * Blog Listing Page
 * AURA ARCHIVE - News and articles
 */

const config = useRuntimeConfig()
const route = useRoute()

const page = ref(Number(route.query.page) || 1)
const category = ref(route.query.category as string || '')

const { data, pending } = await useFetch<{
  success: boolean
  data: {
    blogs: any[]
    pagination: { total: number; page: number; totalPages: number }
  }
}>(() => `${config.public.apiUrl}/blogs?page=${page.value}&limit=9${category.value ? `&category=${category.value}` : ''}`, {
  watch: [page, category],
})

const { data: categoriesData } = await useFetch<{
  success: boolean
  data: { categories: string[] }
}>(`${config.public.apiUrl}/blogs/categories`)

const blogs = computed(() => data.value?.data?.blogs || [])
const pagination = computed(() => data.value?.data?.pagination || {})
const categories = computed(() => categoriesData.value?.data?.categories || [])

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

useSeoMeta({
  title: 'Blog | AURA ARCHIVE',
  description: 'Tin tức thời trang, xu hướng và mẹo phong cách từ AURA ARCHIVE',
})
</script>

<template>
  <div class="section">
    <div class="container-aura">
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="font-serif text-display-2 text-aura-black mb-4">Blog</h1>
        <p class="text-body-lg text-neutral-600">Tin tức, xu hướng và mẹo phong cách</p>
      </div>

      <!-- Categories -->
      <div v-if="categories.length" class="flex flex-wrap justify-center gap-3 mb-12">
        <button
          @click="category = ''"
          class="px-4 py-2 text-body-sm border transition-colors"
          :class="!category ? 'bg-aura-black text-white border-aura-black' : 'border-neutral-300 hover:border-aura-black'"
        >
          Tất cả
        </button>
        <button
          v-for="cat in categories"
          :key="cat"
          @click="category = cat"
          class="px-4 py-2 text-body-sm border transition-colors"
          :class="category === cat ? 'bg-aura-black text-white border-aura-black' : 'border-neutral-300 hover:border-aura-black'"
        >
          {{ cat }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="pending" class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto"></div>
      </div>

      <!-- Blog Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <NuxtLink
          v-for="blog in blogs"
          :key="blog.id"
          :to="`/blog/${blog.slug}`"
          class="group"
        >
          <div class="aspect-[16/10] bg-neutral-100 overflow-hidden mb-4">
            <img
              v-if="blog.featured_image"
              :src="blog.featured_image"
              :alt="blog.title"
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div>
            <p class="text-caption text-neutral-500 uppercase tracking-wider mb-2">
              {{ blog.category }} · {{ formatDate(blog.published_at) }}
            </p>
            <h2 class="font-serif text-heading-4 text-aura-black mb-2 group-hover:text-accent-burgundy transition-colors line-clamp-2">
              {{ blog.title }}
            </h2>
            <p class="text-body text-neutral-600 line-clamp-2">{{ blog.excerpt }}</p>
          </div>
        </NuxtLink>
      </div>

      <!-- Empty -->
      <div v-if="!pending && blogs.length === 0" class="text-center py-16">
        <p class="text-neutral-500">Chưa có bài viết nào</p>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-12">
        <button
          v-for="p in pagination.totalPages"
          :key="p"
          @click="page = p"
          class="w-10 h-10 flex items-center justify-center text-body-sm transition-colors"
          :class="p === pagination.page ? 'bg-aura-black text-white' : 'border border-neutral-300 hover:border-aura-black'"
        >
          {{ p }}
        </button>
      </div>
    </div>
  </div>
</template>
