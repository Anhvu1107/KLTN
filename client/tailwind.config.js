/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './components/**/*.{js,vue,ts}',
        './layouts/**/*.vue',
        './pages/**/*.vue',
        './plugins/**/*.{js,ts}',
        './app.vue',
        './error.vue',
    ],
    theme: {
        extend: {
            // AURA ARCHIVE - Ralph Lauren Inspired Color Palette
            colors: {
                // Primary - Luxury Black & White
                aura: {
                    black: '#0A0A0A',
                    white: '#FFFFFF',
                    cream: '#FAF9F6',
                    ivory: '#FFFFF0',
                },
                // Neutral Grays
                neutral: {
                    50: '#FAFAFA',
                    100: '#F5F5F5',
                    200: '#E5E5E5',
                    300: '#D4D4D4',
                    400: '#A3A3A3',
                    500: '#737373',
                    600: '#525252',
                    700: '#404040',
                    800: '#262626',
                    900: '#171717',
                },
                // Accent Colors - Ralph Lauren Inspired
                accent: {
                    gold: '#D4AF37',
                    burgundy: '#722F37',
                    navy: '#041E42',      // Ralph Lauren Navy
                    'navy-dark': '#032035',
                    olive: '#3C3C2E',
                    tan: '#D2B48C',
                },
            },
            // Typography
            fontFamily: {
                serif: ['Playfair Display', 'Georgia', 'Times New Roman', 'serif'],
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            fontSize: {
                'display-1': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
                'display-2': ['3.75rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
                'heading-1': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
                'heading-2': ['2.25rem', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
                'heading-3': ['1.875rem', { lineHeight: '1.3' }],
                'heading-4': ['1.5rem', { lineHeight: '1.35' }],
                'body-lg': ['1.125rem', { lineHeight: '1.6' }],
                'body': ['1rem', { lineHeight: '1.6' }],
                'body-sm': ['0.875rem', { lineHeight: '1.5' }],
                'caption': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.05em' }],
            },
            // Spacing - Generous whitespace
            spacing: {
                '18': '4.5rem',
                '22': '5.5rem',
                '30': '7.5rem',
                '34': '8.5rem',
                '38': '9.5rem',
            },
            // Border radius
            borderRadius: {
                'none': '0',
                'sm': '0.125rem',
                'DEFAULT': '0.25rem',
                'lg': '0.5rem',
            },
            // Box shadows - Subtle and elegant
            boxShadow: {
                'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
                'medium': '0 4px 16px rgba(0, 0, 0, 0.08)',
                'elevated': '0 8px 32px rgba(0, 0, 0, 0.12)',
                'card': '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
                'card-hover': '0 10px 40px rgba(0, 0, 0, 0.1)',
            },
            // Transitions
            transitionDuration: {
                '250': '250ms',
                '350': '350ms',
                '400': '400ms',
            },
            // Animation
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
                'slide-down': 'slideDown 0.4s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
            // Aspect ratios for product images
            aspectRatio: {
                'product': '3 / 4',
                'hero': '16 / 9',
                'square': '1 / 1',
            },
            // Max widths for containers
            maxWidth: {
                'container': '1280px',
                'content': '900px',
                'narrow': '600px',
            },
        },
    },
    plugins: [],
}
