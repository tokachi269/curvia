<template>
  <div class="property-row">
    <slot />
  </div>
</template>

<script setup lang="ts">
// Props are handled by slot content
</script>

<style scoped>
.property-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  min-height: 22px;
}
</style>
