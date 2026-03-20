/**
 * useCart Composable
 * AURA ARCHIVE - Thin wrapper around the cart store for component ergonomics
 */

export const useCart = () => {
    const cartStore = useCartStore()
    const cart = storeToRefs(cartStore)

    return {
        cartStore,
        ...cart,
        addToCart: cartStore.addToCart,
        removeFromCart: cartStore.removeFromCart,
        clearCart: cartStore.clearCart,
        isInCart: cartStore.isInCart,
        setCoupon: cartStore.setCoupon,
        clearCoupon: cartStore.clearCoupon,
        validateAvailability: cartStore.validateAvailability,
        checkout: cartStore.checkout,
    }
}
