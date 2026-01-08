<script setup lang="ts">
/**
 * Admin Layout
 * AURA ARCHIVE - Sidebar layout for admin pages
 */

import { useI18n } from '#imports'
const { t } = useI18n()
const route = useRoute()

const menuItems = computed(() => [
  { path: '/admin/dashboard', label: t('admin.dashboard'), icon: 'chart' },
  { path: '/admin/orders', label: t('admin.orders'), icon: 'cart' },
  { path: '/admin/products', label: t('admin.products'), icon: 'box' },
  { path: '/admin/users', label: t('admin.users'), icon: 'users' },
  { path: '/admin/ai-config', label: t('admin.aiConfig'), icon: 'robot' },
])

const isActive = (path: string) => route.path.startsWith(path)
</script>

<template>
  <div class="min-h-screen flex bg-neutral-50">
    <!-- Sidebar -->
    <aside class="w-64 bg-aura-black text-aura-white flex flex-col">
      <!-- Logo -->
      <div class="p-6 border-b border-neutral-800">
        <NuxtLink to="/admin/dashboard" class="block">
          <h1 class="font-serif text-xl tracking-wider">AURA ARCHIVE</h1>
          <span class="text-caption text-neutral-400">{{ t('nav.adminPanel') }}</span>
        </NuxtLink>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-4">
        <ul class="space-y-1">
          <li v-for="item in menuItems" :key="item.path">
            <NuxtLink
              :to="item.path"
              class="flex items-center gap-3 px-4 py-3 rounded-sm transition-colors"
              :class="isActive(item.path) ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'"
            >
              <!-- Icons -->
              <svg v-if="item.icon === 'chart'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <svg v-else-if="item.icon === 'cart'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <svg v-else-if="item.icon === 'box'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <svg v-else-if="item.icon === 'users'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <svg v-else-if="item.icon === 'robot'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span class="text-body-sm">{{ item.label }}</span>
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <!-- Footer -->
      <div class="p-4 border-t border-neutral-800">
        <NuxtLink to="/" class="flex items-center gap-2 text-neutral-400 hover:text-white text-body-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {{ t('nav.backToStore') }}
        </NuxtLink>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto">
      <slot />
    </main>
  </div>
</template>
