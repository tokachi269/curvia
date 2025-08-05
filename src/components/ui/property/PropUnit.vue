<template>
  <span :class="['prop-unit', `unit-${size}`]">
    {{ unit }}
  </span>
</template>

<script setup lang="ts">
import { withDefaults } from 'vue'

interface Props {
  unit: string
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'small'
})
</script>

<style scoped>
.prop-unit {
  color: var(--color-text-tertiary);
  text-align: right;
}

.unit-small {
  font-size: var(--font-size-xs);
  min-width: 20px;
}

.unit-medium {
  font-size: var(--font-size-sm);
  min-width: 25px;
}

.unit-large {
  font-size: var(--font-size-md);
  min-width: 30px;
}
</style>
