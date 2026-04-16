<script setup lang="ts">
/**
 * Mega Menu Component
 * AURA ARCHIVE - Full-width category menu with images
 */

const isOpen = ref(false)
const activeCategory = ref<string | null>(null)

// Menu data (could be fetched from API)
const menuCategories = ref([
  {
    name: 'Bags',
    slug: 'bags',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400',
    subcategories: ['Handbags', 'Clutches', 'Totes', 'Crossbody', 'Backpacks'],
  },
  {
    name: 'Outerwear',
    slug: 'outerwear',
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
    subcategories: ['Coats', 'Jackets', 'Blazers', 'Vests', 'Trench'],
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=400',
    subcategories: ['Scarves', 'Belts', 'Jewelry', 'Watches', 'Sunglasses'],
  },
  {
    name: 'Footwear',
    slug: 'footwear',
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400',
    subcategories: ['Heels', 'Flats', 'Boots', 'Sneakers', 'Sandals'],
  },
])

const handleMouseEnter = (category: string) => {
  activeCategory.value = category
  isOpen.value = true
}

const handleMouseLeave = () => {
  isOpen.value = false
  activeCategory.value = null
}

const activeCategoryData = computed(() => 
  menuCategories.value.find(c => c.name === activeCategory.value)
)
</script>

<template>
  <div class="relative" @mouseleave="handleMouseLeave">
    <!-- Trigger -->
    <button 
      class="flex items-center gap-2 py-2 text-body text-neutral-700 hover:text-aura-black transition-colors"
      @mouseenter="isOpen = true"
    >
      <span>Danh mục</span>
      <svg 
        class="w-4 h-4 transition-transform" 
        :class="{ 'rotate-180': isOpen }"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Mega Menu Dropdown -->
    <Transition name="mega">
      <div 
        v-if="isOpen"
        class="absolute left-0 top-full w-screen bg-white shadow-elevated border-t border-neutral-100 z-50"
        style="margin-left: calc(-50vw + 50%);"
      >
        <div class="container-aura py-8">
          <div class="grid grid-cols-12 gap-8">
            <!-- Categories List -->
            <div class="col-span-3 space-y-1">
              <div
                v-for="category in menuCategories"
                :key="category.name"
                @mouseenter="handleMouseEnter(category.name)"
                class="group"
              >
                <NuxtLink
                  :to="`/shop?category=${category.slug}`"
                  class="flex items-center justify-between py-3 px-4 text-body transition-colors rounded-sm"
                  :class="activeCategory === category.name ? 'bg-neutral-100 text-aura-black' : 'text-neutral-600 hover:bg-neutral-50'"
                >
                  {{ category.name }}
                  <svg class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7" />
                  </svg>
                </NuxtLink>
              </div>
            </div>

            <!-- Subcategories -->
            <div class="col-span-5">
              <div v-if="activeCategoryData">
                <h3 class="font-serif text-heading-4 text-aura-black mb-4">{{ activeCategoryData.name }}</h3>
                <div class="grid grid-cols-2 gap-3">
                  <NuxtLink
                    v-for="sub in activeCategoryData.subcategories"
                    :key="sub"
                    :to="`/shop?category=${activeCategoryData.slug}&subcategory=${sub.toLowerCase()}`"
                    class="py-2 text-body text-neutral-600 hover:text-aura-black transition-colors"
                  >
                    {{ sub }}
                  </NuxtLink>
                </div>
                <NuxtLink
                  :to="`/shop?category=${activeCategoryData.slug}`"
                  class="inline-block mt-6 text-body-sm text-accent-burgundy hover:text-aura-black underline"
                >
                  Xem tất cả {{ activeCategoryData.name }} →
                </NuxtLink>
              </div>
            </div>

            <!-- Featured Image -->
            <div class="col-span-4">
              <div v-if="activeCategoryData" class="relative aspect-[4/3] overflow-hidden rounded-sm bg-neutral-100">
                <img
                  :src="activeCategoryData.image"
                  :alt="activeCategoryData.name"
                  class="w-full h-full object-cover"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div class="absolute bottom-4 left-4 right-4">
                  <p class="text-white font-serif text-heading-4">{{ activeCategoryData.name }}</p>
                  <p class="text-white/80 text-body-sm">Bộ sưu tập mới nhất</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.mega-enter-active,
.mega-leave-active {
  transition: all 0.2s ease;
}
.mega-enter-from,
.mega-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
