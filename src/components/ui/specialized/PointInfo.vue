<template>
  <div class="point-info" :style="{ width: availableWidth + 'px' }">
    <!-- 最優先：座標は必ず表示 -->
    <div class="point-coord">
      <TruncateText :text="`(${point.x.toFixed(1)}, ${point.y.toFixed(1)})`" :maxLength="15" />
    </div>
    
    <!-- 幅に応じて表示項目を調整 -->
    <div v-if="shouldShowRadius" class="point-param">
      <span class="param-label">R:</span>
      <TruncateText :text="point.radius.toFixed(1)" :maxLength="8" />
    </div>
    
    <div v-if="shouldShowSpiral" class="point-param">
      <span class="param-label">S:</span>
      <TruncateText :text="point.spiralFactor.toFixed(2)" :maxLength="6" />
    </div>
    
    <!-- 省略表示アイコン -->
    <div v-if="hasHiddenItems" class="more-icon" @click="$emit('expand')">
      <span>...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, withDefaults } from 'vue'
import { TruncateText } from '@/components/ui'
import type { ControlPoint } from '@/types'

interface Props {
  point: ControlPoint
  availableWidth?: number
  minWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  availableWidth: 200,
  minWidth: 120
})

const emit = defineEmits<{
  'expand': []
}>()

// 座標表示に必要な最小幅
const coordWidth = 80

// パラメータ表示に必要な幅
const radiusWidth = 40
const spiralWidth = 40
const moreIconWidth = 20

const shouldShowRadius = computed(() => {
  const requiredWidth = coordWidth + radiusWidth
  return props.availableWidth >= requiredWidth
})

const shouldShowSpiral = computed(() => {
  const requiredWidth = coordWidth + radiusWidth + spiralWidth
  return props.availableWidth >= requiredWidth
})

const hasHiddenItems = computed(() => {
  return !shouldShowRadius.value || !shouldShowSpiral.value
})
</script>

<style scoped>
.point-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  min-width: 120px;
  overflow: hidden;
}

.point-coord {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-semibold);
  flex-shrink: 0;
  min-width: 80px;
}

.point-param {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.param-label {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}

.more-icon {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-sm);
  transition: background-color var(--transition-fast);
  flex-shrink: 0;
}

.more-icon:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-secondary);
}
</style>
