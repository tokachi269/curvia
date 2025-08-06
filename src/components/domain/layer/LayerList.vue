<!-- LayerList.vue - 制御点レイヤーリストコンポーネント -->
<template>
  <div class="layer-list">
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
        @click="selectGroup(group.id)"
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
        </template>

        <!-- 制御点リスト（展開コンテンツ） -->
        <template #expanded>
          <div class="points-container">
            <ListItem 
              v-for="(point, pointIndex) in group.points" 
              :key="`${group.id}-${pointIndex}`"
              :expandable="canExpandPoint(pointIndex, group.points.length)"
              :isNested="true"
              :class="{ 
                selected: selectedPointId === `${group.id}-${pointIndex}`,
                'is-start': pointIndex === 0,
                'is-end': pointIndex === group.points.length - 1
              }"
              @click="selectPoint(group.id, pointIndex)"
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
                        • R{{ point.radius }}
                      </span>
                    </div>
                  </div>
                </div>
              </template>

              <!-- 制御点アクション -->
              <template #actions>
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
                    <input 
                      type="number" 
                      :value="point.radius" 
                      @input="updateRadius(group.id, pointIndex, $event)"
                      class="param-input"
                    >
                  </div>
                  <div class="param-row">
                    <label>スパイラル係数</label>
                    <input 
                      type="number" 
                      :value="point.spiralFactor" 
                      @input="updateSpiralFactor(group.id, pointIndex, $event)"
                      class="param-input"
                      step="0.1"
                    >
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
import { ref, computed, defineEmits } from 'vue'
import type { ControlPoint, CurveGroup } from '@/types'
import { ListItem } from '@/components/ui'

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
}>()

const totalPointsCount = computed(() => {
  return props.curveGroups.reduce((total, group) => total + group.points.length, 0)
})

const selectGroup = (groupId: string) => {
  emit('selectGroup', groupId)
}

const selectPoint = (groupId: string, pointIndex: number) => {
  emit('selectPoint', groupId, pointIndex)
}

const toggleGroupVisibility = (groupId: string) => {
  emit('toggleGroupVisibility', groupId)
}

const canRemoveGroup = (groupIndex: number) => {
  return props.curveGroups.length > 1
}

const canRemovePoint = (pointIndex: number, totalPoints: number) => {
  return totalPoints > 3
}

const canExpandPoint = (pointIndex: number, totalPoints: number) => {
  // 開始点と終了点以外は展開可能
  return pointIndex > 0 && pointIndex < totalPoints - 1
}

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
</script>

<style scoped>
/* レイヤーリストのスタイル */
.layer-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

/* ヘッダー */
.layer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--color-bg-tertiary);
    border-radius: var(--border-radius-sm);
    border: var(--border-width) solid var(--color-border-secondary);
}

.layer-title {
    font-weight: 600;
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
}

.layer-count {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    background: var(--color-bg-primary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius-xs);
    border: var(--border-width) solid var(--color-border-primary);
}

/* レイヤーアイテム */
.layer-items {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

/* グループスタイル */
.curve-group {
    border: var(--border-width) solid var(--color-border-secondary);
}

.curve-group.selected-group {
    border-color: var(--color-primary);
    background: var(--color-primary-alpha-10);
}

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

/* 制御点コンテナ */
.points-container {
    padding: var(--spacing-sm) 0;
    border-top: var(--border-width) solid var(--color-border-tertiary);
    background: var(--color-bg-secondary);
}

/* 制御点スタイル */
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

/* 制御点が選択されている時 */
:deep(.selected) {
    background: var(--color-primary-alpha-10) !important;
    border-color: var(--color-primary) !important;
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

/* ネストされたリストアイテムのスタイル調整 */
:deep(.is-nested) {
    margin-left: var(--spacing-lg);
    border-left: 2px solid var(--color-border-tertiary);
}
</style>
