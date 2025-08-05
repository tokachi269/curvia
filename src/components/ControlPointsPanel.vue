<!-- eslint-disable @typescript-eslint/ban-ts-comment -->
<template>
    <BasePanel title="制御点設定" v-model:isExpanded="uiStore.sidebarExpanded.controls" :zIndex="101">
        <PropertyRow>
            <BaseCheckbox v-model="controlPointsStore.isLoopMode" @change="updateCurve" label="ループモード" />
        </PropertyRow>

        <!-- アクションボタン -->
        <PropertySubgroup title="操作">
            <ButtonRow>
                <BaseButton @click="controlPointsStore.addPoint" variant="primary">追加</BaseButton>
                <BaseButton @click="controlPointsStore.resetPoints" variant="secondary">リセット</BaseButton>
            </ButtonRow>
            <ButtonRow>
                <BaseButton @click="controlPointsStore.applyDefaultToAllSimple" variant="success">デフォルト適用</BaseButton>
                <BaseButton @click="uiStore.toggleDefaultSettings" variant="default">
                    {{ uiStore.showDefaultSettings ? '設定▲' : '設定▼' }}
                </BaseButton>
            </ButtonRow>
        </PropertySubgroup>

        <!-- デフォルト設定 -->
        <PropertySubgroup v-if="uiStore.showDefaultSettings" title="デフォルト値">
            <PropertyRow>
                <PropLabel label="半径" />
                <BaseInput v-model="controlPointsStore.defaultRadius" type="number" :min="10" :max="500" :step="5" />
                <PropUnit unit="m" />
            </PropertyRow>

            <PropertyRow>
                <PropLabel label="スパイラル係数" />
                <BaseInput v-model="controlPointsStore.defaultSpiralFactor" type="number" :min="0.2" :step="0.1" />
                <PropUnit unit="×" />
            </PropertyRow>
        </PropertySubgroup>

        <!-- 区切り線 -->
        <Divider spacing="md" />

        <!-- 制御点リスト -->
        <ListItem expandable defaultExpanded>
            <!-- @ts-ignore -->
            <template #main>
                <span class="section-title">制御点 ({{ controlPointsStore.points.length }}個)</span>
            </template>
            <!-- @ts-ignore -->
            <template #expanded>
                <div class="point-list">
                    <ListItem v-for="(point, index) in controlPointsStore.points" :key="index"
                        :expandable="index > 0 && index < controlPointsStore.points.length - 1" :isNested="true"
                        @click="selectPoint(index)">
                        <!-- @ts-ignore -->
                        <template #main>
                            <div class="point-main" :class="{ selected: selectedPoint === index }">
                                <div class="point-basic">
                                    <span class="point-icon">●</span>
                                    <span class="point-name">P{{ index }}</span>
                                    <PointInfo :point="point" :availableWidth="getAvailableWidth()"
                                        @expand="expandPoint(index)" />
                                </div>
                                <div class="point-actions">
                                    <BaseButton v-if="controlPointsStore.canRemovePoint(index)"
                                        @click.stop="controlPointsStore.removePoint(index)" variant="danger"
                                        size="small">
                                        ×
                                    </BaseButton>
                                </div>
                            </div>
                        </template>

                        <!-- 中間点のパラメータ詳細 -->
                        <!-- @ts-ignore -->
                        <template v-if="index > 0 && index < controlPointsStore.points.length - 1" #expanded>
                            <PointDetail :point="point" :additionalInfo="true">
                                <!-- @ts-ignore -->
                                <template #additional>
                                    <div class="param-controls">
                                        <PropertyRow>
                                            <PropLabel label="半径" />
                                            <BaseInput :modelValue="point.radius"
                                                @update:modelValue="updatePointRadius(index, $event)" type="number"
                                                :min="10" :max="500" :step="5" size="small" />
                                            <PropUnit unit="m" />
                                        </PropertyRow>

                                        <PropertyRow>
                                            <PropLabel label="スパイラル係数" />
                                            <BaseInput :modelValue="point.spiralFactor"
                                                @update:modelValue="updatePointSpiralFactor(index, $event)"
                                                type="number" :min="0.2" :step="0.1" size="small" />
                                        </PropertyRow>

                                        <PropertyRow>
                                            <PropLabel label="制御モード" />
                                            <select :value="point.spiralMode || 'auto'"
                                                @change="updatePointSpiralMode(index, $event)" class="control-select">
                                                <option value="auto">自動</option>
                                                <option value="manual">手動</option>
                                            </select>
                                        </PropertyRow>
                                    </div>
                                </template>
                            </PointDetail>
                        </template>
                    </ListItem>
                </div>
            </template>
        </ListItem>
    </BasePanel>
</template>

<script setup lang="ts">
import { ref, defineEmits } from 'vue'
import { useControlPointsStore, useUIStore } from '@/stores'
import {
    BasePanel,
    ListPanel,
    ListItem,
    BaseButton,
    BaseInput,
    BaseCheckbox,
    ButtonRow,
    PropertyRow,
    PropLabel,
    PropUnit,
    Divider
} from '@/components/ui'
import { PointInfo, PointDetail } from '@/components/domain'

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

// 制御点の座標を安全に更新
const updatePointX = (index: number, event: Event) => {
    const target = event.target as HTMLInputElement
    const value = parseFloat(target.value)
    if (!isNaN(value)) {
        controlPointsStore.updatePoint(index, { x: value })
        updateCurve()
    }
}

const updatePointY = (index: number, event: Event) => {
    const target = event.target as HTMLInputElement
    const value = parseFloat(target.value)
    if (!isNaN(value)) {
        controlPointsStore.updatePoint(index, { y: value })
        updateCurve()
    }
}

const updatePointRadius = (index: number, value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (!isNaN(numValue)) {
        controlPointsStore.updatePoint(index, { radius: numValue })
        updateCurve()
    }
}

const updatePointSpiralFactor = (index: number, value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (!isNaN(numValue)) {
        controlPointsStore.updatePoint(index, { spiralFactor: numValue })
        updateCurve()
    }
}

const updatePointSpiralMode = (index: number, event: Event) => {
    const target = event.target as HTMLSelectElement
    const value = target.value as 'auto' | 'manual'
    controlPointsStore.updatePoint(index, { spiralMode: value })
    updateCurve()
}

// サイドバーの利用可能幅を計算
const getAvailableWidth = () => {
    // サイドバーの基本幅から余白を引いた値
    return 200 // 固定値として設定、実際のUIStoreから取得することも可能
}

// 制御点の詳細表示を展開
const expandPoint = (index: number) => {
    // 必要に応じて詳細表示のロジックを実装
    console.log('Expand point:', index)
}
</script>

<style scoped>
/* 制御点リストのスタイル */
.point-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.point-item {
    background: var(--color-bg-secondary);
    /* ポイントアイテムはセカンダリ */
    border: var(--border-width) solid var(--color-border-primary);
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    overflow: hidden;
    padding: var(--spacing-lg) var(--spacing-xl);
}

.point-item:hover {
    background: var(--color-surface-hover);
    border-color: var(--color-border-secondary);
}

.point-item.selected {
    background: var(--color-bg-tertiary);
    /* デフォルト設定は3階層目 */
    border-color: var(--color-primary);
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.point-compact {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: var(--spacing-md);
}

/* 幅が広い時は横並び */
@media (min-width: 350px) {
    .point-compact {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
}

.point-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    min-width: 0;
}

.point-icon {
    font-size: var(--font-size-sm);
    color: var(--color-text-tertiary);
    width: 12px;
    text-align: center;
}

.point-name {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    min-width: 24px;
}

.point-coords {
    font-size: var(--font-size-sm);
    color: var(--color-text-tertiary);
    white-space: nowrap;
}

.point-params {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    flex-wrap: wrap;
    width: 100%;
}

/* 幅が広い時はコンパクトに */
@media (min-width: 350px) {
    .point-params {
        width: auto;
        flex-wrap: nowrap;
    }
}

.param-group {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.param-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    min-width: 18px;
}

.param-input {
    width: 50px;
    padding: var(--spacing-xs) var(--spacing-sm);
    border: var(--border-width) solid var(--color-border-secondary);
    border-radius: var(--border-radius-sm);
    font-size: var(--font-size-sm);
    text-align: center;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
}

.param-input:focus {
    outline: none;
    border-color: var(--color-primary);
}

.param-unit {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    min-width: 12px;
}

.param-select {
    width: 50px;
    padding: var(--spacing-xs) var(--spacing-sm);
    border: var(--border-width) solid var(--color-border-secondary);
    border-radius: var(--border-radius-sm);
    font-size: var(--font-size-xs);
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
}

.param-select:focus {
    outline: none;
    border-color: var(--color-primary);
}

.point-actions {
    display: flex;
    align-items: center;
    margin-top: var(--spacing-sm);
}

/* 幅が広い時は右端に配置 */
@media (min-width: 350px) {
    .point-actions {
        margin-top: 0;
    }
}

.btn-tiny {
    min-width: 20px !important;
    height: 20px !important;
    padding: 0 !important;
    font-size: var(--font-size-sm) !important;
}

/* 新しいリストベースのスタイル */
.section-title {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
}

.button-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
}

.default-settings {
    padding: var(--spacing-md);
    background: var(--color-bg-secondary);
    /* セカンダリ背景 */
    border-radius: var(--border-radius-sm);
}

.point-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--spacing-xs);
    border-radius: var(--border-radius-sm);
    transition: background-color var(--transition-fast);
}

.point-main.selected {
    background: #dbeafe;
    /* 薄い青背景 */
    color: var(--color-primary);
    /* 濃い青文字 */
    border: var(--border-width) solid var(--color-primary);
    /* 青ボーダー追加 */
    box-shadow: var(--shadow-md);
    /* シャドウで立体感 */
}

.point-basic {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    flex: 1;
    min-width: 0;
}

.point-icon {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    width: 12px;
    text-align: center;
    flex-shrink: 0;
}

.point-name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    min-width: 24px;
    flex-shrink: 0;
}

.point-actions {
    flex-shrink: 0;
}

.param-controls {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
}

.control-select {
    font-size: var(--font-size-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    border: var(--border-width) solid var(--color-border-secondary);
    border-radius: var(--border-radius-sm);
    background: var(--color-bg-primary);
    /* セレクトはプライマリ */
    color: var(--color-text-secondary);
    flex: 1;
}
</style>
