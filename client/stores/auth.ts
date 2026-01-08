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
    role: 'ADMIN' | 'CUSTOMER'
}

export interface AuthState {
    user: User | null
    token: string | null
    isLoading: boolean
}

export const useAuthStore = defineStore('auth', {
    state: (): AuthState => ({
        user: null,
        token: null,
        isLoading: false,
    }),

    getters: {
        isAuthenticated: (state): boolean => !!state.token && !!state.user,
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
                    localStorage.setItem('token', response.data.token)
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
        }): Promise<{ success: boolean; error?: string }> {
            this.isLoading = true

            try {
                const config = useRuntimeConfig()

                const response = await $fetch<{
                    success: boolean
                    data: { user: User; token: string }
                    message?: string
                }>(`${config.public.apiUrl}/auth/register`, {
                    method: 'POST',
                    body: data,
                })

                if (response.success) {
                    this.user = response.data.user
                    this.token = response.data.token
                    localStorage.setItem('token', response.data.token)
                    return { success: true }
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
            localStorage.removeItem('token')
            navigateTo('/')
        },

        /**
         * Fetch current user profile
         */
        async fetchUser(): Promise<void> {
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
            } catch (error) {
                // Token invalid, clear auth state
                this.logout()
            } finally {
                this.isLoading = false
            }
        },

        /**
         * Initialize auth state on app load
         */
        async init(): Promise<void> {
            const token = localStorage.getItem('token')
            if (token) {
                await this.fetchUser()
            }
        },
    },

    persist: {
        pick: ['token'],
    },
})
