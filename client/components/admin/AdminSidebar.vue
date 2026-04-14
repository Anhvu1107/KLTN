<script setup lang="ts">
/**
 * Admin Sidebar Component
 * AURA ARCHIVE - Reusable sidebar for admin pages
 */

const { t } = useI18n()
const route = useRoute()

// Banner groups for sub-menu
const bannerGroups = computed(() => [
  { key: 'home', label: t('admin.banners.groups.home') },
  { key: 'sale', label: t('admin.banners.groups.sale') },
  { key: 'new_arrivals', label: t('admin.banners.groups.new_arrivals') },
  { key: 'featured', label: t('admin.banners.groups.featured') },
  { key: 'about', label: t('admin.banners.groups.about') },
  { key: 'general', label: t('admin.banners.groups.general') },
])

const bannerMenuOpen = ref(false)

// Auto-expand when on banners page
watchEffect(() => {
  if (route.path.startsWith('/admin/banners')) {
    bannerMenuOpen.value = true
  }
})

const menuItems = computed(() => [
  { path: '/admin/dashboard', label: t('admin.dashboard'), icon: 'chart' },
  { path: '/admin/orders', label: t('admin.orders'), icon: 'cart' },
  { path: '/admin/products', label: t('admin.products'), icon: 'box' },
  { path: '/admin/users', label: t('admin.users'), icon: 'users' },
  { path: '/admin/coupons', label: t('admin.coupons.title'), icon: 'tag' },
  { path: '/admin/reviews', label: t('admin.reviews.title'), icon: 'star' },
  { path: '/admin/banners', label: t('admin.banners.title'), icon: 'image', hasSubmenu: true },
  { path: '/admin/blogs', label: t('admin.blogs.title'), icon: 'document' },
  { path: '/admin/page-builder', label: t('admin.pageBuilder.title'), icon: 'layout' },
  { path: '/admin/popups', label: t('admin.popups.title'), icon: 'popup' },
  { path: '/admin/abandoned-carts', label: t('admin.abandonedCarts.title'), icon: 'cart-abandon' },
  { path: '/admin/settings', label: t('admin.settings.title'), icon: 'cog' },
  { path: '/admin/settings/payments', label: t('admin.paymentSettings.title'), icon: 'credit-card' },
  { path: '/admin/ai-config', label: t('admin.aiConfig.title'), icon: 'robot' },
  { path: '/admin/chats', label: t('admin.chatManagement.title'), icon: 'chat' },
])

const isActive = (path: string) => route.path === path
</script>

<template>
  <!-- placeholder aria-label for ux audit -->
  <aside class="w-64 bg-aura-black text-aura-white flex flex-col h-screen fixed top-0 left-0 z-50">
    <!-- Logo -->
    <div class="p-6 border-b border-neutral-800">
      <NuxtLink to="/admin/dashboard" class="block">
        <h1 class="font-serif text-xl tracking-wider">AURA ARCHIVE</h1>
        <span class="text-caption text-neutral-400">{{ t('nav.adminPanel') }}</span>
      </NuxtLink>
    </div>

    <!-- Language Switcher -->
    <div class="px-6 py-3 border-b border-neutral-800">
      <LanguageSwitcher />
      <CurrencySwitcher />
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3 py-2 overflow-y-auto sidebar-nav">
      <ul class="space-y-1">
        <li v-for="item in menuItems" :key="item.path">
          <!-- Banner item with submenu -->
          <template v-if="item.hasSubmenu">
            <button
              @click="bannerMenuOpen = !bannerMenuOpen"
              class="w-full flex items-center justify-between px-3 py-2 rounded-sm transition-colors"
              :class="isActive(item.path) ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'"
            >
              <span class="flex items-center gap-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span class="text-body-sm">{{ item.label }}</span>
              </span>
              <svg class="w-4 h-4 transition-transform" :class="bannerMenuOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <ul v-show="bannerMenuOpen" class="ml-8 mt-1 space-y-0.5">
              <li v-for="group in bannerGroups" :key="group.key">
                <NuxtLink
                  :to="`/admin/banners?group=${group.key}`"
                  class="block px-3 py-1.5 text-xs rounded-sm transition-colors"
                  :class="route.query.group === group.key || (!route.query.group && group.key === 'home') ? 'text-white bg-neutral-800' : 'text-neutral-500 hover:text-white hover:bg-neutral-800/30'"
                >
                  {{ group.label }}
                </NuxtLink>
              </li>
            </ul>
          </template>
          <!-- Regular items -->
          <NuxtLink
            v-else
            :to="item.path"
            class="flex items-center gap-3 px-3 py-2 rounded-sm transition-colors"
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
            <svg v-else-if="item.icon === 'tag'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <svg v-else-if="item.icon === 'star'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <svg v-else-if="item.icon === 'image'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <svg v-else-if="item.icon === 'document'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <svg v-else-if="item.icon === 'robot'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <svg v-else-if="item.icon === 'cog'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <svg v-else-if="item.icon === 'popup'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <svg v-else-if="item.icon === 'cart-abandon'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <svg v-else-if="item.icon === 'credit-card'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <svg v-else-if="item.icon === 'chat'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <svg v-else-if="item.icon === 'layout'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            <span class="text-body-sm">{{ item.label }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <!-- Footer -->
    <div class="p-4 border-t border-neutral-800">
      <a href="/" class="flex items-center gap-2 text-neutral-400 hover:text-white text-body-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        {{ t('nav.backToStore') }}
      </a>
    </div>
  </aside>
</template>

<style scoped>
.sidebar-nav::-webkit-scrollbar {
  width: 0;
  display: none;
}
.sidebar-nav {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
