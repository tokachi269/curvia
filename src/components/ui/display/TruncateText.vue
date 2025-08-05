<template>
  <div class="truncate-text" :title="showTooltip ? fullText : undefined">
    <span v-if="!isTruncated">{{ fullText }}</span>
    <span v-else>{{ truncatedText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, withDefaults } from 'vue'

interface Props {
  text: string
  maxLength?: number
  showTooltip?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxLength: 20,
  showTooltip: true
})

const isTruncated = computed(() => {
  return props.text.length > props.maxLength
})

const truncatedText = computed(() => {
  if (!isTruncated.value) return props.text
  return props.text.slice(0, props.maxLength - 3) + '...'
})

const fullText = computed(() => props.text)
</script>

<style scoped>
.truncate-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: help;
}
</style>
