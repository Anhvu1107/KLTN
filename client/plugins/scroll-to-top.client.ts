/**
 * Scroll to Top Plugin
 * AURA ARCHIVE - Ensures page scrolls to top on navigation
 * 
 * This fixes the issue where layout appears broken when navigating
 * because the previous page's scroll position is retained.
 */

export default defineNuxtPlugin((nuxtApp) => {
    // Hook into page:finish to scroll to top after navigation completes
    nuxtApp.hook('page:finish', () => {
        // Use requestAnimationFrame to ensure DOM is updated before scrolling
        if (process.client) {
            requestAnimationFrame(() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
            })
        }
    })
})
