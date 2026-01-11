<script setup lang="ts">
/**
 * Order History Page
 * AURA ARCHIVE - User's order list
 */

import { useI18n } from '#imports'

definePageMeta({
  middleware: ['auth'],
})

const { t } = useI18n()

const config = useRuntimeConfig()
const token = localStorage.getItem('token')

const page = ref(1)

const { data, pending, refresh } = await useFetch<{
  success: boolean
  data: { orders: any[]; pagination: any }
}>(() => `${config.public.apiUrl}/users/orders?page=${page.value}&limit=10`, {
  headers: { Authorization: `Bearer ${token}` },
  watch: [page],
})

const orders = computed(() => data.value?.data?.orders || [])
const pagination = computed(() => data.value?.data?.pagination || {})

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

useSeoMeta({
  title: 'Order History | AURA ARCHIVE',
})
</script>

<template>
  <div class="section">
    <div class="container-aura max-w-4xl">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <h1 class="font-serif text-heading-1 text-aura-black">{{ t('account.orderHistory') }}</h1>
        <NuxtLink to="/account" class="text-body-sm text-neutral-600 hover:text-aura-black">
          ← {{ t('common.backTo') }} {{ t('common.account') }}
        </NuxtLink>
      </div>

      <!-- Loading -->
      <div v-if="pending" class="text-center py-16">
        <p class="text-neutral-500">{{ t('common.loading') }}</p>
      </div>

      <!-- Empty -->
      <div v-else-if="orders.length === 0" class="text-center py-16 card">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h2 class="font-serif text-heading-4 text-aura-black mb-2">{{ t('account.noOrdersYet') }}</h2>
        <p class="text-body text-neutral-600 mb-6">{{ t('account.startExploring') }}</p>
        <NuxtLink to="/shop" class="btn-primary">{{ t('shop.shopNow') }}</NuxtLink>
      </div>

      <!-- Orders List -->
      <div v-else class="space-y-4">
        <div v-for="order in orders" :key="order.id" class="card p-6">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <p class="text-body font-medium text-aura-black">Order #{{ order.id.slice(0, 8) }}</p>
                <span :class="getStatusClass(order.status)" class="px-2 py-1 text-caption rounded-sm">
                  {{ order.status }}
                </span>
              </div>
              <p class="text-body-sm text-neutral-600">{{ formatDate(order.created_at) }}</p>
            </div>
            
            <div class="text-right">
              <p class="text-body font-medium text-aura-black">{{ formatPrice(order.total_amount) }}</p>
              <p class="text-caption text-neutral-500">{{ order.payment_status }}</p>
            </div>
          </div>

          <!-- Order Details -->
          <div class="mt-4 pt-4 border-t border-neutral-100">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-body-sm">
              <div>
                <p class="text-neutral-500">Subtotal</p>
                <p class="font-medium">{{ formatPrice(order.subtotal) }}</p>
              </div>
              <div>
                <p class="text-neutral-500">Shipping</p>
                <p class="font-medium">{{ formatPrice(order.shipping_fee || 0) }}</p>
              </div>
              <div>
                <p class="text-neutral-500">Payment</p>
                <p class="font-medium">{{ order.payment_method }}</p>
              </div>
              <div v-if="order.shipped_at">
                <p class="text-neutral-500">Shipped</p>
                <p class="font-medium">{{ formatDate(order.shipped_at).split(',')[0] }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-8">
        <button
          v-for="p in pagination.totalPages"
          :key="p"
          @click="page = p"
          class="w-10 h-10 flex items-center justify-center text-body-sm transition-colors"
          :class="p === pagination.page ? 'bg-aura-black text-white' : 'bg-neutral-100 hover:bg-neutral-200'"
        >
          {{ p }}
        </button>
      </div>
    </div>
  </div>
</template>
