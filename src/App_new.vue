<template>
  <div id="app">
    <div class="header">
      <h1>線形設計ツール</h1>
      <p>制御点をドラッグして線の形状を調整できます</p>
    </div>

    <div class="container">
      <div class="sidebar">
        <!-- 表示オプション -->
        <div class="blender-panel">
          <div class="panel-header" @click="sidebarExpanded.display = !sidebarExpanded.display">
            <div class="panel-icon">{{ sidebarExpanded.display ? '▼' : '▶' }}</div>
            <div class="panel-title">表示オプション</div>
          </div>
          <div v-show="sidebarExpanded.display" class="panel-content">
            <div class="property-group">
              <div class="property-row">
                <label class="prop-label">
                  <input type="checkbox" :checked="showGrid" @change="canvasStore.toggleShowGrid(); updateCanvas()" class="prop-checkbox">
                  <span class="prop-name">グリッド表示</span>
                </label>
              </div>
              <div class="property-row">
                <label class="prop-label">
                  <input type="checkbox" :checked="lineOnlyMode" @change="canvasStore.toggleLineOnlyMode(); updateCanvas()" class="prop-checkbox">
                  <span class="prop-name">線のみ表示</span>
                </label>
              </div>
              <div class="property-row">
                <label class="prop-label">
                  <input type="checkbox" :checked="fillInsideMode" @change="canvasStore.toggleFillInsideMode(); updateCanvas()" class="prop-checkbox">
                  <span class="prop-name">曲線内塗りつぶし</span>
                </label>
              </div>
              <div class="property-row">
                <label class="prop-label">
                  <input type="checkbox" :checked="showConnectionLines" @change="canvasStore.toggleShowConnectionLines(); updateCanvas()" :disabled="lineOnlyMode" class="prop-checkbox">
                  <span class="prop-name">制御点間点線</span>
                </label>
              </div>
              <div class="property-row">
                <label class="prop-label">
                  <input type="checkbox" :checked="debugMode" @change="canvasStore.toggleDebugMode(); updateCanvas()" class="prop-checkbox">
                  <span class="prop-name">デバッグモード</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 背景画像 -->
        <div class="blender-panel">
          <div class="panel-header" @click="sidebarExpanded.background = !sidebarExpanded.background">
            <div class="panel-icon">{{ sidebarExpanded.background ? '▼' : '▶' }}</div>
            <div class="panel-title">背景画像</div>
          </div>
          <div v-show="sidebarExpanded.background" class="panel-content">
            <div class="property-group">
              <div class="property-row">
                <input type="file" ref="imageInput" @change="handleImageLoad" accept="image/*" class="file-input">
                <button v-if="backgroundImage" @click="clearImage" class="btn-small btn-danger">削除</button>
              </div>
              
              <div v-if="backgroundImage" class="property-row">
                <label class="prop-label">
                  <input type="checkbox" :checked="showBackgroundImage" @change="backgroundStore.toggleShowBackgroundImage(); updateCanvas()" class="prop-checkbox">
                  <span class="prop-name">画像を表示</span>
                </label>
              </div>
              
              <div v-if="backgroundImage" class="property-subgroup">
                <div class="subgroup-title">位置・変形</div>
                <div class="property-row">
                  <label class="prop-name">X座標</label>
                  <input type="number" v-model.number="imageSettings.x" @input="updateCanvas" class="prop-input" step="10">
                  <span class="prop-unit">px</span>
                </div>
                
                <div class="property-row">
                  <label class="prop-name">Y座標</label>
                  <input type="number" v-model.number="imageSettings.y" @input="updateCanvas" class="prop-input" step="10">
                  <span class="prop-unit">px</span>
                </div>
                
                <div class="property-row">
                  <label class="prop-name">スケール</label>
                  <input type="number" v-model.number="imageSettings.scale" @input="updateCanvas" class="prop-input" min="0.1" max="5" step="0.1">
                  <span class="prop-unit">×</span>
                </div>
                
                <div class="property-row">
                  <label class="prop-name">透過度</label>
                  <input type="range" v-model.number="imageSettings.opacity" @input="updateCanvas" class="prop-slider" min="0" max="1" step="0.1">
                  <span class="prop-value">{{ Math.round(imageSettings.opacity * 100) }}%</span>
                </div>
                
                <div class="property-row">
                  <label class="prop-label">
                    <input type="checkbox" :checked="imageSettings.flipX" @change="imageSettings.flipX = !imageSettings.flipX; updateCanvas()" class="prop-checkbox">
                    <span class="prop-name">水平反転</span>
                  </label>
                </div>
                
                <div class="property-row">
                  <label class="prop-label">
                    <input type="checkbox" :checked="imageSettings.flipY" @change="imageSettings.flipY = !imageSettings.flipY; updateCanvas()" class="prop-checkbox">
                    <span class="prop-name">垂直反転</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 制御点設定 -->
        <div class="blender-panel">
          <div class="panel-header" @click="sidebarExpanded.controls = !sidebarExpanded.controls">
            <div class="panel-icon">{{ sidebarExpanded.controls ? '▼' : '▶' }}</div>
            <div class="panel-title">制御点設定</div>
          </div>
          <div v-show="sidebarExpanded.controls" class="panel-content">
            <div class="property-group">
              <div class="property-row">
                <label class="prop-label">
                  <input type="checkbox" :checked="isLoopMode" @change="controlPointsStore.toggleLoopMode(); updateCurve()" class="prop-checkbox">
                  <span class="prop-name">ループモード</span>
                </label>
              </div>
              
              <!-- アクションボタン -->
              <div class="property-subgroup">
                <div class="subgroup-title">操作</div>
                <div class="button-row">
                  <button @click="addPoint" class="btn-small btn-primary">追加</button>
                  <button @click="resetPoints" class="btn-small btn-secondary">リセット</button>
                </div>
                <div class="button-row">
                  <button @click="applyDefaultToAllSimple" class="btn-small btn-success">デフォルト適用</button>
                  <button @click="toggleDefaultSettings" class="btn-small btn-outline">
                    {{ showDefaultSettings ? '設定▲' : '設定▼' }}
                  </button>
                </div>
              </div>
              
              <!-- デフォルト設定 -->
              <div v-if="showDefaultSettings" class="property-subgroup">
                <div class="subgroup-title">デフォルト値</div>
                <div class="property-row">
                  <label class="prop-name">半径</label>
                  <input type="number" v-model.number="defaultRadius" min="10" max="500" step="5" class="prop-input">
                  <span class="prop-unit">m</span>
                </div>

                <div class="property-row">
                  <label class="prop-name">スパイラル係数</label>
                  <input type="number" v-model.number="defaultSpiralFactor" min="0.2" step="0.1" class="prop-input">
                  <span class="prop-unit">×</span>
                </div>
              </div>
            </div>
            
            <!-- 制御点リスト -->
            <div class="property-subgroup">
              <div class="subgroup-title">制御点 ({{ points.length }}個)</div>
              <div class="point-list-blender">
                <div v-for="(point, index) in points" :key="index" class="point-item-blender"
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
                    <button v-if="canRemovePoint(index)" 
                      @click.stop="removePoint(index)" class="btn-tiny btn-danger">×</button>
                  </div>

                  <!-- 重要パラメータの常時表示 -->
                  <div v-if="index > 0 && index < points.length - 1" class="point-summary">
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
      </div>

      <div class="main-content">
        <div class="canvas-wrapper">
          <!-- ズーム・位置リセットボタンをオーバーレイで配置 -->
          <div class="canvas-overlay-controls">
            <button @click="resetZoom" class="overlay-btn">ズームリセット</button>
            <button @click="resetPan" class="overlay-btn">位置リセット</button>
          </div>

          <!-- 凡例をキャンバス右上に配置（折りたたみ可能） -->
          <div class="legend-overlay" v-if="!lineOnlyMode">
            <div class="legend-header" @click="showLegend = !showLegend">
              <span class="legend-title-main">操作ガイド</span>
              <span class="legend-toggle">{{ showLegend ? '▲' : '▼' }}</span>
            </div>
            <div v-if="showLegend" class="legend-content">
              <div class="legend-section">
                <div class="legend-title">操作方法</div>
                <div class="legend-operation">
                  <div>• 制御点をドラッグして移動</div>
                  <div>• 線上にマウスでプレビュー表示</div>
                  <div>• ダブルクリックで制御点挿入</div>
                  <div>• Shift+ドラッグでパン</div>
                  <div>• マウスホイールでズーム</div>
                </div>
              </div>
              <div class="legend-section" v-if="!lineOnlyMode">
                <div class="legend-title">線種</div>
                <div class="legend-items">
                  <div class="legend-item">
                    <div class="legend-color" style="background-color: #5a9fd4;"></div>
                    <span>直線部</span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-color" style="background-color: #e53e3e;"></div>
                    <span>スパイラル部</span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-color" style="background-color: #f7931e;"></div>
                    <span>円弧部</span>
                  </div>
                </div>
              </div>
              <div class="legend-section" v-if="!lineOnlyMode">
                <div class="legend-title">制御点</div>
                <div class="legend-items">
                  <div class="legend-item">
                    <div class="legend-point" style="background-color: #e53e3e;"></div>
                    <span>TS, ST</span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-point" style="background-color: #f7931e;"></div>
                    <span>SC, CS</span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-point" style="background-color: #9c27b0;"></div>
                    <span>円弧中心</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <canvas ref="canvas" @mousedown="handleMouseDown" @mousemove="handleMouseMove" @mouseup="handleMouseUp"
            @mouseleave="handleMouseLeave" @dblclick="handleDoubleClick" @wheel="handleWheel"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { 
  useControlPointsStore, 
  useCanvasStore, 
  useUIStore, 
  useBackgroundStore 
} from '@/stores'
import type { ControlPoint } from '@/types'

// Utils imports
import { generateClothoidCurve } from './utils/curveGenerator.js'
import { setupCanvasRenderer } from './utils/canvasRenderer.js'

// ストアの初期化
const controlPointsStore = useControlPointsStore()
const canvasStore = useCanvasStore()
const uiStore = useUIStore()
const backgroundStore = useBackgroundStore()

// ストアから状態を取得
const { 
  points, 
  isLoopMode, 
  defaultRadius, 
  defaultSpiralFactor,
  addPoint,
  removePoint,
  updatePoint,
  resetPoints,
  applyDefaultToAllSimple,
  canRemovePoint
} = controlPointsStore

const {
  transform,
  setCanvasElement,
  zoomIn,
  zoomOut,
  resetZoom,
  resetPan,
  pan,
  screenToWorld
} = canvasStore

// リアクティブな状態として個別に取得
const showGrid = computed(() => canvasStore.showGrid)
const lineOnlyMode = computed(() => canvasStore.lineOnlyMode)
const fillInsideMode = computed(() => canvasStore.fillInsideMode)
const showConnectionLines = computed(() => canvasStore.showConnectionLines)
const debugMode = computed(() => canvasStore.debugMode)

const { sidebarExpanded, showDefaultSettings, toggleDefaultSettings } = uiStore

const {
  backgroundImage,
  showBackgroundImage,
  imageSettings,
  loadImage,
  clearImage
} = backgroundStore

// ローカル状態（まだストアに移行していないもの）
const canvas = ref<HTMLCanvasElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const selectedPoint = ref(-1)
const showLegend = ref(true)

// マウス操作関連
const isDragging = ref(false)
const dragPointIndex = ref(-1)
const dragOffset = ref({ x: 0, y: 0 })
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })

// プレビュー点の状態管理
const previewPoint = ref<{x: number, y: number, segmentIndex: number} | null>(null)
const currentMousePos = ref({ x: 0, y: 0 })

// レンダラー関連
let renderer: any = null
let currentCurveData: any = null
let overlapResults: any = null

// 制御点を選択
const selectPoint = (index: number) => {
  selectedPoint.value = index
}

// キャンバスのサイズを動的に設定
const setCanvasSize = () => {
  if (!canvas.value) return
  const rect = canvas.value.getBoundingClientRect()
  canvas.value.width = rect.width
  canvas.value.height = rect.height
}

// キャンバスのみ再描画（曲線計算なし）
const updateCanvas = () => {
  if (!renderer || !currentCurveData) return

  const clothoidData = currentCurveData.clothoidData || null
  renderer.render(currentCurveData.curve, {
    showGrid,
    clothoidData,
    lineOnlyMode,
    fillInsideMode,
    previewPoint: previewPoint.value,
    showConnectionLines: showConnectionLines && !lineOnlyMode,
    showAngles: !lineOnlyMode,
    showRadiusLines: !lineOnlyMode,
    isLoopMode,
    debugMode,
    overlapResults: overlapResults,
    backgroundImage: backgroundImage && showBackgroundImage ? backgroundImage : null,
    imageSettings
  })
}

// 曲線を再計算・再描画
const updateCurve = () => {
  if (!renderer) return

  renderer.points = points

  let result
  if (points.length >= 3) {
    const speed = 60
    result = generateClothoidCurve(points, speed, isLoopMode, defaultSpiralFactor)
  } else {
    result = {
      data: {
        curve: points,
        clothoidData: { segments: [] }
      },
      debug: '制御点が3点未満のため直線として処理'
    }
  }

  if (result.error) {
    renderer.render([], {
      showGrid,
      clothoidData: null,
      lineOnlyMode,
      fillInsideMode: false,
      previewPoint: null,
      showConnectionLines: showConnectionLines && !lineOnlyMode,
      showAngles: !lineOnlyMode,
      showRadiusLines: !lineOnlyMode,
      isLoopMode,
      debugMode,
      overlapResults: null,
      backgroundImage: backgroundImage && showBackgroundImage ? backgroundImage : null,
      imageSettings
    })

    if (canvas.value) {
      const ctx = canvas.value.getContext('2d')
      if (ctx) {
        ctx.save()
        ctx.resetTransform()
        ctx.fillStyle = 'rgba(220, 38, 38, 0.9)'
        ctx.fillRect(10, 10, 300, 30)
        ctx.fillStyle = '#fff'
        ctx.font = '14px sans-serif'
        ctx.fillText(result.error, 15, 30)
        ctx.restore()
      }
    }
    return
  }

  const curveData = result.data || result
  currentCurveData = curveData

  if (debugMode && curveData.clothoidData) {
    // オーバーラップ検出のロジックは必要に応じて後で追加
    overlapResults = null
  } else {
    overlapResults = null
  }

  const clothoidData = curveData.clothoidData || null
  renderer.render(curveData.curve, {
    showGrid,
    clothoidData,
    lineOnlyMode,
    fillInsideMode,
    previewPoint: previewPoint.value,
    showConnectionLines: showConnectionLines && !lineOnlyMode,
    showAngles: !lineOnlyMode,
    showRadiusLines: !lineOnlyMode,
    isLoopMode,
    debugMode,
    overlapResults: overlapResults,
    backgroundImage: backgroundImage && showBackgroundImage ? backgroundImage : null,
    imageSettings
  })
}

// 画像ファイルの読み込み処理
const handleImageLoad = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (backgroundImage) {
    if (!confirm('現在の画像を新しい画像に変更してもよろしいですか？')) {
      target.value = ''
      return
    }
  }

  try {
    await loadImage(file)
    updateCanvas()
  } catch (error) {
    console.error('画像読み込みエラー:', error)
    alert('画像の読み込みに失敗しました')
  }
}

// キャンバスの変換を更新
const updateCanvasTransform = () => {
  if (!renderer) return
  renderer.setTransform(transform.zoom, transform.panX, transform.panY)
  updateCanvas()
}

// マウス座標をキャンバス座標に変換（ズーム・パンを考慮）
const getCanvasCoords = (event: MouseEvent) => {
  if (!canvas.value) return { x: 0, y: 0 }
  const rect = canvas.value.getBoundingClientRect()
  const x = (event.clientX - rect.left - transform.panX) / transform.zoom
  const y = (event.clientY - rect.top - transform.panY) / transform.zoom
  return { x, y }
}

// 点がクリックされたかチェック
const getClickedPoint = (mouseX: number, mouseY: number): number => {
  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    const distance = Math.sqrt((mouseX - point.x) ** 2 + (mouseY - point.y) ** 2)
    if (distance <= 15) {
      return i
    }
  }
  return -1
}

// マウスイベントハンドラー
const handleMouseDown = (event: MouseEvent) => {
  const coords = getCanvasCoords(event)

  if (event.shiftKey) {
    isPanning.value = true
    panStart.value = {
      x: event.clientX - transform.panX,
      y: event.clientY - transform.panY
    }
    if (canvas.value) canvas.value.style.cursor = 'grabbing'
    return
  }

  const pointIndex = getClickedPoint(coords.x, coords.y)

  if (pointIndex !== -1) {
    isDragging.value = true
    dragPointIndex.value = pointIndex
    selectedPoint.value = pointIndex
    dragOffset.value = {
      x: coords.x - points[pointIndex].x,
      y: coords.y - points[pointIndex].y
    }
    
    document.addEventListener('mousemove', handleDocumentMouseMove)
    document.addEventListener('mouseup', handleDocumentMouseUp)
  }
}

const handleDocumentMouseMove = (event: MouseEvent) => {
  if (isDragging.value && canvas.value) {
    const rect = canvas.value.getBoundingClientRect()
    const canvasX = (event.clientX - rect.left - transform.panX) / transform.zoom
    const canvasY = (event.clientY - rect.top - transform.panY) / transform.zoom
    
    const newX = canvasX - dragOffset.value.x
    const newY = canvasY - dragOffset.value.y

    updatePoint(dragPointIndex.value, { x: newX, y: newY })
    updateCurve()
  }
}

const handleDocumentMouseUp = () => {
  if (isDragging.value) {
    isDragging.value = false
    dragPointIndex.value = -1
    if (canvas.value) canvas.value.style.cursor = 'crosshair'
    
    document.removeEventListener('mousemove', handleDocumentMouseMove)
    document.removeEventListener('mouseup', handleDocumentMouseUp)
  }
}

const handleMouseMove = (event: MouseEvent) => {
  const coords = getCanvasCoords(event)
  currentMousePos.value = coords

  if (isPanning.value) {
    const newPanX = event.clientX - panStart.value.x
    const newPanY = event.clientY - panStart.value.y
    pan(newPanX - transform.panX, newPanY - transform.panY)
    updateCanvasTransform()
    return
  }

  if (isDragging.value) return

  if (event.shiftKey) {
    if (canvas.value) canvas.value.style.cursor = 'grab'
    previewPoint.value = null
  } else {
    const pointIndex = getClickedPoint(coords.x, coords.y)

    if (pointIndex !== -1) {
      if (canvas.value) canvas.value.style.cursor = 'pointer'
      if (previewPoint.value) {
        previewPoint.value = null
        nextTick(() => updateCanvas())
      }
    } else {
      if (canvas.value) canvas.value.style.cursor = 'crosshair'
      if (previewPoint.value) {
        previewPoint.value = null
        nextTick(() => updateCanvas())
      }
    }
  }
}

const handleMouseUp = () => {
  isDragging.value = false
  dragPointIndex.value = -1
  isPanning.value = false
  if (canvas.value) canvas.value.style.cursor = 'crosshair'
}

const handleMouseLeave = () => {
  if (previewPoint.value) {
    previewPoint.value = null
    nextTick(() => updateCanvas())
  }
  handleMouseUp()
}

const handleDoubleClick = (event: MouseEvent) => {
  const coords = getCanvasCoords(event)
  const pointIndex = getClickedPoint(coords.x, coords.y)

  if (pointIndex === -1) {
    // 新しい制御点を追加（簡易版）
    const newPoint: ControlPoint = {
      x: coords.x,
      y: coords.y,
      radius: defaultRadius,
      spiralFactor: defaultSpiralFactor
    }
    points.push(newPoint)
    updateCurve()
  }
}

const handleWheel = (event: WheelEvent) => {
  event.preventDefault()

  if (!canvas.value) return
  const rect = canvas.value.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top

  const worldCoords = screenToWorld(mouseX, mouseY)

  const delta = event.deltaY > 0 ? -0.1 : 0.1
  const zoomFactor = 1 + Math.abs(delta)
  const newZoom = delta > 0 ? 
    transform.zoom * zoomFactor : 
    Math.max(0.01, transform.zoom / zoomFactor)

  const newScreenCoords = {
    x: worldCoords.x * newZoom + canvasStore.canvasCenter.x,
    y: worldCoords.y * newZoom + canvasStore.canvasCenter.y
  }

  transform.zoom = newZoom
  transform.panX = mouseX - newScreenCoords.x
  transform.panY = mouseY - newScreenCoords.y

  updateCanvasTransform()
}

// コンポーネントマウント時の処理
onMounted(() => {
  setCanvasSize()

  window.addEventListener('resize', () => {
    setCanvasSize()
    updateCurve()
  })

  if (canvas.value) {
    setCanvasElement(canvas.value)
    renderer = setupCanvasRenderer(canvas.value, points)
    updateCanvasTransform()
    updateCurve()
  }

  document.body.style.overflow = 'hidden'
})

// アンマウント時にスクロール復元とイベントリスナークリーンアップ
onUnmounted(() => {
  document.body.style.overflow = 'auto'
  document.removeEventListener('mousemove', handleDocumentMouseMove)
  document.removeEventListener('mouseup', handleDocumentMouseUp)
})
</script>

<style>
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
  overflow: hidden;
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
  height: calc(100vh - 60px); /* ヘッダー分を考慮した高さ */
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
