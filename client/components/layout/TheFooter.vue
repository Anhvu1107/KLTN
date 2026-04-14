<script setup lang="ts">
/**
 * TheFooter - Ralph Lauren Inspired
 * AURA ARCHIVE - Elegant multi-column footer with prominent newsletter
 */

const { t } = useI18n()
const config = useRuntimeConfig()

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
          <div class="flex gap-5 mt-8">
            <a href="#" class="text-neutral-400 hover:text-white transition-colors" aria-label="Instagram">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"/>
              </svg>
            </a>
            <a href="#" class="text-neutral-400 hover:text-white transition-colors" aria-label="Facebook">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a href="#" class="text-neutral-400 hover:text-white transition-colors" aria-label="Pinterest">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Bar -->
    <div class="border-t border-neutral-800">
      <div class="container-aura py-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <!-- Logo -->
        <NuxtLink to="/" class="font-serif text-lg tracking-[0.2em] text-white">
          AURA ARCHIVE
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
