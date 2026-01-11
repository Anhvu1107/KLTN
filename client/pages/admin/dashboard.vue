<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

import { useI18n } from '#imports'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const { t } = useI18n()

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const config = useRuntimeConfig()
const token = localStorage.getItem('token')

// Fetch stats
const { data: statsData, pending: statsPending } = await useFetch<{
  success: boolean
  data: { stats: any }
}>(`${config.public.apiUrl}/admin/stats`, {
  headers: { Authorization: `Bearer ${token}` },
})

// Fetch monthly revenue
const { data: revenueData, pending: revenuePending } = await useFetch<{
  success: boolean
  data: { months: string[]; revenues: number[]; orderCounts: number[] }
}>(`${config.public.apiUrl}/admin/revenue/monthly`, {
  headers: { Authorization: `Bearer ${token}` },
})

// Fetch recent orders
const { data: ordersData, pending: ordersPending } = await useFetch<{
  success: boolean
  data: { orders: any[] }
}>(`${config.public.apiUrl}/admin/orders/recent?limit=5`, {
  headers: { Authorization: `Bearer ${token}` },
})

const stats = computed(() => statsData.value?.data?.stats || {})
const revenueChart = computed(() => revenueData.value?.data || { months: [], revenues: [], orderCounts: [] })
const recentOrders = computed(() => ordersData.value?.data?.orders || [])

// Chart configuration
const chartData = computed(() => ({
  labels: revenueChart.value.months,
  datasets: [
    {
      label: 'Revenue ($)',
      data: revenueChart.value.revenues,
      borderColor: '#1a1a1a',
      backgroundColor: 'rgba(26, 26, 26, 0.1)',
      fill: true,
      tension: 0.4,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: number) => `$${value.toLocaleString()}`,
      },
    },
  },
}

// Format helpers
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
  title: 'Admin Dashboard | AURA ARCHIVE',
})
</script>

<template>
  <div class="section bg-neutral-50 min-h-screen">
    <div class="container-aura">
      <div class="flex items-center justify-between mb-8">
        <h1 class="font-serif text-heading-2 text-aura-black">{{ t('admin.dashboard') }}</h1>
        <span class="text-caption text-neutral-500">{{ t('nav.adminPanel') }}</span>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="card p-6">
          <p class="text-caption text-neutral-500 uppercase tracking-wider mb-2">{{ t('admin.totalRevenue') }}</p>
          <p class="text-heading-3 font-serif text-aura-black">{{ formatPrice(stats.totalRevenue || 0) }}</p>
        </div>
        <div class="card p-6">
          <p class="text-caption text-neutral-500 uppercase tracking-wider mb-2">{{ t('admin.totalOrders') }}</p>
          <p class="text-heading-3 font-serif text-aura-black">{{ stats.totalOrders || 0 }}</p>
          <p class="text-caption text-yellow-600">{{ stats.pendingOrders || 0 }} {{ t('admin.pending') }}</p>
        </div>
        <div class="card p-6">
          <p class="text-caption text-neutral-500 uppercase tracking-wider mb-2">{{ t('admin.products') }}</p>
          <p class="text-heading-3 font-serif text-aura-black">{{ stats.totalProducts || 0 }}</p>
          <p class="text-caption text-green-600">{{ stats.availableItems || 0 }} {{ t('admin.available') }}</p>
        </div>
        <div class="card p-6">
          <p class="text-caption text-neutral-500 uppercase tracking-wider mb-2">{{ t('admin.customers') }}</p>
          <p class="text-heading-3 font-serif text-aura-black">{{ stats.totalCustomers || 0 }}</p>
          <p class="text-caption text-blue-600">+{{ stats.newCustomersThisMonth || 0 }} {{ t('admin.thisMonth') }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Revenue Chart -->
        <div class="lg:col-span-2 card p-6">
          <h2 class="font-serif text-heading-4 text-aura-black mb-6">{{ t('admin.monthlyRevenue') }}</h2>
          <div class="h-64">
            <Line v-if="!revenuePending && revenueChart.months.length > 0" :data="chartData" :options="chartOptions" />
            <div v-else-if="revenuePending" class="h-full flex items-center justify-center">
              <p class="text-neutral-500">{{ t('common.loading') }}</p>
            </div>
            <div v-else class="h-full flex items-center justify-center">
              <p class="text-neutral-500">{{ t('admin.noRevenueData') }}</p>
            </div>
          </div>
        </div>

        <!-- Quick Links -->
        <div class="card p-6">
          <h2 class="font-serif text-heading-4 text-aura-black mb-6">{{ t('admin.quickActions') }}</h2>
          <div class="space-y-3">
            <NuxtLink to="/admin/orders" class="block p-3 bg-neutral-50 hover:bg-neutral-100 rounded-sm transition-colors">
              <span class="text-body-sm">{{ t('admin.manageOrders') }}</span>
            </NuxtLink>
            <NuxtLink to="/admin/products" class="block p-3 bg-neutral-50 hover:bg-neutral-100 rounded-sm transition-colors">
              <span class="text-body-sm">{{ t('admin.manageProducts') }}</span>
            </NuxtLink>
            <NuxtLink to="/admin/ai-config" class="block p-3 bg-neutral-50 hover:bg-neutral-100 rounded-sm transition-colors">
              <span class="text-body-sm">{{ t('admin.aiConfig.title') }}</span>
            </NuxtLink>
            <NuxtLink to="/admin/users" class="block p-3 bg-neutral-50 hover:bg-neutral-100 rounded-sm transition-colors">
              <span class="text-body-sm">{{ t('admin.manageUsers') }}</span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Recent Orders -->
      <div class="mt-8 card p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="font-serif text-heading-4 text-aura-black">{{ t('admin.recentOrders') }}</h2>
          <NuxtLink to="/admin/orders" class="text-body-sm text-neutral-600 hover:text-aura-black">
            {{ t('common.viewAll') }} →
          </NuxtLink>
        </div>

        <div v-if="ordersPending" class="text-center py-8">
          <p class="text-neutral-500">{{ t('common.loading') }}</p>
        </div>

        <div v-else-if="recentOrders.length === 0" class="text-center py-8">
          <p class="text-neutral-500">{{ t('admin.noOrders') }}</p>
        </div>

        <table v-else class="w-full">
          <thead>
            <tr class="border-b border-neutral-200">
              <th class="text-left py-3 text-caption font-medium text-neutral-500 uppercase">{{ t('admin.orderId') }}</th>
              <th class="text-left py-3 text-caption font-medium text-neutral-500 uppercase">{{ t('admin.customer') }}</th>
              <th class="text-left py-3 text-caption font-medium text-neutral-500 uppercase">{{ t('admin.amount') }}</th>
              <th class="text-left py-3 text-caption font-medium text-neutral-500 uppercase">{{ t('common.status') }}</th>
              <th class="text-left py-3 text-caption font-medium text-neutral-500 uppercase">{{ t('admin.date') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in recentOrders" :key="order.id" class="border-b border-neutral-100">
              <td class="py-4 text-body-sm font-mono">{{ order.id.slice(0, 8) }}...</td>
              <td class="py-4 text-body-sm">{{ order.user?.email || 'N/A' }}</td>
              <td class="py-4 text-body-sm font-medium">{{ formatPrice(order.total_amount) }}</td>
              <td class="py-4">
                <span :class="getStatusClass(order.status)" class="px-2 py-1 text-caption rounded-sm">
                  {{ order.status }}
                </span>
              </td>
              <td class="py-4 text-body-sm text-neutral-600">{{ formatDate(order.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
