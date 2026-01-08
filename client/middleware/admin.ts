/**
 * Admin Middleware
 * AURA ARCHIVE - Protect admin routes
 */

export default defineNuxtRouteMiddleware((to, from) => {
    // This runs on client-side only
    if (process.server) return

    const token = localStorage.getItem('token')

    if (!token) {
        return navigateTo('/auth/login?redirect=' + encodeURIComponent(to.fullPath))
    }

    // Decode JWT to check role (simple base64 decode)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]))

        if (payload.role !== 'ADMIN') {
            return navigateTo('/')
        }
    } catch (error) {
        // Invalid token
        localStorage.removeItem('token')
        return navigateTo('/auth/login')
    }
})
