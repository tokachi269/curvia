<template>
  <button 
    :class="[
      'btn-base',
      `btn-${size}`,
      `btn-${variant}`,
      { 'btn-disabled': disabled }
    ]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { withDefaults } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'default'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'small',
  disabled: false
})

defineEmits<{
  click: [event: Event]
}>()
</script>

<style scoped>
.btn-base {
  border: var(--border-width) solid var(--color-border-secondary);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
  font-weight: var(--font-weight-normal);
  text-align: center;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  user-select: none;
  box-shadow: var(--shadow-sm);               /* ボタンにも立体感 */
}

.btn-base:hover:not(.btn-disabled) {
  box-shadow: var(--shadow-md);               /* ホバー時はより強いシャドウ */
  transform: translateY(-1px);                /* 少し浮き上がる効果 */
}

.btn-base:active:not(.btn-disabled) {
  box-shadow: var(--shadow-sm);               /* クリック時は元に戻る */
  transform: translateY(0);
}

.btn-base:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-focus), var(--shadow-md);
}

/* サイズバリエーション */
.btn-small {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--font-size-sm);
  min-height: 28px;
}

.btn-medium {
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: var(--font-size-md);
  min-height: 32px;
}

.btn-large {
  padding: var(--spacing-lg) var(--spacing-2xl);
  font-size: var(--font-size-lg);
  min-height: 36px;
}

/* カラーバリエーション */
.btn-default {
  background: var(--color-bg-primary);        /* ボタンはプライマリ */
  color: var(--color-text-secondary);
  border-color: var(--color-border-secondary);
}

.btn-default:hover:not(.btn-disabled) {
  background: var(--color-surface-hover);
  border-color: var(--color-border-primary);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.btn-primary:hover:not(.btn-disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.btn-secondary {
  background: var(--color-secondary);
  color: white;
  border-color: var(--color-secondary);
}

.btn-secondary:hover:not(.btn-disabled) {
  background: var(--color-secondary-hover);
  border-color: var(--color-secondary-hover);
}

.btn-success {
  background: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

.btn-success:hover:not(.btn-disabled) {
  background: var(--color-success-hover);
  border-color: var(--color-success-hover);
}

.btn-danger {
  background: var(--color-danger);
  color: white;
  border-color: var(--color-danger);
}

.btn-danger:hover:not(.btn-disabled) {
  background: var(--color-danger-hover);
  border-color: var(--color-danger-hover);
}

.btn-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
