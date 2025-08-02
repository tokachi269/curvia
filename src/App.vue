<template>
  <div id="app">
    <div class="header">
      <h1>道路線形設計ツール</h1>
      <p>制御点をドラッグして道路の形状を調整できます</p>
    </div>

    <div class="container">
      <div class="sidebar">
        <div class="panel">
          <h3>表示オプション</h3>
          <div class="settings">
            <label class="checkbox-item">
              <input type="checkbox" v-model="showGrid" @change="updateCanvas">
              <span>グリッド表示</span>
            </label>
            <label class="checkbox-item">
              <input type="checkbox" v-model="lineOnlyMode" @change="updateCanvas">
              <span>線のみ表示</span>
            </label>
            <label class="checkbox-item">
              <input type="checkbox" v-model="fillInsideMode" @change="updateCanvas">
              <span>曲線内塗りつぶし</span>
            </label>
            <label class="checkbox-item">
              <input type="checkbox" v-model="showConnectionLines" @change="updateCanvas" :disabled="lineOnlyMode">
              <span>制御点間点線</span>
            </label>
            <label class="checkbox-item">
              <input type="checkbox" v-model="debugMode" @change="updateCanvas">
              <span>デバッグモード</span>
            </label>
          </div>
        </div>

        <div class="panel">
          <h3>制御点設定</h3>
          <label>
            <input type="checkbox" v-model="isLoopMode" @change="updateCurve">
            <span>ループモード</span>
          </label>
          <!-- アクションボタンを制御点リストの上部に移動 -->
          <div class="actions-horizontal">
            <button @click="addPoint" class="add-btn">制御点追加</button>
            <button @click="resetPoints" class="reset-btn">リセット</button>
          </div>

          <div class="actions-horizontal">
            <button @click="applyDefaultToAllSimple" class="apply-btn">デフォルト適用</button>
            <button @click="showDefaultSettings = !showDefaultSettings" class="btn btn-secondary">
              {{ showDefaultSettings ? 'デフォルト設定▲' : 'デフォルト設定▼' }}
            </button>
          </div>
          <!-- デフォルト設定を制御点設定内に統合 -->
          <div v-if="showDefaultSettings" class="compact-controls">
            <div class="param-row-compact">

            </div>

            <div class="param-row-compact">
              <label>半径</label>
              <input type="number" v-model.number="defaultRadius" min="10" max="500" step="5"
                @input="applyDefaultRadius" class="param-input-compact">
              <span>m</span>
            </div>

            <div class="param-row-compact">
              <label>スパイラル係数</label>
              <input type="number" v-model.number="defaultSpiralFactor" min="0.2" step="0.1"
                @input="applyDefaultSpiralFactor" class="param-input-compact">
              <span>×</span>
            </div>
          </div>
          <div class="point-list">
            <div v-for="(point, index) in points" :key="index" class="point-item"
              :class="{ selected: selectedPoint === index }" @click="selectPoint(index)">
              <div class="point-header">
                <span class="point-name">P{{ index }}</span>
                <div class="point-coords">
                  <input type="text" v-model="point.x" @change="updateCurve" class="coord-input"
                    :placeholder="`${Math.round(point.x)}`">
                  <span>,</span>
                  <input type="text" v-model="point.y" @change="updateCurve" class="coord-input"
                    :placeholder="`${Math.round(point.y)}`">
                </div>
              </div>

              <!-- パラメータセクション -->
              <div class="point-params"
                :class="{ disabled: !((index > 0 && index < points.length - 1) || (isLoopMode && points.length > 2)) }">
                <div class="param-row">
                  <label>半径 (R)</label>
                  <input type="number" v-model.number="point.radius" min="10" max="500" step="5" @input="updateCurve"
                    class="param-input"
                    :disabled="!((index > 0 && index < points.length - 1) || (isLoopMode && points.length > 2))">
                  <span>m</span>
                </div>

                <div class="param-row">
                  <label>スパイラル長制御</label>
                  <select v-model="point.spiralMode" @change="updateCurve" class="param-select">
                    <option value="auto">自動計算</option>
                    <option value="manual">手動指定</option>
                  </select>
                </div>

                <div class="param-row" v-if="point.spiralMode === 'manual'">
                  <label>スパイラル長 (Ls)</label>
                  <input type="number" v-model.number="point.spiralLength" min="1" :max="point.radius * 2" step="1"
                    @input="updateCurve" class="param-input">
                  <span>m</span>
                </div>

                <div class="param-row" :class="{ disabled: point.spiralMode !== 'auto' }">
                  <label>スパイラル係数</label>
                  <input type="number" v-model.number="point.spiralFactor" min="0.2" step="0.1"
                    @input="updateCurve" class="param-input"
                    :disabled="!((index > 0 && index < points.length - 1) || (isLoopMode && points.length > 2)) || point.spiralMode !== 'auto'">

                  <span title="大きいほど長いスパイラル">×</span>
                </div>

                <div class="param-info" :class="{ disabled: !point.calculatedSpiral }">
                  <small>
                    計算値: Ls={{ point.calculatedSpiral?.length?.toFixed(1) || 0 }}m,
                    θs={{ (point.calculatedSpiral?.angle * 180 / Math.PI)?.toFixed(1) || 0 }}°
                  </small>
                </div>
              </div>

              <button v-if="points.length > 3" @click="removePoint(index)" class="remove-btn"
                :class="{ disabled: !((index > 0 && index < points.length - 1) || (isLoopMode && points.length > 2)) }"
                :disabled="!((index > 0 && index < points.length - 1) || (isLoopMode && points.length > 2))">
                削除
              </button>
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
              <span class="legend-title-main">凡例</span>
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
              <div class="legend-section">
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

<script>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { generateMultiPointCurve, generateCurveWithClothoid, generateClothoidCurve } from './utils/curveGenerator.js'
import { CanvasRenderer } from './utils/canvasRenderer.js'
import { detectOverlaps, formatOverlapReport } from './utils/overlapDetector.js'

export default {
  name: 'App',
  setup() {
    const canvas = ref(null)
    const showGrid = ref(true)
    const lineOnlyMode = ref(false)
    const fillInsideMode = ref(false) // 曲線内塗りつぶしモード
    const isLoopMode = ref(false) // ループモードフラグを追加
    const showConnectionLines = ref(true) // 制御点間点線表示
    const debugMode = ref(false) // デバッグモード追加
    const showAngles = ref(false) // 角度表示
    const showRadiusLines = ref(false) // 半径線表示
    const selectedPoint = ref(-1)
    const showDefaultSettings = ref(false) // デフォルト設定パネル表示フラグ
    const showLegend = ref(true) // 凡例表示フラグ

    // 緩和曲線制御パラメータ
    const defaultRadius = ref(100)
    const defaultSpiralFactor = ref(1.0)

    // ズーム・パン関連
    const zoom = ref(1)
    const panX = ref(0)
    const panY = ref(0)
    const isPanning = ref(false)
    const panStart = ref({ x: 0, y: 0 })

    let renderer = null
    let currentCurveData = null // 現在の曲線データを保持
    let overlapResults = null // オーバーラップ検出結果を保持

    // プレビュー点の状態管理
    const previewPoint = ref(null) // プレビュー点の情報 { x, y, segmentIndex }
    const currentMousePos = ref({ x: 0, y: 0 }) // 現在のマウス位置

    // 制御点の初期値（各点に個別の半径を設定）
    const points = ref([
      { x: 120, y: 400 },  // P0 (始点)
      {
        x: 400,
        y: 200,
        radius: 100,
        spiralMode: 'auto',
        spiralLength: 200,  // 基準値（半径の2倍）で適切な長さ
        spiralFactor: 1.0,  // 係数1
        calculatedSpiral: null
      },  // P1
      { x: 650, y: 350 }   // P2 (終点)
    ])

    // マウス操作関連
    const isDragging = ref(false)
    const dragPointIndex = ref(-1)
    const dragOffset = ref({ x: 0, y: 0 })

    // キャンバスのみ再描画（曲線計算なし）
    const updateCanvas = () => {
      if (!renderer || !currentCurveData) return

      const clothoidData = currentCurveData.clothoidData || null
      renderer.render(currentCurveData.curve, {
        showGrid: showGrid.value,
        clothoidData,
        lineOnlyMode: lineOnlyMode.value,
        fillInsideMode: fillInsideMode.value,
        previewPoint: previewPoint.value,
        showConnectionLines: showConnectionLines.value && !lineOnlyMode.value,
        showAngles: !lineOnlyMode.value,
        showRadiusLines: !lineOnlyMode.value,
        isLoopMode: isLoopMode.value,
        debugMode: debugMode.value,
        overlapResults: overlapResults
      })
    }

    // 曲線を再計算・再描画
    const updateCurve = () => {
      console.group('🔄 曲線更新処理開始')
      console.log('📊 制御点数:', points.value.length)
      console.log('📍 制御点座標:', points.value.map(p => `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`))
      console.log('🔄 ループモード:', isLoopMode.value)

      if (!renderer) {
        console.warn('⚠️ レンダラーが初期化されていません')
        console.groupEnd()
        return
      }

      // レンダラーの制御点を更新
      renderer.points = points.value

      let result
      // 統一版の緩和曲線生成関数を使用
      if (points.value.length >= 3) {
        console.log('✅ 統一緩和曲線生成を実行')
        const speed = 60 // デフォルト速度
        result = generateClothoidCurve(points.value, speed, isLoopMode.value, defaultSpiralFactor.value)
      } else {
        console.log('⚠️ 点数不足 - 直線処理')
        result = {
          data: {
            curve: points.value,
            clothoidData: { segments: [] }
          },
          debug: '制御点が3点未満のため直線として処理'
        }
      }

      if (result.error) {
        console.error('❌ 曲線生成エラー:', result.error)
        console.groupEnd()

        // エラーがあっても基本描画は行う
        renderer.render([], {
          showGrid: showGrid.value,
          clothoidData: null,
          lineOnlyMode: lineOnlyMode.value,
          fillInsideMode: false,
          previewPoint: null,
          showConnectionLines: showConnectionLines.value && !lineOnlyMode.value,
          showAngles: !lineOnlyMode.value,
          showRadiusLines: !lineOnlyMode.value,
          isLoopMode: isLoopMode.value,
          debugMode: debugMode.value,
          overlapResults: null
        })

        // エラーメッセージをオーバーレイで表示
        const ctx = canvas.value.getContext('2d')
        ctx.save()
        ctx.resetTransform()
        ctx.fillStyle = 'rgba(220, 38, 38, 0.9)'
        ctx.fillRect(10, 10, 300, 30)
        ctx.fillStyle = '#fff'
        ctx.font = '14px sans-serif'
        ctx.fillText(result.error, 15, 30)
        ctx.restore()
        return
      }

      // 成功結果からデータを取得
      const curveData = result.data || result

      // 曲線データを保持（線上クリック検出用）
      currentCurveData = curveData

      // オーバーラップ検出を実行
      if (debugMode.value && curveData.clothoidData) {
        overlapResults = detectOverlaps(curveData, points.value)
        console.log('🔍 オーバーラップ検出結果:', overlapResults)
        if (overlapResults.hasOverlaps) {
          console.warn('⚠️ オーバーラップ検出:', formatOverlapReport(overlapResults))
        }
      } else {
        overlapResults = null
      }

      console.log('✅ 曲線生成成功:', {
        点数: curveData.curve?.length || 0,
        セグメント数: curveData.clothoidData?.totalSegments || 0,
        計算時間: curveData.clothoidData?.calculationTime ? `${curveData.clothoidData.calculationTime.toFixed(2)}ms` : '不明',
        オーバーラップ: overlapResults?.hasOverlaps ? `${overlapResults.overlaps.length}件` : 'なし'
      })
      console.groupEnd()

      // 曲線を描画
      const clothoidData = curveData.clothoidData || null
      renderer.render(curveData.curve, {
        showGrid: showGrid.value,
        clothoidData,
        lineOnlyMode: lineOnlyMode.value,
        fillInsideMode: fillInsideMode.value,
        previewPoint: previewPoint.value,
        showConnectionLines: showConnectionLines.value && !lineOnlyMode.value,
        showAngles: !lineOnlyMode.value,
        showRadiusLines: !lineOnlyMode.value,
        isLoopMode: isLoopMode.value,
        debugMode: debugMode.value,
        overlapResults: overlapResults
      })
    }

    // 制御点を選択
    const selectPoint = (index) => {
      selectedPoint.value = index
    }

    // 制御点を追加
    const addPoint = () => {
      const lastPoint = points.value[points.value.length - 1]
      const newPoint = {
        x: lastPoint.x + 100,
        y: lastPoint.y,
        radius: defaultRadius.value,
        spiralMode: 'auto',
        spiralLength: 50,  // デフォルト50m
        spiralFactor: defaultSpiralFactor.value,
        calculatedSpiral: null
      }
      // 最後に追加
      points.value.push(newPoint)
      updateCurve()
    }

    // デフォルト半径を適用
    const applyDefaultRadius = () => {
      points.value.forEach(point => {
        point.radius = defaultRadius.value
      })
      updateCurve()
    }

    // デフォルトスパイラル係数を適用
    const applyDefaultSpiralFactor = () => {
      console.log('🔧 デフォルトスパイラル係数適用:', defaultSpiralFactor.value)
      points.value.forEach((point, index) => {
        if (point.spiralFactor !== undefined) {
          console.log(`  P${index}: ${point.spiralFactor} -> ${defaultSpiralFactor.value}`)
          point.spiralFactor = defaultSpiralFactor.value
        }
      })
      updateCurve()
    }

    // 全点にデフォルト値を適用（シンプル版）
    const applyDefaultToAllSimple = () => {
      points.value.forEach(point => {
        if (point.radius !== undefined) {
          point.radius = defaultRadius.value
          point.spiralFactor = defaultSpiralFactor.value
          point.spiralLength = 50  // デフォルト50m
        }
      })
      updateCurve()
    }

    // 制御点を削除
    const removePoint = (index) => {
      if (points.value.length > 3 && index > 0 && index < points.value.length - 1) {
        points.value.splice(index, 1)

        // 削除後の選択インデックス調整
        if (selectedPoint.value >= index) {
          selectedPoint.value = Math.max(-1, selectedPoint.value - 1)
        }

        console.log(`🗑️ 制御点P${index}を削除, 新しい選択: P${selectedPoint.value}`)
        updateCurve()
      }
    }

    // マウス座標をキャンバス座標に変換（ズーム・パンを考慮）
    const getCanvasCoords = (event) => {
      const rect = canvas.value.getBoundingClientRect()
      const x = (event.clientX - rect.left - panX.value) / zoom.value
      const y = (event.clientY - rect.top - panY.value) / zoom.value
      return { x, y }
    }

    // キャンバスの変換を更新
    const updateCanvasTransform = () => {
      if (!renderer) return
      renderer.setTransform(zoom.value, panX.value, panY.value)
      updateCanvas()
    }

    // ズーム機能
    const zoomIn = () => {
      zoom.value = zoom.value * 1.2  // 20%拡大
      updateCanvasTransform()
    }

    const zoomOut = () => {
      zoom.value = Math.max(0.01, zoom.value / 1.2)  // 20%縮小
      updateCanvasTransform()
    }

    const resetZoom = () => {
      zoom.value = 1
      updateCanvasTransform()
    }

    const resetPan = () => {
      panX.value = 0
      panY.value = 0
      updateCanvasTransform()
    }

    // ホイールイベント（ズーム）
    const handleWheel = (event) => {
      event.preventDefault()

      // マウス位置を取得
      const rect = canvas.value.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top

      // ズーム前のマウス位置のワールド座標
      const worldX = (mouseX - panX.value) / zoom.value
      const worldY = (mouseY - panY.value) / zoom.value

      // ズーム実行
      const delta = event.deltaY > 0 ? -0.1 : 0.1  // ホイールでの変化量を増加
      const zoomFactor = 1 + Math.abs(delta)
      const newZoom = delta > 0 ? 
        zoom.value * zoomFactor :    // ズームイン（倍率ベース）
        Math.max(0.01, zoom.value / zoomFactor)  // ズームアウト（倍率ベース）

      // ズーム後のマウス位置がワールド座標で同じになるようにパンを調整
      const newPanX = mouseX - worldX * newZoom
      const newPanY = mouseY - worldY * newZoom

      zoom.value = newZoom
      panX.value = newPanX
      panY.value = newPanY

      updateCanvasTransform()
    }

    // 線上の点を検索し、どの制御点間にあるかを2分探索で判定
    const findSegmentOnCurve = (mouseX, mouseY, tolerance = 8) => {
      if (!currentCurveData || !currentCurveData.curve) {
        return null
      }

      const curve = currentCurveData.curve
      let closestDistance = Infinity
      let closestSegment = null
      let closestPoint = null
      let closestIndex = -1

      // 曲線上の各線分との最短距離を計算（点だけでなく線分も含む）
      for (let i = 0; i < curve.length - 1; i++) {
        const p1 = curve[i]
        const p2 = curve[i + 1]

        // 線分p1-p2上の最も近い点を求める
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const len = Math.sqrt(dx * dx + dy * dy)

        if (len === 0) {
          // 線分の長さが0の場合は点として扱う
          const distance = Math.sqrt((mouseX - p1.x) ** 2 + (mouseY - p1.y) ** 2)
          if (distance < tolerance && distance < closestDistance) {
            closestDistance = distance
            closestPoint = { x: p1.x, y: p1.y }
            closestIndex = i
          }
          continue
        }

        // 線分上の最も近い点のパラメータt（0〜1）を計算
        const t = Math.max(0, Math.min(1, ((mouseX - p1.x) * dx + (mouseY - p1.y) * dy) / (len * len)))

        // 線分上の最も近い点
        const nearestX = p1.x + t * dx
        const nearestY = p1.y + t * dy

        // マウスとの距離
        const distance = Math.sqrt((mouseX - nearestX) ** 2 + (mouseY - nearestY) ** 2)

        if (distance < tolerance && distance < closestDistance) {
          closestDistance = distance
          closestPoint = { x: nearestX, y: nearestY }
          closestIndex = i + t // 小数点も含む正確な位置
        }
      }

      if (!closestPoint) {
        return null
      }

      // 2分探索で制御点間のセグメントを特定
      const totalPoints = curve.length
      let pointsPerSegment, totalSegments

      if (isLoopMode.value) {
        // ループモード: 制御点数と同じ数のセグメント
        totalSegments = points.value.length
        pointsPerSegment = Math.floor(totalPoints / totalSegments)
      } else {
        // 非ループモード: 制御点数-1のセグメント
        totalSegments = points.value.length - 1
        pointsPerSegment = Math.floor(totalPoints / totalSegments)
      }

      if (pointsPerSegment <= 0) {
        return null
      }

      // どのセグメント（制御点間）にあるかを計算
      let segmentIndex = Math.floor(closestIndex / pointsPerSegment)

      // セグメントインデックスの範囲調整
      if (isLoopMode.value) {
        segmentIndex = segmentIndex % points.value.length
      } else {
        segmentIndex = Math.min(segmentIndex, points.value.length - 2)
      }

      console.log(`🎯 線上クリック検出:`, {
        セグメント: segmentIndex,
        曲線インデックス: closestIndex.toFixed(2),
        距離: closestDistance.toFixed(1) + 'px',
        総セグメント数: totalSegments,
        セグメント毎点数: pointsPerSegment,
        ループモード: isLoopMode.value,
        補間点: `(${closestPoint.x.toFixed(1)}, ${closestPoint.y.toFixed(1)})`
      })

      return {
        segmentIndex: segmentIndex,
        curveIndex: closestIndex,
        point: closestPoint,
        distance: closestDistance
      }
    }

    // 制御点間に新しい制御点を挿入
    const insertPointAtSegment = (segmentIndex, mouseX, mouseY) => {
      console.log(`➕ セグメント${segmentIndex}に新しい制御点を挿入: (${mouseX.toFixed(1)}, ${mouseY.toFixed(1)})`)

      let insertIndex
      if (isLoopMode.value) {
        // ループモードでは、セグメントの後に挿入
        // ただし、最後のセグメント（PnからP0）の場合は最後に挿入
        if (segmentIndex === points.value.length - 1) {
          insertIndex = points.value.length // 最後に追加
        } else {
          insertIndex = segmentIndex + 1
        }
      } else {
        // 非ループモードでは単純にセグメントの後に挿入
        insertIndex = segmentIndex + 1
      }

      const newPoint = {
        x: mouseX,
        y: mouseY,
        radius: defaultRadius.value,
        spiralMode: 'auto',
        spiralLength: 50,  // デフォルト50m
        spiralFactor: defaultSpiralFactor.value,
        calculatedSpiral: null
      }

      // 指定位置に制御点を挿入
      points.value.splice(insertIndex, 0, newPoint)
      selectedPoint.value = insertIndex

      console.log(`✅ 制御点P${insertIndex}を追加完了 (ループモード: ${isLoopMode.value})`)
      updateCurve()
    }

    // 点がクリックされたかチェック
    const getClickedPoint = (mouseX, mouseY) => {
      for (let i = 0; i < points.value.length; i++) {
        const point = points.value[i]
        const distance = Math.sqrt((mouseX - point.x) ** 2 + (mouseY - point.y) ** 2)
        if (distance <= 15) {
          return i
        }
      }
      return -1
    }

    // マウスイベントハンドラー
    const handleMouseDown = (event) => {
      const coords = getCanvasCoords(event)

      // Shiftキーが押されている場合はパン操作
      if (event.shiftKey) {
        isPanning.value = true
        panStart.value = {
          x: event.clientX - panX.value,
          y: event.clientY - panY.value
        }
        canvas.value.style.cursor = 'grabbing'
        return
      }

      const pointIndex = getClickedPoint(coords.x, coords.y)

      if (pointIndex !== -1) {
        isDragging.value = true
        dragPointIndex.value = pointIndex
        selectedPoint.value = pointIndex
        dragOffset.value = {
          x: coords.x - points.value[pointIndex].x,
          y: coords.y - points.value[pointIndex].y
        }
      }
    }

    const handleMouseMove = (event) => {
      const coords = getCanvasCoords(event)
      currentMousePos.value = coords

      // パン操作中
      if (isPanning.value) {
        panX.value = event.clientX - panStart.value.x
        panY.value = event.clientY - panStart.value.y
        updateCanvasTransform()
        return
      }

      // 制御点ドラッグ中
      if (isDragging.value) {
        const newX = coords.x - dragOffset.value.x
        const newY = coords.y - dragOffset.value.y

        // 既存のプロパティを保持しながら座標を更新
        points.value[dragPointIndex.value] = {
          ...points.value[dragPointIndex.value],
          x: newX,
          y: newY
        }
        updateCurve()
        return
      }

      // プレビュー点とカーソルの管理
      if (event.shiftKey) {
        canvas.value.style.cursor = 'grab'
        previewPoint.value = null
      } else {
        const pointIndex = getClickedPoint(coords.x, coords.y)

        if (pointIndex !== -1) {
          canvas.value.style.cursor = 'pointer'
          if (previewPoint.value) {
            previewPoint.value = null
            // プレビュー点をクリアするために再描画
            nextTick(() => {
              if (currentCurveData) {
                const clothoidData = currentCurveData.clothoidData || null
                renderer.render(currentCurveData.curve, {
                  showGrid: showGrid.value,
                  clothoidData,
                  lineOnlyMode: lineOnlyMode.value,
                  fillInsideMode: fillInsideMode.value,
                  previewPoint: null,
                  showConnectionLines: showConnectionLines.value && !lineOnlyMode.value,
                  showAngles: !lineOnlyMode.value,
                  showRadiusLines: !lineOnlyMode.value,
                  isLoopMode: isLoopMode.value,
                  debugMode: debugMode.value,
                  overlapResults: overlapResults
                })
              }
            })
          }
        } else {
          // 線上かどうかをチェックしてプレビュー点を設定
          const segmentInfo = findSegmentOnCurve(coords.x, coords.y, 15) // 感度を上げる
          if (segmentInfo) {
            canvas.value.style.cursor = 'copy'
            // プレビュー点を線上の実際の点に設定（スナップ）
            previewPoint.value = {
              x: segmentInfo.point.x,  // マウス位置ではなく曲線上の実際の点
              y: segmentInfo.point.y,  // マウス位置ではなく曲線上の実際の点
              segmentIndex: segmentInfo.segmentIndex
            }
            // プレビュー点を表示するために再描画
            nextTick(() => {
              if (currentCurveData) {
                const clothoidData = currentCurveData.clothoidData || null
                renderer.render(currentCurveData.curve, {
                  showGrid: showGrid.value,
                  clothoidData,
                  lineOnlyMode: lineOnlyMode.value,
                  fillInsideMode: fillInsideMode.value,
                  previewPoint: previewPoint.value,
                  showConnectionLines: showConnectionLines.value && !lineOnlyMode.value,
                  showAngles: !lineOnlyMode.value,
                  showRadiusLines: !lineOnlyMode.value,
                  isLoopMode: isLoopMode.value,
                  debugMode: debugMode.value,
                  overlapResults: overlapResults
                })
              }
            })
          } else {
            canvas.value.style.cursor = 'crosshair'
            if (previewPoint.value) {
              previewPoint.value = null
              // プレビュー点をクリアするために再描画
              nextTick(() => {
                if (currentCurveData) {
                  const clothoidData = currentCurveData.clothoidData || null
                  renderer.render(currentCurveData.curve, {
                    showGrid: showGrid.value,
                    clothoidData,
                    lineOnlyMode: lineOnlyMode.value,
                    fillInsideMode: fillInsideMode.value,
                    previewPoint: null,
                    showConnectionLines: showConnectionLines.value && !lineOnlyMode.value,
                    showAngles: !lineOnlyMode.value,
                    showRadiusLines: !lineOnlyMode.value,
                    isLoopMode: isLoopMode.value,
                    debugMode: debugMode.value,
                    overlapResults: overlapResults
                  })
                }
              })
            }
          }
        }
      }
    }

    const handleMouseUp = () => {
      isDragging.value = false
      dragPointIndex.value = -1
      isPanning.value = false
      canvas.value.style.cursor = 'crosshair'
    }

    const handleMouseLeave = () => {
      // マウスがキャンバスから離れた場合、プレビュー点をクリア
      if (previewPoint.value) {
        previewPoint.value = null
        nextTick(() => {
          if (currentCurveData) {
            const clothoidData = currentCurveData.clothoidData || null
            renderer.render(currentCurveData.curve, {
              showGrid: showGrid.value,
              clothoidData,
              lineOnlyMode: lineOnlyMode.value,
              fillInsideMode: fillInsideMode.value,
              previewPoint: null,
              showConnectionLines: showConnectionLines.value && !lineOnlyMode.value,
              showAngles: !lineOnlyMode.value,
              showRadiusLines: !lineOnlyMode.value,
              isLoopMode: isLoopMode.value,
              debugMode: debugMode.value,
              overlapResults: overlapResults
            })
          }
        })
      }
      handleMouseUp() // マウスアップ処理も実行
    }

    const handleDoubleClick = (event) => {
      const coords = getCanvasCoords(event)
      const pointIndex = getClickedPoint(coords.x, coords.y)

      if (pointIndex === -1) {
        // プレビュー点がある場合はそれを使用
        if (previewPoint.value) {
          console.log(`🎯 プレビュー点からダブルクリック検出: セグメント${previewPoint.value.segmentIndex}`)
          insertPointAtSegment(previewPoint.value.segmentIndex, previewPoint.value.x, previewPoint.value.y)
          previewPoint.value = null // 挿入後にプレビュー点をクリア
        } else {
          // プレビュー点がない場合は線上検索を実行
          const segmentInfo = findSegmentOnCurve(coords.x, coords.y, 12)

          if (segmentInfo && segmentInfo.segmentIndex >= 0) {
            // 線上の場合：制御点間に新しい制御点を挿入（線上の実際の点を使用）
            console.log(`🎯 線上ダブルクリック検出: セグメント${segmentInfo.segmentIndex}`)
            insertPointAtSegment(segmentInfo.segmentIndex, segmentInfo.point.x, segmentInfo.point.y)
          } else {
            // 空いている場所の場合：最後に新しい制御点を追加
            console.log('📍 空いている場所にダブルクリック - 最後に追加')
            const newPoint = {
              x: coords.x,
              y: coords.y,
              radius: defaultRadius.value,
              spiralMode: 'auto',
              spiralLength: 50,  // デフォルト50m
              spiralFactor: defaultSpiralFactor.value,
              calculatedSpiral: null
            }
            points.value.push(newPoint)
            updateCurve()
          }
        }
      }
    }

    // 全制御点にデフォルト値を適用
    const applyDefaultToAll = () => {
      // 制御点のプロパティを初期化（不足分を補完）
      points.value.forEach((point, index) => {
        if (index > 0 && index < points.value.length - 1) {
          if (!point.spiralMode) {
            point.spiralMode = 'auto'
            console.log(`P${index} spiralMode初期化: auto`)
          }
          if (point.spiralFactor === undefined) {
            point.spiralFactor = defaultSpiralFactor.value
            console.log(`P${index} spiralFactor初期化: ${defaultSpiralFactor.value}`)
          }
          if (point.radius === undefined) {
            point.radius = defaultRadius.value
            console.log(`P${index} radius初期化: ${defaultRadius.value}`)
          }
          if (point.spiralLength === undefined) {
            point.spiralLength = 50  // デフォルト50m
            console.log(`P${index} spiralLength初期化: ${point.spiralLength}`)
          }
        }
      })

      nextTick(() => {
        updateCurve()
      })
    }

    // 制御点をリセット
    const resetPoints = () => {
      points.value = [
        { x: 120, y: 400 },
        {
          x: 400,
          y: 200,
          radius: defaultRadius.value,
          spiralMode: 'auto',
          spiralLength: 50,  // デフォルト50m
          spiralFactor: defaultSpiralFactor.value,
          calculatedSpiral: null
        },
        { x: 650, y: 350 }
      ]
      selectedPoint.value = -1
      updateCurve()
    }

    // コンポーネントマウント時の処理
    onMounted(() => {
      // キャンバスのサイズを動的に設定
      const setCanvasSize = () => {
        const rect = canvas.value.getBoundingClientRect()
        canvas.value.width = rect.width
        canvas.value.height = rect.height
      }

      setCanvasSize()

      // ウィンドウリサイズ時にキャンバスサイズを更新
      window.addEventListener('resize', () => {
        setCanvasSize()
        updateCurve()
      })

      // レンダラーを初期化
      renderer = new CanvasRenderer(canvas.value, points.value)

      // 初期変換を設定
      updateCanvasTransform()

      // 初期描画
      updateCurve()

      // スクロール無効化
      document.body.style.overflow = 'hidden'
    })

    // アンマウント時にスクロール復元
    onUnmounted(() => {
      document.body.style.overflow = 'auto'
    })

    return {
      canvas,
      showGrid,
      lineOnlyMode,
      fillInsideMode,
      isLoopMode, // ループモードを追加
      showConnectionLines, // 制御点間点線表示
      debugMode, // デバッグモードを追加
      showDefaultSettings, // デフォルト設定パネル表示フラグを追加
      showLegend, // 凡例表示フラグを追加
      points,
      selectedPoint,
      defaultRadius,
      defaultSpiralFactor,
      zoom,
      panX,
      panY,
      selectPoint,
      addPoint,
      removePoint,
      applyDefaultRadius,
      applyDefaultSpiralFactor,
      applyDefaultToAll,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleMouseLeave,
      handleDoubleClick,
      handleWheel,
      updateCurve,
      updateCanvas,
      resetPoints,
      zoomIn,
      zoomOut,
      resetZoom,
      resetPan,
      updateCanvasTransform
    }
  }
}
</script>

<style scoped>
#app {
  font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic Medium", "Meiryo", "MS Gothic", sans-serif;
  background-color: #fafafa;
  min-height: 100vh;
  color: #333;
  overflow: hidden;
  /* スクロールを無効化 */
}

.header {
  background: #fff;
  padding: 6px 16px;
  border-bottom: 1px solid #ddd;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.header h1 {
  margin: 0 0 2px 0;
  font-size: 16px;
  font-weight: normal;
  color: #444;
}

.header p {
  margin: 0;
  font-size: 11px;
  color: #777;
}

.container {
  display: flex;
  gap: 8px;
  padding: 8px;
  max-width: 1600px;
  margin: 0 auto;
  height: calc(100vh - 50px);
  overflow: hidden;
}

.sidebar {
  width: 240px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  max-height: 100%;
}

.main-content {
  flex: 1;
}

.panel {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 3px;
  padding: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.panel h3 {
  margin: 0 0 6px 0;
  font-size: 13px;
  font-weight: normal;
  color: #444;
  border-bottom: 1px solid #eee;
  padding-bottom: 3px;
}

.point-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.point-item {
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 3px;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.2s;
}

.point-item:hover {
  background: #f0f0f0;
  border-color: #999;
}

.point-item.selected {
  background: #e8f4f8;
  border-color: #5a9fd4;
}

.point-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.point-name {
  font-weight: normal;
  color: #333;
  font-size: 12px;
  min-width: 20px;
}

.point-coords {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
}

.coord-input {
  width: 35px;
  padding: 1px 3px;
  border: 1px solid #ccc;
  border-radius: 2px;
  font-size: 11px;
  text-align: center;
}

.coord-input:focus {
  outline: none;
  border-color: #5a9fd4;
  background: #fff;
}

.point-params {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid #eee;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 3px;
}

.param-row:last-child {
  margin-bottom: 0;
}

.param-row label {
  font-size: 11px;
  color: #666;
  min-width: 30px;
}

.param-input {
  width: 45px;
  padding: 2px 4px;
  border: 1px solid #ccc;
  border-radius: 2px;
  font-size: 11px;
}

.param-input:focus {
  outline: none;
  border-color: #5a9fd4;
}

.param-row span {
  font-size: 11px;
  color: #666;
}

.remove-btn {
  padding: 2px 6px;
  background: #d4342c;
  color: white;
  border: none;
  border-radius: 2px;
  font-size: 10px;
  cursor: pointer;
  margin-top: 4px;
}

.remove-btn:hover {
  background: #b8302a;
}

.actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.add-btn,
.reset-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.add-btn {
  background: #5a9fd4;
  color: white;
  flex: 1;
}

.add-btn:hover {
  background: #4a8bc2;
}

.reset-btn {
  background: #777;
  color: white;
  flex: 1;
}

.reset-btn:hover {
  background: #666;
}

.param-select {
  padding: 2px;
  border: 1px solid #ddd;
  border-radius: 2px;
  font-size: 11px;
  background: white;
  min-width: 80px;
}

.param-select:focus {
  outline: none;
  border-color: #5a9fd4;
}

.param-info {
  margin-top: 4px;
  padding: 4px;
  background: #f0f8ff;
  border-radius: 2px;
  border: 1px solid #e0e8f0;
}

.param-info small {
  color: #666;
  font-size: 10px;
  line-height: 1.2;
}

.global-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.apply-btn {
  padding: 6px 12px;
  background: #f7931e;
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.apply-btn:hover {
  background: #e8821a;
}

.settings {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-item input[type="checkbox"] {
  margin: 0;
}

.checkbox-item span {
  font-size: 13px;
  color: #555;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 6px;
}

.legend-points {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-color {
  width: 20px;
  height: 3px;
  border-radius: 2px;
}

.legend-point {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid #333;
}

.legend-item span {
  font-size: 12px;
  color: #555;
}

.debug-panel {
  max-height: 200px;
  overflow: hidden;
}

.debug-content {
  height: 150px;
  overflow-y: auto;
  background: #fafafa;
  border: 1px solid #ddd;
  border-radius: 3px;
  padding: 8px;
}

.debug-content pre {
  margin: 0;
  font-family: "Consolas", "Monaco", monospace;
  font-size: 11px;
  color: #444;
  white-space: pre-wrap;
}

.canvas-wrapper {
  background: #fff;
  /* カードスタイルを削除して最大限広げる */
  width: 100%;
  height: 100%;
  position: relative;
}

.canvas-header {
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #ddd;
}

.canvas-header h3 {
  margin: 0 0 1px 0;
  font-size: 13px;
  font-weight: normal;
  color: #444;
}

.canvas-header p {
  margin: 0;
  font-size: 10px;
  color: #777;
}

canvas {
  display: block;
  width: 100%;
  height: calc(100vh - 120px);
  background: #ffffff;
  cursor: crosshair;
}

.zoom-controls {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.zoom-buttons {
  display: flex;
  gap: 2px;
}

.zoom-btn {
  padding: 4px 8px;
  background: #5a9fd4;
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 12px;
  cursor: pointer;
  flex: 1;
}

.zoom-btn:hover {
  background: #4a8bc2;
}

.pan-controls {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #eee;
}

.pan-controls label {
  font-size: 12px;
  color: #666;
}

.reset-pan-btn {
  padding: 6px 12px;
  background: #777;
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 12px;
  cursor: pointer;
}

.reset-pan-btn:hover {
  background: #666;
}

/* スクロールバーのスタイル */
.debug-content::-webkit-scrollbar {
  width: 6px;
}

.debug-content::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.debug-content::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.debug-content::-webkit-scrollbar-thumb:hover {
  background: #bbb;
}

/* レスポンシブデザイン */
@media (max-width: 768px) {
  .container {
    flex-direction: column;
    padding: 16px;
  }

  .sidebar {
    width: 100%;
  }

  .actions {
    flex-direction: column;
  }

  canvas {
    height: 400px;
  }
}

@media (min-width: 1400px) {
  .container {
    max-width: 1400px;
  }

  canvas {
    height: 600px;
  }
}

/* グレーアウト効果 */
.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.checkbox-item.disabled span {
  color: #999;
}

.legend-points.disabled {
  opacity: 0.5;
}

.legend-points.disabled .legend-item {
  color: #999;
}

/* キャンバスオーバーレイコントロール */
.canvas-overlay-controls {
  position: absolute;
  right: 220px;
  /* 凡例の左側に配置 */
  z-index: 20;
  display: flex;
  gap: 8px;
}

.overlay-btn {
  padding: 6px 12px;
  font-size: 11px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.overlay-btn:hover {
  background: rgba(248, 249, 250, 0.95);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* 凡例オーバーレイ */
.legend-overlay {
  position: absolute;
  right: 10px;
  /* 右寄せに変更 */
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0;
  z-index: 10;
  font-size: 11px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 180px;
  min-width: 120px;
}

.legend-header {
  padding: 8px 10px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(248, 249, 250, 0.95);
  border-bottom: 1px solid #ddd;
  border-radius: 6px 6px 0 0;
}

.legend-header:hover {
  background: rgba(240, 242, 245, 0.95);
}

.legend-title-main {
  font-weight: bold;
  color: #333;
  font-size: 12px;
}

.legend-toggle {
  font-size: 10px;
  color: #666;
}

.legend-content {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-section {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.legend-title {
  font-weight: bold;
  color: #333;
  font-size: 10px;
  margin-bottom: 2px;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.legend-operation {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.legend-operation div {
  font-size: 9px;
  color: #555;
  line-height: 1.2;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
}

.legend-color {
  width: 14px;
  height: 3px;
  border-radius: 1px;
}

.legend-point {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

/* アクションボタンの横並び */
.actions-horizontal {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.actions-horizontal button {
  flex: 1;
  padding: 6px 8px;
  font-size: 11px;
}

/* コンパクトなコントロール */
.compact-controls {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
}

.param-row-compact {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.param-row-compact label {
  min-width: 60px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.param-input-compact {
  width: 60px;
  padding: 3px 6px;
  border: 1px solid #ddd;
  border-radius: 3px;
  font-size: 11px;
}

.param-input-compact:focus {
  outline: none;
  border-color: #007bff;
}

/* 無効化スタイル */
.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.point-params.disabled {
  opacity: 0.4;
}

.point-params.disabled input {
  background-color: #f8f9fa;
  cursor: not-allowed;
}

.remove-btn.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.param-info.disabled {
  opacity: 0.4;
}
</style>
