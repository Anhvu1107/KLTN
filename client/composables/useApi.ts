/**
 * useApi Composable
 * AURA ARCHIVE - Centralized API wrapper with auth token injection
 */

import type { ApiResponse } from '~/types/api.types'

export const useApi = () => {
    const config = useRuntimeConfig()
    const authStore = useAuthStore()

    /**
     * Get auth headers
     */
    const getHeaders = (): Record<string, string> => {
        const headers: Record<string, string> = {}
        const token = authStore.token || localStorage.getItem('token')
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }
        return headers
    }

    /**
     * GET request
     */
    const get = async <T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> => {
        let urlStr = `${config.public.apiUrl}${endpoint}`
        if (params) {
            try {
                const url = new URL(urlStr)
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        url.searchParams.set(key, String(value))
                    }
                })
                urlStr = url.toString()
            } catch {
                // Fallback for relative URLs (new URL() requires absolute URL)
                const searchParams = new URLSearchParams()
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        searchParams.set(key, String(value))
                    }
                })
                const qs = searchParams.toString()
                if (qs) urlStr += `?${qs}`
            }
        }

        return await $fetch<ApiResponse<T>>(urlStr, {
            method: 'GET',
            headers: getHeaders(),
        })
    }

    /**
     * POST request
     */
    const post = async <T>(endpoint: string, body?: any): Promise<ApiResponse<T>> => {
        return await $fetch<ApiResponse<T>>(`${config.public.apiUrl}${endpoint}`, {
            method: 'POST',
            headers: getHeaders(),
            body,
        })
    }

    /**
     * PATCH request
     */
    const patch = async <T>(endpoint: string, body?: any): Promise<ApiResponse<T>> => {
        return await $fetch<ApiResponse<T>>(`${config.public.apiUrl}${endpoint}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body,
        })
    }

    /**
     * PUT request
     */
    const put = async <T>(endpoint: string, body?: any): Promise<ApiResponse<T>> => {
        return await $fetch<ApiResponse<T>>(`${config.public.apiUrl}${endpoint}`, {
            method: 'PUT',
            headers: getHeaders(),
            body,
        })
    }

    /**
     * DELETE request
     */
    const del = async <T = void>(endpoint: string): Promise<ApiResponse<T>> => {
        return await $fetch<ApiResponse<T>>(`${config.public.apiUrl}${endpoint}`, {
            method: 'DELETE',
            headers: getHeaders(),
        })
    }

    return {
        get,
        post,
        patch,
        put,
        del,
        getHeaders,
    }
}
