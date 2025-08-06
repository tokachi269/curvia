<template>
  <div class="panel">
    <div 
      class="panel-header" 
      :style="{ zIndex: zIndex }"
    >
      <div class="panel-icon" @click="toggleExpanded">▼</div>
      <div class="panel-title">{{ title }}</div>
    </div>
    <div v-show="isExpanded" class="panel-content">
      <div class="property-group">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { withDefaults } from 'vue'

interface Props {
  title: string
  isExpanded: boolean
  zIndex?: number
}

const props = withDefaults(defineProps<Props>(), {
  zIndex: 100
})

const emit = defineEmits<{
  'update:isExpanded': [value: boolean]
}>()

const toggleExpanded = () => {
  emit('update:isExpanded', !props.isExpanded)
}
</script>

<style scoped>
.panel {
  background: var(--color-bg-primary);         /* パネルはプライマリ（白） */
  border: var(--border-width) solid var(--color-border-secondary);
  border-radius: 0;
  margin-bottom: var(--border-width);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.panel-header {
  background: var(--color-bg-tertiary);       /* ヘッダーは tertiary でメリハリ */
  padding: 0;
  user-select: none;
  display: flex;
  align-items: center;
  border-bottom: var(--border-width) solid var(--color-border-primary);
  position: -webkit-sticky;
  position: sticky;
  top: 0;
  transition: background-color var(--transition-fast);
}

.panel-icon {
  font-size: var(--font-size-xs);
  width: 12px;
  color: var(--color-text-tertiary);
  margin-right: var(--spacing-md);
  cursor: pointer;
  padding: var(--spacing-lg) var(--spacing-xl);
  transition: background-color var(--transition-fast);
}

.panel-icon:hover {
  background: var(--color-surface-hover);
}

.panel-title {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.panel-content {
  background: var(--color-bg-primary);        /* コンテンツは白背景 */
  margin: var(--spacing-md) 0;
}

.property-group {
  padding: 0;
}
</style>
