<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'fr'
  }
})

useSeoMeta({
  title: 'Nitro Ranges',
  description: 'Outil de décision preflop poker'
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
