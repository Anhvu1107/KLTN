/**
 * Cart Store
 * AURA ARCHIVE - Shopping cart with localStorage persistence
 */

import { defineStore } from 'pinia'

export interface CartItem {
    id: string // variant ID
    productId: string
    productName: string
    productBrand: string
    productImage: string
    variantSize: string
    variantColor: string
    price: number
    addedAt: string
}

export interface AppliedCoupon {
    id: string
    code: string
    name: string
    discountAmount: number
}

export interface CartState {
    items: CartItem[]
    isLoading: boolean
    appliedCoupon: AppliedCoupon | null
}

export const useCartStore = defineStore('cart', {
    state: (): CartState => ({
        items: [],
        isLoading: false,
        appliedCoupon: null,
    }),

    getters: {
        /**
         * Get cart item count
         */
        itemCount: (state): number => state.items.length,

        /**
         * Get cart subtotal
         */
        subtotal: (state): number => {
            return state.items.reduce((total, item) => total + item.price, 0)
        },

        /**
         * Get formatted subtotal
         */
        formattedSubtotal(): string {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            }).format(this.subtotal)
        },

        /**
         * Check if cart is empty
         */
        isEmpty: (state): boolean => state.items.length === 0,

        /**
         * Get variant IDs for API calls
         */
        variantIds: (state): string[] => state.items.map(item => item.id),

        /**
         * Get items formatted for checkout
         */
        checkoutItems: (state): { variantId: string }[] => {
            return state.items.map(item => ({ variantId: item.id }))
        },
    },

    actions: {
        /**
         * Add item to cart
         * Returns false if item already exists (unique items only)
         */
        addToCart(item: Omit<CartItem, 'addedAt'>): boolean {
            // Check if item already exists in cart (unique item model)
            const exists = this.items.some(cartItem => cartItem.id === item.id)

            if (exists) {
                return false
            }

            this.items.push({
                ...item,
                addedAt: new Date().toISOString(),
            })

            return true
        },

        /**
         * Remove item from cart
         */
        removeFromCart(variantId: string): void {
            const index = this.items.findIndex(item => item.id === variantId)
            if (index !== -1) {
                this.items.splice(index, 1)
            }
        },

        /**
         * Clear entire cart
         */
        clearCart(): void {
            this.items = []
        },

        /**
         * Check if item is in cart
         */
        isInCart(variantId: string): boolean {
            return this.items.some(item => item.id === variantId)
        },

        /**
         * Set applied coupon
         */
        setCoupon(coupon: AppliedCoupon): void {
            this.appliedCoupon = coupon
        },

        /**
         * Clear applied coupon
         */
        clearCoupon(): void {
            this.appliedCoupon = null
        },

        /**
         * Validate cart items availability
         * Returns unavailable items
         */
        async validateAvailability(): Promise<{ variantId: string; productName: string }[]> {
            if (this.items.length === 0) return []

            this.isLoading = true

            try {
                const config = useRuntimeConfig()
                const token = localStorage.getItem('token')

                const response = await $fetch<{
                    success: boolean
                    data: {
                        allAvailable: boolean
                        items: { variantId: string; productName: string; isAvailable: boolean }[]
                    }
                }>(`${config.public.apiUrl}/orders/check-availability`, {
                    method: 'POST',
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    body: { variantIds: this.variantIds },
                })

                const unavailable = response.data.items.filter(item => !item.isAvailable)

                // Remove unavailable items from cart
                for (const item of unavailable) {
                    this.removeFromCart(item.variantId)
                }

                return unavailable.map(item => ({
                    variantId: item.variantId,
                    productName: item.productName || 'Unknown',
                }))
            } catch (error) {
                console.error('Failed to validate cart:', error)
                return []
            } finally {
                this.isLoading = false
            }
        },

        /**
         * Checkout - create order
         */
        async checkout(orderData: {
            paymentMethod: string
            shippingAddress: Record<string, string>
            shippingFee?: number
            notes?: string
        }): Promise<{ success: boolean; order?: any; error?: string }> {
            if (this.items.length === 0) {
                return { success: false, error: 'Cart is empty' }
            }

            this.isLoading = true

            try {
                const config = useRuntimeConfig()
                const token = localStorage.getItem('token')

                if (!token) {
                    return { success: false, error: 'Please login to checkout' }
                }

                const response = await $fetch<{
                    success: boolean
                    data: { order: any }
                    message?: string
                }>(`${config.public.apiUrl}/orders`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: {
                        items: this.checkoutItems,
                        ...orderData,
                    },
                })

                if (response.success) {
                    // Clear cart after successful checkout
                    this.clearCart()
                    return { success: true, order: response.data.order }
                }

                return { success: false, error: response.message || 'Checkout failed' }
            } catch (error: any) {
                const message = error?.data?.message || error?.message || 'Checkout failed'
                return { success: false, error: message }
            } finally {
                this.isLoading = false
            }
        },
    },

    // Enable persistence to localStorage
    persist: true,
})
