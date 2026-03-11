/**
 * Composable to build full image URLs from server-relative paths.
 * 
 * Images are stored as relative paths like "/uploads/products/filename.jpg".
 * With Nitro devProxy configured, these paths are automatically proxied 
 * to the backend server, so no base URL prepending is needed.
 * 
 * If `imageBaseUrl` is configured (e.g., for CDN or external server),
 * it will be prepended to relative paths.
 */
export const useImageUrl = () => {
    const config = useRuntimeConfig()

    // imageBaseUrl: empty by default (uses relative paths proxied by Nitro),
    // or set to an absolute URL for CDN/external server scenarios
    const serverBaseUrl = computed(() => {
        return (config.public.imageBaseUrl as string) || ''
    })

    /**
     * Get the full URL for a product image.
     * Handles both string (JSON) and array formats for product.images.
     */
    const getProductImage = (product: any): string | null => {
        if (!product?.images || product.images.length === 0) return null

        const images = typeof product.images === 'string'
            ? JSON.parse(product.images)
            : product.images

        if (!images || images.length === 0) return null

        const imagePath = images[0]
        // If already a full URL (http/https), return as-is
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath
        }

        return `${serverBaseUrl.value}${imagePath}`
    }

    /**
     * Get full URL for any server-relative image path.
     */
    const getImageUrl = (path: string | null | undefined): string | null => {
        if (!path) return null
        if (path.startsWith('http://') || path.startsWith('https://')) return path
        return `${serverBaseUrl.value}${path}`
    }

    return {
        getProductImage,
        getImageUrl,
        serverBaseUrl,
    }
}
