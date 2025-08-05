<template>
  <BasePanel
    :title="title"
    :isExpanded="isExpanded"
    @update:isExpanded="$emit('update:isExpanded', $event)"
  >
    <div class="list-panel">
      <slot />
    </div>
  </BasePanel>
</template>

<script setup lang="ts">
import BasePanel from './BasePanel.vue'

interface Props {
  title: string
  isExpanded: boolean
}

defineProps<Props>()

defineEmits<{
  'update:isExpanded': [value: boolean]
}>()
</script>

<style scoped>
.list-panel {
  padding: 0;
}
</style>
