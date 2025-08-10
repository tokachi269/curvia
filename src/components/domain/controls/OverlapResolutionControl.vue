<!-- OverlapResolutionControl.vue - 重複解消制御コンポーネント -->
<template>
  <PropertySubgroup title="重複解消">
    <div class="overlap-resolution-control">
      <!-- 有効/無効切り替え -->
      <div class="control-row">
        <label class="toggle-label">
          <input 
            type="checkbox" 
            v-model="settings.enabled"
            @change="onSettingsChange"
            class="toggle-input"
          >
          <span class="toggle-slider"></span>
          <span class="toggle-text">重複解消を有効にする</span>
        </label>
      </div>

      <!-- 詳細設定 -->
      <div v-if="settings.enabled" class="detail-settings">
        <!-- 調整モード -->
        <div class="control-row">
          <label>調整モード</label>
          <select 
            v-model="settings.mode"
            @change="onSettingsChange"
            class="select-input"
          >
            <option value="global">全体一括調整</option>
            <option value="individual">個別コーナー調整</option>
          </select>
        </div>

        <!-- 計算方式 -->
        <div class="control-row">
          <label>計算方式</label>
          <select 
            v-model="settings.method"
            @change="onSettingsChange"
            class="select-input"
          >
            <option value="css-like">CSS風（高速）</option>
            <option value="space-fit">スペース最適化</option>
          </select>
        </div>

        <!-- 最小分離距離 -->
        <div class="control-row">
          <label>最小分離距離</label>
          <div class="input-group">
            <input 
              type="number" 
              v-model.number="settings.minSeparation"
              @input="onSettingsChange"
              min="0.1"
              max="20"
              step="0.1"
              class="number-input"
            >
            <span class="unit">m</span>
          </div>
        </div>

        <!-- 最大縮小率 -->
        <div class="control-row">
          <label>最大縮小率</label>
          <div class="input-group">
            <input 
              type="range" 
              v-model.number="settings.maxReductionFactor"
              @input="onSettingsChange"
              min="0.1"
              max="1"
              step="0.05"
              class="range-input"
            >
            <span class="range-value">{{ Math.round(settings.maxReductionFactor * 100) }}%</span>
          </div>
        </div>

        <!-- 比率保持 -->
        <div class="control-row">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="settings.preserveRatios"
              @change="onSettingsChange"
              class="checkbox-input"
            >
            <span class="checkbox-text">制御点間の比率を保持</span>
          </label>
        </div>
      </div>

      <!-- 状態表示 -->
      <div v-if="resolutionStatus" class="status-display">
        <div class="status-header">調整状況</div>
        <div v-if="resolutionStatus.applied" class="status-active">
          <div class="status-item">
            <span class="status-label">調整方式:</span>
            <span class="status-value">{{ resolutionStatus.mode }}</span>
          </div>
          <div v-if="resolutionStatus.globalScale" class="status-item">
            <span class="status-label">全体縮小率:</span>
            <span class="status-value">{{ Math.round(resolutionStatus.globalScale * 100) }}%</span>
          </div>
          <div v-if="resolutionStatus.adjustedPointsCount" class="status-item">
            <span class="status-label">調整済み制御点:</span>
            <span class="status-value">{{ resolutionStatus.adjustedPointsCount }}個</span>
          </div>
        </div>
        <div v-else class="status-inactive">
          重複なし（調整不要）
        </div>
      </div>
    </div>
  </PropertySubgroup>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import PropertySubgroup from '@/components/ui/property/PropertySubgroup.vue'
import type { OverlapResolutionSettings } from '@/types'

interface Props {
  initialSettings?: Partial<OverlapResolutionSettings>
  resolutionStatus?: {
    applied: boolean
    mode?: string
    globalScale?: number
    adjustedPointsCount?: number
  }
}

const props = withDefaults(defineProps<Props>(), {
  initialSettings: () => ({
    enabled: true,
    mode: 'global',
    method: 'css-like',
    minSeparation: 2,
    maxReductionFactor: 0.1,
    preserveRatios: true
  })
})

const emit = defineEmits<{
  settingsChange: [settings: OverlapResolutionSettings]
}>()

const settings = reactive<OverlapResolutionSettings>({
  enabled: true,
  mode: 'global',
  method: 'css-like',
  minSeparation: 2,
  maxReductionFactor: 0.1,
  preserveRatios: true,
  ...props.initialSettings
})

const onSettingsChange = () => {
  emit('settingsChange', { ...settings })
}

// 初期設定を親に通知
onSettingsChange()
</script>

<style scoped>
.overlap-resolution-control {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  min-height: 24px;
}

.control-row label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
  min-width: 80px;
  flex-shrink: 0;
}

/* トグルスイッチ */
.toggle-label {
  display: flex !important;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  min-width: auto !important;
}

.toggle-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: relative;
  width: 40px;
  height: 20px;
  background: var(--color-bg-tertiary);
  border-radius: 10px;
  transition: var(--transition-fast);
  border: 1px solid var(--color-border-primary);
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-text-secondary);
  top: 1px;
  left: 1px;
  transition: var(--transition-fast);
}

.toggle-input:checked + .toggle-slider {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.toggle-input:checked + .toggle-slider::before {
  transform: translateX(20px);
  background: var(--color-bg-primary);
}

.toggle-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

/* 詳細設定 */
.detail-settings {
  padding-left: var(--spacing-md);
  border-left: 2px solid var(--color-border-secondary);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

/* 入力要素 */
.select-input,
.number-input {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--border-radius-xs);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  min-width: 80px;
}

.select-input:focus,
.number-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.input-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.input-group .number-input {
  min-width: 60px;
}

.unit {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

/* レンジ入力 */
.range-input {
  min-width: 80px;
}

.range-value {
  font-size: var(--font-size-xs);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
  min-width: 35px;
  text-align: right;
}

/* チェックボックス */
.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
  min-width: auto !important;
}

.checkbox-input {
  width: 14px;
  height: 14px;
  accent-color: var(--color-primary);
}

.checkbox-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-primary);
}

/* 状態表示 */
.status-display {
  padding: var(--spacing-sm);
  background: var(--color-bg-secondary);
  border-radius: var(--border-radius-xs);
  border: 1px solid var(--color-border-secondary);
}

.status-header {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.status-active {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.status-value {
  font-size: var(--font-size-xs);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.status-inactive {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-style: italic;
}
</style>
