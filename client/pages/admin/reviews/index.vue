<script setup lang="ts">
/**
 * Admin Reviews Page
 * AURA ARCHIVE - Manage product reviews
 * Refactored with proper types, composables, and i18n
 */

import { useApi } from '~/composables/useApi'
import { useNotification } from '~/composables/useNotification'
import type { Review, ReviewsListData } from '~/types/review.types'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { t, locale } = useI18n()
const api = useApi()
const notification = useNotification()

// State
const reviews = ref<Review[]>([])
const isLoading = ref(true)
const pagination = ref({ total: 0, page: 1, totalPages: 1 })
const statusFilter = ref('')

// Delete modal state
const showDeleteModal = ref(false)
const deleteTarget = ref<Review | null>(null)
const isDeleting = ref(false)

// Debounce timer
let paginationDebounce: ReturnType<typeof setTimeout> | null = null

// Fetch reviews
const fetchReviews = async () => {
  isLoading.value = true
  try {
    const response = await api.get<ReviewsListData>('/admin/reviews', {
      page: pagination.value.page,
      limit: 20,
      status: statusFilter.value || undefined,
    })
    
    if (response.success) {
      reviews.value = response.data.reviews
      pagination.value = response.data.pagination
    }
  } catch (error) {
    console.error('Failed to fetch reviews:', error)
    notification.errorKey('notifications.loadError')
  } finally {
    isLoading.value = false
  }
}

// Moderate review (approve/reject)
const moderateReview = async (review: Review, isApproved: boolean) => {
  try {
    await api.patch(`/admin/reviews/${review.id}/moderate`, {
      is_approved: isApproved,
    })
    
    // Optimistic update
    review.is_approved = isApproved
    
    notification.successKey(isApproved ? 'notifications.approveSuccess' : 'notifications.rejectSuccess')
  } catch (error) {
    console.error('Failed to moderate review:', error)
    notification.errorKey('notifications.updateError')
    // Revert on error
    await fetchReviews()
  }
}

// Open delete confirmation modal
const confirmDelete = (review: Review) => {
  deleteTarget.value = review
  showDeleteModal.value = true
}

// Delete review
const deleteReview = async () => {
  if (!deleteTarget.value) return
  
  isDeleting.value = true
  try {
    await api.del(`/admin/reviews/${deleteTarget.value.id}`)
    
    // Remove from list
    reviews.value = reviews.value.filter(r => r.id !== deleteTarget.value?.id)
    
    notification.successKey('notifications.deleteSuccess')
    showDeleteModal.value = false
    deleteTarget.value = null
  } catch (error) {
    console.error('Failed to delete review:', error)
    notification.errorKey('notifications.deleteError')
  } finally {
    isDeleting.value = false
  }
}

// Format date based on locale
const formatDate = (dateStr: string) => {
  const localeCode = locale.value === 'vi' ? 'vi-VN' : 'en-US'
  return new Date(dateStr).toLocaleDateString(localeCode, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Generate stars
const getStars = (rating: number) => {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

// Debounced pagination
const changePage = (delta: number) => {
  if (paginationDebounce) clearTimeout(paginationDebounce)
  
  paginationDebounce = setTimeout(() => {
    pagination.value.page += delta
    fetchReviews()
  }, 300)
}

// Watch for filter changes
watch(statusFilter, () => {
  pagination.value.page = 1
  fetchReviews()
})

onMounted(fetchReviews)

useSeoMeta({ title: () => `${t('admin.reviews.title')} | Admin` })
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <AppPageHeader :title="$t('admin.reviews.title')">
      <template #actions>
        <select 
          v-model="statusFilter" 
          class="input-field w-48"
          :aria-label="$t('common.status')"
        >
          <option value="">{{ $t('admin.reviews.allReviews') }}</option>
          <option value="approved">{{ $t('admin.reviews.approved') }}</option>
          <option value="pending">{{ $t('admin.reviews.pending') }}</option>
        </select>
      </template>
    </AppPageHeader>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto" role="status">
        <span class="sr-only">{{ $t('common.loading') }}</span>
      </div>
    </div>

    <!-- Reviews List -->
    <div v-else class="space-y-4">
      <div 
        v-for="review in reviews" 
        :key="review.id"
        class="card p-4"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <!-- Header -->
            <div class="flex items-center gap-3 mb-2">
              <span class="text-yellow-500 text-lg" :aria-label="`${review.rating} ${$t('admin.reviews.rating')}`">
                {{ getStars(review.rating) }}
              </span>
              <span class="text-caption text-neutral-500">
                {{ formatDate(review.created_at) }}
              </span>
              <span 
                class="px-2 py-0.5 rounded text-caption"
                :class="review.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
              >
                {{ review.is_approved ? $t('admin.reviews.approved') : $t('admin.reviews.pending') }}
              </span>
              <span 
                v-if="review.is_verified_purchase" 
                class="px-2 py-0.5 rounded text-caption bg-blue-100 text-blue-700"
              >
                {{ $t('admin.reviews.verifiedPurchase') }}
              </span>
            </div>

            <!-- Product & User -->
            <div class="text-body-sm mb-2">
              <span class="font-medium">
                {{ review.user?.first_name }} {{ review.user?.last_name }}
              </span>
              <span class="text-neutral-400 mx-2">•</span>
              <NuxtLink 
                :to="`/shop/${review.product_id}`" 
                class="text-accent-navy hover:underline"
              >
                {{ review.product?.name || $t('admin.reviews.product') }}
              </NuxtLink>
            </div>

            <!-- Title & Comment -->
            <p v-if="review.title" class="font-medium text-aura-black mb-1">
              {{ review.title }}
            </p>
            <p class="text-body-sm text-neutral-600">
              {{ review.comment }}
            </p>

            <!-- Images -->
            <div v-if="review.images?.length" class="flex gap-2 mt-2">
              <img 
                v-for="(img, idx) in review.images" 
                :key="idx"
                :src="img"
                :alt="`${$t('admin.reviews.content')} ${idx + 1}`"
                class="w-16 h-16 object-cover rounded-sm"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 ml-4">
            <button
              v-if="!review.is_approved"
              type="button"
              class="px-3 py-1 bg-green-600 text-white text-caption rounded hover:bg-green-700 transition-colors"
              @click="moderateReview(review, true)"
            >
              {{ $t('admin.reviews.approve') }}
            </button>
            <button
              v-else
              type="button"
              class="px-3 py-1 bg-yellow-500 text-white text-caption rounded hover:bg-yellow-600 transition-colors"
              @click="moderateReview(review, false)"
            >
              {{ $t('admin.reviews.reject') }}
            </button>
            <button
              type="button"
              class="px-3 py-1 bg-red-600 text-white text-caption rounded hover:bg-red-700 transition-colors"
              @click="confirmDelete(review)"
            >
              {{ $t('admin.reviews.delete') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="reviews.length === 0" class="text-center py-12 text-neutral-500">
        {{ $t('admin.reviews.noReviews') }}
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-6">
      <button
        type="button"
        :disabled="pagination.page === 1"
        class="px-3 py-1 border border-neutral-300 rounded disabled:opacity-50 hover:bg-neutral-50 transition-colors"
        @click="changePage(-1)"
      >
        {{ $t('admin.reviews.previous') }}
      </button>
      <span class="px-3 py-1">
        {{ pagination.page }} / {{ pagination.totalPages }}
      </span>
      <button
        type="button"
        :disabled="pagination.page === pagination.totalPages"
        class="px-3 py-1 border border-neutral-300 rounded disabled:opacity-50 hover:bg-neutral-50 transition-colors"
        @click="changePage(1)"
      >
        {{ $t('admin.reviews.next') }}
      </button>
    </div>

    <!-- Delete Confirmation Modal -->
    <AppModal
      v-model="showDeleteModal"
      :title="$t('notifications.confirmAction')"
      :message="$t('notifications.deleteReviewConfirm')"
      :confirm-text="$t('common.delete')"
      :cancel-text="$t('common.cancel')"
      variant="danger"
      :loading="isDeleting"
      @confirm="deleteReview"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>
