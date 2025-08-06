<template>
  <div class="slider-wrapper">
    <input
      type="range"
      :class="['slider-input', `slider-${size}`]"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      @input="handleInput"
    />
    <span v-if="showValue" :class="['slider-value', `value-${size}`]">
      {{ displayValue }}{{ unit }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { withDefaults, computed } from 'vue'

interface Props {
  modelValue?: number
  min?: number
  max?: number
  step?: number
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  showValue?: boolean
  unit?: string
  formatter?: (value: number) => string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  min: 0,
  max: 100,
  step: 1,
  size: 'small',
  disabled: false,
  showValue: true,
  unit: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
  'input': [event: Event]
}>()

const displayValue = computed(() => {
  if (props.formatter) {
    return props.formatter(props.modelValue)
  }
  return props.modelValue.toString()
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  emit('update:modelValue', value)
  emit('input', event)
}
</script>

<style scoped>
.slider-wrapper {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex: 1;
}

.slider-input {
  -webkit-appearance: none;
  appearance: none;
  height: 2px;
  background: var(--color-border-primary);
  border-radius: 1px;
  outline: none;
  transition: all var(--transition-fast);
  cursor: pointer;
  flex: 1;
  border: none;
}

.slider-input:hover {
  background: var(--color-border-secondary);
}

.slider-input:focus {
  background: var(--color-border-secondary);
}

.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: all var(--transition-fast);
  border: none;
}

.slider-input::-webkit-slider-thumb:hover {
  background: var(--color-primary-hover);
  transform: scale(1.2);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.slider-input::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: all var(--transition-fast);
}

.slider-input::-moz-range-thumb:hover {
  background: var(--color-primary-hover);
  transform: scale(1.2);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.slider-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.slider-input:disabled::-webkit-slider-thumb {
  cursor: not-allowed;
  background: var(--color-text-muted);
  transform: none;
  box-shadow: none;
}

.slider-input:disabled::-moz-range-thumb {
  cursor: not-allowed;
  background: var(--color-text-muted);
  transform: none;
  box-shadow: none;
}

/* サイズバリエーション */
.slider-small {
  height: 16px;
  flex: 1;
}

.slider-medium {
  height: 20px;
  flex: 1;
}

.slider-large {
  height: 24px;
  flex: 1;
}

.slider-value {
  color: var(--color-text-secondary);
  text-align: right;
  font-weight: var(--font-weight-semibold);
}

.value-small {
  font-size: var(--font-size-xs);
  min-width: 35px;
}

.value-medium {
  font-size: var(--font-size-sm);
  min-width: 40px;
}

.value-large {
  font-size: var(--font-size-md);
  min-width: 45px;
}
</style>
