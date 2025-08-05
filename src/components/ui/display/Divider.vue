<template>
  <div 
    class="divider" 
    :class="[
      `divider-${variant}`,
      `divider-${orientation}`,
      `divider-spacing-${spacing}`,
      { 'divider-with-label': hasLabel }
    ]"
  >
    <div v-if="hasLabel && orientation === 'horizontal'" class="divider-line-left"></div>
    <div v-if="hasLabel" class="divider-label">
      <slot />
    </div>
    <div v-if="hasLabel && orientation === 'horizontal'" class="divider-line-right"></div>
    <div v-if="!hasLabel" class="divider-line-full"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots, withDefaults } from 'vue'

interface Props {
  orientation?: 'horizontal' | 'vertical'
  variant?: 'solid' | 'dashed' | 'dotted'
  spacing?: 'none' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  orientation: 'horizontal',
  variant: 'solid',
  spacing: 'md'
})

const slots = useSlots()
const hasLabel = computed(() => !!slots.default)
</script>

<style scoped>
.divider {
  display: flex;
  align-items: center;
}

/* 縦方向の区切り */
.divider-vertical {
  flex-direction: column;
  height: 100%;
  width: 1px;
}

/* 横方向の区切り */
.divider-horizontal {
  flex-direction: row;
  width: 100%;
  height: 1px;
}

/* スペーシング */
.divider-horizontal.divider-spacing-none {
  margin: 0;
}

.divider-horizontal.divider-spacing-sm {
  margin: var(--spacing-sm) 0;
}

.divider-horizontal.divider-spacing-md {
  margin: var(--spacing-md) 0;
}

.divider-horizontal.divider-spacing-lg {
  margin: var(--spacing-lg) 0;
}

.divider-vertical.divider-spacing-none {
  margin: 0;
}

.divider-vertical.divider-spacing-sm {
  margin: 0 var(--spacing-sm);
}

.divider-vertical.divider-spacing-md {
  margin: 0 var(--spacing-md);
}

.divider-vertical.divider-spacing-lg {
  margin: 0 var(--spacing-lg);
}

/* ライン部分 */
.divider-line-full,
.divider-line-left,
.divider-line-right {
  background: var(--color-border-secondary);
}

.divider-horizontal .divider-line-full {
  width: 100%;
  height: 1px;
}

.divider-horizontal .divider-line-left,
.divider-horizontal .divider-line-right {
  flex: 1;
  height: 1px;
}

.divider-vertical .divider-line-full {
  height: 100%;
  width: 1px;
}

/* ライン種類 */
.divider-dashed .divider-line-full,
.divider-dashed .divider-line-left,
.divider-dashed .divider-line-right {
  background: none;
  border-top: 1px dashed var(--color-border-secondary);
}

.divider-vertical.divider-dashed .divider-line-full {
  border-top: none;
  border-left: 1px dashed var(--color-border-secondary);
}

.divider-dotted .divider-line-full,
.divider-dotted .divider-line-left,
.divider-dotted .divider-line-right {
  background: none;
  border-top: 1px dotted var(--color-border-secondary);
}

.divider-vertical.divider-dotted .divider-line-full {
  border-top: none;
  border-left: 1px dotted var(--color-border-secondary);
}

/* ラベル */
.divider-label {
  padding: 0 var(--spacing-md);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  background: var(--color-bg-primary);
  white-space: nowrap;
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.divider-vertical .divider-label {
  padding: var(--spacing-md) 0;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}
</style>
