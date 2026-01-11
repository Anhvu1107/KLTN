/**
 * useRecentlyViewed Composable
 * AURA ARCHIVE - Track and store recently viewed products
 */

export interface RecentProduct {
    id: string
    name: string
    brand: string
    image: string
    price: number
    salePrice?: number
    viewedAt: number
}

const STORAGE_KEY = 'aura_recently_viewed'
const MAX_ITEMS = 12

// Global reactive state
const recentProducts = ref<RecentProduct[]>([])
const isInitialized = ref(false)

export const useRecentlyViewed = () => {
    // Initialize from localStorage
    const init = () => {
        if (isInitialized.value) return

        if (import.meta.client) {
            try {
                const stored = localStorage.getItem(STORAGE_KEY)
                if (stored) {
                    recentProducts.value = JSON.parse(stored)
                }
            } catch (e) {
                console.error('Failed to load recently viewed:', e)
            }
            isInitialized.value = true
        }
    }

    // Save to localStorage
    const save = () => {
        if (import.meta.client) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(recentProducts.value))
            } catch (e) {
                console.error('Failed to save recently viewed:', e)
            }
        }
    }

    // Add product to recently viewed
    const addProduct = (product: Omit<RecentProduct, 'viewedAt'>) => {
        init()

        // Remove if already exists
        const existingIndex = recentProducts.value.findIndex(p => p.id === product.id)
        if (existingIndex > -1) {
            recentProducts.value.splice(existingIndex, 1)
        }

        // Add to beginning
        recentProducts.value.unshift({
            ...product,
            viewedAt: Date.now(),
        })

        // Keep only max items
        if (recentProducts.value.length > MAX_ITEMS) {
            recentProducts.value = recentProducts.value.slice(0, MAX_ITEMS)
        }

        save()
    }

    // Get all recently viewed (excluding current product)
    const getProducts = (excludeId?: string): RecentProduct[] => {
        init()
        return excludeId
            ? recentProducts.value.filter(p => p.id !== excludeId)
            : recentProducts.value
    }

    // Clear all
    const clear = () => {
        recentProducts.value = []
        save()
    }

    // Initialize on first use
    init()

    return {
        products: readonly(recentProducts),
        addProduct,
        getProducts,
        clear,
    }
}
