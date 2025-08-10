<template>
  <div class="main-content">
    <div class="canvas-wrapper">
      <!-- ズーム・位置リセットボタンをオーバーレイで配置 -->
      <div class="canvas-overlay-controls">
        <button @click="resetZoom" class="overlay-btn">ズームリセット</button>
        <button @click="resetPan" class="overlay-btn">位置リセット</button>
      </div>

    <!-- 凡例をキャンバス右上に配置（折りたたみ可能） -->
    <div class="legend-overlay">
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
        <div class="legend-section">
          <div class="legend-title">線種</div>
          <div class="legend-items">
            <div class="legend-item">
              <LegendIndicator variant="straight" shape="line" />
              <span>直線部</span>
            </div>
            <div class="legend-item">
              <LegendIndicator variant="spiral" shape="line" />
              <span>スパイラル部</span>
            </div>
            <div class="legend-item">
              <LegendIndicator variant="arc" shape="line" />
              <span>円弧部</span>
            </div>
          </div>
        </div>
        <div class="legend-section">
          <div class="legend-title">制御点</div>
          <div class="legend-items">
            <div class="legend-item">
              <LegendIndicator variant="transition" shape="point" />
              <span>TS, ST</span>
            </div>
            <div class="legend-item">
              <LegendIndicator variant="curve" shape="point" />
              <span>SC, CS</span>
            </div>
            <div class="legend-item">
              <LegendIndicator variant="center" shape="point" />
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
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { 
  useControlPointsStore, 
  useCanvasStore, 
  useUIStore, 
  useBackgroundStore 
} from '@/stores'
import type { ControlPoint } from '@/types'
import { LegendIndicator } from '@/components/domain'

// Utils imports
import { generateClothoidCurve } from '@/utils/curveGenerator.js'
import { CanvasRenderer } from '@/utils/canvasRenderer.js'
import { setGlobalState, logger } from '@/utils/logger.js'

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
  const newWidth = rect.width
  const newHeight = rect.height
  
  // サイズが変更された場合のみ更新
  if (canvas.value.width !== newWidth || canvas.value.height !== newHeight) {
    canvas.value.width = newWidth
    canvas.value.height = newHeight
    
    // キャンバスサイズが変更された場合は再描画
    nextTick(() => {
      updateCanvas()
    })
  }
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
    imageSettings: backgroundStore.imageSettings,
    lineWidth: canvasStore.lineWidth
  })
}

// 曲線を再計算・再描画
const updateCurve = (isFinalResult = false) => {
  if (!renderer) return

  // 制御点データの検証
  if (!controlPointsStore.validatePoints()) {
    logger.curve.error('無効な制御点データが検出されました。曲線更新を中止します')
    return
  }

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
      imageSettings: backgroundStore.imageSettings,
      lineWidth: canvasStore.lineWidth
    })
    return
  }

  const result = generateClothoidCurve(currentPoints, 60, controlPointsStore.isLoopMode, controlPointsStore.defaultSpiralFactor, isFinalResult)

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
      imageSettings: backgroundStore.imageSettings,
      lineWidth: canvasStore.lineWidth
    })
    return
  }

  const curveData = result.data || result
  currentCurveData = curveData

  // デバッグモード時にオーバーラップ結果を設定
  if (canvasStore.debugMode && curveData.overlapResolution && curveData.overlapResolution.overlapResults) {
    overlapResults = curveData.overlapResolution.overlapResults
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
    imageSettings: backgroundStore.imageSettings,
    lineWidth: canvasStore.lineWidth
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
const getCanvasCoords = (event: MouseEvent | WheelEvent) => {
  if (!canvas.value) return { x: 0, y: 0 }
  
  try {
    const rect = canvas.value.getBoundingClientRect()
    const x = (event.clientX - rect.left - transform.panX) / transform.zoom
    const y = (event.clientY - rect.top - transform.panY) / transform.zoom
    return { x, y }
  } catch (error) {
    logger.curve.warn('座標変換でエラー:', error)
    return { x: 0, y: 0 }
  }
}

// スクリーン座標をワールド座標に変換（カーソル中心ズーム用）
const getScreenCoords = (event: MouseEvent | WheelEvent) => {
  if (!canvas.value) return { x: 0, y: 0 }
  const rect = canvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
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

  // 制御点との距離をチェック（制御点に近すぎる場合はプレビューを表示しない）
  const controlPointRadius = 20 / transform.zoom // 制御点の影響範囲
  for (let i = 0; i < points.length; i++) {
    if (getDistanceToPoint(coords, points[i]) <= controlPointRadius) {
      return null // 制御点に近すぎる場合はプレビューなし
    }
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
    // プレビュー点が制御点に近すぎないかも再チェック
    for (let i = 0; i < points.length; i++) {
      if (getDistanceToPoint(closestPoint, points[i]) <= controlPointRadius) {
        return null // プレビュー点が制御点に近すぎる場合もプレビューなし
      }
    }
    
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
    // 安全性チェック：選択された制御点が存在するか確認
    const selectedPoint = points[pointIndex]
    if (!selectedPoint) {
      logger.curve.warn('選択された制御点が見つかりません:', pointIndex)
      return
    }
    
    isDragging.value = true
    dragPointIndex.value = pointIndex
    dragOffset.value = {
      x: coords.x - selectedPoint.x,
      y: coords.y - selectedPoint.y
    }
    
    // ドラッグ開始をloggerに通知（ログ抑制のため）
    setGlobalState({ isDragging: true })
    
    emit('pointSelected', pointIndex)
    if (canvas.value) canvas.value.style.cursor = 'grabbing'
    
    document.addEventListener('mousemove', handleDocumentMouseMove)
    document.addEventListener('mouseup', handleDocumentMouseUp)
  }
}

const handleDocumentMouseMove = (event: MouseEvent) => {
  if (isDragging.value && dragPointIndex.value >= 0 && canvas.value) {
    const coords = getCanvasCoords(event)
    
    // 安全性チェック：ドラッグ中の制御点が存在するか確認
    const currentPoint = points[dragPointIndex.value]
    if (!currentPoint) {
      logger.curve.warn('ドラッグ中の制御点が見つかりません:', dragPointIndex.value)
      isDragging.value = false
      dragPointIndex.value = -1
      return
    }
    
    const newX = coords.x - dragOffset.value.x
    const newY = coords.y - dragOffset.value.y
    
    updatePoint(dragPointIndex.value, {
      x: newX,
      y: newY,
      radius: currentPoint.radius,
      spiralFactor: currentPoint.spiralFactor
    })
    
    updateCurve()
  }
}

const handleDocumentMouseUp = () => {
  if (isDragging.value) {
    isDragging.value = false
    dragPointIndex.value = -1
    
    // ドラッグ終了をloggerに通知（ログ抑制解除のため）
    setGlobalState({ isDragging: false })
    
    // ドラッグ終了時の最終計算を実行（確定結果ログ出力のため）
    updateCurve(true) // 第二引数をtrueにして最終結果フラグを渡す
    
    if (canvas.value) canvas.value.style.cursor = 'crosshair'
    
    document.removeEventListener('mousemove', handleDocumentMouseMove)
    document.removeEventListener('mouseup', handleDocumentMouseUp)
  }
}

const handleMouseMove = (event: MouseEvent) => {
  const coords = getCanvasCoords(event)
  currentMousePos.value = coords

  if (isPanning.value) {
    const deltaX = event.clientX - panStart.value.x
    const deltaY = event.clientY - panStart.value.y
    pan(deltaX, deltaY)
    panStart.value = { x: event.clientX, y: event.clientY }
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
  
  // ドラッグ中にマウスがキャンバスから離れた場合、ドラッグを終了
  if (isDragging.value) {
    isDragging.value = false
    dragPointIndex.value = -1
    setGlobalState({ isDragging: false })
    
    document.removeEventListener('mousemove', handleDocumentMouseMove)
    document.removeEventListener('mouseup', handleDocumentMouseUp)
  }
  
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
  
  // マウスのスクリーン座標を取得
  const screenPos = getScreenCoords(event)
  
  // ズーム前のワールド座標を計算
  const worldPosBeforeZoom = {
    x: (screenPos.x - transform.panX) / transform.zoom,
    y: (screenPos.y - transform.panY) / transform.zoom
  }
  
  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
  const newZoom = Math.max(0.1, Math.min(5, transform.zoom * zoomFactor))
  
  // ズーム後、同じワールド座標がマウス位置になるようにパン値を調整
  const newPanX = screenPos.x - worldPosBeforeZoom.x * newZoom
  const newPanY = screenPos.y - worldPosBeforeZoom.y * newZoom
  
  canvasStore.setTransform(newZoom, newPanX, newPanY)
  updateCanvasTransform()
}

// ライフサイクル
onMounted(() => {
  if (!canvas.value) return

  setCanvasElement(canvas.value)
  renderer = new CanvasRenderer(canvas.value, points)
  
  resizeCanvas()
  updateCurve()

  // ResizeObserverでキャンバスコンテナのサイズ変更を監視
  const container = canvas.value.parentElement
  if (container) {
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
    })
    resizeObserver.observe(container)
    
    // クリーンアップ用にResizeObserverを保存
    onUnmounted(() => {
      resizeObserver.disconnect()
    })
  }

  // 従来のwindow resizeイベントも残しておく（フォールバック）
  window.addEventListener('resize', resizeCanvas)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  document.removeEventListener('mousemove', handleDocumentMouseMove)
  document.removeEventListener('mouseup', handleDocumentMouseUp)
})

// lineWidthの変更を監視してキャンバスを更新
watch(() => canvasStore.lineWidth, () => {
  updateCanvas()
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
  background: var(--color-bg-primary);
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
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-xs);
  background: rgba(255, 255, 255, 0.9);
  border: var(--border-width) solid var(--color-border-secondary);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.overlay-btn:hover {
  background: rgba(255, 255, 255, 1);
  border-color: var(--color-border-primary);
}

/* 凡例オーバーレイ */
.legend-overlay {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  background: rgba(255, 255, 255, 0.95);
  border: var(--border-width) solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  padding: 0;
  font-size: var(--font-size-xs);
  max-width: 200px;
  box-shadow: var(--shadow-sm);
  z-index: 100;
  overflow: hidden;
}

.legend-header {
  background: var(--color-bg-primary);        /* 白背景に統一 */
  padding: var(--spacing-md) var(--spacing-sm);
  border-bottom: var(--border-width) solid var(--color-border-primary);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
}

.legend-header:hover {
  background: var(--color-surface-hover);
}

.legend-title-main {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}

.legend-toggle {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.legend-content {
  padding: var(--spacing-md);
}

.legend-section {
  margin-bottom: var(--spacing-md);
}

.legend-section:last-child {
  margin-bottom: 0;
}

.legend-title {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.legend-operation {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  line-height: 1.3;
}

.legend-operation div {
  margin-bottom: var(--spacing-xxs);
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xxs);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
</style>
