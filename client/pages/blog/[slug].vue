<script setup lang="ts">
/**
 * Blog Detail Page
 * AURA ARCHIVE - Single blog post
 */

const config = useRuntimeConfig()
const route = useRoute()
const slug = route.params.slug as string

// Import sanitizer for XSS protection
const { sanitize } = useSanitizeHtml()

const { data, pending, error } = await useFetch<{
  success: boolean
  data: { blog: any }
}>(`${config.public.apiUrl}/blogs/${slug}`)

const blog = computed(() => data.value?.data?.blog)

// Sanitize blog content to prevent XSS
const sanitizedContent = computed(() => {
  if (!blog.value?.content) return ''
  return sanitize(blog.value.content)
})

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

useSeoMeta({
  title: () => blog.value ? `${blog.value.title} | AURA ARCHIVE Blog` : 'Blog | AURA ARCHIVE',
  description: () => blog.value?.excerpt || '',
})
</script>

<template>
  <div class="section">
    <div class="container-aura max-w-3xl">
      <!-- Loading -->
      <div v-if="pending" class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto"></div>
      </div>

      <!-- Not Found -->
      <div v-else-if="error || !blog" class="text-center py-16">
        <h1 class="font-serif text-heading-1 text-aura-black mb-4">Không tìm thấy bài viết</h1>
        <NuxtLink to="/blog" class="btn-secondary">← Quay lại Blog</NuxtLink>
      </div>

      <!-- Blog Content -->
      <article v-else>
        <!-- Back link -->
        <NuxtLink to="/blog" class="text-body-sm text-neutral-500 hover:text-aura-black mb-6 inline-block">
          ← Quay lại Blog
        </NuxtLink>

        <!-- Header -->
        <header class="mb-8">
          <p class="text-caption text-accent-burgundy uppercase tracking-wider mb-3">
            {{ blog.category }}
          </p>
          <h1 class="font-serif text-display-2 text-aura-black mb-4 leading-tight">{{ blog.title }}</h1>
          <p class="text-body text-neutral-500">
            {{ formatDate(blog.published_at) }}
            <span v-if="blog.author"> · {{ blog.author.first_name }} {{ blog.author.last_name }}</span>
          </p>
        </header>

        <!-- Featured Image -->
        <div v-if="blog.featured_image" class="aspect-video bg-neutral-100 overflow-hidden mb-8">
          <img
            :src="blog.featured_image"
            :alt="blog.title"
            class="w-full h-full object-cover"
          />
        </div>

        <!-- Content - SANITIZED for XSS protection -->
        <div 
          class="prose prose-lg max-w-none"
          v-html="sanitizedContent"
        />

        <!-- Tags -->
        <div v-if="blog.tags?.length" class="flex flex-wrap gap-2 mt-8 pt-8 border-t">
          <span
            v-for="tag in blog.tags"
            :key="tag"
            class="px-3 py-1 bg-neutral-100 text-body-sm text-neutral-600"
          >
            #{{ tag }}
          </span>
        </div>

        <!-- Share -->
        <div class="mt-8 pt-8 border-t">
          <p class="text-body-sm text-neutral-500 mb-3">Chia sẻ bài viết:</p>
          <div class="flex gap-3">
            <a
              :href="`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent($route.fullPath)}`"
              target="_blank"
              class="w-10 h-10 flex items-center justify-center border border-neutral-300 hover:border-aura-black transition-colors"
            >
              <span class="text-body-sm">FB</span>
            </a>
            <a
              :href="`https://twitter.com/intent/tweet?url=${encodeURIComponent($route.fullPath)}&text=${encodeURIComponent(blog.title)}`"
              target="_blank"
              class="w-10 h-10 flex items-center justify-center border border-neutral-300 hover:border-aura-black transition-colors"
            >
              <span class="text-body-sm">X</span>
            </a>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style>
.prose h2 {
  @apply font-serif text-heading-3 text-aura-black mt-8 mb-4;
}
.prose h3 {
  @apply font-serif text-heading-4 text-aura-black mt-6 mb-3;
}
.prose p {
  @apply text-body text-neutral-700 mb-4 leading-relaxed;
}
.prose a {
  @apply text-accent-burgundy underline;
}
.prose ul, .prose ol {
  @apply mb-4 pl-6;
}
.prose li {
  @apply mb-2;
}
.prose blockquote {
  @apply border-l-4 border-accent-burgundy pl-4 italic text-neutral-600;
}
</style>
