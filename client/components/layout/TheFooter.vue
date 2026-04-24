<script setup lang="ts">
/**
 * TheFooter - Ralph Lauren Inspired
 * AURA ARCHIVE - Elegant multi-column footer with prominent newsletter
 */

const { t } = useI18n()
const config = useRuntimeConfig()
const {
  fetchSettings,
  siteName,
  logoUrl,
  socialFacebookUrl,
  socialInstagramUrl,
  socialTiktokUrl,
  socialYoutubeUrl,
} = useSiteSettings()

// Newsletter form
const newsletterEmail = ref('')
const isSubscribing = ref(false)
const subscribeMessage = ref('')
const subscribeError = ref('')

const handleSubscribe = async () => {
  if (!newsletterEmail.value) return
  
  isSubscribing.value = true
  subscribeMessage.value = ''
  subscribeError.value = ''
  
  try {
    const response = await $fetch<{
      success: boolean
      message: string
    }>(`${config.public.apiUrl}/newsletter/subscribe`, {
      method: 'POST',
      body: { email: newsletterEmail.value },
    })

    if (response.success) {
      subscribeMessage.value = response.message
      newsletterEmail.value = ''
    }
  } catch (error: any) {
    subscribeError.value = error?.data?.message || 'Failed to subscribe. Please try again.'
  } finally {
    isSubscribing.value = false
  }
}

// Footer links
const shopLinks = computed(() => [
  { name: t('nav.newArrivals'), href: '/new-arrivals' },
  { name: t('nav.featured'), href: '/featured' },
  { name: t('home.women'), href: '/shop?subcategory=Women' },
  { name: t('home.men'), href: '/shop?subcategory=Men' },
])

const customerLinks = computed(() => [
  { name: t('common.contact'), href: '/contact' },
  { name: t('footer.faq'), href: '/faqs' },
  { name: t('footer.shipping'), href: '/shipping' },
  { name: t('footer.returns'), href: '/returns' },
])

const companyLinks = computed(() => [
  { name: t('footer.about'), href: '/about' },
  { name: 'Blog', href: '/blog' },
  { name: t('footer.privacy'), href: '/privacy' },
  { name: t('footer.terms'), href: '/terms' },
])

const socialLinks = computed(() => [
  { name: 'Facebook', href: socialFacebookUrl.value, icon: 'ph:facebook-logo' },
  { name: 'Instagram', href: socialInstagramUrl.value, icon: 'ph:instagram-logo' },
  { name: 'TikTok', href: socialTiktokUrl.value, icon: 'ph:tiktok-logo' },
  { name: 'YouTube', href: socialYoutubeUrl.value, icon: 'ph:youtube-logo' },
].filter((link) => link.href))

onMounted(() => {
  fetchSettings()
})
</script>

<template>
  <footer class="bg-aura-black text-white">
    <!-- Main Footer -->
    <div class="container-aura py-20 lg:py-24">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
        
        <!-- Newsletter Section (takes more space) -->
        <div class="lg:col-span-5">
          <h2 class="font-serif text-heading-3 mb-4">{{ t('footer.newsletter') }}</h2>
          <p class="text-body text-neutral-400 mb-6 max-w-sm leading-relaxed">
            {{ t('footer.newsletterText') }}
          </p>
          
          <!-- Success/Error Messages -->
          <div v-if="subscribeMessage" class="mb-4 p-3 bg-green-900/30 border border-green-700 text-green-400 text-caption">
            {{ subscribeMessage }}
          </div>
          <div v-if="subscribeError" class="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-400 text-caption">
            {{ subscribeError }}
          </div>
          
          <form @submit.prevent="handleSubscribe" class="flex">
            <input
              v-model="newsletterEmail"
              type="email"
              :placeholder="t('footer.emailPlaceholder')"
              class="flex-1 px-5 py-3.5 bg-transparent border border-neutral-700 text-white text-body-sm placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors"
              :disabled="isSubscribing"
            />
            <button 
              type="submit" 
              :disabled="isSubscribing || !newsletterEmail"
              class="px-6 py-3.5 bg-white text-aura-black text-caption uppercase tracking-widest font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubscribing ? '...' : t('footer.subscribe') }}
            </button>
          </form>
        </div>

        <!-- Spacer -->
        <div class="hidden lg:block lg:col-span-1" />

        <!-- Shop Links -->
        <div class="lg:col-span-2">
          <h3 class="text-caption uppercase tracking-[0.2em] text-neutral-400 mb-6">{{ t('common.shop') }}</h3>
          <ul class="space-y-3">
            <li v-for="link in shopLinks" :key="link.href">
              <NuxtLink
                :to="link.href"
                class="text-body-sm text-neutral-300 hover:text-white transition-colors"
              >
                {{ link.name }}
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Customer Service -->
        <div class="lg:col-span-2">
          <h3 class="text-caption uppercase tracking-[0.2em] text-neutral-400 mb-6">{{ t('footer.help') }}</h3>
          <ul class="space-y-3">
            <li v-for="link in customerLinks" :key="link.href">
              <NuxtLink
                :to="link.href"
                class="text-body-sm text-neutral-300 hover:text-white transition-colors"
              >
                {{ link.name }}
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Company -->
        <div class="lg:col-span-2">
          <h3 class="text-caption uppercase tracking-[0.2em] text-neutral-400 mb-6">{{ t('footer.company') }}</h3>
          <ul class="space-y-3">
            <li v-for="link in companyLinks" :key="link.href">
              <NuxtLink
                :to="link.href"
                class="text-body-sm text-neutral-300 hover:text-white transition-colors"
              >
                {{ link.name }}
              </NuxtLink>
            </li>
          </ul>
          
          <!-- Social Links -->
          <div v-if="socialLinks.length" class="flex gap-5 mt-8">
            <a
              v-for="link in socialLinks"
              :key="link.name"
              :href="link.href"
              target="_blank"
              rel="noopener noreferrer"
              class="text-neutral-400 hover:text-white transition-colors"
              :aria-label="link.name"
            >
              <Icon :name="link.icon" class="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Bar -->
    <div class="border-t border-neutral-800">
      <div class="container-aura py-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <!-- Logo -->
        <NuxtLink to="/" class="flex h-9 items-center">
          <img
            v-if="logoUrl"
            :src="logoUrl"
            :alt="siteName"
            class="h-9 w-auto max-w-[180px] object-contain"
          />
          <span v-else class="font-serif text-lg tracking-[0.2em] text-white">
            {{ siteName }}
          </span>
        </NuxtLink>
        
        <!-- Copyright -->
        <p class="text-caption text-neutral-500">
          {{ t('footer.copyright', { year: new Date().getFullYear() }) }}
        </p>
        
        <!-- Legal Links -->
        <div class="flex gap-6 text-caption text-neutral-500">
          <NuxtLink to="/privacy" class="hover:text-neutral-300 transition-colors">{{ t('footer.privacy') }}</NuxtLink>
          <NuxtLink to="/terms" class="hover:text-neutral-300 transition-colors">{{ t('footer.terms') }}</NuxtLink>
        </div>
      </div>
    </div>
  </footer>
</template>
