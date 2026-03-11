/**
 * Review Types
 * AURA ARCHIVE - Product review interfaces
 */

/**
 * User info attached to review
 */
export interface ReviewUser {
    id: string
    first_name: string
    last_name: string
    email?: string
}

/**
 * Product info attached to review
 */
export interface ReviewProduct {
    id: string
    name: string
    slug?: string
}

/**
 * Review entity
 */
export interface Review {
    id: string
    rating: number
    title?: string
    comment: string
    is_approved: boolean
    is_verified_purchase: boolean
    created_at: string
    updated_at?: string
    images?: string[]
    product_id: string
    user_id: string
    user?: ReviewUser
    product?: ReviewProduct
}

/**
 * Review moderation payload
 */
export interface ReviewModerationPayload {
    is_approved: boolean
}

/**
 * Reviews list response from API
 */
export interface ReviewsListData {
    reviews: Review[]
    pagination: {
        total: number
        page: number
        totalPages: number
    }
}
