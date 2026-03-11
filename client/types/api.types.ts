/**
 * API Types
 * AURA ARCHIVE - Common API response interfaces
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
    success: boolean
    data: T
    message?: string
}

/**
 * Pagination metadata
 */
export interface Pagination {
    page: number
    totalPages: number
    total: number
    limit?: number
}

/**
 * Paginated API response
 */
export interface PaginatedData<T> {
    items: T[]
    pagination: Pagination
}

/**
 * API Error response
 */
export interface ApiError {
    success: false
    message: string
    errors?: Record<string, string[]>
}
