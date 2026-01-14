/**
 * Auth Plugin
 * AURA ARCHIVE - Restore auth state from localStorage on app start
 * 
 * CRITICAL: This plugin ensures auth state is restored SYNCHRONOUSLY
 * before any components render to prevent "flash of logged out state"
 */

export default defineNuxtPlugin({
    name: 'auth',
    enforce: 'pre', // Run before other plugins
    async setup(nuxtApp) {
        // Only run on client
        if (import.meta.server) return

        // Wait for app:created hook to ensure Pinia is ready
        nuxtApp.hook('app:created', () => {
            // IMMEDIATELY restore auth state (synchronous)
            // This runs before Vue components mount
            const restoreAuthSync = () => {
                const authStore = useAuthStore()

                // Skip if already has auth data (Pinia persist already worked)
                if (authStore.token && authStore.user) {
                    // Mark as hydrated since we already have complete data
                    authStore.$patch({ isHydrated: true })
                    return
                }

                // Try to restore from localStorage synchronously
                const persistedAuth = localStorage.getItem('auth')
                const legacyToken = localStorage.getItem('token')

                // First try 'auth' key (Pinia persist format)
                if (persistedAuth) {
                    try {
                        const parsed = JSON.parse(persistedAuth)
                        if (parsed.token && parsed.user) {
                            // Directly set store state with all data
                            authStore.$patch({
                                token: parsed.token,
                                user: parsed.user,
                                isHydrated: true, // Complete hydration
                            })
                            // Sync legacy key
                            localStorage.setItem('token', parsed.token)
                            return
                        }
                    } catch (e) {
                        console.warn('[Auth Plugin] Failed to parse persisted auth:', e)
                    }
                }

                // Fallback: try legacy 'token' key (will need to fetch user async)
                if (legacyToken) {
                    authStore.$patch({
                        token: legacyToken,
                        // Don't set isHydrated yet - need to fetch user first
                    })
                } else {
                    // No auth data found - mark as hydrated (completed check)
                    authStore.$patch({ isHydrated: true })
                }
            }

            // Execute immediately to restore state before mount
            restoreAuthSync()
        })

        // Also verify token validity after mount (async)
        nuxtApp.hook('app:mounted', async () => {
            const authStore = useAuthStore()

            // If we have a token but no user, fetch user data
            if (authStore.token && !authStore.user) {
                await authStore.fetchUser()
            }

            // Mark hydration complete after all async operations
            if (!authStore.isHydrated) {
                authStore.$patch({ isHydrated: true })
            }
        })
    }
})
