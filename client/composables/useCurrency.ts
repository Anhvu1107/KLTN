/**
 * Currency Composable
 * AURA ARCHIVE - Manage currency display (VND base, USD toggle)
 *
 * Prices in DB are stored in VND.
 * User can toggle to see approximate USD equivalent.
 */

const EXCHANGE_RATE = 25000 // 1 USD = 25,000 VND

// Shared reactive state (persisted across components)
const currencyState = reactive({
    currency: 'VND' as 'VND' | 'USD',
    initialized: false,
})

export const useCurrency = () => {
    // Initialize from localStorage (client-side only)
    if (import.meta.client && !currencyState.initialized) {
        const saved = localStorage.getItem('aura_currency')
        if (saved === 'USD' || saved === 'VND') {
            currencyState.currency = saved
        }
        currencyState.initialized = true
    }

    const currency = computed(() => currencyState.currency)

    const setCurrency = (value: 'VND' | 'USD') => {
        currencyState.currency = value
        if (import.meta.client) {
            localStorage.setItem('aura_currency', value)
        }
    }

    const toggleCurrency = () => {
        setCurrency(currencyState.currency === 'VND' ? 'USD' : 'VND')
    }

    /**
     * Format a price stored in VND
     * If current currency is USD, converts using exchange rate
     */
    const formatPrice = (priceInVND: number): string => {
        if (!priceInVND && priceInVND !== 0) return '0 ₫'

        if (currencyState.currency === 'USD') {
            const usdPrice = priceInVND / EXCHANGE_RATE
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(usdPrice)
        }

        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(priceInVND)
    }

    /**
     * Get raw VND price (for calculations like QR code)
     */
    const getRawVND = (price: number): number => {
        return Math.round(price)
    }

    return {
        currency,
        setCurrency,
        toggleCurrency,
        formatPrice,
        getRawVND,
        EXCHANGE_RATE,
    }
}
