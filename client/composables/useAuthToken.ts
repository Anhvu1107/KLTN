/**
 * useAuthToken Composable
 * AURA ARCHIVE - Safe way to get auth token for API calls
 * Works on both client and server (returns null on server)
 */

export const useAuthToken = () => {
    const authStore = useAuthStore()

    const getToken = (): string | null => {
        // First try store
        if (authStore.token) {
            return authStore.token
        }

        // Fallback to localStorage on client
        if (process.client) {
            const token = localStorage.getItem('token')
            if (token) {
                // Sync to store
                authStore.token = token
                return token
            }

            // Try persisted auth
            const persistedAuth = localStorage.getItem('auth')
            if (persistedAuth) {
                try {
                    const parsed = JSON.parse(persistedAuth)
                    if (parsed.token) {
                        authStore.token = parsed.token
                        if (parsed.user) {
                            authStore.user = parsed.user
                        }
                        return parsed.token
                    }
                } catch {
                    // Invalid JSON
                }
            }
        }

        return null
    }

    const getAuthHeaders = () => {
        const token = getToken()
        return token ? { Authorization: `Bearer ${token}` } : {}
    }

    return {
        getToken,
        getAuthHeaders,
        token: computed(() => getToken()),
    }
}
