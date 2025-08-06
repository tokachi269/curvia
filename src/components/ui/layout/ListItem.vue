<template>
  <div :class="['list-item', { 'is-nested': isNested, 'is-expandable': expandable }]">
    <div class="list-item-content" @click="handleContentClick">
      <div v-if="expandable" class="expand-icon" @click.stop="handleExpandClick">
        {{ isExpanded ? '▼' : '▶' }}
      </div>
      <div class="list-item-main">
        <slot name="main" />
      </div>
      <div v-if="$slots.actions" class="list-item-actions">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="expandable && isExpanded" class="list-item-expanded">
      <slot name="expanded" />
    </div>
    <div v-if="$slots.children" class="list-item-children">
      <slot name="children" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, withDefaults } from 'vue'

interface Props {
  expandable?: boolean
  defaultExpanded?: boolean
  isNested?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  expandable: false,
  defaultExpanded: false,
  isNested: false
})

const emit = defineEmits<{
  'toggle': [expanded: boolean]
  'click': [event: MouseEvent]
}>()

const isExpanded = ref(props.defaultExpanded)

const handleExpandClick = () => {
  isExpanded.value = !isExpanded.value
  emit('toggle', isExpanded.value)
}

const handleContentClick = (event: MouseEvent) => {
  emit('click', event)
}
</script>

<style scoped>
.list-item {
  display: flex;
  flex-direction: column;
  border: var(--border-width) solid var(--color-border-primary);
  border-radius: var(--border-radius-sm);
  background: var(--color-bg-primary);
  transition: all var(--transition-fast);
}

.list-item:hover {
  border-color: var(--color-border-secondary);
  background: var(--color-surface-hover);
}

.list-item.is-nested {
  margin-left: var(--spacing-md);
  border-left: 2px solid var(--color-border-tertiary);
}

.list-item-content {
  display: flex;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  cursor: pointer;
  gap: var(--spacing-md);
}

.expand-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--transition-fast);
}

.expand-icon:hover {
  color: var(--color-text-primary);
}

.list-item-main {
  flex: 1;
  min-width: 0;
}

.list-item-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.list-item-expanded {
  border-top: var(--border-width) solid var(--color-border-tertiary);
  background: var(--color-bg-secondary);
}

.list-item-children {
  padding: var(--spacing-sm) 0;
}

/* 選択状態 */
.list-item.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-alpha-10);
}
</style>