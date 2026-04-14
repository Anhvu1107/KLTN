<script setup lang="ts">
/**
 * DynamicBlockRenderer
 * AURA ARCHIVE - Renders a single block from page builder data
 */

const props = defineProps<{
  block: any
  locale: string
}>()

const config = useRuntimeConfig()

const getLangField = (data: any, field: string) => {
  return data?.[props.locale]?.[field] || data?.vi?.[field] || ''
}

const getImageSrc = (url: string) => {
  if (!url) return ''
  return url.startsWith('http') ? url : `${config.public.apiUrl}${url}`
}
</script>

<template>
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
            <span class="text-2xl">{{ { shield: '🛡️', star: '⭐', leaf: '🌿', heart: '❤️', check: '✅', globe: '🌍', lightning: '⚡', trophy: '🏆', gem: '💎', clock: '⏰' }[item.icon] || '📦' }}</span>
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
      <h2 v-if="getLangField(block.data, 'title')" class="font-serif text-heading-2 text-center mb-12">{{ getLangField(block.data, 'title') }}</h2>
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
