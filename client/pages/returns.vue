<script setup lang="ts">
/**
 * Returns & Exchanges Page
 * AURA ARCHIVE - Return policies with i18n
 */


const { t } = useI18n()

useSeoMeta({
  title: () => `${t('returnsPage.title')} | AURA ARCHIVE`,
  description: () => t('returnsPage.subtitle'),
})
</script>

<template>
  <div class="section">
    <div class="container-aura max-w-4xl">
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="font-serif text-heading-1 text-aura-black mb-4">{{ $t('returnsPage.title') }}</h1>
        <p class="text-body text-neutral-600">{{ $t('returnsPage.subtitle') }}</p>
      </div>

      <!-- Content -->
      <div class="prose prose-neutral max-w-none space-y-8">
        <!-- Return Policy -->
        <section>
          <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('returnsPage.policyTitle') }}</h2>
          <p class="text-body text-neutral-600 leading-relaxed mb-4">{{ $t('returnsPage.policyText') }}</p>
          <ul class="list-disc list-inside space-y-2 text-body text-neutral-600">
            <li>{{ $t('returnsPage.policy1') }}</li>
            <li>{{ $t('returnsPage.policy2') }}</li>
            <li>{{ $t('returnsPage.policy3') }}</li>
          </ul>
        </section>

        <!-- How to Return -->
        <section>
          <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('returnsPage.howToTitle') }}</h2>
          <ol class="list-decimal list-inside space-y-2 text-body text-neutral-600">
            <li>{{ $t('returnsPage.step1') }}</li>
            <li>{{ $t('returnsPage.step2') }}</li>
            <li>{{ $t('returnsPage.step3') }}</li>
          </ol>
        </section>

        <!-- Exchanges -->
        <section>
          <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('returnsPage.exchangeTitle') }}</h2>
          <p class="text-body text-neutral-600 leading-relaxed">{{ $t('returnsPage.exchangeText') }}</p>
        </section>

        <!-- Refunds -->
        <section>
          <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('returnsPage.refundTitle') }}</h2>
          <p class="text-body text-neutral-600 leading-relaxed">{{ $t('returnsPage.refundText') }}</p>
        </section>

        <!-- Contact -->
        <section class="bg-neutral-50 p-6 rounded-sm">
          <h2 class="font-serif text-heading-4 text-aura-black mb-4">{{ $t('returnsPage.needHelp') }}</h2>
          <p class="text-body text-neutral-600">
            {{ $t('returnsPage.needHelpText') }}
            <NuxtLink to="/contact" class="text-aura-black underline hover:no-underline">{{ $t('common.contact') }}</NuxtLink>
          </p>
        </section>
      </div>
    </div>
  </div>
</template>
