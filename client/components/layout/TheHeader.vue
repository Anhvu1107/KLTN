<script setup lang="ts">
/**
 * TheHeader - Ralph Lauren Inspired
 * AURA ARCHIVE - Elegant navigation with centered menu
 */

import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cart'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const cartStore = useCartStore()

// Navigation items with i18n
const navItems = computed(() => [
  { name: t('nav.newArrivals'), href: '/new-arrivals' },
  { name: t('common.shop'), href: '/shop' },
  { name: t('common.about'), href: '/about' },
  { name: t('common.contact'), href: '/contact' },
])

// Mobile menu state
const isMobileMenuOpen = ref(false)

// Check if link is active
const isActive = (href: string) => route.path === href

// Check if logged in
const isLoggedIn = computed(() => authStore.isAuthenticated)
const isAdmin = computed(() => authStore.isAdmin)

// Scroll state for header background
const isScrolled = ref(false)

onMounted(() => {
  window.addEventListener('scroll', () => {
    isScrolled.value = window.scrollY > 20
  })
})
</script>

<template>
  <header class="sticky top-0 z-50">
    <!-- Top Announcement Bar - Light Version -->
    <div class="bg-neutral-100 text-neutral-700 border-b border-neutral-200">
      <div class="container-aura">
        <div class="flex items-center justify-end py-2 text-caption">
          <div class="flex items-center gap-6 w-full md:w-auto justify-center md:justify-end">
            <LanguageSwitcher />
            <CurrencySwitcher />
            <ClientOnly>
              <NuxtLink 
                v-if="!isLoggedIn" 
                to="/auth/login" 
                class="hover:text-aura-black transition-colors"
              >
                {{ t('header.signInOrCreate') }}
              </NuxtLink>
              <NuxtLink
                v-else
                to="/account"
                class="hover:text-aura-black transition-colors"
              >
                {{ t('header.hello') }}, {{ authStore.fullName || authStore.user?.email }}
              </NuxtLink>
              <template #fallback>
                <span class="text-neutral-400">{{ t('header.signInOrCreate') }}</span>
              </template>
            </ClientOnly>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Header -->
    <div 
      class="bg-aura-white transition-all duration-300"
      :class="isScrolled ? 'shadow-soft' : 'border-b border-neutral-100'"
    >
      <div class="container-aura">
        <div class="flex items-center justify-between py-5">
          
          <!-- Left: Logo -->
          <NuxtLink to="/" class="flex-shrink-0">
            <h1 class="font-serif text-2xl lg:text-[1.75rem] tracking-[0.2em] text-aura-black">
              AURA ARCHIVE
            </h1>
          </NuxtLink>

          <!-- Center: Navigation (Desktop) -->
          <nav class="hidden lg:flex items-center justify-center gap-10 absolute left-1/2 transform -translate-x-1/2">
            <NuxtLink
              v-for="item in navItems"
              :key="item.href"
              :to="item.href"
              class="text-caption uppercase tracking-[0.15em] text-neutral-700 hover:text-aura-black transition-colors relative group"
              :class="{ 'text-aura-black font-medium': isActive(item.href) }"
            >
              {{ item.name }}
              <!-- Underline effect -->
              <span 
                class="absolute -bottom-1 left-0 w-0 h-px bg-aura-black transition-all duration-300 group-hover:w-full"
                :class="{ 'w-full': isActive(item.href) }"
              />
            </NuxtLink>
          </nav>

          <!-- Right: Actions -->
          <div class="flex items-center gap-2 lg:gap-4">
            <!-- Mobile Menu Button -->
            <button
              @click="isMobileMenuOpen = !isMobileMenuOpen"
              class="lg:hidden p-2 text-neutral-700 hover:text-aura-black transition-colors"
              aria-label="Toggle menu"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  v-if="!isMobileMenuOpen"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M4 6h16M4 12h16M4 18h16"
                />
                <path
                  v-else
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <!-- Search -->
            <NuxtLink
              to="/shop"
              class="p-2 text-neutral-600 hover:text-aura-black transition-colors"
              :aria-label="t('common.search')"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </NuxtLink>

            <!-- User Account Dropdown -->
            <Menu as="div" class="relative">
              <MenuButton class="p-2 text-neutral-600 hover:text-aura-black transition-colors">
                <div class="relative">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <ClientOnly>
                    <span
                      v-if="isLoggedIn"
                      class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"
                    />
                  </ClientOnly>
                </div>
              </MenuButton>

              <transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="opacity-0 translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 translate-y-1"
              >
                <MenuItems
                  class="absolute right-0 mt-2 w-52 bg-aura-white shadow-elevated py-2 focus:outline-none z-50"
                >
                  <template v-if="isLoggedIn">
                    <!-- User info header -->
                    <div class="px-4 py-3 border-b border-neutral-100">
                      <p class="text-body-sm font-medium text-aura-black truncate">
                        {{ authStore.fullName || t('common.account') }}
                      </p>
                      <p class="text-caption text-neutral-500 truncate">
                        {{ authStore.user?.email }}
                      </p>
                    </div>
                    <MenuItem v-slot="{ active }">
                      <NuxtLink
                        to="/account"
                        class="block px-4 py-2.5 text-body-sm"
                        :class="active ? 'bg-neutral-50 text-aura-black' : 'text-neutral-600'"
                      >
                        {{ t('common.account') }}
                      </NuxtLink>
                    </MenuItem>
                    <MenuItem v-slot="{ active }">
                      <NuxtLink
                        to="/account/orders"
                        class="block px-4 py-2.5 text-body-sm"
                        :class="active ? 'bg-neutral-50 text-aura-black' : 'text-neutral-600'"
                      >
                        {{ t('account.orders') }}
                      </NuxtLink>
                    </MenuItem>
                    <MenuItem v-slot="{ active }">
                      <NuxtLink
                        to="/account/wishlist"
                        class="block px-4 py-2.5 text-body-sm"
                        :class="active ? 'bg-neutral-50 text-aura-black' : 'text-neutral-600'"
                      >
                        {{ t('common.wishlist') }}
                      </NuxtLink>
                    </MenuItem>
                    <MenuItem v-if="isAdmin" v-slot="{ active }">
                      <NuxtLink
                        to="/admin/dashboard"
                        class="block px-4 py-2.5 text-body-sm border-t border-neutral-100 mt-1 pt-2.5"
                        :class="active ? 'bg-neutral-50 text-aura-black' : 'text-neutral-600'"
                      >
                        {{ t('nav.adminPanel') }}
                      </NuxtLink>
                    </MenuItem>
                    <MenuItem v-slot="{ active }">
                      <button
                        @click="authStore.logout()"
                        class="w-full text-left block px-4 py-2.5 text-body-sm border-t border-neutral-100 mt-1 pt-2.5"
                        :class="active ? 'bg-neutral-50 text-aura-black' : 'text-neutral-600'"
                      >
                        {{ t('common.logout') }}
                      </button>
                    </MenuItem>
                  </template>
                  <template v-else>
                    <MenuItem v-slot="{ active }">
                      <NuxtLink
                        to="/auth/login"
                        class="block px-4 py-2.5 text-body-sm"
                        :class="active ? 'bg-neutral-50 text-aura-black' : 'text-neutral-600'"
                      >
                        {{ t('common.login') }}
                      </NuxtLink>
                    </MenuItem>
                    <MenuItem v-slot="{ active }">
                      <NuxtLink
                        to="/auth/register"
                        class="block px-4 py-2.5 text-body-sm"
                        :class="active ? 'bg-neutral-50 text-aura-black' : 'text-neutral-600'"
                      >
                        {{ t('common.register') }}
                      </NuxtLink>
                    </MenuItem>
                  </template>
                </MenuItems>
              </transition>
            </Menu>

            <!-- Wishlist (Desktop only, if logged in) -->
            <ClientOnly>
              <NuxtLink
                v-if="isLoggedIn"
                to="/account/wishlist"
                class="hidden lg:block p-2 text-neutral-600 hover:text-aura-black transition-colors"
                :aria-label="t('common.wishlist')"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </NuxtLink>
            </ClientOnly>

            <!-- Cart -->
            <NuxtLink
              to="/cart"
              class="relative p-2 text-neutral-600 hover:text-aura-black transition-colors"
              :aria-label="t('common.cart')"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <!-- Cart counter badge -->
              <span
                v-if="cartStore.itemCount > 0"
                class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent-burgundy text-white text-[10px] flex items-center justify-center rounded-full"
              >
                {{ cartStore.itemCount }}
              </span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Navigation -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <nav
        v-show="isMobileMenuOpen"
        class="lg:hidden bg-aura-white border-b border-neutral-100"
      >
        <div class="container-aura py-6 space-y-4">
          <NuxtLink
            v-for="item in navItems"
            :key="item.href"
            :to="item.href"
            class="block text-body uppercase tracking-[0.15em] text-neutral-700 hover:text-aura-black transition-colors py-2"
            :class="{ 'text-aura-black font-medium': isActive(item.href) }"
            @click="isMobileMenuOpen = false"
          >
            {{ item.name }}
          </NuxtLink>
        </div>
      </nav>
    </transition>
  </header>
</template>
