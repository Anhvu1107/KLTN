/**
 * Admin Middleware
 * AURA ARCHIVE - Protect admin routes
 * 
 * Uses external: true for all navigateTo calls to force full page reload
 * This prevents layout glitches when switching between different layouts
 */

export default defineNuxtRouteMiddleware((to) => {
    // Skip on server
    if (process.server) return

    // Check localStorage token
    let token = localStorage.getItem('token')
    let userRole: string | null = null

    // Also check pinia persisted store
    const persistedAuth = localStorage.getItem('auth')

    if (persistedAuth) {
        try {
            const parsed = JSON.parse(persistedAuth)
            if (!token && parsed.token) {
                token = parsed.token
            }
            if (parsed.user?.role) {
                userRole = parsed.user.role
            }
        } catch {
            // Invalid JSON, ignore
        }
    }

    // No token at all - redirect to login with full page reload
    if (!token) {
        return navigateTo('/auth/login?redirect=' + encodeURIComponent(to.fullPath), { external: true })
    }

    // Check admin role from persisted user
    if (userRole === 'ADMIN') {
        return // Allow access
    }

    // Fallback: decode JWT to check role
    try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.role !== 'ADMIN') {
            // Not admin - redirect to homepage with full page reload
            return navigateTo('/', { external: true })
        }
    } catch {
        // Invalid token - clear storage and redirect to login with full page reload
        localStorage.removeItem('token')
        localStorage.removeItem('auth')
        return navigateTo('/auth/login', { external: true })
    }
})

