<script setup lang="ts">
/**
 * Shipping Information Page
 * AURA ARCHIVE - Shipping policies with dynamic blocks + locale fallback
 */

const { t } = useI18n()
const { blocks, hasPublishedContent, locale } = usePageContent('shipping')

useSeoMeta({
  title: () => `${t('shippingPage.title')} | AURA ARCHIVE`,
  description: () => t('shippingPage.subtitle'),
})
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
            <h1 class="font-serif text-heading-1 text-aura-black mb-4">{{ $t('shippingPage.title') }}</h1>
            <p class="text-body text-neutral-600">{{ $t('shippingPage.subtitle') }}</p>
          </div>

          <div class="prose prose-neutral max-w-none space-y-8">
            <section>
              <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('shippingPage.domesticTitle') }}</h2>
              <p class="text-body text-neutral-600 leading-relaxed mb-4">{{ $t('shippingPage.domesticText') }}</p>
              <ul class="list-disc list-inside space-y-2 text-body text-neutral-600">
                <li>{{ $t('shippingPage.domestic1') }}</li>
                <li>{{ $t('shippingPage.domestic2') }}</li>
                <li>{{ $t('shippingPage.domestic3') }}</li>
              </ul>
            </section>

            <section>
              <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('shippingPage.internationalTitle') }}</h2>
              <p class="text-body text-neutral-600 leading-relaxed mb-4">{{ $t('shippingPage.internationalText') }}</p>
              <ul class="list-disc list-inside space-y-2 text-body text-neutral-600">
                <li>{{ $t('shippingPage.international1') }}</li>
                <li>{{ $t('shippingPage.international2') }}</li>
              </ul>
            </section>

            <section>
              <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('shippingPage.trackingTitle') }}</h2>
              <p class="text-body text-neutral-600 leading-relaxed">{{ $t('shippingPage.trackingText') }}</p>
            </section>

            <section class="bg-neutral-50 p-6 rounded-sm">
              <h2 class="font-serif text-heading-4 text-aura-black mb-4">{{ $t('shippingPage.questions') }}</h2>
              <p class="text-body text-neutral-600">
                {{ $t('shippingPage.questionsText') }}
                <NuxtLink to="/contact" class="text-aura-black underline hover:no-underline">{{ $t('common.contact') }}</NuxtLink>
              </p>
            </section>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
