<script setup lang="ts">
/**
 * BannerSlider - Reusable banner carousel/slider component
 * Supports: none (static), slide (horizontal), fade (crossfade)
 */

interface Banner {
  id: string
  title: string
  subtitle?: string
  image_url: string
  link_url?: string
  button_text?: string
}

const props = withDefaults(defineProps<{
  banners: Banner[]
  animation: 'none' | 'slide' | 'fade'
  interval?: number
  aspectClass?: string
  overlayContent?: boolean
}>(), {
  animation: 'none',
  interval: 5000,
  aspectClass: 'aspect-[3/4]',
  overlayContent: false,
})

const emit = defineEmits<{
  change: [banner: Banner | null, index: number]
}>()

const config = useRuntimeConfig()

const currentIndex = ref(0)
const isTransitioning = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const resolvedAspectClass = computed(() => props.aspectClass?.trim() || 'aspect-[3/4]')

const resolveUrl = (url: string) => {
  if (!url) return ''
  return url.startsWith('http') ? url : `${config.public.apiUrl}${url}`
}

const currentBanner = computed(() => props.banners[currentIndex.value] || null)
const totalSlides = computed(() => props.banners.length)
const hasMultiple = computed(() => totalSlides.value > 1)

const goTo = (index: number) => {
  if (isTransitioning.value || index === currentIndex.value) return
  isTransitioning.value = true
  currentIndex.value = index
  setTimeout(() => { isTransitioning.value = false }, 600)
  resetTimer()
}

const next = () => {
  goTo((currentIndex.value + 1) % totalSlides.value)
}

const prev = () => {
  goTo((currentIndex.value - 1 + totalSlides.value) % totalSlides.value)
}

const resetTimer = () => {
  if (timer) clearInterval(timer)
  if (hasMultiple.value && props.animation !== 'none') {
    timer = setInterval(next, props.interval)
  }
}

onMounted(resetTimer)
onUnmounted(() => { if (timer) clearInterval(timer) })
watch(() => props.animation, resetTimer)
watch(() => props.banners.length, resetTimer)
watch([currentBanner, currentIndex], () => {
  emit('change', currentBanner.value, currentIndex.value)
}, { immediate: true })
</script>

<template>
  <div class="banner-slider relative overflow-hidden w-full h-full" :class="resolvedAspectClass">
    <!-- STATIC / single banner -->
    <template v-if="animation === 'none' || !hasMultiple">
      <div v-if="currentBanner" class="w-full h-full">
        <img
          :src="resolveUrl(currentBanner.image_url)"
          :alt="currentBanner.title"
          class="w-full h-full object-contain"
        />
      </div>
      <slot v-else name="empty" />
    </template>

    <!-- FADE animation -->
    <template v-else-if="animation === 'fade'">
      <div
        v-for="(banner, idx) in banners"
        :key="banner.id"
        class="absolute inset-0 transition-opacity duration-700 ease-in-out"
        :class="idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'"
      >
        <img
          :src="resolveUrl(banner.image_url)"
          :alt="banner.title"
          class="w-full h-full object-contain"
        />
      </div>
    </template>

    <!-- SLIDE animation -->
    <template v-else-if="animation === 'slide'">
      <div
        class="flex transition-transform duration-600 ease-in-out h-full"
        :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
      >
        <div
          v-for="banner in banners"
          :key="banner.id"
          class="w-full h-full flex-shrink-0"
        >
          <img
            :src="resolveUrl(banner.image_url)"
            :alt="banner.title"
            class="w-full h-full object-contain"
          />
        </div>
      </div>
    </template>

    <!-- Navigation Arrows (only when multiple) -->
    <template v-if="hasMultiple && animation !== 'none'">
      <button
        @click.prevent="prev"
        class="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
        aria-label="Previous"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <button
        @click.prevent="next"
        class="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
        aria-label="Next"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      </button>

      <!-- Dots -->
      <div class="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        <button
          v-for="(_, idx) in banners"
          :key="idx"
          @click.prevent="goTo(idx)"
          class="w-2 h-2 rounded-full transition-all"
          :class="idx === currentIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'"
        />
      </div>
    </template>

    <!-- Overlay slot (for text on top of banner) -->
    <div v-if="$slots.overlay" class="absolute inset-0 z-15">
      <slot name="overlay" :banner="currentBanner" />
    </div>
  </div>
</template>

<style scoped>
.banner-slider:hover .opacity-0 {
  opacity: 1;
}
.duration-600 {
  transition-duration: 600ms;
}
</style>
