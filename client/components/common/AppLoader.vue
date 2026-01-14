<script setup lang="ts">
/**
 * AppLoader.vue
 * Reusable spinner component for inline loading states
 * AURA ARCHIVE design system
 */

interface Props {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  color?: 'gold' | 'black' | 'white'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'gold'
})

const sizeClasses = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3'
}

const colorClasses = {
  gold: 'border-t-[#D4AF37]',
  black: 'border-t-[#0A0A0A]',
  white: 'border-t-white'
}
</script>

<template>
  <div class="app-loader">
    <div 
      class="app-loader__spinner border-transparent rounded-full animate-spin"
      :class="[sizeClasses[props.size], colorClasses[props.color]]"
    />
    <span v-if="props.text" class="app-loader__text">{{ props.text }}</span>
  </div>
</template>

<style scoped>
.app-loader {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.app-loader__spinner {
  border-style: solid;
}

.app-loader__text {
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  color: currentColor;
  letter-spacing: 0.05em;
}
</style>
