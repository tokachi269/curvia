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
  background: var(--color-bg-tertiary);       /* スライダートラックは3階層目 */
  border-radius: var(--border-radius-sm);
  accent-color: var(--color-primary);
  cursor: pointer;
}

.slider-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  color: var(--color-text-tertiary);
  text-align: right;
}

.value-small {
  font-size: var(--font-size-xs);
  min-width: 30px;
}

.value-medium {
  font-size: var(--font-size-sm);
  min-width: 40px;
}

.value-large {
  font-size: var(--font-size-md);
  min-width: 50px;
}
</style>
