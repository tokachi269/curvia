<!-- CurveLayerList.vue - 曲線レイヤー管理コンポーネント -->
<template>
  <div class="curve-layer-list">
    <!-- ヘッダー -->
    <div class="layer-header">
      <span class="layer-title">制御点レイヤー</span>
      <span class="layer-count">{{ totalPointsCount }}</span>
    </div>
    
    <!-- カーブグループリスト -->
    <div class="layer-items">
      <ListItem 
        v-for="(group, groupIndex) in curveGroups" 
        :key="group.id"
        :expandable="true"
        :defaultExpanded="true"
        :class="{ 
          'curve-group': true,
          'selected-group': selectedGroupId === group.id
        }"
        @click="handleGroupClick(group, groupIndex)"
      >
        <!-- グループメインコンテンツ -->
        <template #main>
          <div class="group-content">
            <div class="group-visibility">
              <button 
                class="visibility-btn"
                @click.stop="toggleGroupVisibility(group.id)"
                :title="group.visible ? '非表示にする' : '表示する'"
              >
                <svg v-if="group.visible" class="eye-icon" viewBox="0 0 24 24">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
                <svg v-else class="eye-off-icon" viewBox="0 0 24 24">
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                </svg>
              </button>
            </div>
            
            <div class="group-icon">
              <div class="curve-indicator" :style="{ backgroundColor: group.color }"></div>
            </div>
            
            <div class="group-info">
              <div class="group-name">{{ group.name }}</div>
              <div class="group-details">{{ group.points.length }}点</div>
            </div>
          </div>
        </template>

        <!-- グループアクション -->
        <template #actions>
          <div class="group-actions">
            <!-- 重複解消設定 -->
            <div class="overlap-controls">
              <label class="overlap-checkbox-label">
                <input 
                  type="checkbox"
                  class="overlap-checkbox"
                  :checked="group.overlapResolution?.enabled"
                  @change="toggleGroupOverlapResolution(group.id)"
                  @click.stop
                >
                <span class="overlap-label-text">重複解消</span>
              </label>
            </div>
            
            <!-- 削除ボタン -->
            <button 
              v-if="selectedGroupId === group.id && canRemoveGroup(groupIndex)"
              class="remove-btn"
              @click.stop="$emit('removeGroup', group.id)"
              title="グループ削除"
            >
              <svg class="remove-icon" viewBox="0 0 24 24">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </template>

        <!-- 制御点リスト（展開コンテンツ） -->
        <template #expanded>
          <div class="points-container">
            <ListItem 
              v-for="(point, pointIndex) in group.points" 
              :key="`${group.id}-${pointIndex}`"
              :expandable="canExpandPoint(point, pointIndex, group)"
              :isNested="true"
              :class="{ 
                selected: selectedPointId === `${group.id}-${pointIndex}`,
                'is-start': pointIndex === 0,
                'is-end': pointIndex === group.points.length - 1
              }"
              @click="handlePointClick(point, pointIndex, group, groupIndex)"
            >
              <!-- 制御点メインコンテンツ -->
              <template #main>
                <div class="point-content">
                  <div class="point-icon">
                    <div class="point-indicator" :class="{
                      'start-point': pointIndex === 0,
                      'end-point': pointIndex === group.points.length - 1,
                      'control-point': pointIndex > 0 && pointIndex < group.points.length - 1
                    }"></div>
                  </div>
                  
                  <div class="point-info">
                    <div class="point-name">{{ getPointName(pointIndex, group.points.length) }}</div>
                    <div class="point-details">
                      {{ Math.round(point.x) }}, {{ Math.round(point.y) }}
                      <span v-if="pointIndex > 0 && pointIndex < group.points.length - 1">
                        • R{{ getDisplayRadius(point) }}
                        <span v-if="point.adjustment" class="adjustment-indicator" :title="getAdjustmentTooltip(point)">
                          *
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </template>

              <!-- 制御点アクション -->
              <template #actions>
                <div class="point-actions">
                  <!-- 個別制御点の重複解消設定（制御点のみ、開始点と終了点以外） -->
                  <label 
                    v-if="pointIndex > 0 && pointIndex < group.points.length - 1"
                    class="point-overlap-checkbox-label"
                  >
                    <input 
                      type="checkbox"
                      class="point-overlap-checkbox"
                      :checked="point.overlapResolution?.enabled"
                      @change="togglePointOverlapResolution(group.id, pointIndex)"
                      @click.stop
                    >
                    <span class="point-overlap-label-text">重複解消</span>
                  </label>
                  
                  <!-- 削除ボタン -->
                  <button 
                    v-if="selectedPointId === `${group.id}-${pointIndex}` && canRemovePoint(pointIndex, group.points.length)"
                    class="remove-btn"
                    @click.stop="$emit('removePoint', group.id, pointIndex)"
                    title="制御点削除"
                  >
                    <svg class="remove-icon" viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </div>
              </template>

              <!-- 制御点展開コンテンツ -->
              <template #expanded>
                <div class="param-section">
                  <div class="param-row">
                    <label>X座標</label>
                    <input 
                      type="number" 
                      :value="point.x" 
                      @input="updateX(group.id, pointIndex, $event)"
                      class="param-input"
                    >
                  </div>
                  <div class="param-row">
                    <label>Y座標</label>
                    <input 
                      type="number" 
                      :value="point.y" 
                      @input="updateY(group.id, pointIndex, $event)"
                      class="param-input"
                    >
                  </div>
                  <div class="param-row">
                    <label>半径</label>
                    <div class="param-with-adjustment">
                      <input 
                        type="number" 
                        :value="point.radius" 
                        @input="updateRadius(group.id, pointIndex, $event)"
                        class="param-input"
                        :class="{ 'has-adjustment': point.adjustment }"
                      >
                      <div v-if="point.adjustment" class="adjustment-display">
                        → {{ getDisplayRadius(point) }}
                      </div>
                    </div>
                  </div>
                  <div class="param-row">
                    <label>スパイラル係数</label>
                    <div class="param-with-adjustment">
                      <input 
                        type="number" 
                        :value="point.spiralFactor" 
                        @input="updateSpiralFactor(group.id, pointIndex, $event)"
                        class="param-input"
                        :class="{ 'has-adjustment': point.adjustment }"
                        step="0.1"
                      >
                      <div v-if="point.adjustment" class="adjustment-display">
                        → {{ getDisplaySpiralFactor(point) }}
                      </div>
                    </div>
                  </div>
                  <div v-if="point.adjustment" class="adjustment-info">
                    <div class="adjustment-reason">
                      {{ getAdjustmentReason(point.adjustment) }}
                    </div>
                  </div>
                </div>
              </template>
            </ListItem>
          </div>
        </template>
      </ListItem>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ControlPoint, CurveGroup } from '@/types'
import ListItem from '@/components/ui/layout/ListItem.vue'

interface Props {
  curveGroups: CurveGroup[]
  selectedGroupId?: string
  selectedPointId?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  selectGroup: [groupId: string]
  selectPoint: [groupId: string, pointIndex: number]
  removeGroup: [groupId: string]
  removePoint: [groupId: string, pointIndex: number]
  updatePoint: [groupId: string, pointIndex: number, point: Partial<ControlPoint>]
  updateRadius: [groupId: string, pointIndex: number, value: number]
  updateSpiralFactor: [groupId: string, pointIndex: number, value: number]
  toggleGroupVisibility: [groupId: string]
  toggleGroupOverlapResolution: [groupId: string]
  togglePointOverlapResolution: [groupId: string, pointIndex: number]
}>()

const totalPointsCount = computed(() => {
  return props.curveGroups.reduce((total, group) => total + group.points.length, 0)
})

// グループ選択
const handleGroupClick = (group: CurveGroup, index: number) => {
  emit('selectGroup', group.id)
}

// 制御点選択
const handlePointClick = (point: ControlPoint, pointIndex: number, group: CurveGroup, groupIndex: number) => {
  emit('selectPoint', group.id, pointIndex)
}

// 可視性切り替え
const toggleGroupVisibility = (groupId: string) => {
  emit('toggleGroupVisibility', groupId)
}

// 重複解消制御
const toggleGroupOverlapResolution = (groupId: string) => {
  emit('toggleGroupOverlapResolution', groupId)
}

const togglePointOverlapResolution = (groupId: string, pointIndex: number) => {
  emit('togglePointOverlapResolution', groupId, pointIndex)
}

// 削除可能判定
const canRemoveGroup = (groupIndex: number) => {
  return props.curveGroups.length > 1
}

const canRemovePoint = (pointIndex: number, totalPoints: number) => {
  return totalPoints > 3
}

// 制御点展開可能判定
const canExpandPoint = (point: ControlPoint, pointIndex: number, group: CurveGroup) => {
  // 開始点と終了点以外は展開可能
  return pointIndex > 0 && pointIndex < group.points.length - 1
}

// 制御点名取得
const getPointName = (pointIndex: number, totalPoints: number) => {
  if (pointIndex === 0) return '開始点'
  if (pointIndex === totalPoints - 1) return '終了点'
  return `制御点 ${pointIndex}`
}

// 制御点パラメータ更新ハンドラー
const updateX = (groupId: string, pointIndex: number, event: Event) => {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  if (!isNaN(value)) {
    emit('updatePoint', groupId, pointIndex, { x: value })
  }
}

const updateY = (groupId: string, pointIndex: number, event: Event) => {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  if (!isNaN(value)) {
    emit('updatePoint', groupId, pointIndex, { y: value })
  }
}

const updateRadius = (groupId: string, pointIndex: number, event: Event) => {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  if (!isNaN(value) && value >= 0) {
    emit('updateRadius', groupId, pointIndex, value)
  }
}

const updateSpiralFactor = (groupId: string, pointIndex: number, event: Event) => {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  if (!isNaN(value) && value >= 0) {
    emit('updateSpiralFactor', groupId, pointIndex, value)
  }
}

// 調整値表示関数
const getDisplayRadius = (point: ControlPoint) => {
  return point.adjustedRadius ? point.adjustedRadius.toFixed(1) : point.radius.toString()
}

const getDisplaySpiralFactor = (point: ControlPoint) => {
  return point.adjustedSpiralFactor ? point.adjustedSpiralFactor.toFixed(1) : point.spiralFactor.toString()
}

const getAdjustmentTooltip = (point: ControlPoint) => {
  if (!point.adjustment) return ''
  
  const { type, reason, radiusScale } = point.adjustment
  const scalePercent = Math.round(radiusScale * 100)
  
  switch (reason) {
    case 'overlap-prevention':
      return `重複回避のため ${scalePercent}% に縮小されています`
    case 'space-optimization':
      return `スペース最適化のため ${scalePercent}% に調整されています`
    default:
      return `${type}調整により ${scalePercent}% に変更されています`
  }
}

const getAdjustmentReason = (adjustment: any) => {
  switch (adjustment.reason) {
    case 'overlap-prevention':
      return '重複回避により調整'
    case 'space-optimization':
      return 'スペース最適化により調整'
    default:
      return '自動調整適用'
  }
}
</script>

<style scoped>
/* 曲線レイヤーリストコンテナ */
.curve-layer-list {
    padding: var(--spacing-md);
}

/* 曲線グループ固有スタイル */
.group-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    width: 100%;
}

.group-visibility {
    flex-shrink: 0;
}

.visibility-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: color var(--transition-fast);
}

.visibility-btn:hover {
    color: var(--color-text-primary);
}

.eye-icon,
.eye-off-icon {
    width: 16px;
    height: 16px;
    fill: currentColor;
}

.group-icon {
    flex-shrink: 0;
}

.curve-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--color-bg-primary);
}

.group-info {
    flex: 1;
    min-width: 0;
}

.group-name {
    font-weight: 500;
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
}

.group-details {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
}

/* 制御点固有スタイル */
.point-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    width: 100%;
}

.point-icon {
    flex-shrink: 0;
}

.point-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 2px solid var(--color-bg-primary);
}

.point-indicator.start-point {
    background: var(--color-success);
}

.point-indicator.end-point {
    background: var(--color-danger);
}

.point-indicator.control-point {
    background: var(--color-warning);
}

.point-info {
    flex: 1;
    min-width: 0;
}

.point-name {
    font-weight: 500;
    color: var(--color-text-primary);
    font-size: var(--font-size-xs);
}

.point-details {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
}

/* 削除ボタン */
.remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: color var(--transition-fast);
}

.remove-btn:hover {
    color: var(--color-danger);
}

.remove-icon {
    width: 14px;
    height: 14px;
    fill: currentColor;
}

/* パラメータセクション */
.param-section {
    padding: var(--spacing-md);
    background: var(--color-bg-tertiary);
    border-top: var(--border-width) solid var(--color-border-tertiary);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
}

.param-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.param-row label {
    flex: 1;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    min-width: 60px;
}

.param-input {
    flex: 1;
    padding: var(--spacing-xs) var(--spacing-sm);
    border: var(--border-width) solid var(--color-border-primary);
    border-radius: var(--border-radius-xs);
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    font-size: var(--font-size-xs);
    width: 60px;
}

.param-input:focus {
    outline: none;
    border-color: var(--color-primary);
}

.param-input.has-adjustment {
    border-color: var(--color-warning);
    background: rgba(255, 193, 7, 0.1);
}

/* 調整値表示 */
.param-with-adjustment {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
}

.adjustment-display {
    font-size: var(--font-size-xs);
    color: var(--color-warning);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
}

.adjustment-indicator {
    color: var(--color-warning);
    font-weight: var(--font-weight-bold);
    cursor: help;
}

.adjustment-info {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: rgba(255, 193, 7, 0.1);
    border: 1px solid var(--color-warning);
    border-radius: var(--border-radius-xs);
    margin-top: var(--spacing-xs);
}

.adjustment-reason {
    font-size: var(--font-size-xs);
    color: var(--color-warning);
    font-style: italic;
}

/* 重複解消制御 */
.group-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
}

.overlap-controls {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
}

.overlap-checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    cursor: pointer;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
}

.overlap-checkbox {
    width: 14px;
    height: 14px;
    margin: 0;
    cursor: pointer;
}

.overlap-label-text {
    white-space: nowrap;
    user-select: none;
}

/* 制御点アクション */
.point-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
}

.point-overlap-checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    cursor: pointer;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
}

.point-overlap-checkbox {
    width: 12px;
    height: 12px;
    margin: 0;
    cursor: pointer;
}

.point-overlap-label-text {
    white-space: nowrap;
    user-select: none;
}
</style>
