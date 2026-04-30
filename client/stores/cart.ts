/**
 * Cart Store
 * AURA ARCHIVE - Shopping cart with localStorage persistence
 */

import { defineStore } from 'pinia'
import { useAuthStore } from '~/stores/auth'

const CART_STORAGE_PREFIX = 'aura_cart:'
const LEGACY_CART_STORAGE_KEY = 'cart'

// Debounced abandoned cart tracking
let trackTimer: ReturnType<typeof setTimeout> | null = null
const TRACK_DEBOUNCE_MS = 5000 // Wait 5s of inactivity before sending


export interface CartItem {
    id: string // variant ID
    productId: string
    productName: string
    productBrand: string
    productImage: string
    variantSize: string
    variantColor: string
    variantMaterial?: string
    price: number
    quantity: number
    stockQuantity?: number
    stockStatus?: string
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

type PersistedCartState = Pick<CartState, 'items' | 'appliedCoupon'>

const createEmptyPersistedCart = (): PersistedCartState => ({
    items: [],
    appliedCoupon: null,
})

const toPositiveInteger = (value: unknown, fallback = 1): number => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback
    return Math.floor(parsed)
}

const toFiniteNumber = (value: unknown, fallback = 0): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeCartItem = (item: Partial<CartItem> | null | undefined): CartItem | null => {
    if (!item?.id || !item.productId) return null

    const stockQuantity = item.stockQuantity === undefined
        ? undefined
        : Math.max(0, toPositiveInteger(item.stockQuantity, 0))

    return {
        id: String(item.id),
        productId: String(item.productId),
        productName: item.productName ? String(item.productName) : 'Unknown Item',
        productBrand: item.productBrand ? String(item.productBrand) : '',
        productImage: item.productImage ? String(item.productImage) : '',
        variantSize: item.variantSize ? String(item.variantSize) : '',
        variantColor: item.variantColor ? String(item.variantColor) : '',
        variantMaterial: item.variantMaterial ? String(item.variantMaterial) : undefined,
        price: toFiniteNumber(item.price, 0),
        quantity: toPositiveInteger(item.quantity, 1),
        stockQuantity,
        stockStatus: item.stockStatus ? String(item.stockStatus) : undefined,
        addedAt: item.addedAt ? String(item.addedAt) : new Date().toISOString(),
    }
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
        itemCount: (state): number => state.items.reduce((sum, item) => sum + toPositiveInteger(item.quantity, 0), 0),

        /**
         * Get cart subtotal
         */
        subtotal: (state): number => {
            return state.items.reduce((total, item) => {
                return total + (toFiniteNumber(item.price, 0) * toPositiveInteger(item.quantity, 0))
            }, 0)
        },

        /**
         * Get formatted subtotal
         */
        formattedSubtotal(): string {
            const { formatPrice } = useCurrency()
            return formatPrice(this.subtotal)
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
        checkoutItems: (state): { variantId: string; quantity: number; productName: string }[] => {
            return state.items
                .filter(item => item.id)
                .map(item => ({
                    variantId: item.id,
                    quantity: toPositiveInteger(item.quantity, 1),
                    productName: item.productName,
                }))
        },
    },

    actions: {
        getStorageKey(userId: string): string {
            return `${CART_STORAGE_PREFIX}${userId}`
        },

        readPersistedCart(raw: string | null): PersistedCartState {
            if (!raw) {
                return createEmptyPersistedCart()
            }

            try {
                const parsed = JSON.parse(raw)
                return {
                    items: Array.isArray(parsed?.items)
                        ? parsed.items.map(normalizeCartItem).filter(Boolean) as CartItem[]
                        : [],
                    appliedCoupon: parsed?.appliedCoupon ?? null,
                }
            } catch (error) {
                console.warn('Failed to parse persisted cart:', error)
                return createEmptyPersistedCart()
            }
        },

        persistCartForUser(userId: string | null = useAuthStore().user?.id ?? null): void {
            if (!process.client || !userId) {
                return
            }

            const payload = {
                items: this.items,
                appliedCoupon: this.appliedCoupon,
            }

            const storageKey = this.getStorageKey(userId)

            if (payload.items.length === 0 && !payload.appliedCoupon) {
                localStorage.removeItem(storageKey)
                return
            }

            localStorage.setItem(storageKey, JSON.stringify(payload))
        },

        migrateLegacyCart(userId: string): void {
            if (!process.client) {
                return
            }

            const storageKey = this.getStorageKey(userId)
            if (localStorage.getItem(storageKey)) {
                localStorage.removeItem(LEGACY_CART_STORAGE_KEY)
                return
            }

            const legacyCart = this.readPersistedCart(localStorage.getItem(LEGACY_CART_STORAGE_KEY))
            if (legacyCart.items.length === 0 && !legacyCart.appliedCoupon) {
                localStorage.removeItem(LEGACY_CART_STORAGE_KEY)
                return
            }

            localStorage.setItem(storageKey, JSON.stringify(legacyCart))
            localStorage.removeItem(LEGACY_CART_STORAGE_KEY)
        },

        loadCartForUser(userId: string | null): void {
            if (!process.client || !userId) {
                this.items = []
                this.appliedCoupon = null
                return
            }

            this.migrateLegacyCart(userId)

            const persistedCart = this.readPersistedCart(localStorage.getItem(this.getStorageKey(userId)))
            this.items = persistedCart.items
            this.appliedCoupon = persistedCart.appliedCoupon
        },

        syncWithUser(userId: string | null, previousUserId: string | null = null): void {
            if (previousUserId && previousUserId !== userId) {
                this.persistCartForUser(previousUserId)
            }

            this.loadCartForUser(userId)
        },

        /**
         * Add item to cart
         */
        addToCart(item: Omit<CartItem, 'addedAt' | 'quantity'> & { quantity?: number }): boolean {
            const normalizedItem = normalizeCartItem({
                ...item,
                quantity: item.quantity ?? 1,
                addedAt: new Date().toISOString(),
            })

            if (!normalizedItem) return false

            const existingItem = this.items.find(cartItem => cartItem.id === normalizedItem.id)

            if (existingItem) {
                existingItem.quantity = toPositiveInteger(existingItem.quantity, 0) + normalizedItem.quantity
                existingItem.price = normalizedItem.price
                existingItem.productName = normalizedItem.productName
                existingItem.productBrand = normalizedItem.productBrand
                existingItem.productImage = normalizedItem.productImage
                existingItem.variantSize = normalizedItem.variantSize
                existingItem.variantColor = normalizedItem.variantColor
                existingItem.variantMaterial = normalizedItem.variantMaterial
                existingItem.stockQuantity = normalizedItem.stockQuantity
                existingItem.stockStatus = normalizedItem.stockStatus
            } else {
                this.items.push(normalizedItem)
            }

            this.persistCartForUser()
            this.debouncedTrackAbandonedCart()
            return true
        },

        /**
         * Remove item from cart
         */
        removeFromCart(variantId: string): void {
            const index = this.items.findIndex(item => item.id === variantId)
            if (index !== -1) {
                this.items.splice(index, 1)
                if (this.items.length === 0) {
                    this.appliedCoupon = null
                }
                this.persistCartForUser()
                this.debouncedTrackAbandonedCart()
            }
        },

        updateQuantity(variantId: string, quantity: number): void {
            const item = this.items.find(i => i.id === variantId)
            if (item) {
                const nextQuantity = toPositiveInteger(quantity, 0)
                if (nextQuantity <= 0) {
                    this.removeFromCart(variantId)
                } else {
                    item.quantity = nextQuantity
                    this.persistCartForUser()
                    this.debouncedTrackAbandonedCart()
                }
            }
        },

        /**
         * Clear entire cart
         */
        clearCart(): void {
            this.items = []
            this.appliedCoupon = null
            this.persistCartForUser()
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
            this.persistCartForUser()
        },

        /**
         * Clear applied coupon
         */
        clearCoupon(): void {
            this.appliedCoupon = null
            this.persistCartForUser()
        },

        /**
         * Validate cart items availability
         * Returns unavailable items
         */
        async validateAvailability(adjustCart = true): Promise<{
            variantId: string
            productName: string
            status?: string
            requestedQuantity?: number
            availableQuantity?: number
        }[]> {
            if (this.items.length === 0) return []

            this.isLoading = true

            try {
                const config = useRuntimeConfig()
                const token = localStorage.getItem('token')

                const response = await $fetch<{
                    success: boolean
                    data: {
                        allAvailable: boolean
                        items: {
                            variantId: string
                            productName: string
                            isAvailable: boolean
                            status?: string
                            requestedQuantity?: number
                            availableQuantity?: number
                        }[]
                    }
                }>(`${config.public.apiUrl}/orders/check-availability`, {
                    method: 'POST',
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    body: { items: this.checkoutItems },
                })

                const checkedItems = response.data.items || []

                for (const item of checkedItems) {
                    const cartItem = this.items.find(i => i.id === item.variantId)
                    if (!cartItem) continue

                    if (item.productName) {
                        cartItem.productName = item.productName
                    }

                    if (item.status) {
                        cartItem.stockStatus = item.status
                    }

                    if (item.availableQuantity !== undefined) {
                        cartItem.stockQuantity = Math.max(0, toPositiveInteger(item.availableQuantity, 0))
                    }
                }

                const unavailable = checkedItems.filter(item => !item.isAvailable)

                // Handle unavailable items
                if (adjustCart) {
                    for (const item of unavailable) {
                        if (item.availableQuantity !== undefined && item.availableQuantity > 0) {
                            // Reduce quantity to max available
                            this.updateQuantity(item.variantId, item.availableQuantity)
                        } else {
                            // Completely out of stock or missing
                            this.removeFromCart(item.variantId)
                        }
                    }
                }

                if (checkedItems.length > 0 || unavailable.length > 0) {
                    this.persistCartForUser()
                }

                return unavailable.map(item => ({
                    variantId: item.variantId,
                    productName: item.productName || 'Unknown',
                    status: item.status,
                    requestedQuantity: item.requestedQuantity,
                    availableQuantity: item.availableQuantity,
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
            couponId?: string
            discountCouponId?: string
            shippingCouponId?: string
        }): Promise<{ success: boolean; order?: any; error?: string }> {
            if (this.items.length === 0) {
                return { success: false, error: 'Cart is empty' }
            }

            this.isLoading = true

            try {
                const config = useRuntimeConfig()
                const token = process.client ? localStorage.getItem('token') : null

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
                const errorMessage = error?.data?.message || error?.message || 'Checkout failed'
                console.error('Checkout error:', errorMessage)
                return { success: false, error: errorMessage }
            } finally {
                this.isLoading = false
            }
        },

        /**
         * Track abandoned cart - sends cart data to server for recovery
         */
        debouncedTrackAbandonedCart(): void {
            if (!process.client) return

            if (trackTimer) {
                clearTimeout(trackTimer)
            }

            trackTimer = setTimeout(() => {
                this.trackAbandonedCart()
            }, TRACK_DEBOUNCE_MS)
        },

        async trackAbandonedCart(): Promise<void> {
            if (!process.client) return

            const token = localStorage.getItem('token')
            if (!token || this.items.length === 0) return

            try {
                const config = useRuntimeConfig()
                const authStore = useAuthStore()

                await $fetch(`${config.public.apiUrl}/abandoned-carts/track`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: {
                        items: this.items.map(item => ({
                            variantId: item.id,
                            productId: item.productId,
                            productName: item.productName,
                            productBrand: item.productBrand,
                            price: item.price,
                            variantSize: item.variantSize,
                            variantColor: item.variantColor,
                            variantMaterial: item.variantMaterial,
                            quantity: item.quantity,
                        })),
                        totalAmount: this.subtotal,
                        email: authStore.user?.email || null,
                    },
                })
            } catch (error) {
                // Silent fail - tracking is non-critical
                console.debug('Abandoned cart tracking failed:', error)
            }
        },
    },
})
