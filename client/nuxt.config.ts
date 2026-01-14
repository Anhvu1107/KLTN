// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // Modules
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@pinia-plugin-persistedstate/nuxt',
    '@nuxtjs/i18n',
  ],

  // i18n Configuration
  i18n: {
    vueI18n: './i18n.config.ts',
    locales: [
      { code: 'en', language: 'en-US', file: 'en.json' },
      { code: 'vi', language: 'vi-VN', file: 'vi.json' },
    ],
    defaultLocale: 'vi',
    lazy: true,
    langDir: 'locales',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      fallbackLocale: 'vi',
      alwaysRedirect: false,
      redirectOn: 'root',
    },
  },

  // App configuration
  app: {
    head: {
      title: 'AURA ARCHIVE | Luxury Resell Fashion',
      htmlAttrs: {
        lang: 'vi',
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'AURA ARCHIVE - Curated luxury consignment and resell fashion. Discover pre-owned designer pieces.'
        },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap'
        },
      ],
    },
  },

  // Tailwind CSS
  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: 'tailwind.config.js',
    viewer: false,
  },

  // Pinia
  pinia: {
    storesDirs: ['./stores/**'],
  },

  // Runtime config
  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
      aiServiceUrl: process.env.NUXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000',
    },
  },

  // TypeScript
  typescript: {
    strict: true,
    typeCheck: false,
  },

  // CSS
  css: ['~/assets/css/tailwind.css'],

  // Auto-imports
  imports: {
    dirs: ['stores', 'composables', 'utils'],
  },

  // Components
  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],

  // Vite configuration for Docker HMR on Windows
  vite: {
    server: {
      watch: {
        // Use polling for file watching in Docker on Windows/WSL
        usePolling: true,
        interval: 1000, // Check for changes every 1 second
      },
      hmr: {
        // Required for HMR to work properly in Docker
        clientPort: 3000,
        host: 'localhost',
      },
    },
  },
})
