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
    const placeholderImage = '/images/placeholders/product-placeholder.svg'

    // imageBaseUrl: empty by default (uses relative paths proxied by Nitro),
    // or set to an absolute URL for CDN/external server scenarios
    const serverBaseUrl = computed(() => {
        return (config.public.imageBaseUrl as string) || ''
    })

    const resolveImagePath = (path: string): string => {
        // Full URLs (Cloudinary, CDN, etc.) — return as-is
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path
        }

        // Seeded demo data references static JPGs that do not exist in this repo.
        // Map them to a bundled placeholder so Nuxt does not keep routing those 404s.
        if (path.startsWith('/images/products/')) {
            return placeholderImage
        }

        // Legacy local uploads — proxy through Nitro
        return `${serverBaseUrl.value}${path}`
    }

    /**
     * Get the full URL for a product image.
     * Handles both string (JSON) and array formats for product.images.
     */
    const getProductImage = (product: any): string | undefined => {
        if (!product?.images || product.images.length === 0) return undefined

        const images = typeof product.images === 'string'
            ? JSON.parse(product.images)
            : product.images

        if (!images || images.length === 0) return undefined

        return resolveImagePath(images[0])
    }

    /**
     * Get full URL for any server-relative image path.
     */
    const getImageUrl = (path: string | null | undefined): string | undefined => {
        if (!path) return undefined
        return resolveImagePath(path)
    }

    return {
        getProductImage,
        getImageUrl,
        serverBaseUrl,
    }
}
