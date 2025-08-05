<template>
  <div class="button-row">
    <slot />
  </div>
</template>

<script setup lang="ts">
// Props are handled by slot content
</script>

<style scoped>
.button-row {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}
</style>
