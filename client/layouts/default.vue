<script setup lang="ts">
// Default layout for AURA ARCHIVE
// Ralph Lauren inspired luxury design
</script>

<template>
  <div class="min-h-screen flex flex-col bg-aura-white">
    <!-- Header -->
    <TheHeader />

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <TheFooter />

    <!-- AI Chat Widget -->
    <AiChatWidget />
  </div>
</template>
