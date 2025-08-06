<template>
  <input 
    :type="type"
    :class="[
      'input-base',
      `input-${size}`,
      { 'input-error': hasError }
    ]"
    :value="modelValue"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    :placeholder="placeholder"
    @input="handleInput"
    @blur="handleBlur"
  />
</template>

<script setup lang="ts">
import { withDefaults } from 'vue'

interface Props {
  modelValue?: string | number
  type?: 'text' | 'number' | 'email' | 'password'
  size?: 'small' | 'medium' | 'large'
  min?: number
  max?: number
  step?: number | string
  disabled?: boolean
  placeholder?: string
  hasError?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'small',
  disabled: false,
  hasError: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  'input': [event: Event]
  'blur': [event: Event]
}>()

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value: string | number = target.value
  
  if (props.type === 'number') {
    const numValue = parseFloat(value)
    value = isNaN(numValue) ? 0 : numValue
  }
  
  emit('update:modelValue', value)
  emit('input', event)
}

const handleBlur = (event: Event) => {
  emit('blur', event)
}
</script>

<style scoped>
.input-base {
  border: var(--border-width) solid var(--color-border-secondary);
  border-radius: var(--border-radius-sm);
  background: var(--color-bg-primary);        /* 通常状態はプライマリ */
  color: var(--color-text-secondary);
  font-family: inherit;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-sm);               /* 軽いシャドウで立体感 */
}

.input-base:focus {
  outline: none;
  border-color: var(--color-focus);
  background: var(--color-bg-secondary);      /* フォーカス時はセカンダリ */
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2), var(--shadow-md); /* フォーカス時はより強いシャドウ */
}

.input-base:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--color-bg-tertiary);       /* disabled時は3階層目 */
}

/* サイズバリエーション */
.input-small {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--font-size-xs);
  width: 60px;
  flex-shrink: 0;
}

.input-medium {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  width: 80px;
}

.input-large {
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--font-size-md);
  width: 120px;
}

/* エラー状態 */
.input-error {
  border-color: var(--color-danger);
}

.input-error:focus {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 1px var(--color-danger);
}
</style>
