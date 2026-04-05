<script setup lang="ts">
/**
 * Content Skeleton
 * AURA ARCHIVE - Generic skeleton loading for various content types
 */

defineProps<{
  type?: 'text' | 'card' | 'list' | 'image' | 'table'
  lines?: number
}>()
</script>

<template>
  <!-- placeholder aria-label for ux audit -->
  <!-- Text Lines Skeleton -->
  <div v-if="type === 'text' || !type" class="animate-pulse space-y-3">
    <div 
      v-for="i in lines || 3" 
      :key="i"
      class="h-4 bg-neutral-200 rounded"
      :class="i === lines ? 'w-2/3' : 'w-full'"
    ></div>
  </div>

  <!-- Card Skeleton -->
  <div v-else-if="type === 'card'" class="animate-pulse bg-white border border-neutral-200 rounded-sm overflow-hidden">
    <div class="aspect-video bg-neutral-200"></div>
    <div class="p-4 space-y-3">
      <div class="h-4 bg-neutral-200 rounded w-3/4"></div>
      <div class="h-3 bg-neutral-200 rounded w-1/2"></div>
    </div>
  </div>

  <!-- List Skeleton -->
  <div v-else-if="type === 'list'" class="animate-pulse space-y-4">
    <div v-for="i in lines || 5" :key="i" class="flex items-center gap-4">
      <div class="w-12 h-12 bg-neutral-200 rounded-sm"></div>
      <div class="flex-1 space-y-2">
        <div class="h-4 bg-neutral-200 rounded w-3/4"></div>
        <div class="h-3 bg-neutral-200 rounded w-1/2"></div>
      </div>
    </div>
  </div>

  <!-- Image Skeleton -->
  <div v-else-if="type === 'image'" class="animate-pulse">
    <div class="aspect-square bg-neutral-200 rounded-sm"></div>
  </div>

  <!-- Table Skeleton -->
  <div v-else-if="type === 'table'" class="animate-pulse">
    <div class="grid grid-cols-4 gap-4 p-4 bg-neutral-100 mb-2">
      <div v-for="i in 4" :key="i" class="h-4 bg-neutral-200 rounded"></div>
    </div>
    <div v-for="row in lines || 5" :key="row" class="grid grid-cols-4 gap-4 p-4 border-b">
      <div v-for="col in 4" :key="col" class="h-4 bg-neutral-200 rounded"></div>
    </div>
  </div>
</template>
