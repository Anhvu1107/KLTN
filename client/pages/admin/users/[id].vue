<script setup lang="ts">
/**
 * Admin User Detail
 * AURA ARCHIVE - View user info, orders, wishlist
 */

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { t, locale } = useI18n()

const route = useRoute()
const config = useRuntimeConfig()
const { getToken } = useAuthToken()
const userId = route.params.id as string

// Fetch user detail - client-side only
const { data, pending } = await useFetch<{
  success: boolean
  data: {
    user: any
    stats: { orderCount: number; wishlistCount: number }
    recentOrders: any[]
    wishlist: any[]
  }
}>(`${config.public.apiUrl}/admin/users/${userId}`, {
  headers: { Authorization: `Bearer ${getToken()}` },
  server: false, // Client-side only to avoid SSR token issue
})

const user = computed(() => data.value?.data?.user)
const stats = computed(() => data.value?.data?.stats || { orderCount: 0, wishlistCount: 0 })
const recentOrders = computed(() => data.value?.data?.recentOrders || [])
const wishlist = computed(() => data.value?.data?.wishlist || [])

const { formatPrice } = useCurrency()

const formatDate = (date: string) => {
  if (!date) return t('common.unknown', 'Kh\u00f4ng x\u00e1c \u0111\u1ecbnh')
  const d = new Date(date)
  if (isNaN(d.getTime())) return t('common.unknown', 'Kh\u00f4ng x\u00e1c \u0111\u1ecbnh')
  return d.toLocaleDateString(locale.value === 'vi' ? 'vi-VN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    PROCESSING: 'bg-teal-100 text-teal-800',
    SHIPPED: 'bg-indigo-100 text-indigo-800',
    DELIVERED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

useSeoMeta({
  title: () => user.value ? `${user.value.email} | AURA ARCHIVE Admin` : 'User Detail',
})
</script>

<template>
  <!-- aria-label -->
  <div class="p-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <h1 class="font-serif text-heading-2 text-aura-black">{{ $t('admin.userDetail') }}</h1>
      <NuxtLink to="/admin/users" class="text-body-sm text-neutral-600 hover:text-aura-black">
        ← {{ $t('common.backTo') }} {{ $t('admin.users') }}
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="text-center py-16">
      <p class="text-neutral-500">{{ $t('common.loading') }}</p>
    </div>

    <!-- Not Found -->
    <div v-else-if="!user" class="text-center py-16 card">
      <p class="text-neutral-500">{{ $t('admin.noUsers') }}</p>
    </div>

    <!-- User Detail -->
    <div v-else class="space-y-8">
      <!-- Profile Card -->
      <div class="card p-6">
        <div class="flex items-start gap-6">
          <div class="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-heading-3 font-serif text-neutral-400">
            {{ user.first_name?.[0] || user.email[0].toUpperCase() }}
          </div>
          <div class="flex-1">
            <h2 class="text-heading-4 font-serif text-aura-black">
              {{ user.first_name || '' }} {{ user.last_name || '' }}
            </h2>
            <p class="text-body text-neutral-600">{{ user.email }}</p>
            <p v-if="user.phone" class="text-body-sm text-neutral-500">{{ user.phone }}</p>
            <div class="flex gap-2 mt-3">
              <span 
                class="px-2 py-1 text-caption rounded-sm"
                :class="user.role === 'ADMIN' ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'"
              >
                {{ user.role === 'ADMIN' ? $t('admin.adminRole') : $t('admin.customer') }}
              </span>
              <span 
                class="px-2 py-1 text-caption rounded-sm"
                :class="user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
              >
                {{ user.is_active ? $t('common.active') : $t('common.inactive') }}
              </span>
            </div>
          </div>
          <div class="text-right">
            <p class="text-caption text-neutral-500">{{ $t('admin.memberSince') }}</p>
            <p class="text-body-sm">{{ formatDate(user.created_at) }}</p>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-4">
        <div class="card p-6">
          <p class="text-heading-2 font-serif text-aura-black">{{ stats.orderCount }}</p>
          <p class="text-body-sm text-neutral-600">{{ $t('admin.totalOrdersCount') }}</p>
        </div>
        <div class="card p-6">
          <p class="text-heading-2 font-serif text-aura-black">{{ stats.wishlistCount }}</p>
          <p class="text-body-sm text-neutral-600">{{ $t('admin.wishlistItemsCount') }}</p>
        </div>
      </div>

      <!-- Recent Orders -->
      <div class="card p-6">
        <h3 class="font-serif text-heading-4 text-aura-black mb-4">{{ $t('account.recentOrders') }}</h3>
        
        <div v-if="recentOrders.length === 0" class="text-center py-8">
          <p class="text-neutral-500">{{ $t('admin.noOrders') }}</p>
        </div>

        <div v-else class="space-y-3">
          <div v-for="order in recentOrders" :key="order.id" class="flex items-center justify-between p-3 bg-neutral-50 rounded-sm">
            <div>
              <p class="text-body-sm font-mono">{{ order.order_number || order.id.slice(0, 8) + '...' }}</p>
              <p class="text-caption text-neutral-500">{{ formatDate(order.created_at) }}</p>
            </div>
            <div class="text-right">
              <p class="text-body-sm font-medium">{{ formatPrice(order.total_amount) }}</p>
              <span :class="getStatusClass(order.status)" class="px-2 py-0.5 text-caption rounded-sm">
                {{ $t(`orders.${order.status.toLowerCase()}`) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Wishlist -->
      <div class="card p-6">
        <h3 class="font-serif text-heading-4 text-aura-black mb-4">{{ $t('wishlist.title') }}</h3>
        
        <div v-if="wishlist.length === 0" class="text-center py-8">
          <p class="text-neutral-500">{{ $t('wishlist.empty') }}</p>
        </div>

        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div v-for="item in wishlist" :key="item.id" class="text-center">
            <div class="aspect-square bg-neutral-100 rounded-sm mb-2"></div>
            <p class="text-caption text-neutral-500">{{ item.product?.brand }}</p>
            <p class="text-body-sm truncate">{{ item.product?.name }}</p>
            <p class="text-body-sm font-medium">{{ formatPrice(item.product?.base_price || 0) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
