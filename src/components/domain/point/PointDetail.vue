<template>
  <div class="point-detail">
    <div class="detail-section">
      <div class="detail-title">座標</div>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">X:</span>
          <span class="detail-value">{{ point.x.toFixed(3) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Y:</span>
          <span class="detail-value">{{ point.y.toFixed(3) }}</span>
        </div>
      </div>
    </div>
    
    <div class="detail-section">
      <div class="detail-title">パラメータ</div>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">半径:</span>
          <span class="detail-value">{{ point.radius.toFixed(3) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">スパイラル係数:</span>
          <span class="detail-value">{{ point.spiralFactor.toFixed(4) }}</span>
        </div>
      </div>
    </div>
    
    <div v-if="additionalInfo" class="detail-section">
      <div class="detail-title">追加情報</div>
      <div class="detail-content">
        <slot name="additional" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ControlPoint } from '@/types'

interface Props {
  point: ControlPoint
  additionalInfo?: boolean
}

interface Slots {
  additional?: () => any
}

withDefaults(defineProps<Props>(), {
  additionalInfo: false
})

defineSlots<Slots>()
</script>

<style scoped>
.point-detail {
  font-size: var(--font-size-xs);
  line-height: 1.4;
}

.detail-section {
  margin-bottom: var(--spacing-md);
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-title {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-xs);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xs);
  background: var(--color-bg-tertiary);       /* 詳細項目は3階層目 */
  border-radius: var(--border-radius-sm);
}

.detail-label {
  color: var(--color-text-tertiary);
  font-weight: var(--font-weight-normal);
}

.detail-value {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-semibold);
  font-family: monospace;
}

.detail-content {
  padding: var(--spacing-md);
  background: var(--color-bg-tertiary);       /* 詳細コンテンツも3階層目 */
  border-radius: var(--border-radius-sm);
}
</style>
