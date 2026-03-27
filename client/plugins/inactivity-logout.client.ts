/**
 * Inactivity Auto-Logout Plugin
 * AURA ARCHIVE - Auto logout after 60 minutes of inactivity for security
 * 
 * Tracks: mouse, keyboard, scroll, touch events
 * Only active when user is authenticated
 */

const INACTIVITY_TIMEOUT = 60 * 60 * 1000 // 60 minutes in ms
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const

export default defineNuxtPlugin(() => {
    if (import.meta.server) return

    const authStore = useAuthStore()
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null
    let lastActivity = Date.now()

    const resetTimer = () => {
        lastActivity = Date.now()

        if (inactivityTimer) {
            clearTimeout(inactivityTimer)
        }

        // Only set timer if user is logged in
        if (authStore.token) {
            inactivityTimer = setTimeout(() => {
                if (authStore.token) {
                    console.warn('[Security] Auto-logout: 60 minutes of inactivity')
                    authStore.logout()
                }
            }, INACTIVITY_TIMEOUT)
        }
    }

    // Throttle event handler to avoid performance issues
    let throttleTimeout: ReturnType<typeof setTimeout> | null = null
    const throttledReset = () => {
        if (throttleTimeout) return
        throttleTimeout = setTimeout(() => {
            throttleTimeout = null
            resetTimer()
        }, 1000) // Throttle to max once per second
    }

    const startTracking = () => {
        ACTIVITY_EVENTS.forEach(event => {
            document.addEventListener(event, throttledReset, { passive: true })
        })
        resetTimer()
    }

    const stopTracking = () => {
        ACTIVITY_EVENTS.forEach(event => {
            document.removeEventListener(event, throttledReset)
        })
        if (inactivityTimer) {
            clearTimeout(inactivityTimer)
            inactivityTimer = null
        }
        if (throttleTimeout) {
            clearTimeout(throttleTimeout)
            throttleTimeout = null
        }
    }

    // Watch auth state - start/stop tracking based on login status
    watch(
        () => authStore.token,
        (newToken) => {
            if (newToken) {
                startTracking()
            } else {
                stopTracking()
            }
        },
        { immediate: true }
    )

    // Check inactivity on tab visibility change (user returns to tab)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && authStore.token) {
            const elapsed = Date.now() - lastActivity
            if (elapsed >= INACTIVITY_TIMEOUT) {
                console.warn('[Security] Auto-logout: inactive while tab was hidden')
                authStore.logout()
            } else {
                resetTimer()
            }
        }
    })
})
