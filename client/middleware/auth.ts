/**
 * Auth Middleware (Frontend)
 * AURA ARCHIVE - Protect user account routes
 */

export default defineNuxtRouteMiddleware((to, from) => {
    if (process.server) return

    const token = localStorage.getItem('token')

    if (!token) {
        return navigateTo('/auth/login?redirect=' + encodeURIComponent(to.fullPath))
    }
})
