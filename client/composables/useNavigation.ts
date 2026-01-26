/**
 * useNavigation Composable
 * AURA ARCHIVE - Safe navigation utilities
 * 
 * Provides helper functions for navigation that handles layout transitions properly.
 * Use these functions when navigating between pages with different layouts to prevent
 * layout glitches.
 * 
 * RULE: When navigating between different layouts (e.g., auth ↔ default ↔ admin),
 * always use navigateWithReload() or add { external: true } to navigateTo().
 * 
 * Layout mapping:
 * - default: homepage, shop, product pages, account pages
 * - auth: login, register, forgot-password, reset-password
 * - admin: all /admin/* pages
 */

/**
 * Navigate with full page reload
 * Use this when switching between different layouts to prevent layout glitches
 * 
 * @param path - The path to navigate to
 * @example navigateWithReload('/admin/dashboard')
 * @example navigateWithReload('/')
 */
export const navigateWithReload = (path: string) => {
    return navigateTo(path, { external: true })
}

/**
 * Navigate to login with redirect support
 * Always uses full page reload to prevent layout issues
 * 
 * @param redirectPath - Optional path to redirect back after login
 */
export const navigateToLogin = (redirectPath?: string) => {
    const path = redirectPath
        ? `/auth/login?redirect=${encodeURIComponent(redirectPath)}`
        : '/auth/login'
    return navigateTo(path, { external: true })
}

/**
 * Navigate to home with full page reload
 * Use after logout or when transitioning from auth/admin layouts
 */
export const navigateToHome = () => {
    return navigateTo('/', { external: true })
}

/**
 * Navigate to admin dashboard with full page reload
 * Use after admin login
 */
export const navigateToAdminDashboard = () => {
    return navigateTo('/admin/dashboard', { external: true })
}

/**
 * Check if target path uses a different layout than current
 * 
 * @param targetPath - The path to check
 * @param currentPath - Current route path
 * @returns true if layouts are different
 */
export const isDifferentLayout = (targetPath: string, currentPath: string): boolean => {
    const getLayout = (path: string): string => {
        if (path.startsWith('/admin')) return 'admin'
        if (path.startsWith('/auth')) return 'auth'
        return 'default'
    }

    return getLayout(targetPath) !== getLayout(currentPath)
}
