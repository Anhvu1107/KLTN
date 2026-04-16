/**
 * Auth Middleware (Frontend)
 * AURA ARCHIVE - Protect user account routes
 */

export default defineNuxtRouteMiddleware((to) => {
    // Skip on server
    if (process.server) return

    // Check localStorage token (most reliable)
    const token = localStorage.getItem('token')

    // Also check pinia persisted store
    const persistedAuth = localStorage.getItem('auth')
    let hasPersistedToken = false

    if (persistedAuth) {
        try {
            const parsed = JSON.parse(persistedAuth)
            hasPersistedToken = !!parsed.token
        } catch {
            // Invalid JSON, ignore
        }
    }

    // Use external: true to force full page reload and prevent layout glitches
    if (!token && !hasPersistedToken) {
        return navigateTo('/auth/login?redirect=' + encodeURIComponent(to.fullPath), { external: true })
    }
})
