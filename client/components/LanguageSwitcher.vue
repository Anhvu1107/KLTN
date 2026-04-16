<script setup lang="ts">
/**
 * Language Switcher Component
 * AURA ARCHIVE - Switch between EN/VI
 */

const { locale, locales, setLocale } = useI18n()

const currentLocale = computed(() => {
  const current = locales.value.find((l: any) => l.code === locale.value)
  return current || { code: 'vi', name: 'Tiếng Việt' }
})

const switchLocale = (code: string) => {
  setLocale(code)
}
</script>

<template>
  <div class="relative group">
    <button class="flex items-center gap-1 py-2 px-3 text-body-sm hover:text-aura-black transition-colors">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{{ (currentLocale as any).code?.toUpperCase() }}</span>
    </button>

    <!-- Dropdown -->
    <div class="absolute top-full left-0 mt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100]">
      <div class="bg-white shadow-lg border border-neutral-200 rounded-sm py-1 min-w-[140px]">
        <button
          v-for="loc in locales"
          :key="(loc as any).code"
          @click="switchLocale((loc as any).code)"
          class="w-full text-left px-4 py-2 text-body-sm text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
          :class="{ 'bg-neutral-100 font-medium': (loc as any).code === locale }"
        >
          <span class="font-medium">{{ (loc as any).code.toUpperCase() }}</span>
          <span class="text-neutral-500">{{ (loc as any).name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
