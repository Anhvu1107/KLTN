<script setup lang="ts">
/**
 * Review Form Component
 * AURA ARCHIVE - Submit product reviews (purchase required)
 */


const { t } = useI18n()

const props = defineProps<{
  productId: string
}>()

const emit = defineEmits<{
  submitted: []
}>()

const config = useRuntimeConfig()

// Form state
const rating = ref(0)
const hoverRating = ref(0)
const title = ref('')
const comment = ref('')
const isSubmitting = ref(false)
const error = ref('')
const success = ref(false)

// Eligibility state
const isCheckingEligibility = ref(true)
const isEligible = ref(false)
const ineligibleReason = ref('')

// Check if user is logged in (reactive, client-only)
const token = computed(() => process.client ? localStorage.getItem('token') : null)
const isLoggedIn = computed(() => !!token.value)

// Check review eligibility on mount
onMounted(async () => {
  if (!isLoggedIn.value) {
    isCheckingEligibility.value = false
    return
  }

  try {
    const response = await $fetch<any>(`${config.public.apiUrl}/products/${props.productId}/reviews/eligibility`, {
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    })

    isEligible.value = response.data.eligible
    ineligibleReason.value = response.data.reason || ''
  } catch {
    // If error, default to not eligible
    isEligible.value = false
    ineligibleReason.value = 'not_purchased'
  } finally {
    isCheckingEligibility.value = false
  }
})

// Ineligible message
const ineligibleMessage = computed(() => {
  if (ineligibleReason.value === 'already_reviewed') {
    return t('reviews.alreadyReviewed')
  }
  if (ineligibleReason.value === 'not_purchased') {
    return t('reviews.purchaseRequired')
  }
  return ''
})

// Submit review
const handleSubmit = async () => {
  if (rating.value === 0) {
    error.value = t('reviews.selectRating') || 'Please select a rating'
    return
  }

  if (!comment.value.trim()) {
    error.value = t('reviews.writeReview') || 'Please write a review'
    return
  }

  error.value = ''
  isSubmitting.value = true

  try {
    await $fetch(`${config.public.apiUrl}/products/${props.productId}/reviews`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
      body: {
        rating: rating.value,
        title: title.value || undefined,
        comment: comment.value,
      },
    })

    success.value = true
    rating.value = 0
    title.value = ''
    comment.value = ''
    emit('submitted')
  } catch (err: any) {
    error.value = err.data?.message || t('reviews.submitError') || 'Failed to submit review'
  } finally {
    isSubmitting.value = false
  }
}

// Star hover handlers
const setHoverRating = (star: number) => {
  hoverRating.value = star
}

const clearHoverRating = () => {
  hoverRating.value = 0
}

const setRating = (star: number) => {
  rating.value = star
}

const displayRating = computed(() => hoverRating.value || rating.value)
</script>

<template>
  <div class="bg-neutral-50 rounded-sm p-6">
    <h3 class="font-serif text-heading-4 text-aura-black mb-4">
      {{ t('reviews.writeReview') || 'Write a Review' }}
    </h3>

    <!-- Not logged in -->
    <div v-if="!isLoggedIn" class="text-center py-4">
      <p class="text-body text-neutral-600 mb-4">
        {{ t('reviews.loginToReview') || 'Please login to write a review' }}
      </p>
      <NuxtLink to="/auth/login" class="btn-primary">
        {{ t('common.login') || 'Login' }}
      </NuxtLink>
    </div>

    <!-- Checking eligibility -->
    <div v-else-if="isCheckingEligibility" class="text-center py-4">
      <div class="animate-spin h-6 w-6 mx-auto border-2 border-neutral-300 border-t-aura-black rounded-full"></div>
    </div>

    <!-- Not eligible -->
    <div v-else-if="!isEligible" class="text-center py-4">
      <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
        <svg class="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z"/>
        </svg>
      </div>
      <p class="text-body text-neutral-600">
        {{ ineligibleMessage }}
      </p>
    </div>

    <!-- Success message -->
    <div v-else-if="success" class="text-center py-4">
      <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <p class="text-body text-neutral-700 mb-2">
        {{ t('reviews.thankYou') || 'Thank you for your review!' }}
      </p>
    </div>

    <!-- Review form -->
    <form v-else @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Error -->
      <div 
        v-if="error"
        class="p-3 bg-red-50 border border-red-200 rounded-sm text-body-sm text-red-700"
      >
        {{ error }}
      </div>

      <!-- Rating -->
      <div>
        <label class="input-label mb-2 block">
          {{ t('reviews.yourRating') || 'Your Rating' }} *
        </label>
        <div class="flex items-center gap-1" @mouseleave="clearHoverRating">
          <button
            v-for="star in 5"
            :key="star"
            type="button"
            @mouseenter="setHoverRating(star)"
            @click="setRating(star)"
            class="p-1 transition-transform hover:scale-110"
          >
            <svg 
              class="w-8 h-8 transition-colors"
              :class="star <= displayRating ? 'text-accent-gold' : 'text-neutral-300'"
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          </button>
          <span v-if="displayRating" class="ml-2 text-body-sm text-neutral-600">
            {{ ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][displayRating] }}
          </span>
        </div>
      </div>

      <!-- Title (optional) -->
      <div>
        <label for="review-title" class="input-label">
          {{ t('reviews.title') || 'Title' }} ({{ t('common.optional') || 'optional' }})
        </label>
        <input
          id="review-title"
          v-model="title"
          type="text"
          class="input-field"
          :placeholder="t('reviews.titlePlaceholder') || 'Summarize your experience'"
          maxlength="200"
        />
      </div>

      <!-- Comment -->
      <div>
        <label for="review-comment" class="input-label">
          {{ t('reviews.yourReview') || 'Your Review' }} *
        </label>
        <textarea
          id="review-comment"
          v-model="comment"
          rows="4"
          class="input-field resize-none"
          :placeholder="t('reviews.commentPlaceholder') || 'Share your experience with this product...'"
          required
        />
      </div>

      <!-- Submit -->
      <button
        type="submit"
        :disabled="isSubmitting"
        class="btn-primary"
        :class="{ 'opacity-70 cursor-not-allowed': isSubmitting }"
      >
        <span v-if="isSubmitting" class="flex items-center gap-2">
          <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          {{ t('common.submitting') || 'Submitting...' }}
        </span>
        <span v-else>{{ t('reviews.submitReview') || 'Submit Review' }}</span>
      </button>
    </form>
  </div>
</template>
