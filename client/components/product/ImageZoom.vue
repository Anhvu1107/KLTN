<script setup lang="ts">
/**
 * Product Image Zoom Component
 * AURA ARCHIVE - Zoom on hover for product images
 */

defineProps<{
  src: string
  alt: string
}>()

const containerRef = ref<HTMLElement | null>(null)
const isZooming = ref(false)
const zoomPosition = ref({ x: 50, y: 50 })

const handleMouseEnter = () => {
  isZooming.value = true
}

const handleMouseLeave = () => {
  isZooming.value = false
  zoomPosition.value = { x: 50, y: 50 }
}

const handleMouseMove = (e: MouseEvent) => {
  if (!containerRef.value) return
  
  const rect = containerRef.value.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  
  zoomPosition.value = { x, y }
}
</script>

<template>
  <div
    ref="containerRef"
    class="relative overflow-hidden cursor-zoom-in"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @mousemove="handleMouseMove"
  >
    <!-- Normal Image -->
    <img 
      :src="src" 
      :alt="alt"
      class="w-full h-full object-cover transition-transform duration-300"
      :class="{ 'scale-105': isZooming }"
    />
    
    <!-- Zoom Overlay -->
    <div
      v-if="isZooming"
      class="absolute inset-0 pointer-events-none"
      :style="{
        backgroundImage: `url(${src})`,
        backgroundSize: '200%',
        backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
        backgroundRepeat: 'no-repeat',
      }"
    />
  </div>
</template>
