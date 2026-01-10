<script setup lang="ts">
/**
 * Admin Reviews Page
 * AURA ARCHIVE - Manage product reviews
 */

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const config = useRuntimeConfig()

// State
const reviews = ref<any[]>([])
const isLoading = ref(true)
const pagination = ref({ total: 0, page: 1, totalPages: 1 })
const statusFilter = ref('')

// Fetch reviews
const fetchReviews = async () => {
  isLoading.value = true
  try {
    const token = localStorage.getItem('token')
    const params = new URLSearchParams()
    params.set('page', String(pagination.value.page))
    params.set('limit', '20')
    if (statusFilter.value) params.set('status', statusFilter.value)

    const response = await $fetch<{ 
      success: boolean
      data: { 
        reviews: any[]
        pagination: { total: number; page: number; totalPages: number }
      } 
    }>(`${config.public.apiUrl}/admin/reviews?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    reviews.value = response.data.reviews
    pagination.value = response.data.pagination
  } catch (error) {
    console.error('Failed to fetch reviews:', error)
  } finally {
    isLoading.value = false
  }
}

// Moderate review
const moderateReview = async (reviewId: string, isApproved: boolean) => {
  try {
    const token = localStorage.getItem('token')
    await $fetch(`${config.public.apiUrl}/admin/reviews/${reviewId}/moderate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: { is_approved: isApproved },
    })
    await fetchReviews()
  } catch (error) {
    console.error('Failed to moderate review:', error)
  }
}

// Delete review
const deleteReview = async (reviewId: string) => {
  if (!confirm('Are you sure you want to delete this review?')) return

  try {
    const token = localStorage.getItem('token')
    await $fetch(`${config.public.apiUrl}/admin/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    await fetchReviews()
  } catch (error) {
    console.error('Failed to delete review:', error)
  }
}

// Format date
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Generate stars
const getStars = (rating: number) => {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

// Watch for filter changes
watch(statusFilter, () => {
  pagination.value.page = 1
  fetchReviews()
})

onMounted(fetchReviews)

useSeoMeta({ title: 'Review Management | Admin' })
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-serif text-heading-2 text-aura-black">Review Management</h1>
      
      <!-- Filter -->
      <select v-model="statusFilter" class="input-field w-48">
        <option value="">All Reviews</option>
        <option value="approved">Approved</option>
        <option value="pending">Pending</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto"></div>
    </div>

    <!-- Reviews List -->
    <div v-else class="space-y-4">
      <div 
        v-for="review in reviews" 
        :key="review.id"
        class="bg-white rounded-sm border border-neutral-200 p-4"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <!-- Header -->
            <div class="flex items-center gap-3 mb-2">
              <span class="text-yellow-500 text-lg">{{ getStars(review.rating) }}</span>
              <span class="text-caption text-neutral-500">{{ formatDate(review.created_at) }}</span>
              <span 
                class="px-2 py-0.5 rounded text-caption"
                :class="review.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
              >
                {{ review.is_approved ? 'Approved' : 'Pending' }}
              </span>
              <span v-if="review.is_verified_purchase" class="px-2 py-0.5 rounded text-caption bg-blue-100 text-blue-700">
                Verified Purchase
              </span>
            </div>

            <!-- Product & User -->
            <div class="text-body-sm mb-2">
              <span class="font-medium">{{ review.user?.first_name }} {{ review.user?.last_name }}</span>
              <span class="text-neutral-400 mx-2">•</span>
              <NuxtLink :to="`/shop/${review.product_id}`" class="text-accent-navy hover:underline">
                {{ review.product?.name || 'Product' }}
              </NuxtLink>
            </div>

            <!-- Title & Comment -->
            <p v-if="review.title" class="font-medium text-aura-black mb-1">{{ review.title }}</p>
            <p class="text-body-sm text-neutral-600">{{ review.comment }}</p>

            <!-- Images -->
            <div v-if="review.images?.length" class="flex gap-2 mt-2">
              <img 
                v-for="(img, idx) in review.images" 
                :key="idx"
                :src="img"
                :alt="`Review image ${idx + 1}`"
                class="w-16 h-16 object-cover rounded-sm"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 ml-4">
            <button
              v-if="!review.is_approved"
              @click="moderateReview(review.id, true)"
              class="px-3 py-1 bg-green-600 text-white text-caption rounded hover:bg-green-700"
            >
              Approve
            </button>
            <button
              v-else
              @click="moderateReview(review.id, false)"
              class="px-3 py-1 bg-yellow-500 text-white text-caption rounded hover:bg-yellow-600"
            >
              Reject
            </button>
            <button
              @click="deleteReview(review.id)"
              class="px-3 py-1 bg-red-600 text-white text-caption rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div v-if="reviews.length === 0" class="text-center py-12 text-neutral-500">
        No reviews found
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-6">
      <button
        @click="pagination.page--; fetchReviews()"
        :disabled="pagination.page === 1"
        class="px-3 py-1 border border-neutral-300 rounded disabled:opacity-50"
      >
        Previous
      </button>
      <span class="px-3 py-1">{{ pagination.page }} / {{ pagination.totalPages }}</span>
      <button
        @click="pagination.page++; fetchReviews()"
        :disabled="pagination.page === pagination.totalPages"
        class="px-3 py-1 border border-neutral-300 rounded disabled:opacity-50"
      >
        Next
      </button>
    </div>
  </div>
</template>
