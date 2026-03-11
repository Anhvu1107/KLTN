<script setup lang="ts">
/**
 * Privacy Policy Page
 * AURA ARCHIVE - Privacy policy with i18n
 */

import { useI18n } from '#imports'

const { t } = useI18n()

useSeoMeta({
  title: () => `${t('legal.privacyTitle')} | AURA ARCHIVE`,
  description: () => t('legal.privacyDesc'),
})
</script>

<template>
  <div class="section">
    <div class="container-aura max-w-4xl">
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="font-serif text-heading-1 text-aura-black mb-4">{{ $t('legal.privacyTitle') }}</h1>
        <p class="text-body text-neutral-600">{{ $t('legal.lastUpdated') }}: {{ $t('legal.updateDate') }}</p>
      </div>

      <!-- Content -->
      <div class="prose prose-neutral max-w-none space-y-8">
        <!-- Introduction -->
        <section>
          <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('legal.privacyIntro') }}</h2>
          <p class="text-body text-neutral-600 leading-relaxed">{{ $t('legal.privacyIntroText') }}</p>
        </section>

        <!-- Data Collection -->
        <section>
          <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('legal.dataCollection') }}</h2>
          <p class="text-body text-neutral-600 leading-relaxed mb-4">{{ $t('legal.dataCollectionText') }}</p>
          <ul class="list-disc list-inside space-y-2 text-body text-neutral-600">
            <li>{{ $t('legal.dataType1') }}</li>
            <li>{{ $t('legal.dataType2') }}</li>
            <li>{{ $t('legal.dataType3') }}</li>
            <li>{{ $t('legal.dataType4') }}</li>
          </ul>
        </section>

        <!-- Data Usage -->
        <section>
          <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('legal.dataUsage') }}</h2>
          <p class="text-body text-neutral-600 leading-relaxed mb-4">{{ $t('legal.dataUsageText') }}</p>
          <ul class="list-disc list-inside space-y-2 text-body text-neutral-600">
            <li>{{ $t('legal.usage1') }}</li>
            <li>{{ $t('legal.usage2') }}</li>
            <li>{{ $t('legal.usage3') }}</li>
            <li>{{ $t('legal.usage4') }}</li>
          </ul>
        </section>

        <!-- Cookies -->
        <section>
          <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('legal.cookies') }}</h2>
          <p class="text-body text-neutral-600 leading-relaxed">{{ $t('legal.cookiesText') }}</p>
        </section>

        <!-- Data Security -->
        <section>
          <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('legal.dataSecurity') }}</h2>
          <p class="text-body text-neutral-600 leading-relaxed">{{ $t('legal.dataSecurityText') }}</p>
        </section>

        <!-- Your Rights -->
        <section>
          <h2 class="font-serif text-heading-3 text-aura-black mb-4">{{ $t('legal.yourRights') }}</h2>
          <p class="text-body text-neutral-600 leading-relaxed mb-4">{{ $t('legal.yourRightsText') }}</p>
          <ul class="list-disc list-inside space-y-2 text-body text-neutral-600">
            <li>{{ $t('legal.right1') }}</li>
            <li>{{ $t('legal.right2') }}</li>
            <li>{{ $t('legal.right3') }}</li>
            <li>{{ $t('legal.right4') }}</li>
          </ul>
        </section>

        <!-- Contact -->
        <section class="bg-neutral-50 p-6 rounded-sm">
          <h2 class="font-serif text-heading-4 text-aura-black mb-4">{{ $t('legal.questions') }}</h2>
          <p class="text-body text-neutral-600">
            {{ $t('legal.privacyQuestionsText') }} 
            <NuxtLink to="/contact" class="text-aura-black underline hover:no-underline">{{ $t('common.contact') }}</NuxtLink>
          </p>
        </section>
      </div>
    </div>
  </div>
</template>
