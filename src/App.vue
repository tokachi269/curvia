<template>
  <!-- フォントローディング画面 -->
  <div v-if="!fontsLoaded" class="loading-screen">
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <p>読み込み中...</p>
    </div>
  </div>

  <!-- メインアプリ -->
  <div v-else id="app" class="app-fade-in">
    <div class="header">
      <h1>線形設計ツール</h1>
      <p>制御点をドラッグして線形を調整できます</p>
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
import { ref, onMounted } from 'vue'
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
import { logger } from '@/utils/logger.js'

// フォント読み込み状態
const fontsLoaded = ref(false)

// フォント読み込み処理
const loadFonts = async () => {
  try {
    // フォントがキャッシュされているかチェック
    const yuseiFontFace = [...document.fonts].find(font => 
      font.family === 'Yusei Magic'
    )
    
    if (yuseiFontFace && yuseiFontFace.status === 'loaded') {
      // キャッシュ済みの場合は即座に表示
      fontsLoaded.value = true
      return
    }

    // document.fontsが利用可能な場合
    if ('fonts' in document) {
      await document.fonts.load('400 12px "Yusei Magic"')
      await document.fonts.ready
    } else {
      // フォールバック：少し待機
      await new Promise(resolve => setTimeout(resolve, 800))
    }
    
    // 初回読み込み時のみ少し待機
    setTimeout(() => {
      fontsLoaded.value = true
    }, 200)
  } catch (error) {
    logger.curve.warn('フォント読み込み失敗、アプリを表示します:', error)
    setTimeout(() => {
      fontsLoaded.value = true
    }, 200)
  }
}

// マウント時にフォント読み込み開始
onMounted(() => {
  loadFonts()
})

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
  /* Background Colors - 階層表現のための3色 */
  --color-bg-primary: #ffffff;      /* メイン背景（カード、パネルヘッダー） */
  --color-bg-secondary: #f8fafc;    /* サイドバー背景 - 明るいグレー */
  --color-bg-tertiary: #f1f5f9;     /* 設定項目背景（適度な階層感） */
  
  --color-border-primary: #e2e8f0;      /* 薄いボーダー */
  --color-border-secondary: #cbd5e1;    /* 中間ボーダー */
  --color-border-tertiary: #94a3b8;     /* 濃いボーダー */
  
  --color-text-primary: #1e293b;        /* 濃い黒 - 適度なコントラスト */
  --color-text-secondary: #334155;      /* 程よい濃さのグレー */
  --color-text-tertiary: #64748b;       /* 中間グレー - 読みやすい */
  --color-text-quaternary: #334155;     /* セカンダリと同じ */
  --color-text-muted: #94a3b8;          /* 薄いグレー */
  
  --color-surface-hover: #f1f5f9;       /* ホバー - 明るめ */
  --color-surface-active: #e2e8f0;      /* アクティブ - 適度な色 */
  
  /* UI コンポーネント用カラー */
  --color-primary: #3b82f6;             /* 明るいブルー */
  --color-primary-hover: #2563eb;
  --color-secondary: #64748b;           /* 明るめのグレー */
  --color-secondary-hover: #475569;
  --color-success: #10b981;             /* 明るいグリーン */
  --color-success-hover: #059669;
  --color-danger: #ef4444;              /* 明るいレッド */
  --color-danger-hover: #dc2626;
  --color-danger-bg: rgba(239, 68, 68, 0.1);  /* 削除ボタンホバー背景 */
  --color-focus: #3b82f6;
  --color-accent: #3b82f6;               /* アクセントカラー（プライマリと同じ） */
  --color-surface-selected: #dbeafe;     /* 選択状態の背景 */
  
  /* スペーシング */
  --spacing-xxs: 1px;
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
  
  /* シャドウ - 右下方向の自然な影（薄め） */
  --shadow-none: none;
  --shadow-sm: 1px 1px 3px rgba(0, 0, 0, 0.08), 0px 1px 1px rgba(0, 0, 0, 0.05);
  --shadow-md: 2px 2px 6px rgba(0, 0, 0, 0.1), 1px 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-lg: 4px 4px 12px rgba(0, 0, 0, 0.12), 2px 2px 6px rgba(0, 0, 0, 0.1);
  --shadow-xl: 6px 6px 18px rgba(0, 0, 0, 0.14), 3px 3px 9px rgba(0, 0, 0, 0.12);
  
  /* z-index */
  --z-sticky-header: 100;
  --z-panel-1: 103;
  --z-panel-2: 102;
  --z-panel-3: 101;
  
  /* フォント */
  --font-size-xs: 11px;
  --font-size-sm: 13px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --font-weight-normal: 400;
  --font-weight-semibold: 600;
  
  /* 曲線・制御点カラー */
  --color-curve-straight: #5a9fd4;
  --color-curve-spiral: #e53e3e;
  --color-curve-arc: #f7931e;
  --color-point-transition: #e53e3e;
  --color-point-curve: #f7931e;
  --color-point-center: #9c27b0;
  
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
  font-family: "Yusei Magic", "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic Medium", "Meiryo", "MS Gothic", sans-serif;
  background-color: var(--color-bg-secondary);  /* 全体背景はセカンダリに */
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
  background: var(--color-bg-primary);         /* ヘッダーはプライマリ（白） */
  border-bottom: var(--border-width) solid var(--color-border-primary);
  padding: var(--spacing-lg) var(--spacing-md);
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
  max-width: 1600px;
  margin: 0 auto;
  height: calc(100vh - 70px); /* ヘッダー分を調整 */
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
  padding: var(--spacing-md);
  box-sizing: border-box;
  background: var(--color-bg-secondary);        /* サイドバーはセカンダリ */
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
  margin-bottom: 4px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.section-header {
  background: #e9ecef;
  padding: 6px 8px;
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
  background: #dee2e6;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  color: #1a1a1a;
}

.section-toggle {
  font-size: 12px;
  color: #4a5568;
  font-weight: bold;
}

.section-content {
  padding: 8px;
  background: #fff;
}

/* モダンなパネルスタイル */
.panel {
  background: var(--color-bg-primary);  /* パネルは白背景 */
  border: var(--border-width) solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--border-width);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0; /* サイズを維持 */
}

/* 制御点設定パネルもflexサイズを固定 */
.panel:nth-child(3) {
  flex-shrink: 0;
}

.panel:nth-child(1) .panel-header {
  z-index: var(--z-panel-1);
}

.panel:nth-child(2) .panel-header {
  z-index: var(--z-panel-2);
}

.panel:nth-child(3) .panel-header {
  z-index: var(--z-panel-3);
}

/* ファイルアップロード */
.file-input {
  font-size: 13px;
  padding: 2px;
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
  background: var(--color-bg-primary);  /* 白背景 */
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
  padding: 3px 6px;
  font-size: 13px;
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
  font-size: 13px;
  max-width: 200px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 100;
  overflow: hidden;
}

.legend-header {
  background: #e9ecef;
  padding: 6px 8px;
  border-bottom: 1px solid #e9ecef;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
}

.legend-header:hover {
  background: #dee2e6;
}

.legend-title-main {
  font-weight: 600;
  color: #1a1a1a;
}

.legend-toggle {
  font-size: 11px;
  color: #4a5568;
}

.legend-content {
  padding: 6px;
}

.legend-section {
  margin-bottom: 4px;
}

.legend-section:last-child {
  margin-bottom: 0;
}

.legend-title {
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.legend-operation {
  font-size: 11px;
  color: #4a5568;
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
  font-size: 11px;
  color: #4a5568;
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
  font-size: 11px;
  color: #4a5568;
  line-height: 1.2;
}

.disabled {
  opacity: 0.5;
}

/* ローディング画面 */
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: var(--color-bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeOut 0.5s ease-out 0.8s forwards;
}

.loading-content {
  text-align: center;
  color: var(--color-text-primary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border-secondary);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

/* メインアプリのフェードイン */
.app-fade-in {
  animation: fadeIn 0.25s ease-out;
}

@keyframes fadeIn {
  from { 
    opacity: 0;
  }
  to { 
    opacity: 1;
  }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-content p {
  margin: 0;
  font-size: 14px;
  font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic Medium", sans-serif;
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
