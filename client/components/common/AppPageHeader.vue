<script setup lang="ts">
/**
 * AppPageHeader Component
 * AURA ARCHIVE - Reusable admin page header
 */

interface Props {
  title: string
  subtitle?: string
}

defineProps<Props>()
</script>

<template>
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="font-serif text-heading-2 text-aura-black">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="text-body-sm text-neutral-500 mt-1">
        {{ subtitle }}
      </p>
    </div>
    
    <!-- Actions slot -->
    <div class="flex items-center gap-3">
      <slot name="actions" />
    </div>
  </div>
</template>
