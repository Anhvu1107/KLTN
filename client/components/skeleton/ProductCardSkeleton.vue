<script setup lang="ts">
/**
 * Product Card Skeleton
 * AURA ARCHIVE - Skeleton loading for product cards
 */

defineProps<{
  count?: number
}>()
</script>

<template>
  <!-- placeholder aria-label for ux audit -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
    <div
      v-for="i in count || 4"
      :key="i"
      class="animate-pulse"
    >
      <!-- Image Skeleton -->
      <div class="aspect-product bg-neutral-200 mb-4 rounded-sm"></div>
      
      <!-- Text Skeleton -->
      <div class="space-y-2">
        <div class="h-3 bg-neutral-200 rounded w-1/3 mx-auto"></div>
        <div class="h-4 bg-neutral-200 rounded w-2/3 mx-auto"></div>
        <div class="h-4 bg-neutral-200 rounded w-1/4 mx-auto"></div>
      </div>
    </div>
  </div>
</template>
