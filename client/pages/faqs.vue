<script setup lang="ts">
/**
 * FAQs Page
 * AURA ARCHIVE - Frequently Asked Questions with dynamic blocks + locale fallback
 */

const { t } = useI18n()
const { blocks, hasPublishedContent, locale } = usePageContent('faqs')

useSeoMeta({
  title: () => `${t('faqs.title')} | AURA ARCHIVE`,
  description: () => t('faqs.subtitle'),
})

const faqItems = computed(() => [
  { q: t('faqs.q1'), a: t('faqs.a1') },
  { q: t('faqs.q2'), a: t('faqs.a2') },
  { q: t('faqs.q3'), a: t('faqs.a3') },
  { q: t('faqs.q4'), a: t('faqs.a4') },
  { q: t('faqs.q5'), a: t('faqs.a5') },
  { q: t('faqs.q6'), a: t('faqs.a6') },
])

const openIndex = ref<number | null>(null)
const toggle = (i: number) => {
  openIndex.value = openIndex.value === i ? null : i
}
</script>

<template>
  <div>
    <!-- Dynamic blocks -->
    <template v-if="hasPublishedContent">
      <DynamicBlockRenderer v-for="block in blocks" :key="block.id" :block="block" :locale="locale as string" />
    </template>

    <!-- Fallback -->
    <template v-else>
      <div class="section">
        <div class="container-aura max-w-4xl">
          <div class="text-center mb-12">
            <h1 class="font-serif text-heading-1 text-aura-black mb-4">{{ $t('faqs.title') }}</h1>
            <p class="text-body text-neutral-600">{{ $t('faqs.subtitle') }}</p>
          </div>

          <div class="space-y-4">
            <div
              v-for="(item, index) in faqItems"
              :key="index"
              class="border border-neutral-200 rounded-sm overflow-hidden"
            >
              <button
                class="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-neutral-50 transition-colors"
                @click="toggle(index)"
              >
                <span class="font-serif text-heading-4 text-aura-black pr-4">{{ item.q }}</span>
                <svg
                  class="w-5 h-5 text-neutral-400 flex-shrink-0 transition-transform duration-300"
                  :class="{ 'rotate-180': openIndex === index }"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="max-h-0 opacity-0"
                enter-to-class="max-h-96 opacity-100"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="max-h-96 opacity-100"
                leave-to-class="max-h-0 opacity-0"
              >
                <div v-show="openIndex === index" class="overflow-hidden">
                  <p class="px-6 pb-5 text-body text-neutral-600 leading-relaxed">{{ item.a }}</p>
                </div>
              </transition>
            </div>
          </div>

          <div class="mt-12 bg-neutral-50 p-6 rounded-sm text-center">
            <h2 class="font-serif text-heading-4 text-aura-black mb-4">{{ $t('faqs.stillHaveQuestions') }}</h2>
            <p class="text-body text-neutral-600 mb-6">{{ $t('faqs.contactText') }}</p>
            <NuxtLink to="/contact" class="inline-block px-8 py-3 bg-aura-black text-white text-caption uppercase tracking-widest hover:bg-neutral-800 transition-colors">
              {{ $t('common.contact') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
