<template>
  <div 
    ref="dividerRef"
    class="divider" 
    :class="[
      `divider-${variant}`,
      `divider-${orientation}`,
      `divider-spacing-${spacing}`,
      { 'divider-with-label': hasLabel }
    ]"
  >
    <!-- 手書き風の区切り線 -->
    <template v-if="variant === 'sketchy'">
      <div v-if="hasLabel && orientation === 'horizontal'" class="sketchy-line-left">
        <svg :width="leftWidth" height="4" xmlns="http://www.w3.org/2000/svg">
          <path :d="generateSketchyPath(leftWidth, 4)" stroke="var(--color-border-secondary)" stroke-width="1" fill="none" />
        </svg>
      </div>
      <div v-if="hasLabel" class="divider-label sketchy-label">
        <slot />
      </div>
      <div v-if="hasLabel && orientation === 'horizontal'" class="sketchy-line-right">
        <svg :width="rightWidth" height="4" xmlns="http://www.w3.org/2000/svg">
          <path :d="generateSketchyPath(rightWidth, 4)" stroke="var(--color-border-secondary)" stroke-width="1" fill="none" />
        </svg>
      </div>
      <div v-if="!hasLabel && orientation === 'horizontal'" class="sketchy-line-full">
        <svg width="100%" height="4" xmlns="http://www.w3.org/2000/svg">
          <path :d="generateSketchyPath(containerWidth - 32, 4)" stroke="var(--color-border-secondary)" stroke-width="1" fill="none" />
        </svg>
      </div>
    </template>

    <!-- 通常の区切り線 -->
    <template v-else>
      <div v-if="hasLabel && orientation === 'horizontal'" class="divider-line-left"></div>
      <div v-if="hasLabel" class="divider-label">
        <slot />
      </div>
      <div v-if="hasLabel && orientation === 'horizontal'" class="divider-line-right"></div>
      <div v-if="!hasLabel" class="divider-line-full"></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots, withDefaults, ref, onMounted, onUnmounted } from 'vue'

interface Props {
  orientation?: 'horizontal' | 'vertical'
  variant?: 'solid' | 'dashed' | 'dotted' | 'sketchy'
  spacing?: 'none' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  orientation: 'horizontal',
  variant: 'solid',
  spacing: 'md'
})

const slots = useSlots()
const hasLabel = computed(() => !!slots.default)

// 手書き風パスジェネレーター
const generateSketchyPath = (width: number, height: number): string => {
  const points: number[] = []
  const numPoints = Math.max(4, Math.floor(width / 20))
  
  for (let i = 0; i <= numPoints; i++) {
    const x = (i / numPoints) * width
    const y = height / 2 + (Math.random() - 0.5) * 2
    points.push(x, y)
  }
  
  let path = `M ${points[0]} ${points[1]}`
  for (let i = 2; i < points.length; i += 2) {
    const prevX = points[i - 2]
    const prevY = points[i - 1]
    const currX = points[i]
    const currY = points[i + 1]
    
    const cpX1 = prevX + (currX - prevX) * 0.3 + (Math.random() - 0.5) * 5
    const cpY1 = prevY + (currY - prevY) * 0.3 + (Math.random() - 0.5) * 2
    const cpX2 = prevX + (currX - prevX) * 0.7 + (Math.random() - 0.5) * 5
    const cpY2 = prevY + (currY - prevY) * 0.7 + (Math.random() - 0.5) * 2
    
    path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${currX} ${currY}`
  }
  
  return path
}

// 動的な幅計算
const dividerRef = ref<HTMLElement>()
const containerWidth = ref(300)
const leftWidth = ref(100)
const rightWidth = ref(100)

// ResizeObserverを使って親要素の幅変更を監視
const updateContainerWidth = () => {
  if (dividerRef.value) {
    const rect = dividerRef.value.getBoundingClientRect()
    containerWidth.value = rect.width
    
    // ラベルがある場合は左右に分割、ない場合は全幅
    if (hasLabel.value) {
      leftWidth.value = Math.max(50, (containerWidth.value - 120) / 2) // 120pxはラベル部分の推定幅
      rightWidth.value = leftWidth.value
    }
  }
}

onMounted(() => {
  updateContainerWidth()
  
  // ResizeObserverでサイズ変更を監視
  if (dividerRef.value) {
    const resizeObserver = new ResizeObserver(() => {
      updateContainerWidth()
    })
    resizeObserver.observe(dividerRef.value)
    
    // クリーンアップ
    onUnmounted(() => {
      resizeObserver.disconnect()
    })
  }
})
</script>

<style scoped>
.divider {
  display: flex;
  align-items: center;
}

/* 縦方向の区切り */
.divider-vertical {
  flex-direction: column;
  height: 100%;
  width: 1px;
}

/* 横方向の区切り */
.divider-horizontal {
  flex-direction: row;
  width: 100%;
  height: 1px;
}

/* スペーシング */
.divider-horizontal.divider-spacing-none {
  margin: 0;
}

.divider-horizontal.divider-spacing-sm {
  margin: var(--spacing-sm) 0;
}

.divider-horizontal.divider-spacing-md {
  margin: var(--spacing-md) 0;
}

.divider-horizontal.divider-spacing-lg {
  margin: var(--spacing-lg) 0;
}

.divider-vertical.divider-spacing-none {
  margin: 0;
}

.divider-vertical.divider-spacing-sm {
  margin: 0 var(--spacing-sm);
}

.divider-vertical.divider-spacing-md {
  margin: 0 var(--spacing-md);
}

.divider-vertical.divider-spacing-lg {
  margin: 0 var(--spacing-lg);
}

/* ライン部分 */
.divider-line-full,
.divider-line-left,
.divider-line-right {
  background: var(--color-border-secondary);
}

.divider-horizontal .divider-line-full {
  width: 100%;
  height: 1px;
}

.divider-horizontal .divider-line-left,
.divider-horizontal .divider-line-right {
  flex: 1;
  height: 1px;
}

.divider-vertical .divider-line-full {
  height: 100%;
  width: 1px;
}

/* ライン種類 */
.divider-dashed .divider-line-full,
.divider-dashed .divider-line-left,
.divider-dashed .divider-line-right {
  background: none;
  border-top: 1px dashed var(--color-border-secondary);
}

.divider-vertical.divider-dashed .divider-line-full {
  border-top: none;
  border-left: 1px dashed var(--color-border-secondary);
}

.divider-dotted .divider-line-full,
.divider-dotted .divider-line-left,
.divider-dotted .divider-line-right {
  background: none;
  border-top: 1px dotted var(--color-border-secondary);
}

.divider-vertical.divider-dotted .divider-line-full {
  border-top: none;
  border-left: 1px dotted var(--color-border-secondary);
}

/* ラベル */
.divider-label {
  padding: 0 var(--spacing-md);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  background: var(--color-bg-primary);
  white-space: nowrap;
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sketchy-label {
  font-family: 'Comic Sans MS', 'Chalkduster', cursive;
  text-transform: none;
  letter-spacing: normal;
  font-weight: var(--font-weight-normal);
}

.divider-vertical .divider-label {
  padding: var(--spacing-md) 0;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

/* 手書き風の線のコンテナ */
.sketchy-line-left,
.sketchy-line-right,
.sketchy-line-full {
  display: flex;
  align-items: center;
}

.sketchy-line-left,
.sketchy-line-right {
  flex: 1;
}

.sketchy-line-full {
  width: 100%;
  padding: 0 var(--spacing-md);
}

.sketchy-line-full svg {
  width: 100%;
  height: 4px;
}
</style>
