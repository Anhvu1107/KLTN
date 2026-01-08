<script setup lang="ts">
/**
 * Admin Order Detail
 * AURA ARCHIVE - Single order view with status management
 */

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const route = useRoute()
const config = useRuntimeConfig()
const token = localStorage.getItem('token')
const orderId = route.params.id as string

// Fetch order
const { data, pending, refresh } = await useFetch<{
  success: boolean
  data: { orders: any[] }
}>(`${config.public.apiUrl}/admin/orders?search=`, {
  headers: { Authorization: `Bearer ${token}` },
})

// Find specific order (simple approach for now)
const order = computed(() => {
  // We'll use a direct call for the order
  return null
})

// For now, redirect back to list
// In a full implementation, you'd have a specific endpoint

useSeoMeta({
  title: 'Order Detail | AURA ARCHIVE Admin',
})
</script>

<template>
  <div class="p-8">
    <div class="flex items-center justify-between mb-8">
      <h1 class="font-serif text-heading-2 text-aura-black">Order Detail</h1>
      <NuxtLink to="/admin/orders" class="text-body-sm text-neutral-600 hover:text-aura-black">
        ← Back to Orders
      </NuxtLink>
    </div>

    <div class="card p-6">
      <p class="text-body text-neutral-600">Order ID: {{ orderId }}</p>
      <p class="text-body-sm text-neutral-500 mt-4">
        Detailed order view coming soon. For now, manage orders from the orders list.
      </p>
      <NuxtLink to="/admin/orders" class="btn-primary mt-6 inline-block">
        Go to Orders List
      </NuxtLink>
    </div>
  </div>
</template>
