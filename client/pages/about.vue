<script setup lang="ts">
/**
 * About Page
 * AURA ARCHIVE - Company story, mission, and values
 */

import { useI18n } from '#imports'

const { t } = useI18n()
const config = useRuntimeConfig()

// Fetch banners
const { data: bannersData } = await useFetch<{
  success: boolean
  data: { banners: any[] }
}>(`${config.public.apiUrl}/banners`)

// Get about banner (position = 1)
const aboutBanner = computed(() => {
  const banners = bannersData.value?.data?.banners || []
  return banners.find((b: any) => b.position === 1) || null
})

useSeoMeta({
  title: () => `${t('about.title')} | AURA ARCHIVE`,
  description: () => t('about.subtitle'),
})

const values = computed(() => [
  {
    key: 'authenticity',
    icon: 'shield',
  },
  {
    key: 'quality',
    icon: 'star',
  },
  {
    key: 'sustainability',
    icon: 'leaf',
  },
  {
    key: 'service',
    icon: 'heart',
  },
])
</script>

<template>
  <div>
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
              v-if="aboutBanner?.image_url"
              :src="aboutBanner.image_url"
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
          <div 
            v-for="value in values" 
            :key="value.key"
            class="text-center p-6"
          >
            <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-neutral-100 flex items-center justify-center">
              <!-- Shield Icon -->
              <svg v-if="value.icon === 'shield'" class="w-7 h-7 text-aura-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <!-- Star Icon -->
              <svg v-else-if="value.icon === 'star'" class="w-7 h-7 text-aura-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <!-- Leaf Icon -->
              <svg v-else-if="value.icon === 'leaf'" class="w-7 h-7 text-aura-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <!-- Heart Icon -->
              <svg v-else-if="value.icon === 'heart'" class="w-7 h-7 text-aura-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
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
  </div>
</template>
