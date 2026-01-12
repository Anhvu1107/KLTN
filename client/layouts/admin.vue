<script setup lang="ts">
/**
 * Admin Layout
 * AURA ARCHIVE - Clean layout using AdminSidebar component
 */
</script>

<template>
  <div class="min-h-screen flex bg-neutral-50">
    <!-- Sidebar Component -->
    <AdminSidebar />

    <!-- Main Content -->
    <main class="flex-1 overflow-auto ml-64">
      <slot />
    </main>
  </div>
</template>
