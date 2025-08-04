<template>
  <div class="blender-panel">
    <div class="panel-header" @click="uiStore.sidebarExpanded.controls = !uiStore.sidebarExpanded.controls">
      <div class="panel-icon">{{ uiStore.sidebarExpanded.controls ? '▼' : '▶' }}</div>
      <div class="panel-title">制御点設定</div>
    </div>
    <div v-show="uiStore.sidebarExpanded.controls" class="panel-content">
      <div class="property-group">
        <div class="property-row">
          <label class="prop-label">
            <input type="checkbox" v-model="controlPointsStore.isLoopMode" @change="updateCurve" class="prop-checkbox">
            <span class="prop-name">ループモード</span>
          </label>
        </div>
        
        <!-- アクションボタン -->
        <div class="property-subgroup">
          <div class="subgroup-title">操作</div>
          <div class="button-row">
            <button @click="controlPointsStore.addPoint" class="btn-small btn-primary">追加</button>
            <button @click="controlPointsStore.resetPoints" class="btn-small btn-secondary">リセット</button>
          </div>
          <div class="button-row">
            <button @click="controlPointsStore.applyDefaultToAllSimple" class="btn-small btn-success">デフォルト適用</button>
            <button @click="uiStore.toggleDefaultSettings" class="btn-small btn-outline">
              {{ uiStore.showDefaultSettings ? '設定▲' : '設定▼' }}
            </button>
          </div>
        </div>
        
        <!-- デフォルト設定 -->
        <div v-if="uiStore.showDefaultSettings" class="property-subgroup">
          <div class="subgroup-title">デフォルト値</div>
          <div class="property-row">
            <label class="prop-name">半径</label>
            <input type="number" v-model.number="controlPointsStore.defaultRadius" min="10" max="500" step="5" class="prop-input">
            <span class="prop-unit">m</span>
          </div>

          <div class="property-row">
            <label class="prop-name">スパイラル係数</label>
            <input type="number" v-model.number="controlPointsStore.defaultSpiralFactor" min="0.2" step="0.1" class="prop-input">
            <span class="prop-unit">×</span>
          </div>
        </div>
      </div>
      
      <!-- 制御点リスト -->
      <div class="property-subgroup">
        <div class="subgroup-title">制御点 ({{ controlPointsStore.points.length }}個)</div>
        <div class="point-list-blender">
          <div v-for="(point, index) in controlPointsStore.points" :key="index" class="point-item-blender"
            :class="{ selected: selectedPoint === index }" 
            @click="selectPoint(index)">
            
            <!-- 制御点ヘッダー -->
            <div class="point-header-blender">
              <div class="point-icon">●</div>
              <div class="point-name">P{{ index }}</div>
              <div class="point-coords-compact">
                <input type="text" v-model="point.x" @change="updateCurve" class="coord-input-mini"
                  :placeholder="`${Math.round(point.x)}`">
                <span>,</span>
                <input type="text" v-model="point.y" @change="updateCurve" class="coord-input-mini"
                  :placeholder="`${Math.round(point.y)}`">
              </div>
              <button v-if="controlPointsStore.canRemovePoint(index)" 
                @click.stop="controlPointsStore.removePoint(index)" class="btn-tiny btn-danger">×</button>
            </div>

            <!-- 重要パラメータの常時表示 -->
            <div v-if="index > 0 && index < controlPointsStore.points.length - 1" class="point-summary">
              <div class="summary-row">
                <span class="summary-label">R:</span>
                <input type="number" v-model.number="point.radius" @input="updateCurve" 
                  class="summary-input" min="10" max="500" step="5">
                <span class="summary-unit">m</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">×:</span>
                <input type="number" v-model.number="point.spiralFactor" @input="updateCurve" 
                  class="summary-input" min="0.2" step="0.1">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits } from 'vue'
import { useControlPointsStore, useUIStore } from '@/stores'

const emit = defineEmits<{
  updateCurve: []
  pointSelected: [index: number]
}>()

const controlPointsStore = useControlPointsStore()
const uiStore = useUIStore()
const selectedPoint = ref(-1)

// 制御点を選択
const selectPoint = (index: number) => {
  selectedPoint.value = index
  emit('pointSelected', index)
}

const updateCurve = () => {
  emit('updateCurve')
}
</script>

<style scoped>
/* Panel specific styles */
.blender-panel {
  background: var(--color-bg-secondary);
  border: var(--border-width) solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--border-width);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.panel-header {
  background: var(--color-bg-quaternary);
  padding: var(--spacing-lg) var(--spacing-xl);
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  border-bottom: var(--border-width) solid var(--color-border-primary);
  position: -webkit-sticky;
  position: sticky;
  top: 0;
  z-index: var(--z-panel-3);
  transition: background-color var(--transition-fast);
}

.panel-header:hover {
  background: var(--color-surface-hover);
}

.panel-icon {
  font-size: var(--font-size-xs);
  width: 12px;
  color: var(--color-text-tertiary);
  margin-right: var(--spacing-md);
}

.panel-title {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.panel-content {
  background: var(--color-bg-secondary);
}

.property-group {
  padding: var(--spacing-lg);
}

.property-subgroup {
  background: var(--color-bg-accent);
  border: var(--border-width) solid var(--color-border-primary);
  border-radius: var(--border-radius-sm);
  margin: var(--spacing-md) 0;
  padding: var(--spacing-md);
}

.subgroup-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-xs);
  border-bottom: var(--border-width) solid var(--color-border-primary);
}

.property-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  min-height: 22px;
}

.prop-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  cursor: pointer;
  flex: 1;
}

.prop-name {
  font-size: 11px;
  color: var(--color-text-secondary);
  min-width: 60px;
  flex-shrink: 0;
}

.prop-input {
  background: var(--color-bg-secondary);
  border: var(--border-width) solid var(--color-border-secondary);
  border-radius: var(--border-radius-sm);
  color: var(--color-text-secondary);
  padding: 3px var(--spacing-md);
  font-size: 11px;
  width: 60px;
  flex-shrink: 0;
}

.prop-input:focus {
  outline: none;
  border-color: var(--color-focus);
  background: #fefefe;
}

.prop-checkbox {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--color-primary);
}

.prop-unit {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  min-width: 20px;
  text-align: right;
}

.btn-small {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--font-size-xs);
  border: var(--border-width) solid var(--color-border-secondary);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin: var(--border-width);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary-hover);
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.btn-secondary {
  background: var(--color-secondary);
  color: white;
  border-color: var(--color-secondary-hover);
}

.btn-secondary:hover {
  background: var(--color-secondary-hover);
}

.btn-success {
  background: var(--color-success);
  color: white;
  border-color: var(--color-success-hover);
}

.btn-success:hover {
  background: var(--color-success-hover);
}

.btn-danger {
  background: var(--color-danger);
  color: white;
  border-color: var(--color-danger-hover);
}

.btn-danger:hover {
  background: var(--color-danger-hover);
}

.btn-outline {
  background: transparent;
  color: var(--color-text-secondary);
  border: var(--border-width) solid var(--color-border-secondary);
}

.btn-outline:hover {
  background: var(--color-bg-quaternary);
}

.btn-tiny {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: 9px;
  min-width: 20px;
}

.button-row {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

/* 制御点リストBlenderスタイル */
.point-list-blender {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.point-item-blender {
  background: #fff;
  border: 1px solid #e1e5e9;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
  overflow: hidden;
}

.point-item-blender:hover {
  background: #f8f9fa;
  border-color: #ced4da;
}

.point-item-blender.selected {
  background: #e7f3ff;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.point-header-blender {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  gap: 6px;
  min-height: 28px;
  border-bottom: 1px solid #f1f3f4;
}

.point-icon {
  font-size: 8px;
  color: #6c757d;
  width: 10px;
  text-align: center;
}

.point-name {
  font-size: 10px;
  font-weight: 600;
  color: #495057;
  min-width: 20px;
}

.point-coords-compact {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 9px;
  color: #6c757d;
  flex: 1;
}

.coord-input-mini {
  background: transparent;
  border: none;
  font-size: 9px;
  width: 35px;
  color: #6c757d;
  text-align: right;
}

.coord-input-mini:focus {
  outline: 1px solid #3b82f6;
  background: #fff;
  border-radius: 1px;
}

.point-summary {
  padding: 4px 8px 6px;
  background: #fafbfc;
  border-top: 1px solid #f1f3f4;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.summary-row {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 9px;
}

.summary-label {
  color: #6c757d;
  font-weight: 500;
  min-width: 12px;
}

.summary-input {
  background: #fff;
  border: 1px solid #d6d9dc;
  border-radius: 1px;
  width: 32px;
  height: 16px;
  font-size: 8px;
  text-align: center;
  color: #495057;
}

.summary-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.summary-unit {
  color: #6c757d;
  font-size: 8px;
}
</style>
