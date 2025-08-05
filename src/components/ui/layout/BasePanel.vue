<template>
  <div class="panel">
    <div 
      class="panel-header" 
      @click="toggleExpanded"
      :style="{ zIndex: zIndex }"
    >
      <div class="panel-icon">{{ isExpanded ? '▼' : '▶' }}</div>
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
  border-radius: var(--border-radius-md);
  margin-bottom: var(--border-width);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.panel-header {
  background: var(--color-bg-primary);        /* ヘッダーも白背景 */
  padding: var(--spacing-lg) var(--spacing-xl);
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  border-bottom: var(--border-width) solid var(--color-border-primary);
  position: -webkit-sticky;
  position: sticky;
  top: 0;
  transition: background-color var(--transition-fast);
}

.panel-header:hover {
  background: var(--color-surface-hover);
}

.panel-icon {
  font-size: var(--font-size-xs);
  width: 12px;
  color: var(--color-text-tertiary);
  margin-right: var(--spacing-md);
}

.panel-title {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.panel-content {
  background: var(--color-bg-tertiary);
}

.property-group {
  padding: var(--spacing-lg);
}
</style>
