<script setup lang="ts">
/**
 * Product Reviews Component
 * AURA ARCHIVE - Display product reviews and ratings
 */


const { t } = useI18n()

const props = defineProps<{
  productId: string
}>()

const config = useRuntimeConfig()

// Fetch reviews
const { data: reviewsData, pending, refresh } = useFetch<{
  success: boolean
  data: {
    reviews: any[]
    pagination: { total: number; page: number; totalPages: number }
  }
}>(`${config.public.apiUrl}/products/${props.productId}/reviews`, {
  query: { limit: 5 },
})

// Fetch rating summary
const { data: summaryData } = useFetch<{
  success: boolean
  data: {
    averageRating: number
    totalReviews: number
    distribution: Record<number, number>
  }
}>(`${config.public.apiUrl}/products/${props.productId}/reviews/summary`)

const reviews = computed(() => reviewsData.value?.data?.reviews || [])
const pagination = computed(() => reviewsData.value?.data?.pagination || { total: 0, page: 1, totalPages: 1 })
const summary = computed(() => summaryData.value?.data || { averageRating: 0, totalReviews: 0, distribution: {} })

// Format date
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Get user display name
const getUserName = (user: any) => {
  if (user?.first_name || user?.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim()
  }
  return 'Anonymous'
}

// Calculate percentage for rating bar
const getRatingPercentage = (rating: number) => {
  if (summary.value.totalReviews === 0) return 0
  return (summary.value.distribution[rating] / summary.value.totalReviews) * 100
}

// Mark helpful
const markHelpful = async (reviewId: string) => {
  try {
    await $fetch(`${config.public.apiUrl}/reviews/${reviewId}/helpful`, {
      method: 'POST',
    })
    refresh()
  } catch (error) {
    console.error('Error marking helpful:', error)
  }
}

// Expose refresh for parent component
defineExpose({ refresh })
</script>

<template>
  <div class="mt-12 pt-12 border-t border-neutral-200">
    <!-- Header -->
    <div class="flex flex-col lg:flex-row lg:items-start gap-8 mb-8">
      <!-- Rating Summary -->
      <div class="lg:w-1/3">
        <h2 class="font-serif text-heading-3 text-aura-black mb-4">
          {{ t('reviews.customerReviews') || 'Customer Reviews' }}
        </h2>
        
        <!-- Average Rating -->
        <div class="flex items-center gap-3 mb-4">
          <span class="text-display-2 font-serif text-aura-black">
            {{ summary.averageRating.toFixed(1) }}
          </span>
          <div>
            <!-- Stars -->
            <div class="flex items-center gap-1 mb-1">
              <template v-for="star in 5" :key="star">
                <svg 
                  class="w-5 h-5"
                  :class="star <= Math.round(summary.averageRating) ? 'text-accent-gold' : 'text-neutral-300'"
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </template>
            </div>
            <p class="text-body-sm text-neutral-600">
              {{ summary.totalReviews }} {{ t('reviews.reviews') || 'reviews' }}
            </p>
          </div>
        </div>

        <!-- Rating Distribution -->
        <div class="space-y-2">
          <div v-for="rating in [5, 4, 3, 2, 1]" :key="rating" class="flex items-center gap-3">
            <span class="text-body-sm text-neutral-600 w-8">{{ rating }} ★</span>
            <div class="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div 
                class="h-full bg-accent-gold rounded-full transition-all duration-300"
                :style="{ width: `${getRatingPercentage(rating)}%` }"
              />
            </div>
            <span class="text-caption text-neutral-500 w-8">
              {{ summary.distribution[rating] || 0 }}
            </span>
          </div>
        </div>
      </div>

      <!-- Reviews List -->
      <div class="lg:w-2/3">
        <!-- Loading -->
        <div v-if="pending" class="text-center py-8">
          <p class="text-neutral-500">{{ t('common.loading') || 'Loading...' }}</p>
        </div>

        <!-- No Reviews -->
        <div v-else-if="reviews.length === 0" class="text-center py-8 bg-neutral-50 rounded-sm">
          <p class="text-body text-neutral-600 mb-2">
            {{ t('reviews.noReviews') || 'No reviews yet' }}
          </p>
          <p class="text-body-sm text-neutral-500">
            {{ t('reviews.beFirst') || 'Be the first to share your experience!' }}
          </p>
        </div>

        <!-- Reviews -->
        <div v-else class="space-y-6">
          <div 
            v-for="review in reviews" 
            :key="review.id"
            class="pb-6 border-b border-neutral-100 last:border-0"
          >
            <!-- Review Header -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <!-- Avatar -->
                <div class="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center">
                  <img 
                    v-if="review.user?.avatar_url" 
                    :src="review.user.avatar_url" 
                    :alt="getUserName(review.user)"
                    class="w-full h-full rounded-full object-cover"
                  />
                  <span v-else class="text-body font-medium text-neutral-500">
                    {{ getUserName(review.user).charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div>
                  <p class="text-body font-medium text-aura-black">
                    {{ getUserName(review.user) }}
                  </p>
                  <p class="text-caption text-neutral-500">
                    {{ formatDate(review.created_at) }}
                  </p>
                </div>
              </div>
              
              <!-- Verified Badge -->
              <span 
                v-if="review.is_verified_purchase"
                class="text-caption text-green-600 bg-green-50 px-2 py-1 rounded"
              >
                ✓ {{ t('reviews.verifiedPurchase') || 'Verified Purchase' }}
              </span>
            </div>

            <!-- Rating -->
            <div class="flex items-center gap-1 mb-2">
              <template v-for="star in 5" :key="star">
                <svg 
                  class="w-4 h-4"
                  :class="star <= review.rating ? 'text-accent-gold' : 'text-neutral-300'"
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </template>
              <span v-if="review.title" class="ml-2 text-body font-medium text-aura-black">
                {{ review.title }}
              </span>
            </div>

            <!-- Comment -->
            <p class="text-body text-neutral-700 mb-3">
              {{ review.comment }}
            </p>

            <!-- Review Images -->
            <div v-if="review.images?.length > 0" class="flex gap-2 mb-3">
              <div 
                v-for="(img, idx) in review.images.slice(0, 4)" 
                :key="idx"
                class="w-16 h-16 bg-neutral-100 rounded-sm overflow-hidden"
              >
              <img :src="img" :alt="`Review image ${Number(idx) + 1}`" class="w-full h-full object-cover" />
              </div>
            </div>

            <!-- Helpful -->
            <button 
              @click="markHelpful(review.id)"
              class="text-caption text-neutral-500 hover:text-aura-black transition-colors flex items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>
              </svg>
              {{ t('reviews.helpful') || 'Helpful' }} ({{ review.helpful_count }})
            </button>
          </div>
        </div>

        <!-- Load More -->
        <div v-if="pagination.totalPages > 1" class="mt-6 text-center">
          <button class="text-body-sm text-aura-black underline underline-offset-4 hover:no-underline">
            {{ t('reviews.viewAll') || 'View all reviews' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
