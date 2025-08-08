<template>
  <div class="property-subgroup">
    <div v-if="title" class="subgroup-title">{{ title }}</div>
    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
}

defineProps<Props>()
</script>

<style scoped>
.property-subgroup {
  background: var(--color-bg-primary);
  border: var(--border-width) solid var(--color-border-primary);
  border-radius: var(--border-radius-sm);
  margin: var(--spacing-md) 0;
  padding: var(--spacing-md);
}

.subgroup-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-xs);
  border-bottom: var(--border-width) solid var(--color-border-primary);
}
</style>
