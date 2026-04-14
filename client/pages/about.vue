<script setup lang="ts">
/**
 * About Page
 * AURA ARCHIVE - Dynamic block-based content with locale fallback
 */

const { t, locale } = useI18n()
const config = useRuntimeConfig()

// Fetch dynamic page content
const { data: pageData } = await useFetch<{
  success: boolean
  data: { content: any }
}>(`${config.public.apiUrl}/page-content/about`)

// Fetch banner for fallback image
const { data: bannersData } = await useFetch<{
  success: boolean
  data: { banners: any[] }
}>(`${config.public.apiUrl}/banners?section=about`)

const aboutBanner = computed(() => {
  const banners = bannersData.value?.data?.banners || []
  return banners[0] || null
})

const aboutBannerImage = computed(() => {
  const url = aboutBanner.value?.image_url
  if (!url) return ''
  return url.startsWith('http') ? url : `${config.public.apiUrl}${url}`
})

// Dynamic blocks (if published)
const blocks = computed(() => pageData.value?.data?.content?.blocks || [])
const hasPublishedContent = computed(() => blocks.value.length > 0)

// Get language-specific field
const getLangField = (data: any, field: string) => {
  const lang = locale.value as string
  return data?.[lang]?.[field] || data?.vi?.[field] || ''
}

// Get image URL
const getImageSrc = (url: string) => {
  if (!url) return ''
  return url.startsWith('http') ? url : `${config.public.apiUrl}${url}`
}

// Fallback values for static content
const values = computed(() => [
  { key: 'authenticity', icon: 'shield' },
  { key: 'quality', icon: 'star' },
  { key: 'sustainability', icon: 'leaf' },
  { key: 'service', icon: 'heart' },
])

useSeoMeta({
  title: () => `${t('about.title')} | AURA ARCHIVE`,
  description: () => t('about.subtitle'),
})
</script>

<template>
  <div>
    <!-- ============ DYNAMIC BLOCKS MODE ============ -->
    <template v-if="hasPublishedContent">
      <template v-for="block in blocks" :key="block.id">
        <!-- Hero Text -->
        <section v-if="block.type === 'hero_text'" class="section bg-neutral-50">
          <div class="container-aura text-center max-w-3xl mx-auto">
            <h1 class="font-serif text-display-2 lg:text-display-1 text-aura-black mb-6">
              {{ getLangField(block.data, 'title') }}
            </h1>
            <p class="text-body-lg text-neutral-600">
              {{ getLangField(block.data, 'subtitle') }}
            </p>
          </div>
        </section>

        <!-- Image + Text -->
        <section v-else-if="block.type === 'image_text'" class="section">
          <div class="container-aura">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div :class="block.data.image_position === 'right' ? 'lg:order-2' : ''" class="aspect-[4/5] bg-neutral-100 rounded-sm overflow-hidden">
                <img v-if="block.data.image_url" :src="getImageSrc(block.data.image_url)" :alt="getLangField(block.data, 'title')" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center text-neutral-300">
                  <svg class="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
              </div>
              <div :class="block.data.image_position === 'right' ? 'lg:order-1' : ''">
                <h2 class="font-serif text-heading-2 text-aura-black mb-6">{{ getLangField(block.data, 'title') }}</h2>
                <p class="text-body text-neutral-600 leading-relaxed whitespace-pre-line">{{ getLangField(block.data, 'content') }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Full-width Text -->
        <section v-else-if="block.type === 'fullwidth_text'" class="section" :class="block.data.theme === 'dark' ? 'bg-aura-black text-aura-white' : ''">
          <div class="container-aura text-center max-w-3xl mx-auto">
            <h2 class="font-serif text-heading-2 mb-6">{{ getLangField(block.data, 'title') }}</h2>
            <p class="text-body-lg leading-relaxed whitespace-pre-line" :class="block.data.theme === 'dark' ? 'text-neutral-300' : 'text-neutral-600'">
              {{ getLangField(block.data, 'content') }}
            </p>
          </div>
        </section>

        <!-- Values Grid -->
        <section v-else-if="block.type === 'values_grid'" class="section">
          <div class="container-aura">
            <div v-if="getLangField(block.data, 'title')" class="text-center mb-12">
              <h2 class="font-serif text-heading-2 text-aura-black mb-4">{{ getLangField(block.data, 'title') }}</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div v-for="(item, i) in block.data.items" :key="i" class="text-center p-6">
                <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-neutral-100 flex items-center justify-center">
                  <!-- Dynamic icons -->
                  <svg v-if="item.icon === 'shield'" class="w-7 h-7 text-aura-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  <svg v-else-if="item.icon === 'star'" class="w-7 h-7 text-aura-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                  <svg v-else-if="item.icon === 'leaf'" class="w-7 h-7 text-aura-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                  <svg v-else-if="item.icon === 'heart'" class="w-7 h-7 text-aura-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  <span v-else class="text-2xl">{{ { check: '✅', globe: '🌍', lightning: '⚡', trophy: '🏆', gem: '💎', clock: '⏰' }[item.icon] || '📦' }}</span>
                </div>
                <h3 class="font-serif text-heading-4 text-aura-black mb-3">{{ item[locale]?.title || item.vi?.title }}</h3>
                <p class="text-body text-neutral-600">{{ item[locale]?.description || item.vi?.description }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- CTA -->
        <section v-else-if="block.type === 'cta'" class="section" :class="block.data.theme === 'dark' ? 'bg-aura-black text-aura-white' : 'bg-neutral-50'">
          <div class="container-aura text-center">
            <h2 class="font-serif text-heading-2 mb-4">{{ getLangField(block.data, 'title') }}</h2>
            <p class="text-body mb-8 max-w-xl mx-auto" :class="block.data.theme === 'dark' ? 'text-neutral-300' : 'text-neutral-600'">
              {{ getLangField(block.data, 'description') }}
            </p>
            <NuxtLink v-if="block.data.button_link" :to="block.data.button_link" class="btn-primary">
              {{ getLangField(block.data, 'button_text') }}
            </NuxtLink>
          </div>
        </section>

        <!-- Video Embed -->
        <section v-else-if="block.type === 'video_embed'" class="section">
          <div class="container-aura max-w-4xl mx-auto">
            <h2 v-if="getLangField(block.data, 'title')" class="font-serif text-heading-2 text-center mb-8">{{ getLangField(block.data, 'title') }}</h2>
            <div class="aspect-video bg-neutral-900 rounded-lg overflow-hidden">
              <iframe v-if="block.data.video_url" :src="block.data.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')" class="w-full h-full" frameborder="0" allowfullscreen />
            </div>
          </div>
        </section>

        <!-- Testimonial -->
        <section v-else-if="block.type === 'testimonial'" class="section bg-neutral-50">
          <div class="container-aura max-w-4xl mx-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div v-for="(item, i) in block.data.items" :key="i" class="bg-white p-8 rounded-lg shadow-sm">
                <p class="text-neutral-600 italic mb-6 leading-relaxed">"{{ item[locale]?.quote || item.vi?.quote }}"</p>
                <div class="flex items-center gap-3">
                  <div v-if="item.avatar_url" class="w-10 h-10 rounded-full overflow-hidden bg-neutral-200">
                    <img :src="getImageSrc(item.avatar_url)" class="w-full h-full object-cover" />
                  </div>
                  <div v-else class="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-500">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <div>
                    <div class="font-medium text-sm text-aura-black">{{ item[locale]?.name || item.vi?.name }}</div>
                    <div class="text-xs text-neutral-500">{{ item[locale]?.role || item.vi?.role }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Team Grid -->
        <section v-else-if="block.type === 'team_grid'" class="section">
          <div class="container-aura">
            <h2 v-if="getLangField(block.data, 'title')" class="font-serif text-heading-2 text-aura-black text-center mb-12">{{ getLangField(block.data, 'title') }}</h2>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              <div v-for="(member, i) in block.data.members" :key="i" class="text-center">
                <div class="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-neutral-100">
                  <img v-if="member.photo_url" :src="getImageSrc(member.photo_url)" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center text-neutral-400">
                    <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                </div>
                <h3 class="font-medium text-aura-black">{{ member[locale]?.name || member.vi?.name }}</h3>
                <p class="text-sm text-neutral-500">{{ member[locale]?.role || member.vi?.role }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Image Gallery -->
        <section v-else-if="block.type === 'image_gallery'" class="section">
          <div class="container-aura">
            <h2 v-if="getLangField(block.data, 'title')" class="font-serif text-heading-2 text-center mb-12">{{ getLangField(block.data, 'title') }}</h2>
            <div class="grid gap-4" :style="{ gridTemplateColumns: `repeat(${block.data.columns || 3}, 1fr)` }">
              <div v-for="(img, i) in block.data.images" :key="i" class="aspect-square bg-neutral-100 rounded-lg overflow-hidden">
                <img :src="getImageSrc(img.url)" class="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        <!-- Stats Counter -->
        <section v-else-if="block.type === 'stats_counter'" class="section bg-aura-black text-white">
          <div class="container-aura">
            <h2 v-if="getLangField(block.data, 'title')" class="font-serif text-heading-2 text-center mb-12">{{ getLangField(block.data, 'title') }}</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div v-for="(item, i) in block.data.items" :key="i">
                <div class="text-4xl font-bold mb-2">{{ item.value }}</div>
                <div class="text-neutral-400 text-sm">{{ item[locale]?.label || item.vi?.label }}</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Divider -->
        <div v-else-if="block.type === 'divider'" :style="{ height: (block.data.height || 40) + 'px' }" class="flex items-center">
          <div v-if="block.data.style === 'line'" class="w-full container-aura border-t border-neutral-200" />
        </div>

        <!-- FAQ -->
        <section v-else-if="block.type === 'faq'" class="section">
          <div class="container-aura max-w-3xl mx-auto">
            <h2 v-if="getLangField(block.data, 'title')" class="font-serif text-heading-2 text-center mb-12">{{ getLangField(block.data, 'title') }}</h2>
            <div class="space-y-4">
              <details v-for="(item, i) in block.data.items" :key="i" class="border border-neutral-200 rounded-lg group">
                <summary class="p-5 cursor-pointer font-medium text-aura-black flex items-center justify-between list-none">
                  {{ item[locale]?.question || item.vi?.question }}
                  <svg class="w-5 h-5 text-neutral-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </summary>
                <div class="px-5 pb-5 text-neutral-600 text-sm leading-relaxed">
                  {{ item[locale]?.answer || item.vi?.answer }}
                </div>
              </details>
            </div>
          </div>
        </section>
      </template>
    </template>

    <!-- ============ FALLBACK: STATIC LOCALE CONTENT ============ -->
    <template v-else>
      <!-- Hero Section -->
      <section class="section bg-neutral-50">
        <div class="container-aura text-center max-w-3xl mx-auto">
          <h1 class="font-serif text-display-2 lg:text-display-1 text-aura-black mb-6">
            {{ t('about.title') }}
          </h1>
          <p class="text-body-lg text-neutral-600">
            {{ t('about.subtitle') }}
          </p>
        </div>
      </section>

      <!-- Our Story -->
      <section class="section">
        <div class="container-aura">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <!-- Image from Banner -->
            <div class="aspect-[4/5] bg-neutral-100 rounded-sm overflow-hidden">
              <img
                v-if="aboutBannerImage"
                :src="aboutBannerImage"
                :alt="aboutBanner.title || t('about.story')"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-neutral-300">
                <svg class="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <!-- Story Content -->
            <div>
              <h2 class="font-serif text-heading-2 text-aura-black mb-6">{{ t('about.story') }}</h2>
              <p class="text-body text-neutral-600 mb-6 leading-relaxed">
                {{ t('about.storyText1') }}
              </p>
              <p class="text-body text-neutral-600 leading-relaxed">
                {{ t('about.storyText2') }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Mission -->
      <section class="section bg-aura-black text-aura-white">
        <div class="container-aura text-center max-w-3xl mx-auto">
          <h2 class="font-serif text-heading-2 mb-6">{{ t('about.mission') }}</h2>
          <p class="text-body-lg text-neutral-300 leading-relaxed">
            {{ t('about.missionText') }}
          </p>
        </div>
      </section>

      <!-- Values -->
      <section class="section">
        <div class="container-aura">
          <div class="text-center mb-12">
            <h2 class="font-serif text-heading-2 text-aura-black mb-4">{{ t('about.values') }}</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div v-for="value in values" :key="value.key" class="text-center p-6">
              <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-neutral-100 flex items-center justify-center">
                <svg v-if="value.icon === 'shield'" class="w-7 h-7 text-aura-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                <svg v-else-if="value.icon === 'star'" class="w-7 h-7 text-aura-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                <svg v-else-if="value.icon === 'leaf'" class="w-7 h-7 text-aura-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                <svg v-else-if="value.icon === 'heart'" class="w-7 h-7 text-aura-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </div>
              <h3 class="font-serif text-heading-4 text-aura-black mb-3">
                {{ t(`about.${value.key}`) }}
              </h3>
              <p class="text-body text-neutral-600">
                {{ t(`about.${value.key}Desc`) }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="section bg-neutral-50">
        <div class="container-aura text-center">
          <h2 class="font-serif text-heading-2 text-aura-black mb-4">{{ t('about.team') }}</h2>
          <p class="text-body text-neutral-600 mb-8 max-w-xl mx-auto">
            {{ t('about.teamDesc') }}
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <NuxtLink to="/contact" class="btn-primary">
              {{ t('common.contact') }}
            </NuxtLink>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
