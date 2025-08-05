<template>
  <div :class="['list-item', { 'is-nested': isNested, 'is-expandable': expandable }]">
    <div class="list-item-content" @click="handleClick">
      <div v-if="expandable" class="expand-icon">
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

interface Slots {
  main: () => any
  expanded?: () => any
  actions?: () => any
  children?: () => any
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

defineSlots<Slots>()

const isExpanded = ref(props.defaultExpanded)

const handleClick = (event: MouseEvent) => {
  if (props.expandable) {
    isExpanded.value = !isExpanded.value
    emit('toggle', isExpanded.value)
  }
  emit('click', event)
}
</script>

<style scoped>
.list-item {
  border-bottom: var(--border-width) solid var(--color-border-primary);
}

.list-item:last-child {
  border-bottom: none;
}

.list-item-content {
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
  gap: var(--spacing-md);
  min-height: 32px;
  transition: background-color var(--transition-fast);
}

.is-expandable .list-item-content {
  cursor: pointer;
}

.is-expandable .list-item-content:hover {
  background: var(--color-surface-hover);
}

.expand-icon {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  width: 12px;
  flex-shrink: 0;
}

.list-item-main {
  flex: 1;
  min-width: 0;
}

.list-item-actions {
  flex-shrink: 0;
  display: flex;
  gap: var(--spacing-xs);
}

.list-item-expanded {
  padding: var(--spacing-md);
  padding-top: 0;
  background: var(--color-bg-secondary);      /* 展開エリアはセカンダリ */
  border-top: var(--border-width) solid var(--color-border-primary);
}

.list-item-children {
  padding-left: var(--spacing-xl);
}

.is-nested {
  background: var(--color-bg-secondary);      /* ネストアイテムもセカンダリ */
}

.is-nested .list-item-content {
  padding-left: var(--spacing-lg);
}
</style>
