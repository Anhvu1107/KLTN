<script setup lang="ts">
/**
 * Contact Page
 * AURA ARCHIVE - Contact form with i18n
 */


const { t } = useI18n()
const config = useRuntimeConfig()

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
            
            <!-- Success Message -->
            <div v-if="successMessage" class="mb-6 p-4 bg-green-50 text-green-800 rounded-sm">
              {{ successMessage }}
            </div>
            
            <!-- Error Message -->
            <div v-if="errorMessage" class="mb-6 p-4 bg-red-50 text-red-800 rounded-sm">
              {{ errorMessage }}
            </div>

            <form @submit.prevent="handleSubmit" class="space-y-6">
              <div>
                <label for="name" class="input-label">{{ t('contact.name') }} *</label>
                <input 
                  id="name" 
                  v-model="form.name"
                  type="text" 
                  required
                  class="input-field" 
                />
              </div>
              <div>
                <label for="email" class="input-label">{{ t('contact.email') }} *</label>
                <input 
                  id="email" 
                  v-model="form.email"
                  type="email" 
                  required
                  class="input-field" 
                />
              </div>
              <div>
                <label for="subject" class="input-label">{{ t('contact.subject') }}</label>
                <input 
                  id="subject" 
                  v-model="form.subject"
                  type="text" 
                  class="input-field" 
                />
              </div>
              <div>
                <label for="message" class="input-label">{{ t('contact.message') }} *</label>
                <textarea 
                  id="message" 
                  v-model="form.message"
                  rows="5" 
                  required
                  class="input-field" 
                  :placeholder="t('contact.messagePlaceholder')"
                ></textarea>
              </div>
              <button 
                type="submit" 
                :disabled="isSubmitting"
                class="btn-primary w-full"
              >
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
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
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
