/**
 * Auth Store
 * AURA ARCHIVE - Authentication state management
 */

import { defineStore } from 'pinia'

export interface User {
    id: string
    email: string
    firstName: string
    lastName: string
    phone?: string
    address?: string
    city?: string
    district?: string
    ward?: string
    role: 'ADMIN' | 'CUSTOMER'
}

export interface AuthState {
    user: User | null
    token: string | null
    isLoading: boolean
    isHydrated: boolean // Track if state has been restored from localStorage
}

export const useAuthStore = defineStore('auth', {
    state: (): AuthState => ({
        user: null,
        token: null,
        isLoading: false,
        isHydrated: false,
    }),

    getters: {
        // Returns true if user is authenticated (has both token and user)
        // During hydration, if we have a token, we're "potentially" authenticated
        isAuthenticated: (state): boolean => {
            // If we have both token and user, definitely authenticated
            if (state.token && state.user) return true
            // If we have token but user not loaded yet, still consider authenticated
            // This prevents flash of "logged out" state during hydration
            if (state.token && !state.isHydrated) return true
            return false
        },
        isAdmin: (state): boolean => state.user?.role === 'ADMIN',
        fullName: (state): string => {
            if (!state.user) return ''
            return `${state.user.firstName || ''} ${state.user.lastName || ''}`.trim()
        },
    },

    actions: {
        /**
         * Login user
         */
        async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
            this.isLoading = true

            try {
                const config = useRuntimeConfig()

                const response = await $fetch<{
                    success: boolean
                    data: { user: User; token: string }
                    message?: string
                }>(`${config.public.apiUrl}/auth/login`, {
                    method: 'POST',
                    body: { email, password },
                })

                if (response.success) {
                    this.user = response.data.user
                    this.token = response.data.token
                    if (process.client) {
                        localStorage.setItem('token', response.data.token)
                        localStorage.setItem('auth', JSON.stringify({
                            token: response.data.token,
                            user: response.data.user
                        }))
                    }
                    return { success: true }
                }

                return { success: false, error: response.message || 'Login failed' }
            } catch (error: any) {
                const message = error?.data?.message || 'Invalid email or password'
                return { success: false, error: message }
            } finally {
                this.isLoading = false
            }
        },

        /**
         * Register new user
         */
        async register(data: {
            email: string
            password: string
            firstName?: string
            lastName?: string
        }): Promise<{ success: boolean; email?: string; error?: string }> {
            this.isLoading = true

            try {
                const config = useRuntimeConfig()

                // Register returns {message, email} — OTP verification is required before login
                const response = await $fetch<{
                    success: boolean
                    data: { email: string }
                    message?: string
                }>(`${config.public.apiUrl}/auth/register`, {
                    method: 'POST',
                    body: data,
                })

                if (response.success) {
                    // Don't set user/token here — user must verify OTP first
                    return { success: true, email: response.data.email }
                }

                return { success: false, error: response.message || 'Registration failed' }
            } catch (error: any) {
                const message = error?.data?.message || 'Registration failed'
                return { success: false, error: message }
            } finally {
                this.isLoading = false
            }
        },

        /**
         * Logout user
         */
        logout(): void {
            this.user = null
            this.token = null
            if (process.client) {
                localStorage.removeItem('token')
                localStorage.removeItem('auth')
            }
            // Use external: true to force full page reload and prevent layout glitches
            navigateTo('/', { external: true })
        },

        /**
         * Fetch current user profile
         */
        async fetchUser(): Promise<void> {
            if (!process.client) return
            const token = localStorage.getItem('token')
            if (!token) return

            this.isLoading = true
            this.token = token

            try {
                const config = useRuntimeConfig()

                const response = await $fetch<{
                    success: boolean
                    data: { user: User }
                }>(`${config.public.apiUrl}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                })

                if (response.success) {
                    this.user = response.data.user
                }
            } catch (error: any) {
                // Only logout on 401 Unauthorized (invalid token)
                // Don't logout on network errors or other issues
                if (error?.status === 401 || error?.statusCode === 401) {
                    this.logout()
                }
                // For other errors, just log and keep existing user data
                console.warn('Failed to fetch user:', error?.message || error)
            } finally {
                this.isLoading = false
            }
        },

        /**
         * Initialize auth state on app load
         */
        async init(): Promise<void> {
            if (!process.client) return

            // If user already exists from persist, don't fetch again
            if (this.user && this.token) {
                return
            }

            const token = localStorage.getItem('token')
            if (token && !this.token) {
                this.token = token
                await this.fetchUser()
            }
        },
    },

    persist: {
        pick: ['token', 'user'],
    },
})
