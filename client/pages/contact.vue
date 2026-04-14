<script setup lang="ts">
/**
 * Contact Page
 * AURA ARCHIVE - Dynamic block-based content with locale fallback + contact form
 */

const { t, locale } = useI18n()
const config = useRuntimeConfig()

// Fetch dynamic page content
const { data: pageData } = await useFetch<{
  success: boolean
  data: { content: any }
}>(`${config.public.apiUrl}/page-content/contact`)

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

// Contact form
const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
})

const isSubmitting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const handleSubmit = async () => {
  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    const response = await $fetch<{
      success: boolean
      message: string
    }>(`${config.public.apiUrl}/contact`, {
      method: 'POST',
      body: {
        name: form.name,
        email: form.email,
        subject: form.subject || undefined,
        message: form.message,
      },
    })

    if (response.success) {
      successMessage.value = t('contact.sent')
      form.name = ''
      form.email = ''
      form.subject = ''
      form.message = ''
    }
  } catch (error: any) {
    errorMessage.value = error?.data?.message || t('contact.sendError')
  } finally {
    isSubmitting.value = false
  }
}

useSeoMeta({
  title: 'Contact Us | AURA ARCHIVE',
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

      <!-- Always show contact form even in dynamic mode -->
      <section class="section">
        <div class="container-aura max-w-2xl mx-auto">
          <div class="bg-white p-8 rounded-sm shadow-card">
            <h2 class="font-serif text-heading-3 text-aura-black mb-6">{{ t('contact.sendMessage') }}</h2>

            <div v-if="successMessage" class="mb-6 p-4 bg-green-50 text-green-800 rounded-sm">
              {{ successMessage }}
            </div>
            <div v-if="errorMessage" class="mb-6 p-4 bg-red-50 text-red-800 rounded-sm">
              {{ errorMessage }}
            </div>

            <form @submit.prevent="handleSubmit" class="space-y-6">
              <div>
                <label for="name" class="input-label">{{ t('contact.name') }} *</label>
                <input id="name" v-model="form.name" type="text" required class="input-field" />
              </div>
              <div>
                <label for="email" class="input-label">{{ t('contact.email') }} *</label>
                <input id="email" v-model="form.email" type="email" required class="input-field" />
              </div>
              <div>
                <label for="subject" class="input-label">{{ t('contact.subject') }}</label>
                <input id="subject" v-model="form.subject" type="text" class="input-field" />
              </div>
              <div>
                <label for="message" class="input-label">{{ t('contact.message') }} *</label>
                <textarea id="message" v-model="form.message" rows="5" required class="input-field" :placeholder="t('contact.messagePlaceholder')"></textarea>
              </div>
              <button type="submit" :disabled="isSubmitting" class="btn-primary w-full">
                {{ isSubmitting ? t('contact.sending') : t('contact.sendMessage') }}
              </button>
            </form>
          </div>
        </div>
      </section>
    </template>

    <!-- ============ FALLBACK: STATIC LOCALE CONTENT ============ -->
    <template v-else>
      <div class="section">
        <div class="container-aura">
          <div class="max-w-4xl mx-auto">
            <!-- Header -->
            <div class="text-center mb-12">
              <h1 class="font-serif text-heading-1 text-aura-black mb-4">{{ t('contact.title') }}</h1>
              <p class="text-body-lg text-neutral-600">{{ t('contact.subtitle') }}</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <!-- Contact Form -->
              <div class="bg-white p-8 rounded-sm shadow-card">
                <h2 class="font-serif text-heading-3 text-aura-black mb-6">{{ t('contact.sendMessage') }}</h2>

                <div v-if="successMessage" class="mb-6 p-4 bg-green-50 text-green-800 rounded-sm">
                  {{ successMessage }}
                </div>
                <div v-if="errorMessage" class="mb-6 p-4 bg-red-50 text-red-800 rounded-sm">
                  {{ errorMessage }}
                </div>

                <form @submit.prevent="handleSubmit" class="space-y-6">
                  <div>
                    <label for="name" class="input-label">{{ t('contact.name') }} *</label>
                    <input id="name" v-model="form.name" type="text" required class="input-field" />
                  </div>
                  <div>
                    <label for="email" class="input-label">{{ t('contact.email') }} *</label>
                    <input id="email" v-model="form.email" type="email" required class="input-field" />
                  </div>
                  <div>
                    <label for="subject" class="input-label">{{ t('contact.subject') }}</label>
                    <input id="subject" v-model="form.subject" type="text" class="input-field" />
                  </div>
                  <div>
                    <label for="message" class="input-label">{{ t('contact.message') }} *</label>
                    <textarea id="message" v-model="form.message" rows="5" required class="input-field" :placeholder="t('contact.messagePlaceholder')"></textarea>
                  </div>
                  <button type="submit" :disabled="isSubmitting" class="btn-primary w-full">
                    {{ isSubmitting ? t('contact.sending') : t('contact.sendMessage') }}
                  </button>
                </form>
              </div>

              <!-- Contact Info -->
              <div class="space-y-8">
                <div>
                  <h2 class="font-serif text-heading-3 text-aura-black mb-6">{{ t('contact.info') }}</h2>
                  <div class="space-y-6">
                    <div>
                      <h3 class="text-body font-medium text-aura-black mb-2">{{ t('contact.addressLabel') }}</h3>
                      <p class="text-body text-neutral-600">{{ t('contact.addressValue') }}</p>
                    </div>
                    <div>
                      <h3 class="text-body font-medium text-aura-black mb-2">{{ t('contact.phoneLabel') }}</h3>
                      <p class="text-body text-neutral-600">{{ t('contact.phoneValue') }}</p>
                    </div>
                    <div>
                      <h3 class="text-body font-medium text-aura-black mb-2">{{ t('contact.emailLabel') }}</h3>
                      <p class="text-body text-neutral-600">{{ t('contact.emailValue') }}</p>
                    </div>
                    <div>
                      <h3 class="text-body font-medium text-aura-black mb-2">{{ t('contact.hours') }}</h3>
                      <p class="text-body text-neutral-600">{{ t('contact.hoursValue') }}</p>
                    </div>
                  </div>
                </div>

                <!-- Social Links -->
                <div>
                  <h3 class="text-body font-medium text-aura-black mb-4">{{ t('contact.followUs') }}</h3>
                  <div class="flex gap-4">
                    <a href="#" class="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </a>
                    <a href="#" class="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
