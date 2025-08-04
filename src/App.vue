<template>
  <div id="app">
    <div class="header">
      <h1>線形設計ツール</h1>
      <p>制御点をドラッグして線の形状を調整できます</p>
    </div>

    <div class="container">
      <div class="sidebar">
        <!-- 表示オプション -->
        <DisplayOptionsPanel @updateCanvas="updateCanvas" />

        <!-- 背景画像 -->
        <BackgroundImagePanel @updateCanvas="updateCanvas" />

        <!-- 制御点設定 -->
        <ControlPointsPanel @updateCurve="updateCurve" @pointSelected="handlePointSelected" />
      </div>

      <!-- キャンバスエリア -->
      <CanvasArea 
        :selectedPoint="selectedPoint" 
        @pointSelected="handlePointSelected"
        @curveUpdated="handleCurveUpdated"
        @error="handleError"
        ref="canvasArea" />
    </div>
    
    <!-- エラーハンドリング -->
    <ErrorToast ref="errorToast" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { 
  useControlPointsStore, 
  useCanvasStore, 
  useUIStore, 
  useBackgroundStore 
} from '@/stores'

// コンポーネントのインポート
import DisplayOptionsPanel from '@/components/DisplayOptionsPanel.vue'
import BackgroundImagePanel from '@/components/BackgroundImagePanel.vue'
import ControlPointsPanel from '@/components/ControlPointsPanel.vue'
import CanvasArea from '@/components/CanvasArea.vue'
import ErrorToast from '@/components/ErrorToast.vue'

// ストアの初期化
const controlPointsStore = useControlPointsStore()
const canvasStore = useCanvasStore()
const uiStore = useUIStore()
const backgroundStore = useBackgroundStore()

// ローカル状態（まだストアに移行していないもの）
const selectedPoint = ref(-1)
const canvasArea = ref<InstanceType<typeof CanvasArea> | null>(null)
const errorToast = ref<InstanceType<typeof ErrorToast> | null>(null)

// 制御点を選択
const selectPoint = (index: number) => {
  selectedPoint.value = index
}

// 制御点選択イベントハンドラー
const handlePointSelected = (index: number) => {
  selectPoint(index)
}

// 曲線更新イベントハンドラー
const handleCurveUpdated = () => {
  // 必要に応じて追加の処理を行う
}

// エラーハンドラー
const handleError = (error: string | Error) => {
  const message = typeof error === 'string' ? error : error.message
  errorToast.value?.showError(message)
}

// キャンバスエリアからの更新要求
const updateCanvas = () => {
  if (canvasArea.value) {
    canvasArea.value.updateCanvas()
  }
}

const updateCurve = () => {
  if (canvasArea.value) {
    canvasArea.value.updateCurve()
  }
}
</script>

<style>
/* グローバルリセットと基本設定 */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden; /* ページ全体のスクロールを完全に無効化 */
}

/* デザインシステム - CSS変数定義（グローバル） */
:root {
  /* カラーパレット - ライトモード */
  --color-bg-primary: #fafafa;
  --color-bg-secondary: #ffffff;
  --color-bg-tertiary: #f8f9fa;
  --color-bg-quaternary: #f3f4f6;
  --color-bg-accent: #f9fafb;
  
  --color-border-primary: #e5e7eb;
  --color-border-secondary: #d1d5db;
  --color-border-tertiary: #dee2e6;
  
  --color-text-primary: #333333;
  --color-text-secondary: #374151;
  --color-text-tertiary: #6b7280;
  --color-text-quaternary: #495057;
  --color-text-muted: #6c757d;
  
  --color-surface-hover: #e5e7eb;
  --color-surface-active: #e9ecef;
  
  /* UI コンポーネント用カラー */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-secondary: #6b7280;
  --color-secondary-hover: #4b5563;
  --color-success: #10b981;
  --color-success-hover: #059669;
  --color-danger: #ef4444;
  --color-danger-hover: #dc2626;
  --color-focus: #3b82f6;
  
  /* スペーシング */
  --spacing-xs: 2px;
  --spacing-sm: 4px;
  --spacing-md: 6px;
  --spacing-lg: 8px;
  --spacing-xl: 10px;
  --spacing-2xl: 12px;
  
  /* ボーダー */
  --border-radius-sm: 3px;
  --border-radius-md: 4px;
  --border-width: 1px;
  
  /* シャドウ */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 1px 3px rgba(0, 0, 0, 0.1);
  
  /* z-index */
  --z-sticky-header: 100;
  --z-panel-1: 103;
  --z-panel-2: 102;
  --z-panel-3: 101;
  
  /* フォント */
  --font-size-xs: 10px;
  --font-size-sm: 12px;
  --font-size-md: 13px;
  --font-weight-normal: 400;
  --font-weight-semibold: 600;
  
  /* トランジション */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s ease;
}

/* 将来のダークモード用（現在は未使用）
.dark {
  --color-bg-primary: #1a1a1a;
  --color-bg-secondary: #2a2a2a;
  --color-bg-tertiary: #333333;
  --color-bg-quaternary: #404040;
  --color-bg-accent: #383838;
  
  --color-border-primary: #4a4a4a;
  --color-border-secondary: #555555;
  --color-border-tertiary: #606060;
  
  --color-text-primary: #ffffff;
  --color-text-secondary: #e5e7eb;
  --color-text-tertiary: #9ca3af;
  --color-text-quaternary: #d1d5db;
  --color-text-muted: #6b7280;
  
  --color-surface-hover: #404040;
  --color-surface-active: #4a4a4a;
}
*/
</style>

<style scoped>
#app {
  font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic Medium", "Meiryo", "MS Gothic", sans-serif;
  background-color: var(--color-bg-primary);
  min-height: 100vh;
  color: var(--color-text-primary);
  overflow: hidden; /* ページ全体のスクロールを防ぐ */
  position: fixed; /* ページの固定 */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.header {
  background: var(--color-bg-secondary);
  border-bottom: var(--border-width) solid var(--color-border-primary);
  padding: var(--spacing-xl) var(--spacing-lg);
  text-align: center;
}

.header h1 {
  margin: 0 0 var(--spacing-sm);
  font-size: 18px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}

.header p {
  margin: 0;
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.container {
  display: flex;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  max-width: 1600px;
  margin: 0 auto;
  height: calc(100vh - 90px); /* ヘッダー分を正確に計算 */
  overflow: hidden;
}

.sidebar {
  width: 300px;
  min-width: 200px;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  overflow-y: auto; /* サイドバー全体のスクロールを有効化 */
  height: 100%; /* max-heightからheightに変更 */
  scrollbar-gutter: stable;
  padding: var(--spacing-sm);
  box-sizing: border-box;
  background: var(--color-bg-tertiary);
  border-right: var(--border-width) solid var(--color-border-tertiary);
  resize: horizontal;
  position: relative;
}

/* サイドバーのスクロールバーを常に表示 */
.sidebar::-webkit-scrollbar {
  width: 8px;
}

.sidebar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.sidebar::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
  min-height: 20px; /* 最小サイズを設定 */
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: #bbb;
}

/* Firefox用のスクロールバー設定とWebKit追加設定 */
.sidebar {
  scrollbar-width: thin;
  scrollbar-color: #ccc #f1f1f1;
}

/* スクロールバーを強制的に常に表示 */
.sidebar::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
  min-height: 20px; /* 最小サイズを設定 */
  /* 常に表示されるように透明度を調整 */
  opacity: 1;
}

.sidebar::-webkit-scrollbar-thumb:window-inactive {
  background: #ccc; /* 非アクティブ時も表示 */
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* メインコンテンツ領域でのスクロールを制御 */
  min-height: 0; /* フレックスコンテナの高さ問題を回避 */
}

/* 新しいサイドバーセクションスタイル */
.sidebar-section {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 8px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.section-header {
  background: #f8f9fa;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
  transition: background-color 0.2s ease;
}

.section-header:hover {
  background: #e9ecef;
}

.section-title {
  font-weight: 600;
  font-size: 13px;
  color: #495057;
}

.section-toggle {
  font-size: 12px;
  color: #6c757d;
  font-weight: bold;
}

.section-content {
  padding: 12px;
  background: #fff;
}

/* モダンなパネルスタイル（Blenderライクだがライトモード） */
.blender-panel {
  background: var(--color-bg-secondary);
  border: var(--border-width) solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--border-width);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0; /* サイズを維持 */
}

/* 制御点設定パネルもflexサイズを固定 */
.blender-panel:nth-child(3) {
  flex-shrink: 0;
}

.blender-panel:nth-child(1) .panel-header {
  z-index: var(--z-panel-1);
}

.blender-panel:nth-child(2) .panel-header {
  z-index: var(--z-panel-2);
}

.blender-panel:nth-child(3) .panel-header {
  z-index: var(--z-panel-3);
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
  z-index: var(--z-sticky-header);
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

.prop-select {
  background: var(--color-bg-secondary);
  border: var(--border-width) solid var(--color-border-secondary);
  border-radius: var(--border-radius-sm);
  color: var(--color-text-secondary);
  padding: 3px var(--spacing-md);
  font-size: 11px;
  width: 100px;
}

.prop-checkbox {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--color-primary);
}

.prop-slider {
  flex: 1;
  height: 16px;
  background: var(--color-bg-quaternary);
  border-radius: var(--border-radius-sm);
  accent-color: var(--color-primary);
}

.prop-unit {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  min-width: 20px;
  text-align: right;
}

.prop-value {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  min-width: 30px;
  text-align: right;
}

/* Blenderスタイルのボタン（ライトモード） */
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

/* 制御点リストBlenderスタイル（ライトモード） */
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

.point-item-blender.disabled {
  opacity: 0.6;
  background: #f8f9fa;
  cursor: default;
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

.point-details {
  padding: 8px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

/* ファイルアップロード */
.file-input {
  font-size: 10px;
  padding: 4px;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  background: #ffffff;
  flex: 1;
}

/* キャンバス関連 */
.canvas-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f9f9f9;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
}

/* オーバーレイコントロール */
.canvas-overlay-controls {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 5px;
  z-index: 100;
}

.overlay-btn {
  padding: 5px 10px;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #ddd;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.overlay-btn:hover {
  background: rgba(255, 255, 255, 1);
  border-color: #bbb;
}

/* 凡例オーバーレイ */
.legend-overlay {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0;
  font-size: 11px;
  max-width: 200px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 100;
  overflow: hidden;
}

.legend-header {
  background: #f8f9fa;
  padding: 8px 10px;
  border-bottom: 1px solid #e9ecef;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
}

.legend-header:hover {
  background: #e9ecef;
}

.legend-title-main {
  font-weight: 600;
  color: #495057;
}

.legend-toggle {
  font-size: 10px;
  color: #6c757d;
}

.legend-content {
  padding: 8px;
}

.legend-section {
  margin-bottom: 8px;
}

.legend-section:last-child {
  margin-bottom: 0;
}

.legend-title {
  font-weight: 600;
  color: #495057;
  margin-bottom: 4px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.legend-operation {
  font-size: 9px;
  color: #6c757d;
  line-height: 1.3;
}

.legend-operation div {
  margin-bottom: 1px;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  color: #6c757d;
}

.legend-color {
  width: 12px;
  height: 2px;
  border-radius: 1px;
}

.legend-point {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

/* デバッグ用 */
.debug-info {
  opacity: 0.7;
  font-style: italic;
}

.debug-values {
  font-size: 9px;
  color: #6c757d;
  line-height: 1.2;
}

.disabled {
  opacity: 0.5;
}

.disabled input {
  cursor: not-allowed;
}

/* レスポンシブ調整 */
@media (max-width: 768px) {
  .container {
    flex-direction: column;
    height: auto;
  }
  
  .sidebar {
    width: 100%;
    max-width: none;
    height: auto;
    max-height: 300px;
    resize: none;
  }
  
  .canvas-wrapper {
    height: 400px;
  }
}
</style>
