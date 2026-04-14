<script setup lang="ts">
type BrandTickerItem = {
  name: string
  count: number
}

const props = defineProps<{
  brands: BrandTickerItem[]
}>()

const staticThreshold = 5

const sanitizedBrands = computed(() =>
  props.brands.filter((brand) => brand.name.trim().length > 0)
)

const shouldAnimate = computed(() => sanitizedBrands.value.length > staticThreshold)
const animationDuration = computed(() => `${Math.max(20, sanitizedBrands.value.length * 4)}s`)
</script>

<template>
  <section v-if="sanitizedBrands.length > 0" class="overflow-hidden border-y border-neutral-200 bg-white py-12">
    <div class="container-aura">
      <div v-if="shouldAnimate" class="relative overflow-hidden">
        <div class="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white via-white/90 to-transparent" />
        <div class="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white via-white/90 to-transparent" />

        <div class="brand-marquee-track text-neutral-400" :style="{ '--brand-ticker-duration': animationDuration }">
          <div class="brand-marquee-group">
            <NuxtLink
              v-for="brand in sanitizedBrands"
              :key="brand.name"
              :to="{ path: '/shop', query: { brand: brand.name } }"
              class="font-serif text-xl tracking-[0.08em] whitespace-nowrap transition-colors duration-300 hover:text-aura-black"
            >
              {{ brand.name }}
            </NuxtLink>
          </div>

          <div class="brand-marquee-group" aria-hidden="true">
            <NuxtLink
              v-for="brand in sanitizedBrands"
              :key="`${brand.name}-duplicate`"
              :to="{ path: '/shop', query: { brand: brand.name } }"
              tabindex="-1"
              class="font-serif text-xl tracking-[0.08em] whitespace-nowrap transition-colors duration-300 hover:text-aura-black"
            >
              {{ brand.name }}
            </NuxtLink>
          </div>
        </div>
      </div>

      <div v-else class="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-neutral-400 lg:gap-x-20">
        <NuxtLink
          v-for="brand in sanitizedBrands"
          :key="brand.name"
          :to="{ path: '/shop', query: { brand: brand.name } }"
          class="font-serif text-xl tracking-[0.08em] transition-colors duration-300 hover:text-aura-black"
        >
          {{ brand.name }}
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.brand-marquee-track {
  --brand-ticker-duration: 24s;
  display: flex;
  width: max-content;
  animation: brand-ticker-scroll var(--brand-ticker-duration) linear infinite;
  will-change: transform;
}

.brand-marquee-track:hover {
  animation-play-state: paused;
}

.brand-marquee-group {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: clamp(3rem, 5vw, 5rem);
  padding-right: clamp(3rem, 5vw, 5rem);
}

@keyframes brand-ticker-scroll {
  from {
    transform: translate3d(0, 0, 0);
  }

  to {
    transform: translate3d(-50%, 0, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .brand-marquee-track {
    width: 100%;
    animation: none;
  }
}
</style>
