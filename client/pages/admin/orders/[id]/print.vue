<script setup lang="ts">
/**
 * Print Order Invoice Page
 * AURA ARCHIVE - Generate printable invoice/packing slip
 */

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const route = useRoute()
const config = useRuntimeConfig()
const { getToken } = useAuthToken()
const orderId = route.params.id as string

const order = ref<any>(null)
const isLoading = ref(true)

// Fetch order
const fetchOrder = async () => {
  try {
    const response = await $fetch<{ success: boolean; data: { order: any } }>(
      `${config.public.apiUrl}/admin/orders/${orderId}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
    order.value = response.data.order
  } catch (error) {
    console.error('Failed to fetch order:', error)
  } finally {
    isLoading.value = false
  }
}

// Format
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price * 24000)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Print
const handlePrint = () => {
  window.print()
}

onMounted(fetchOrder)
</script>

<template>
  <div class="print-page">
    <!-- Print Button (hidden in print) -->
    <div class="no-print p-4 flex gap-4 bg-neutral-100 mb-4">
      <button @click="handlePrint" class="btn-primary">
        🖨️ In hóa đơn
      </button>
      <NuxtLink :to="`/admin/orders/${orderId}`" class="btn-secondary">
        ← Quay lại
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12">
      <p>Đang tải...</p>
    </div>

    <!-- Invoice -->
    <div v-else-if="order" class="invoice-container max-w-3xl mx-auto bg-white p-8">
      <!-- Header -->
      <div class="flex justify-between items-start mb-8 pb-8 border-b-2 border-black">
        <div>
          <h1 class="text-3xl font-serif font-bold">AURA ARCHIVE</h1>
          <p class="text-sm text-neutral-600 mt-1">Luxury Resell Fashion</p>
        </div>
        <div class="text-right">
          <h2 class="text-xl font-bold">HÓA ĐƠN</h2>
          <p class="text-sm text-neutral-600">#{{ order.order_number || order.id.slice(0, 8).toUpperCase() }}</p>
          <p class="text-sm text-neutral-600">{{ formatDate(order.created_at) }}</p>
        </div>
      </div>

      <!-- Customer & Shipping Info -->
      <div class="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 class="font-bold text-sm uppercase text-neutral-500 mb-2">Khách hàng</h3>
          <p class="font-medium">{{ order.user?.first_name }} {{ order.user?.last_name }}</p>
          <p class="text-sm">{{ order.user?.email }}</p>
          <p class="text-sm">{{ order.user?.phone }}</p>
        </div>
        <div>
          <h3 class="font-bold text-sm uppercase text-neutral-500 mb-2">Địa chỉ giao hàng</h3>
          <p>{{ order.shipping_address?.full_name }}</p>
          <p class="text-sm">{{ order.shipping_address?.address }}</p>
          <p class="text-sm">{{ order.shipping_address?.district }}, {{ order.shipping_address?.city }}</p>
          <p class="text-sm">{{ order.shipping_address?.phone }}</p>
        </div>
      </div>

      <!-- Order Items -->
      <table class="w-full mb-8">
        <thead>
          <tr class="border-b-2 border-black">
            <th class="text-left py-2 font-bold">Sản phẩm</th>
            <th class="text-center py-2 font-bold w-24">Size</th>
            <th class="text-center py-2 font-bold w-24">Màu</th>
            <th class="text-right py-2 font-bold w-32">Giá</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in order.items" :key="item.id" class="border-b">
            <td class="py-3">
              <p class="font-medium">{{ item.product?.name }}</p>
              <p class="text-xs text-neutral-500">SKU: {{ item.variant?.sku || 'N/A' }}</p>
            </td>
            <td class="text-center py-3">{{ item.variant?.size }}</td>
            <td class="text-center py-3">{{ item.variant?.color }}</td>
            <td class="text-right py-3">{{ formatPrice(item.price) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Totals -->
      <div class="flex justify-end">
        <div class="w-64">
          <div class="flex justify-between py-2 border-b">
            <span>Tạm tính:</span>
            <span>{{ formatPrice(order.subtotal) }}</span>
          </div>
          <div class="flex justify-between py-2 border-b">
            <span>Phí vận chuyển:</span>
            <span>{{ formatPrice(order.shipping_fee || 0) }}</span>
          </div>
          <div v-if="order.discount_amount > 0" class="flex justify-between py-2 border-b text-green-600">
            <span>Giảm giá:</span>
            <span>-{{ formatPrice(order.discount_amount) }}</span>
          </div>
          <div class="flex justify-between py-3 font-bold text-lg">
            <span>Tổng cộng:</span>
            <span>{{ formatPrice(order.total_amount) }}</span>
          </div>
        </div>
      </div>

      <!-- Payment Info -->
      <div class="mt-8 pt-8 border-t">
        <div class="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span class="text-neutral-500">Phương thức:</span>
            <span class="ml-2 font-medium">{{ order.payment_method }}</span>
          </div>
          <div>
            <span class="text-neutral-500">Trạng thái:</span>
            <span class="ml-2 font-medium">{{ order.status }}</span>
          </div>
          <div>
            <span class="text-neutral-500">Thanh toán:</span>
            <span class="ml-2 font-medium">{{ order.payment_status }}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-12 pt-8 border-t text-center text-sm text-neutral-500">
        <p>Cảm ơn quý khách đã mua hàng tại AURA ARCHIVE</p>
        <p class="mt-1">Website: aura-archive.com | Email: support@aura-archive.com</p>
      </div>
    </div>
  </div>
</template>

<style>
@media print {
  .no-print {
    display: none !important;
  }
  .invoice-container {
    margin: 0;
    padding: 20px;
    box-shadow: none;
  }
  body {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}

.print-page {
  background: #f5f5f5;
  min-height: 100vh;
}

.invoice-container {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style>
