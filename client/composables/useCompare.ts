/**
 * useCompare Composable
 * AURA ARCHIVE - Compare products side by side
 */

export interface CompareProduct {
    id: string
    name: string
    brand: string
    image: string
    price: number
    salePrice?: number
    category?: string
    condition?: string
    size?: string
    color?: string
    material?: string
}

const STORAGE_KEY = 'aura_compare'
const MAX_ITEMS = 4

// Global reactive state
const compareProducts = ref<CompareProduct[]>([])
const isInitialized = ref(false)

export const useCompare = () => {
    // Initialize from localStorage
    const init = () => {
        if (isInitialized.value) return

        if (import.meta.client) {
            try {
                const stored = localStorage.getItem(STORAGE_KEY)
                if (stored) {
                    compareProducts.value = JSON.parse(stored)
                }
            } catch (e) {
                console.error('Failed to load compare:', e)
            }
            isInitialized.value = true
        }
    }

    // Save to localStorage
    const save = () => {
        if (import.meta.client) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(compareProducts.value))
            } catch (e) {
                console.error('Failed to save compare:', e)
            }
        }
    }

    // Check if product is in compare
    const isInCompare = (productId: string): boolean => {
        init()
        return compareProducts.value.some(p => p.id === productId)
    }

    // Add product to compare
    const addProduct = (product: CompareProduct): boolean => {
        init()

        if (isInCompare(product.id)) {
            return false
        }

        if (compareProducts.value.length >= MAX_ITEMS) {
            return false
        }

        compareProducts.value.push(product)
        save()
        return true
    }

    // Remove product from compare
    const removeProduct = (productId: string) => {
        const index = compareProducts.value.findIndex(p => p.id === productId)
        if (index > -1) {
            compareProducts.value.splice(index, 1)
            save()
        }
    }

    // Toggle product in compare
    const toggleProduct = (product: CompareProduct): boolean => {
        if (isInCompare(product.id)) {
            removeProduct(product.id)
            return false
        } else {
            return addProduct(product)
        }
    }

    // Clear all
    const clear = () => {
        compareProducts.value = []
        save()
    }

    // Get count
    const count = computed(() => compareProducts.value.length)

    // Is full
    const isFull = computed(() => compareProducts.value.length >= MAX_ITEMS)

    // Initialize on first use
    init()

    return {
        products: readonly(compareProducts),
        count,
        isFull,
        maxItems: MAX_ITEMS,
        isInCompare,
        addProduct,
        removeProduct,
        toggleProduct,
        clear,
    }
}
