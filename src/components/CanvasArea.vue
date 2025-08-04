<template>
  <div class="main-content">
    <div class="canvas-wrapper">
      <!-- ズーム・位置リセットボタンをオーバーレイで配置 -->
      <div class="canvas-overlay-controls">
        <button @click="resetZoom" class="overlay-btn">ズームリセット</button>
        <button @click="resetPan" class="overlay-btn">位置リセット</button>
      </div>

    <!-- 凡例をキャンバス右上に配置（折りたたみ可能） -->
    <div class="legend-overlay" v-if="!canvasStore.lineOnlyMode">
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
        <div class="legend-section" v-if="!canvasStore.lineOnlyMode">
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
        <div class="legend-section" v-if="!canvasStore.lineOnlyMode">
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

    <canvas 
      ref="canvas" 
      @mousedown="handleMouseDown" 
      @mousemove="handleMouseMove" 
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave" 
      @dblclick="handleDoubleClick" 
      @wheel="handleWheel">
    </canvas>
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
import { generateClothoidCurve } from '@/utils/curveGenerator.js'
import { CanvasRenderer } from '@/utils/canvasRenderer.js'

// Props
interface Props {
  selectedPoint: number
}

// Emits
interface Emits {
  (e: 'pointSelected', index: number): void
  (e: 'curveUpdated'): void
  (e: 'error', error: string | Error): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// ストアの初期化
const controlPointsStore = useControlPointsStore()
const canvasStore = useCanvasStore()
const uiStore = useUIStore()
const backgroundStore = useBackgroundStore()

// ストアから状態を取得
const { 
  points, 
  isLoopMode, 
  addPoint,
  removePoint,
  updatePoint,
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

// ローカル状態
const canvas = ref<HTMLCanvasElement | null>(null)
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

// キャンバスサイズを調整
const resizeCanvas = () => {
  if (!canvas.value) return
  const container = canvas.value.parentElement
  if (!container) return
  
  const rect = container.getBoundingClientRect()
  canvas.value.width = rect.width
  canvas.value.height = rect.height
}

// キャンバスのみ再描画（曲線計算なし）
const updateCanvas = () => {
  if (!renderer || !currentCurveData) return

  const clothoidData = currentCurveData.clothoidData || null
  renderer.render(currentCurveData.curve, {
    showGrid: canvasStore.showGrid,
    clothoidData,
    lineOnlyMode: canvasStore.lineOnlyMode,
    fillInsideMode: canvasStore.fillInsideMode,
    previewPoint: previewPoint.value,
    showConnectionLines: canvasStore.showConnectionLines && !canvasStore.lineOnlyMode,
    showAngles: !canvasStore.lineOnlyMode,
    showRadiusLines: !canvasStore.lineOnlyMode,
    isLoopMode: controlPointsStore.isLoopMode,
    debugMode: canvasStore.debugMode,
    overlapResults: overlapResults,
    backgroundImage: backgroundStore.backgroundImage && backgroundStore.showBackgroundImage ? backgroundStore.backgroundImage : null,
    imageSettings: backgroundStore.imageSettings
  })
}

// 曲線を再計算・再描画
const updateCurve = () => {
  if (!renderer) return

  // pointsの値をリアクティブに取得
  const currentPoints = controlPointsStore.points
  
  // レンダラーのpointsプロパティを更新
  renderer.points = currentPoints
  
  if (currentPoints.length < 2) {
    renderer.render([], {
      showGrid: canvasStore.showGrid,
      clothoidData: null,
      lineOnlyMode: canvasStore.lineOnlyMode,
      fillInsideMode: false,
      previewPoint: null,
      showConnectionLines: canvasStore.showConnectionLines && !canvasStore.lineOnlyMode,
      showAngles: !canvasStore.lineOnlyMode,
      showRadiusLines: !canvasStore.lineOnlyMode,
      isLoopMode: controlPointsStore.isLoopMode,
      debugMode: canvasStore.debugMode,
      overlapResults: null,
      backgroundImage: backgroundStore.backgroundImage && backgroundStore.showBackgroundImage ? backgroundStore.backgroundImage : null,
      imageSettings: backgroundStore.imageSettings
    })
    return
  }

  const result = generateClothoidCurve(currentPoints, 60, controlPointsStore.isLoopMode, controlPointsStore.defaultSpiralFactor)

  if (result.error) {
    emit('error', result.error)
    renderer.render([], {
      showGrid: canvasStore.showGrid,
      clothoidData: null,
      lineOnlyMode: canvasStore.lineOnlyMode,
      fillInsideMode: false,
      previewPoint: null,
      showConnectionLines: canvasStore.showConnectionLines && !canvasStore.lineOnlyMode,
      showAngles: !canvasStore.lineOnlyMode,
      showRadiusLines: !canvasStore.lineOnlyMode,
      isLoopMode: controlPointsStore.isLoopMode,
      debugMode: canvasStore.debugMode,
      overlapResults: null,
      backgroundImage: backgroundStore.backgroundImage && backgroundStore.showBackgroundImage ? backgroundStore.backgroundImage : null,
      imageSettings: backgroundStore.imageSettings
    })
    return
  }

  const curveData = result.data || result
  currentCurveData = curveData

  if (canvasStore.debugMode && curveData.clothoidData) {
    // オーバーラップ検出のロジックは必要に応じて後で追加
    overlapResults = null
  } else {
    overlapResults = null
  }

  const clothoidData = curveData.clothoidData || null
  renderer.render(curveData.curve, {
    showGrid: canvasStore.showGrid,
    clothoidData,
    lineOnlyMode: canvasStore.lineOnlyMode,
    fillInsideMode: canvasStore.fillInsideMode,
    previewPoint: previewPoint.value,
    showConnectionLines: canvasStore.showConnectionLines && !canvasStore.lineOnlyMode,
    showAngles: !canvasStore.lineOnlyMode,
    showRadiusLines: !canvasStore.lineOnlyMode,
    isLoopMode: controlPointsStore.isLoopMode,
    debugMode: canvasStore.debugMode,
    overlapResults: overlapResults,
    backgroundImage: backgroundStore.backgroundImage && backgroundStore.showBackgroundImage ? backgroundStore.backgroundImage : null,
    imageSettings: backgroundStore.imageSettings
  })
  
  emit('curveUpdated')
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

// 制御点との距離を計算
const getDistanceToPoint = (mousePos: { x: number, y: number }, point: ControlPoint) => {
  const dx = mousePos.x - point.x
  const dy = mousePos.y - point.y
  return Math.sqrt(dx * dx + dy * dy)
}

// マウスが制御点上にあるかチェック
const getPointAtMouse = (coords: { x: number, y: number }) => {
  const hitRadius = 12 / transform.zoom
  for (let i = 0; i < points.length; i++) {
    if (getDistanceToPoint(coords, points[i]) <= hitRadius) {
      return i
    }
  }
  return -1
}

// 曲線上のプレビュー点を計算
const calculatePreviewPoint = (coords: { x: number, y: number }) => {
  if (!currentCurveData || !currentCurveData.curve || currentCurveData.curve.length < 2) {
    return null
  }

  const curve = currentCurveData.curve
  let closestDistance = Infinity
  let closestSegment = -1
  let closestPoint = null

  for (let i = 0; i < curve.length - 1; i++) {
    const start = curve[i]
    const end = curve[i + 1]
    
    const A = coords.x - start.x
    const B = coords.y - start.y
    const C = end.x - start.x
    const D = end.y - start.y
    
    const dot = A * C + B * D
    const lenSq = C * C + D * D
    
    if (lenSq === 0) continue
    
    let param = dot / lenSq
    param = Math.max(0, Math.min(1, param))
    
    const projX = start.x + param * C
    const projY = start.y + param * D
    
    const distance = Math.sqrt((coords.x - projX) ** 2 + (coords.y - projY) ** 2)
    
    if (distance < closestDistance) {
      closestDistance = distance
      closestSegment = i
      closestPoint = { x: projX, y: projY }
    }
  }

  const maxDistance = 30 / transform.zoom
  if (closestDistance <= maxDistance && closestPoint) {
    return {
      x: closestPoint.x,
      y: closestPoint.y,
      segmentIndex: closestSegment
    }
  }
  
  return null
}

// マウス関連のイベントハンドラー
const handleMouseDown = (event: MouseEvent) => {
  if (!canvas.value) return
  const coords = getCanvasCoords(event)
  
  if (event.shiftKey) {
    isPanning.value = true
    panStart.value = { x: event.clientX, y: event.clientY }
    if (canvas.value) canvas.value.style.cursor = 'grabbing'
    return
  }

  const pointIndex = getPointAtMouse(coords)
  if (pointIndex >= 0) {
    isDragging.value = true
    dragPointIndex.value = pointIndex
    dragOffset.value = {
      x: coords.x - points[pointIndex].x,
      y: coords.y - points[pointIndex].y
    }
    emit('pointSelected', pointIndex)
    if (canvas.value) canvas.value.style.cursor = 'grabbing'
    
    document.addEventListener('mousemove', handleDocumentMouseMove)
    document.addEventListener('mouseup', handleDocumentMouseUp)
  }
}

const handleDocumentMouseMove = (event: MouseEvent) => {
  if (isDragging.value && dragPointIndex.value >= 0 && canvas.value) {
    const coords = getCanvasCoords(event)
    const newX = coords.x - dragOffset.value.x
    const newY = coords.y - dragOffset.value.y
    
    updatePoint(dragPointIndex.value, {
      x: newX,
      y: newY,
      radius: points[dragPointIndex.value].radius,
      spiralFactor: points[dragPointIndex.value].spiralFactor
    })
    
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
    updateCanvas()
    return
  }

  const pointIndex = getPointAtMouse(coords)
  if (pointIndex >= 0) {
    if (canvas.value) canvas.value.style.cursor = 'pointer'
    previewPoint.value = null
  } else {
    if (canvas.value) canvas.value.style.cursor = 'crosshair'
    const preview = calculatePreviewPoint(coords)
    previewPoint.value = preview
  }
  
  updateCanvas()
}

const handleMouseUp = (event: MouseEvent) => {
  if (isPanning.value) {
    isPanning.value = false
    if (canvas.value) canvas.value.style.cursor = 'crosshair'
  }
}

const handleMouseLeave = () => {
  if (canvas.value) canvas.value.style.cursor = 'crosshair'
  previewPoint.value = null
  updateCanvas()
}

const handleDoubleClick = (event: MouseEvent) => {
  if (event.shiftKey) return
  
  const coords = getCanvasCoords(event)
  const pointIndex = getPointAtMouse(coords)
  
  if (pointIndex >= 0) {
    if (canRemovePoint(pointIndex)) {
      removePoint(pointIndex)
      updateCurve()
    }
  } else {
    const preview = calculatePreviewPoint(coords)
    if (preview) {
      const newPoint: ControlPoint = {
        x: preview.x,
        y: preview.y,
        radius: controlPointsStore.defaultRadius,
        spiralFactor: controlPointsStore.defaultSpiralFactor
      }
      
      controlPointsStore.insertPoint(preview.segmentIndex + 1, newPoint)
      updateCurve()
    } else {
      addPoint()
      const lastIndex = points.length - 1
      updatePoint(lastIndex, {
        x: coords.x,
        y: coords.y,
        radius: controlPointsStore.defaultRadius,
        spiralFactor: controlPointsStore.defaultSpiralFactor
      })
      updateCurve()
    }
  }
}

const handleWheel = (event: WheelEvent) => {
  // イベントがキャンバス上で発生した場合のみ処理
  event.preventDefault()
  
  const coords = getCanvasCoords(event)
  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
  
  const newZoom = Math.max(0.1, Math.min(5, transform.zoom * zoomFactor))
  const zoomRatio = newZoom / transform.zoom
  
  const newPanX = coords.x - (coords.x - transform.panX / transform.zoom) * zoomRatio
  const newPanY = coords.y - (coords.y - transform.panY / transform.zoom) * zoomRatio
  
  canvasStore.setTransform(newZoom, newPanX * newZoom, newPanY * newZoom)
  updateCanvasTransform()
}

// ライフサイクル
onMounted(() => {
  if (!canvas.value) return

  setCanvasElement(canvas.value)
  renderer = new CanvasRenderer(canvas.value, points)
  
  resizeCanvas()
  updateCurve()

  window.addEventListener('resize', resizeCanvas)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  document.removeEventListener('mousemove', handleDocumentMouseMove)
  document.removeEventListener('mouseup', handleDocumentMouseUp)
})

// 外部からの更新を受け取るメソッドを定義
defineExpose({
  updateCanvas,
  updateCurve
})
</script>

<style scoped>
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* キャンバス関連スタイルをここに移動 */
.canvas-wrapper {
  position: relative;
  flex: 1;
  overflow: hidden;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--border-radius-md);
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
</style>
