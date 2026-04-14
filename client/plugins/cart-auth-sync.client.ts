/**
 * Cart/Auth Sync Plugin
 * Ensures cart data is isolated per authenticated user.
 */

export default defineNuxtPlugin({
  name: 'cart-auth-sync',
  dependsOn: ['auth'],
  setup() {
    const authStore = useAuthStore()
    const cartStore = useCartStore()

    watch(
      () => authStore.user?.id ?? null,
      (newUserId, previousUserId) => {
        cartStore.syncWithUser(newUserId, previousUserId ?? null)
      },
      {
        immediate: true,
        flush: 'sync',
      }
    )
  },
})
