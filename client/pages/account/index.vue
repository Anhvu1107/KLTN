<script setup lang="ts">
/**
 * Account Dashboard
 * AURA ARCHIVE - User account overview
 */

import { useI18n } from '#imports'
import { useAuthStore } from '~/stores/auth'

const { t } = useI18n()

definePageMeta({
  middleware: ['auth'],
})

const config = useRuntimeConfig()
const authStore = useAuthStore()

// Fetch user profile
const token = localStorage.getItem('token')
const { data: profileData } = await useFetch<{
  success: boolean
  data: { user: any }
}>(`${config.public.apiUrl}/users/profile`, {
  headers: { Authorization: `Bearer ${token}` },
})

// Fetch recent orders
const { data: ordersData } = await useFetch<{
  success: boolean
  data: { orders: any[]; pagination: any }
}>(`${config.public.apiUrl}/users/orders?limit=3`, {
  headers: { Authorization: `Bearer ${token}` },
})

// Fetch wishlist count
const { data: wishlistData } = await useFetch<{
  success: boolean
  data: { items: any[]; count: number }
}>(`${config.public.apiUrl}/wishlist`, {
  headers: { Authorization: `Bearer ${token}` },
})

const user = computed(() => profileData.value?.data?.user || authStore.user)
const recentOrders = computed(() => ordersData.value?.data?.orders || [])
const wishlistCount = computed(() => wishlistData.value?.data?.count || 0)

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    PROCESSING: 'bg-purple-100 text-purple-800',
    SHIPPED: 'bg-indigo-100 text-indigo-800',
    DELIVERED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    PENDING: t('orders.pending'),
    CONFIRMED: t('orders.confirmed'),
    PROCESSING: t('orders.processing'),
    SHIPPED: t('orders.shipped'),
    DELIVERED: t('orders.delivered'),
    CANCELLED: t('orders.cancelled'),
  }
  return map[status] || status
}

useSeoMeta({
  title: () => `${t('account.title')} | AURA ARCHIVE`,
})
</script>

<template>
  <div class="section">
    <div class="container-aura max-w-4xl">
      <h1 class="font-serif text-heading-1 text-aura-black mb-8">{{ t('account.title') }}</h1>

      <!-- Welcome -->
      <div class="card p-6 mb-8">
        <h2 class="font-serif text-heading-3 text-aura-black">
          {{ t('account.welcome') }}, {{ user?.first_name || 'Guest' }}
        </h2>
        <p class="text-body text-neutral-600 mt-1">{{ user?.email }}</p>
      </div>

      <!-- Quick Links -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <NuxtLink to="/account/orders" class="card p-6 hover:border-aura-black transition-colors">
          <div class="text-heading-2 font-serif text-aura-black">{{ recentOrders.length }}</div>
          <p class="text-body-sm text-neutral-600">{{ t('account.recentOrders') }}</p>
        </NuxtLink>
        <NuxtLink to="/account/wishlist" class="card p-6 hover:border-aura-black transition-colors">
          <div class="text-heading-2 font-serif text-aura-black">{{ wishlistCount }}</div>
          <p class="text-body-sm text-neutral-600">{{ t('account.wishlistItems') }}</p>
        </NuxtLink>
        <NuxtLink to="/account/profile" class="card p-6 hover:border-aura-black transition-colors">
          <div class="text-heading-2 font-serif text-aura-black">
            <svg class="w-8 h-8 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p class="text-body-sm text-neutral-600">{{ t('account.editProfile') }}</p>
        </NuxtLink>
      </div>

      <!-- Recent Orders -->
      <div class="card p-6 mb-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="font-serif text-heading-4 text-aura-black">{{ t('account.recentOrders') }}</h2>
          <NuxtLink to="/account/orders" class="text-body-sm text-neutral-600 hover:text-aura-black">
            {{ t('account.viewAll') }} →
          </NuxtLink>
        </div>

        <div v-if="recentOrders.length === 0" class="text-center py-8">
          <p class="text-neutral-500">{{ t('account.noOrders') }}</p>
          <NuxtLink to="/shop" class="btn-primary mt-4">{{ t('account.startShopping') }}</NuxtLink>
        </div>

        <div v-else class="space-y-4">
          <div v-for="order in recentOrders" :key="order.id" class="flex items-center justify-between p-4 bg-neutral-50 rounded-sm">
            <div>
              <p class="text-body-sm font-medium text-aura-black">{{ t('orders.orderId') }} #{{ order.id.slice(0, 8) }}</p>
              <p class="text-caption text-neutral-500">{{ formatDate(order.created_at) }}</p>
            </div>
            <div class="text-right">
              <p class="text-body-sm font-medium">{{ formatPrice(order.total_amount) }}</p>
              <span :class="getStatusClass(order.status)" class="px-2 py-1 text-caption rounded-sm">
                {{ getStatusText(order.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Account Actions -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NuxtLink to="/account/profile" class="btn-secondary text-center">
          {{ t('account.editProfile') }}
        </NuxtLink>
        <button @click="authStore.logout()" class="btn-ghost text-red-600 hover:bg-red-50">
          {{ t('account.signOut') }}
        </button>
      </div>
    </div>
  </div>
</template>
