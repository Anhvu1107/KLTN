/**
 * useSanitizeHtml Composable
 * AURA ARCHIVE - Sanitize HTML to prevent XSS attacks
 */

/**
 * Basic HTML sanitizer to prevent XSS attacks
 * Removes dangerous tags and attributes while keeping safe content
 */
export function useSanitizeHtml() {
    // Allowed tags that are safe for blog content
    const allowedTags = [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'blockquote', 'pre', 'code',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'div', 'span', 'hr',
    ]

    // Allowed attributes for specific tags
    const allowedAttributes: Record<string, string[]> = {
        a: ['href', 'title', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'width', 'height'],
        '*': ['class', 'id', 'style'],
    }

    // Dangerous patterns to remove
    const dangerousPatterns = [
        /<script\b[^>]*>[\s\S]*?<\/script>/gi,
        /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
        /<object\b[^>]*>[\s\S]*?<\/object>/gi,
        /<embed\b[^>]*>/gi,
        /<link\b[^>]*>/gi,
        /<style\b[^>]*>[\s\S]*?<\/style>/gi,
        /on\w+\s*=\s*["'][^"']*["']/gi, // Event handlers like onclick, onerror
        /on\w+\s*=\s*[^\s>]+/gi, // Event handlers without quotes
        /javascript\s*:/gi,
        /vbscript\s*:/gi,
        /data\s*:/gi, // data: URLs (can be used for XSS)
        /expression\s*\(/gi, // CSS expressions
    ]

    /**
     * Sanitize HTML string to remove potentially dangerous content
     */
    const sanitize = (html: string): string => {
        if (!html || typeof html !== 'string') {
            return ''
        }

        let sanitized = html

        // Remove dangerous patterns
        for (const pattern of dangerousPatterns) {
            sanitized = sanitized.replace(pattern, '')
        }

        // Remove dangerous href/src attributes
        sanitized = sanitized.replace(
            /(<a[^>]*\s+href\s*=\s*["']?)\s*javascript:[^"'>\s]*/gi,
            '$1#'
        )
        sanitized = sanitized.replace(
            /(<img[^>]*\s+src\s*=\s*["']?)\s*javascript:[^"'>\s]*/gi,
            '$1'
        )

        // Add rel="noopener noreferrer" to external links for security
        sanitized = sanitized.replace(
            /<a\s+([^>]*?)href\s*=\s*["']https?:\/\/([^"']+)["']([^>]*)>/gi,
            '<a $1href="https://$2" rel="noopener noreferrer" target="_blank"$3>'
        )

        return sanitized
    }

    /**
     * Check if HTML content appears to be safe
     */
    const isSafe = (html: string): boolean => {
        if (!html) return true

        for (const pattern of dangerousPatterns) {
            if (pattern.test(html)) {
                return false
            }
        }
        return true
    }

    return {
        sanitize,
        isSafe,
        allowedTags,
        allowedAttributes,
    }
}
