/**
 * Guest Middleware (Frontend)
 * AURA ARCHIVE - Redirect authenticated users away from auth pages (login/register)
 */

export default defineNuxtRouteMiddleware(() => {
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

    // If user is already authenticated, redirect away from auth pages
    if (token || hasPersistedToken) {
        return navigateTo('/', { external: true })
    }
})
