<template>
  <label :class="['prop-label', `label-${size}`]">
    {{ label }}
  </label>
</template>

<script setup lang="ts">
import { withDefaults } from 'vue'

interface Props {
  label: string
  size?: 'small' | 'medium' | 'large'
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'small',
  required: false
})
</script>

<style scoped>
.prop-label {
  color: var(--color-text-secondary);
  flex-shrink: 0;
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
