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
const authStore = useAuthStore()
const token = computed(() => authStore.token)
const { formatPrice, currency } = useCurrency()

// ── Period selectors ──
type ViewType = 'month' | 'quarter' | 'year'
const selectedView = ref<ViewType>('year')
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1) // 1-12
const selectedQuarter = ref(Math.ceil((new Date().getMonth() + 1) / 3)) // 1-4

// Generate year options (current year and 4 previous years)
const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

const monthOptions = [
  { value: 1, label: '01' }, { value: 2, label: '02' }, { value: 3, label: '03' },
  { value: 4, label: '04' }, { value: 5, label: '05' }, { value: 6, label: '06' },
  { value: 7, label: '07' }, { value: 8, label: '08' }, { value: 9, label: '09' },
  { value: 10, label: '10' }, { value: 11, label: '11' }, { value: 12, label: '12' },
]

const quarterOptions = [
  { value: 1, label: 'Q1' },
  { value: 2, label: 'Q2' },
  { value: 3, label: 'Q3' },
  { value: 4, label: 'Q4' },
]

// Build API URL reactively
const revenueUrl = computed(() => {
  let url = `${config.public.apiUrl}/admin/revenue/monthly?view=${selectedView.value}&year=${selectedYear.value}`
  if (selectedView.value === 'month') url += `&month=${selectedMonth.value}`
  if (selectedView.value === 'quarter') url += `&quarter=${selectedQuarter.value}`
  return url
})

// Fetch stats
const { data: statsData } = await useFetch<{
  success: boolean
  data: { stats: any }
}>(`${config.public.apiUrl}/admin/stats`, {
  headers: { Authorization: `Bearer ${token.value}` },
  server: false,
})

// Fetch revenue (reactive)
const { data: revenueData, pending: revenuePending } = await useFetch<{
  success: boolean
  data: { labels: string[]; revenues: number[]; orderCounts: number[] }
}>(revenueUrl, {
  headers: { Authorization: `Bearer ${token.value}` },
  server: false,
  watch: [selectedView, selectedYear, selectedMonth, selectedQuarter],
})

// Fetch recent orders
const { data: ordersData, pending: ordersPending } = await useFetch<{
  success: boolean
  data: { orders: any[] }
}>(`${config.public.apiUrl}/admin/orders/recent?limit=5`, {
  headers: { Authorization: `Bearer ${token.value}` },
  server: false,
})

const stats = computed(() => statsData.value?.data?.stats || {})
const revenueChart = computed(() => {
  const d = revenueData.value?.data || { labels: [], revenues: [], orderCounts: [] }
  return {
    labels: d.labels || (d as any).months || [],
    revenues: d.revenues || [],
    orderCounts: d.orderCounts || [],
  }
})
const recentOrders = computed(() => ordersData.value?.data?.orders || [])

// Chart data
const chartData = computed(() => ({
  labels: revenueChart.value.labels,
  datasets: [
    {
      label: t('admin.totalRevenue'),
      data: revenueChart.value.revenues,
      borderColor: '#1a1a1a',
      backgroundColor: 'rgba(26, 26, 26, 0.1)',
      fill: true,
      tension: 0.4,
    },
  ],
}))

const chartKey = computed(() => `${currency.value}-${selectedView.value}-${selectedYear.value}-${selectedMonth.value}-${selectedQuarter.value}-${revenueChart.value.revenues.length}`)

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: string | number) => formatPrice(Number(value)),
      },
    },
  },
}))

// Chart title
const chartTitle = computed(() => {
  switch (selectedView.value) {
    case 'month':
      return `${t('admin.revenueByPeriod', { period: t('admin.periodMonth').toLowerCase() })} ${String(selectedMonth.value).padStart(2, '0')}/${selectedYear.value}`
    case 'quarter':
      return `${t('admin.revenueByPeriod', { period: t('admin.periodQuarter').toLowerCase() })} Q${selectedQuarter.value}/${selectedYear.value}`
    case 'year':
      return `${t('admin.revenueByPeriod', { period: t('admin.periodYear').toLowerCase() })} ${selectedYear.value}`
    default:
      return t('admin.monthlyRevenue')
  }
})

const formatDate = (date: string) => {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
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

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    PENDING: t('orders.pending'),
    CONFIRMED: t('orders.confirmed'),
    PROCESSING: t('orders.processing'),
    SHIPPED: t('orders.shipped'),
    DELIVERED: t('orders.delivered'),
    CANCELLED: t('orders.cancelled'),
  }
  return map[s] || s
}

useSeoMeta({
  title: 'Admin Dashboard | AURA ARCHIVE',
})
</script>

<template>
  <!-- placeholder aria-label for ux audit -->
  <div class="section bg-neutral-50 min-h-screen">
    <div class="container-aura">
      <div class="flex items-center justify-between mb-8">
        <h1 class="font-serif text-heading-2 text-aura-black">{{ $t('admin.dashboard') }}</h1>
        <span class="text-caption text-neutral-500">{{ $t('nav.adminPanel') }}</span>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="card p-6">
          <p class="text-caption text-neutral-500 uppercase tracking-wider mb-2">{{ $t('admin.totalRevenue') }}</p>
          <p class="text-heading-3 font-serif text-aura-black">{{ formatPrice(stats.totalRevenue || 0) }}</p>
        </div>
        <div class="card p-6">
          <p class="text-caption text-neutral-500 uppercase tracking-wider mb-2">{{ $t('admin.totalOrders') }}</p>
          <p class="text-heading-3 font-serif text-aura-black">{{ stats.totalOrders || 0 }}</p>
          <p class="text-caption text-yellow-600">{{ stats.pendingOrders || 0 }} {{ $t('orders.pending').toLowerCase() }}</p>
        </div>
        <div class="card p-6">
          <p class="text-caption text-neutral-500 uppercase tracking-wider mb-2">{{ $t('admin.products') }}</p>
          <p class="text-heading-3 font-serif text-aura-black">{{ stats.totalProducts || 0 }}</p>
          <p class="text-caption text-green-600">{{ stats.availableItems || 0 }} {{ $t('shop.available').toLowerCase() }}</p>
        </div>
        <div class="card p-6">
          <p class="text-caption text-neutral-500 uppercase tracking-wider mb-2">{{ $t('admin.users') }}</p>
          <p class="text-heading-3 font-serif text-aura-black">{{ stats.totalCustomers || 0 }}</p>
          <p class="text-caption text-blue-600">+{{ stats.newCustomersThisMonth || 0 }} {{ $t('admin.newCustomers').toLowerCase() }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Revenue Chart -->
        <div class="lg:col-span-2 card p-6">
          <!-- Chart Header: Title + Controls -->
          <div class="flex flex-col gap-4 mb-6">
            <div class="flex items-center justify-between">
              <h2 class="font-serif text-heading-4 text-aura-black">{{ chartTitle }}</h2>
            </div>

            <!-- Filters row -->
            <div class="flex flex-wrap items-center gap-3">
              <!-- Year selector -->
              <select
                v-model="selectedYear"
                class="px-3 py-1.5 text-caption bg-white border border-neutral-200 rounded-sm focus:outline-none focus:border-aura-black"
              >
                <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
              </select>

              <!-- View type buttons -->
              <div class="flex gap-1">
                <button
                  class="px-3 py-1.5 text-caption rounded-sm transition-colors"
                  :class="selectedView === 'year'
                    ? 'bg-aura-black text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
                  @click="selectedView = 'year'"
                >
                  {{ $t('admin.periodYear') }}
                </button>
                <button
                  class="px-3 py-1.5 text-caption rounded-sm transition-colors"
                  :class="selectedView === 'quarter'
                    ? 'bg-aura-black text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
                  @click="selectedView = 'quarter'"
                >
                  {{ $t('admin.periodQuarter') }}
                </button>
                <button
                  class="px-3 py-1.5 text-caption rounded-sm transition-colors"
                  :class="selectedView === 'month'
                    ? 'bg-aura-black text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
                  @click="selectedView = 'month'"
                >
                  {{ $t('admin.periodMonth') }}
                </button>
              </div>

              <!-- Sub-period selector (quarter or month) -->
              <select
                v-if="selectedView === 'quarter'"
                v-model="selectedQuarter"
                class="px-3 py-1.5 text-caption bg-white border border-neutral-200 rounded-sm focus:outline-none focus:border-aura-black"
              >
                <option v-for="q in quarterOptions" :key="q.value" :value="q.value">{{ q.label }}</option>
              </select>

              <select
                v-if="selectedView === 'month'"
                v-model="selectedMonth"
                class="px-3 py-1.5 text-caption bg-white border border-neutral-200 rounded-sm focus:outline-none focus:border-aura-black"
              >
                <option v-for="m in monthOptions" :key="m.value" :value="m.value">
                  {{ $t('admin.periodMonth') }} {{ m.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- Chart -->
          <div class="h-72">
            <Line
              v-if="!revenuePending && revenueChart.labels && revenueChart.labels.length > 0"
              :key="chartKey"
              :data="chartData"
              :options="chartOptions"
            />
            <div v-else-if="revenuePending" class="h-full flex items-center justify-center">
              <p class="text-neutral-500">{{ $t('common.loading') }}</p>
            </div>
            <div v-else class="h-full flex items-center justify-center">
              <p class="text-neutral-500">{{ $t('admin.noRevenueData') }}</p>
            </div>
          </div>
        </div>

        <!-- Quick Links -->
        <div class="card p-6">
          <h2 class="font-serif text-heading-4 text-aura-black mb-6">{{ $t('admin.quickActions') }}</h2>
          <div class="space-y-3">
            <NuxtLink to="/admin/orders" class="block p-3 bg-neutral-50 hover:bg-neutral-100 rounded-sm transition-colors">
              <span class="text-body-sm">{{ $t('admin.orderManagement') }}</span>
            </NuxtLink>
            <NuxtLink to="/admin/products" class="block p-3 bg-neutral-50 hover:bg-neutral-100 rounded-sm transition-colors">
              <span class="text-body-sm">{{ $t('admin.products') }}</span>
            </NuxtLink>
            <NuxtLink to="/admin/ai-config" class="block p-3 bg-neutral-50 hover:bg-neutral-100 rounded-sm transition-colors">
              <span class="text-body-sm">{{ $t('admin.aiConfig.title') }}</span>
            </NuxtLink>
            <NuxtLink to="/admin/users" class="block p-3 bg-neutral-50 hover:bg-neutral-100 rounded-sm transition-colors">
              <span class="text-body-sm">{{ $t('admin.userManagement') }}</span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Recent Orders -->
      <div class="mt-8 card p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="font-serif text-heading-4 text-aura-black">{{ $t('admin.recentOrders') }}</h2>
          <NuxtLink to="/admin/orders" class="text-body-sm text-neutral-600 hover:text-aura-black">
            {{ $t('home.viewAll') }} →
          </NuxtLink>
        </div>

        <div v-if="ordersPending" class="text-center py-8">
          <p class="text-neutral-500">{{ $t('common.loading') }}</p>
        </div>

        <div v-else-if="recentOrders.length === 0" class="text-center py-8">
          <p class="text-neutral-500">{{ $t('account.noOrders') }}</p>
        </div>

        <table v-else class="w-full">
          <thead>
            <tr class="border-b border-neutral-200">
              <th class="text-left py-3 text-caption font-medium text-neutral-500 uppercase">{{ $t('orders.orderId') }}</th>
              <th class="text-left py-3 text-caption font-medium text-neutral-500 uppercase">{{ $t('admin.reviews.customer') }}</th>
              <th class="text-left py-3 text-caption font-medium text-neutral-500 uppercase">{{ $t('orders.total') }}</th>
              <th class="text-left py-3 text-caption font-medium text-neutral-500 uppercase">{{ $t('orders.status') }}</th>
              <th class="text-left py-3 text-caption font-medium text-neutral-500 uppercase">{{ $t('orders.date') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in recentOrders" :key="order.id" class="border-b border-neutral-100">
              <td class="py-4 text-body-sm font-mono">{{ order.order_number || order.id.slice(0, 8) + '...' }}</td>
              <td class="py-4 text-body-sm">{{ order.user?.email || 'N/A' }}</td>
              <td class="py-4 text-body-sm font-medium">{{ formatPrice(order.total_amount) }}</td>
              <td class="py-4">
                <span :class="getStatusClass(order.status)" class="px-2 py-1 text-caption rounded-sm">
                  {{ statusLabel(order.status) }}
                </span>
              </td>
              <td class="py-4 text-body-sm text-neutral-600">{{ formatDate(order.created_at || order.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
