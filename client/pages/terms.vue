<script setup lang="ts">
/**
 * Terms of Service Page
 * AURA ARCHIVE - Terms with dynamic blocks + locale fallback
 */

const { t } = useI18n()
const { blocks, hasPublishedContent, locale } = usePageContent('terms')

useSeoMeta({
  title: () => `${t('legal.termsTitle')} | AURA ARCHIVE`,
  description: () => t('legal.termsDesc'),
})
</script>

<template>
  <div>
    <template v-if="hasPublishedContent">
      <DynamicBlockRenderer v-for="block in blocks" :key="block.id" :block="block" :locale="locale as string" />
    </template>

    <template v-else>
      <div class="section">
        <div class="container-aura max-w-4xl">
          <div class="text-center mb-12">
            <h1 class="font-serif text-heading-1 text-aura-black mb-4">{{ $t('legal.termsTitle') }}</h1>
            <p class="text-body text-neutral-600">{{ $t('legal.termsDesc') }}</p>
            <p class="text-caption text-neutral-400 mt-2">{{ $t('legal.lastUpdated') }}: {{ $t('legal.updateDate') }}</p>
          </div>

          <div class="prose prose-neutral max-w-none space-y-8">
            <section>
              <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('legal.termsIntro') }}</h2>
              <p class="text-body text-neutral-600 leading-relaxed">{{ $t('legal.termsIntroText') }}</p>
            </section>

            <section>
              <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('legal.accountTerms') }}</h2>
              <ul class="list-disc list-inside space-y-2 text-body text-neutral-600">
                <li>{{ $t('legal.accountTerm1') }}</li>
                <li>{{ $t('legal.accountTerm2') }}</li>
                <li>{{ $t('legal.accountTerm3') }}</li>
                <li>{{ $t('legal.accountTerm4') }}</li>
              </ul>
            </section>

            <section>
              <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('legal.productInfo') }}</h2>
              <p class="text-body text-neutral-600 leading-relaxed mb-4">{{ $t('legal.productInfoText') }}</p>
              <ul class="list-disc list-inside space-y-2 text-body text-neutral-600">
                <li>{{ $t('legal.productTerm1') }}</li>
                <li>{{ $t('legal.productTerm2') }}</li>
                <li>{{ $t('legal.productTerm3') }}</li>
              </ul>
            </section>

            <section>
              <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('legal.ordersPayment') }}</h2>
              <p class="text-body text-neutral-600 leading-relaxed">{{ $t('legal.ordersPaymentText') }}</p>
            </section>

            <section>
              <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('legal.shippingReturns') }}</h2>
              <p class="text-body text-neutral-600 leading-relaxed">{{ $t('legal.shippingReturnsText') }}</p>
            </section>

            <section>
              <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('legal.intellectualProperty') }}</h2>
              <p class="text-body text-neutral-600 leading-relaxed">{{ $t('legal.intellectualPropertyText') }}</p>
            </section>

            <section class="bg-neutral-50 p-6 rounded-sm">
              <h2 class="font-serif text-heading-4 text-aura-black mb-4">{{ $t('legal.questions') }}</h2>
              <p class="text-body text-neutral-600">
                {{ $t('legal.questionsText') }}
                <NuxtLink to="/contact" class="text-aura-black underline hover:no-underline">{{ $t('common.contact') }}</NuxtLink>
              </p>
            </section>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
