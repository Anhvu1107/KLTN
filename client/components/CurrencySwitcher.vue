<script setup lang="ts">
/**
 * Currency Switcher Component
 * AURA ARCHIVE - Toggle between VND and USD display
 */

const { currency, toggleCurrency } = useCurrency()
</script>

<template>
  <button
    @click="toggleCurrency()"
    class="flex items-center gap-1 text-caption hover:text-aura-black transition-colors cursor-pointer"
    :title="currency === 'VND' ? 'Switch to USD' : 'Chuyển sang VND'"
  >
    <span class="font-medium" :class="currency === 'VND' ? 'text-aura-black' : 'text-neutral-400'">₫</span>
    <span class="text-neutral-300">/</span>
    <span class="font-medium" :class="currency === 'USD' ? 'text-aura-black' : 'text-neutral-400'">$</span>
  </button>
</template>
