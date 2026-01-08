<script setup lang="ts">
// Auth layout - Minimal design for authentication pages
</script>

<template>
  <div class="min-h-screen flex flex-col bg-neutral-50">
    <!-- Simple Header -->
    <header class="py-8 text-center">
      <NuxtLink to="/" class="inline-block">
        <h1 class="font-serif text-2xl tracking-[0.3em] text-aura-black uppercase">
          AURA ARCHIVE
        </h1>
      </NuxtLink>
    </header>

    <!-- Auth Content -->
    <main class="flex-1 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <slot />
      </div>
    </main>

    <!-- Simple Footer -->
    <footer class="py-8 text-center text-body-sm text-neutral-500">
      <p>&copy; {{ new Date().getFullYear() }} AURA ARCHIVE. All rights reserved.</p>
    </footer>
  </div>
</template>
