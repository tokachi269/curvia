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
        <Divider spacing="md" variant="sketchy" />

        <!-- 制御点レイヤーリスト -->
        <CurveLayerList 
            :curveGroups="curveGroups"
            :selectedGroupId="selectedGroupId"
            :selectedPointId="selectedPointId"
            @selectGroup="selectGroup"
            @selectPoint="selectPoint"
            @removeGroup="removeGroup"
            @removePoint="removePoint"
            @updatePoint="updatePoint"
            @updateRadius="updatePointRadius"
            @updateSpiralFactor="updatePointSpiralFactor"
            @toggleGroupVisibility="toggleGroupVisibility"
            @toggleGroupOverlapResolution="handleToggleGroupOverlapResolution"
            @togglePointOverlapResolution="handleTogglePointOverlapResolution"
        />
    </BasePanel>
</template>

<script setup lang="ts">
import { ref, computed, defineEmits } from 'vue'
import { useControlPointsStore, useUIStore } from '@/stores'
import {
    BasePanel,
    BaseButton,
    BaseInput,
    BaseCheckbox,
    ButtonRow,
    PropertyRow,
    PropertySubgroup,
    PropLabel,
    PropUnit,
    Divider,
} from '@/components/ui'
import { PointInfo, PointDetail } from '@/components/domain'
import { CurveLayerList } from '@/components/domain'
import logger from '@/utils/logger.js'

const emit = defineEmits<{
    updateCurve: []
    pointSelected: [index: number]
    overlapResolutionChanged: [settings: { enabled: boolean, mode: 'global' | 'individual' }]
}>()

const controlPointsStore = useControlPointsStore()
const uiStore = useUIStore()
const selectedPoint = ref(-1)
const selectedGroupId = ref('default')
const selectedPointId = ref<string | undefined>(undefined)

// 重複解消設定のローカル状態（フットプリント調整を含む統合版）
const groupOverlapSettings = ref({
    enabled: false,
    mode: 'global' as 'global' | 'individual'
})

// フットプリント調整設定のローカル状態（重複解消機能と統合）
const footprintSettings = ref({
    enableControlPointCheck: true // デフォルトtrue（既存の重複解消機能と連動）
})

// 一時的に既存のpoints配列をCurveGroupに変換
const curveGroups = computed(() => {
    // 制御点にグループ設定を注入
    const pointsWithGroupSettings = controlPointsStore.points.map(point => ({
        ...point,
        groupOverlapResolution: groupOverlapSettings.value
    }))
    
    return [{
        id: 'default',
        name: 'カーブ 1',
        points: pointsWithGroupSettings,
        visible: true,
        color: '#3b82f6',
        overlapResolution: groupOverlapSettings.value
    }]
})

// グループ選択
const selectGroup = (groupId: string) => {
    selectedGroupId.value = groupId
}

// 制御点を選択
const selectPoint = (groupId: string, pointIndex: number) => {
    selectedPoint.value = pointIndex
    selectedPointId.value = `${groupId}-${pointIndex}`
    emit('pointSelected', pointIndex)
}

// グループ削除（暫定的に無効化）
const removeGroup = (groupId: string) => {
    // 今は1つのグループのみなので削除しない
    console.log('Group removal not implemented yet')
}

// 制御点削除
const removePoint = (groupId: string, pointIndex: number) => {
    controlPointsStore.removePoint(pointIndex)
    updateCurve()
}

// グループ表示切り替え（暫定的に無効化）
const toggleGroupVisibility = (groupId: string) => {
    // 今は表示切り替えは実装しない
    console.log('Group visibility toggle not implemented yet')
}

const updateCurve = () => {
    emit('updateCurve')
}

// フットプリント設定変更ハンドラー
const handleFootprintSettingsChanged = () => {
    // 既存の重複解消機能に統合
    groupOverlapSettings.value.enabled = footprintSettings.value.enableControlPointCheck
    emit('overlapResolutionChanged', groupOverlapSettings.value)
    updateCurve()
}

// 重複解消制御ハンドラー（方向オーバーラップ + フットプリント超過を統合処理）
const handleToggleGroupOverlapResolution = (groupId: string) => {
    groupOverlapSettings.value.enabled = !groupOverlapSettings.value.enabled
    // フットプリント設定も同期
    footprintSettings.value.enableControlPointCheck = groupOverlapSettings.value.enabled
    emit('overlapResolutionChanged', groupOverlapSettings.value)
    updateCurve()
}

const handleTogglePointOverlapResolution = (groupId: string, pointIndex: number) => {
    // 個別制御点の重複解消設定を切り替え
    const point = controlPointsStore.points[pointIndex]
    if (point) {
        if (!point.overlapResolution) {
            point.overlapResolution = { enabled: true, mode: 'individual' }
        } else {
            point.overlapResolution.enabled = !point.overlapResolution.enabled
        }
        updateCurve()
    }
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

const updatePointRadius = (groupId: string, pointIndex: number, value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (!isNaN(numValue)) {
        controlPointsStore.updatePoint(pointIndex, { radius: numValue })
        updateCurve()
    }
}

const updatePointSpiralFactor = (groupId: string, pointIndex: number, value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (!isNaN(numValue)) {
        controlPointsStore.updatePoint(pointIndex, { spiralFactor: numValue })
        updateCurve()
    }
}

const updatePointSpiralMode = (index: number, event: Event) => {
    const target = event.target as HTMLSelectElement
    const value = target.value as 'auto' | 'manual'
    controlPointsStore.updatePoint(index, { spiralMode: value })
    updateCurve()
}

// 新しい階層的インターフェース用のupdatePoint関数
const updatePoint = (groupId: string, pointIndex: number, updates: any) => {
    // 暫定的な実装: 最初のグループのポイントを更新
    controlPointsStore.updatePoint(pointIndex, updates)
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
    logger.debug('Expand point:', index)
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

/* プロパティ説明文のスタイル */
.property-description {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    margin-top: var(--spacing-xs);
    padding-left: var(--spacing-sm);
    line-height: 1.4;
    font-style: italic;
}
</style>
