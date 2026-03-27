/**
 * useAuth Composable
 * AURA ARCHIVE - Thin wrapper around the auth store for component ergonomics
 */

export const useAuth = () => {
    const authStore = useAuthStore()
    const auth = storeToRefs(authStore)

    return {
        authStore,
        ...auth,
        login: authStore.login,
        register: authStore.register,
        logout: authStore.logout,
        fetchUser: authStore.fetchUser,
        init: authStore.init,
    }
}
