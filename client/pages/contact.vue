<script setup lang="ts">
// Contact page
useSeoMeta({
  title: 'Contact Us | AURA ARCHIVE',
})
</script>

<template>
  <div class="section">
    <div class="container-aura max-w-2xl">
      <h1 class="font-serif text-heading-1 text-aura-black text-center mb-4">Contact Us</h1>
      <p class="text-body text-neutral-600 text-center mb-12">
        Have a question? We're here to help.
      </p>
      
      <form class="space-y-6">
        <div>
          <label for="name" class="input-label">Name</label>
          <input id="name" type="text" class="input-field" placeholder="Your name" />
        </div>
        <div>
          <label for="email" class="input-label">Email</label>
          <input id="email" type="email" class="input-field" placeholder="your@email.com" />
        </div>
        <div>
          <label for="message" class="input-label">Message</label>
          <textarea id="message" rows="5" class="input-field" placeholder="How can we help you?"></textarea>
        </div>
        <button type="submit" class="btn-primary w-full">Send Message</button>
      </form>
    </div>
  </div>
</template>
