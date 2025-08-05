<template>
  <label :class="['checkbox-wrapper', { 'checkbox-disabled': disabled }]">
    <input
      type="checkbox"
      :class="['checkbox-input', `checkbox-${size}`]"
      :checked="modelValue"
      :disabled="disabled"
      @change="handleChange"
    />
    <span v-if="label" :class="['checkbox-label', `label-${size}`]">{{ label }}</span>
    <slot />
  </label>
</template>

<script setup lang="ts">
import { withDefaults } from 'vue'

interface Props {
  modelValue?: boolean
  label?: string
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  size: 'small',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'change': [event: Event]
}>()

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
  emit('change', event)
}
</script>

<style scoped>
.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  cursor: pointer;
  flex: 1;
}

.checkbox-wrapper.checkbox-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.checkbox-input {
  margin: 0;
  accent-color: var(--color-primary);
}

.checkbox-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* サイズバリエーション */
.checkbox-small {
  width: 14px;
  height: 14px;
}

.checkbox-medium {
  width: 16px;
  height: 16px;
}

.checkbox-large {
  width: 18px;
  height: 18px;
}

.checkbox-label {
  color: var(--color-text-secondary);
  flex-shrink: 0;
  user-select: none;
}

.label-small {
  font-size: var(--font-size-xs);
  min-width: 60px;
}

.label-medium {
  font-size: var(--font-size-sm);
  min-width: 80px;
}

.label-large {
  font-size: var(--font-size-md);
  min-width: 100px;
}
</style>
