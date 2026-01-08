<script setup lang="ts">
// Homepage - AURA ARCHIVE
useSeoMeta({
  title: 'AURA ARCHIVE | Luxury Resell Fashion',
  description: 'Discover curated pre-owned luxury fashion. Authenticated designer pieces from the world\'s finest brands.',
})
</script>

<template>
  <div>
    <!-- Hero Section -->
    <section class="relative h-[80vh] min-h-[600px] flex items-center justify-center bg-neutral-100">
      <!-- Background Image Placeholder -->
      <div class="absolute inset-0 bg-gradient-to-b from-neutral-200 to-neutral-100">
        <div class="absolute inset-0 bg-[url('/images/hero-pattern.svg')] opacity-5"></div>
      </div>
      
      <!-- Hero Content -->
      <div class="relative z-10 text-center px-6 max-w-3xl mx-auto">
        <span class="text-caption uppercase tracking-[0.3em] text-neutral-500 mb-4 block">
          Curated Luxury Consignment
        </span>
        <h1 class="font-serif text-display-2 lg:text-display-1 text-aura-black mb-6 text-balance">
          Timeless Elegance, Reimagined
        </h1>
        <p class="text-body-lg text-neutral-600 mb-10 max-w-xl mx-auto">
          Discover authenticated pre-owned pieces from the world's most coveted fashion houses. 
          Each item tells a story of enduring style.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <NuxtLink to="/shop" class="btn-primary">
            Explore Collection
          </NuxtLink>
          <NuxtLink to="/consignment" class="btn-secondary">
            Consign With Us
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Featured Categories -->
    <section class="section">
      <div class="container-aura">
        <div class="section-header">
          <h2 class="font-serif text-heading-2 text-aura-black mb-4">Shop by Category</h2>
          <p class="text-body text-neutral-600">Explore our curated selection of luxury pieces</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Category Card -->
          <NuxtLink
            v-for="category in ['Bags', 'Clothing', 'Accessories']"
            :key="category"
            :to="`/shop?category=${category.toLowerCase()}`"
            class="group relative aspect-[3/4] overflow-hidden bg-neutral-100"
          >
            <div class="absolute inset-0 bg-gradient-to-t from-aura-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div class="absolute bottom-0 left-0 right-0 p-6 text-aura-white translate-y-full group-hover:translate-y-0 transition-transform duration-500">
              <h3 class="font-serif text-heading-4 mb-2">{{ category }}</h3>
              <span class="text-body-sm uppercase tracking-wider opacity-80">View Collection &rarr;</span>
            </div>
            <div class="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity duration-300">
              <h3 class="font-serif text-heading-3 text-aura-black">{{ category }}</h3>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section class="section bg-neutral-50">
      <div class="container-aura">
        <div class="section-header">
          <h2 class="font-serif text-heading-2 text-aura-black mb-4">New Arrivals</h2>
          <p class="text-body text-neutral-600">The latest additions to our collection</p>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- Product Card Placeholder -->
          <div
            v-for="i in 4"
            :key="i"
            class="product-card"
          >
            <div class="product-card-image">
              <div class="w-full h-full bg-neutral-200 animate-pulse"></div>
            </div>
            <div class="pt-4 space-y-2">
              <p class="text-caption text-neutral-500 uppercase tracking-wider">Brand Name</p>
              <h3 class="text-body font-medium text-aura-black line-clamp-2">Product Name Example</h3>
              <p class="text-body text-neutral-700">$1,200</p>
            </div>
          </div>
        </div>

        <div class="text-center mt-12">
          <NuxtLink to="/shop" class="btn-secondary">
            View All Products
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Value Propositions -->
    <section class="section">
      <div class="container-aura">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-neutral-100 flex items-center justify-center">
              <svg class="w-7 h-7 text-aura-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 class="font-serif text-heading-4 text-aura-black mb-3">Authenticated</h3>
            <p class="text-body text-neutral-600">Every piece is verified by our expert team to ensure authenticity.</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-neutral-100 flex items-center justify-center">
              <svg class="w-7 h-7 text-aura-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <h3 class="font-serif text-heading-4 text-aura-black mb-3">Worldwide Shipping</h3>
            <p class="text-body text-neutral-600">Secure delivery to your door, anywhere in the world.</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-neutral-100 flex items-center justify-center">
              <svg class="w-7 h-7 text-aura-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 class="font-serif text-heading-4 text-aura-black mb-3">AI Stylist</h3>
            <p class="text-body text-neutral-600">Get personalized style advice from our intelligent fashion assistant.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Newsletter / CTA -->
    <section class="py-20 bg-aura-black text-aura-white">
      <div class="container-aura text-center">
        <h2 class="font-serif text-heading-2 mb-4">Join the Archive</h2>
        <p class="text-body text-neutral-400 mb-8 max-w-md mx-auto">
          Be the first to know about new arrivals and exclusive offers.
        </p>
        <form class="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder="Enter your email"
            class="flex-1 px-4 py-3 bg-neutral-800 border border-neutral-700 text-aura-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
          />
          <button type="submit" class="px-8 py-3 bg-aura-white text-aura-black font-medium uppercase tracking-wider text-body-sm hover:bg-neutral-100 transition-colors">
            Subscribe
          </button>
        </form>
      </div>
    </section>
  </div>
</template>
