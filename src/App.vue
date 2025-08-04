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
                  <input type="checkbox" v-model="showGrid" @change="updateCanvas" class="prop-checkbox">
                  <span class="prop-name">グリッド表示</span>
                </label>
              </div>
              <div class="property-row">
                <label class="prop-label">
                  <input type="checkbox" v-model="lineOnlyMode" @change="updateCanvas" class="prop-checkbox">
                  <span class="prop-name">線のみ表示</span>
                </label>
              </div>
              <div class="property-row">
                <label class="prop-label">
                  <input type="checkbox" v-model="fillInsideMode" @change="updateCanvas" class="prop-checkbox">
                  <span class="prop-name">曲線内塗りつぶし</span>
                </label>
              </div>
              <div class="property-row">
                <label class="prop-label">
                  <input type="checkbox" v-model="showConnectionLines" @change="updateCanvas" :disabled="lineOnlyMode" class="prop-checkbox">
                  <span class="prop-name">制御点間点線</span>
                </label>
              </div>
              <div class="property-row">
                <label class="prop-label">
                  <input type="checkbox" v-model="debugMode" @change="updateCanvas" class="prop-checkbox">
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
                  <input type="checkbox" v-model="showBackgroundImage" @change="updateCanvas" class="prop-checkbox">
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
                    <input type="checkbox" v-model="imageSettings.flipX" @change="updateCanvas" class="prop-checkbox">
                    <span class="prop-name">水平反転</span>
                  </label>
                </div>
                
                <div class="property-row">
                  <label class="prop-label">
                    <input type="checkbox" v-model="imageSettings.flipY" @change="updateCanvas" class="prop-checkbox">
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
                  <input type="checkbox" v-model="isLoopMode" @change="updateCurve" class="prop-checkbox">
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
                  <button @click="showDefaultSettings = !showDefaultSettings" class="btn-small btn-outline">
                    {{ showDefaultSettings ? '設定▲' : '設定▼' }}
                  </button>
                </div>
              </div>
              
              <!-- デフォルト設定 -->
              <div v-if="showDefaultSettings" class="property-subgroup">
                <div class="subgroup-title">デフォルト値</div>
                <div class="property-row">
                  <label class="prop-name">半径</label>
                  <input type="number" v-model.number="defaultRadius" min="10" max="500" step="5"
                    @input="applyDefaultRadius" class="prop-input">
                  <span class="prop-unit">m</span>
                </div>

                <div class="property-row">
                  <label class="prop-name">スパイラル係数</label>
                  <input type="number" v-model.number="defaultSpiralFactor" min="0.2" step="0.1"
                    @input="applyDefaultSpiralFactor" class="prop-input">
                  <span class="prop-unit">×</span>
                </div>
              </div>
            </div>
            
            <!-- 制御点リスト -->
            <div class="property-subgroup">
              <div class="subgroup-title">制御点 ({{ points.length }}個)</div>
              <div class="point-list-blender">
                <div v-for="(point, index) in points" :key="index" class="point-item-blender"
                  :class="{ selected: selectedPoint === index, disabled: !((index > 0 && index < points.length - 1) || (isLoopMode && points.length > 2)) }" 
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
                    <button v-if="points.length > 3 && ((index > 0 && index < points.length - 1) || (isLoopMode && points.length > 2))" 
                      @click.stop="removePoint(index)" class="btn-tiny btn-danger">×</button>
                  </div>

                  <!-- 重要パラメータの常時表示 -->
                  <div v-if="((index > 0 && index < points.length - 1) || (isLoopMode && points.length > 2))" 
                    class="point-summary">
                    <div class="summary-row">
                      <span class="summary-label">R:</span>
                      <input type="number" v-model.number="point.radius" @input="updateCurve" 
                        class="summary-input" min="10" max="500" step="5">
                      <span class="summary-unit">m</span>
                    </div>
                    <div class="summary-row" v-if="point.spiralMode === 'manual'">
                      <span class="summary-label">Ls:</span>
                      <input type="number" v-model.number="point.spiralLength" @input="updateCurve" 
                        class="summary-input" min="1" :max="point.radius * 2" step="1">
                      <span class="summary-unit">m</span>
                    </div>
                    <div class="summary-row" v-else>
                      <span class="summary-label">×:</span>
                      <input type="number" v-model.number="point.spiralFactor" @input="updateCurve" 
                        class="summary-input" min="0.2" step="0.1">
                    </div>
                  </div>

                  <!-- 展開可能なパラメータ -->
                  <div v-if="selectedPoint === index && ((index > 0 && index < points.length - 1) || (isLoopMode && points.length > 2))" 
                    class="point-details">
                    
                    <div class="property-subgroup">
                      <div class="subgroup-title">座標</div>
                      <div class="property-row">
                        <label class="prop-name">X</label>
                        <input type="number" v-model.number="point.x" @change="updateCurve" class="prop-input" step="1">
                        <span class="prop-unit">px</span>
                      </div>
                      <div class="property-row">
                        <label class="prop-name">Y</label>
                        <input type="number" v-model.number="point.y" @change="updateCurve" class="prop-input" step="1">
                        <span class="prop-unit">px</span>
                      </div>
                    </div>

                    <div class="property-subgroup">
                      <div class="subgroup-title">円弧パラメータ</div>
                      <div class="property-row">
                        <label class="prop-name">半径 (R)</label>
                        <input type="number" v-model.number="point.radius" min="10" max="500" step="5" @input="updateCurve"
                          class="prop-input">
                        <span class="prop-unit">m</span>
                      </div>
                    </div>

                    <div class="property-subgroup">
                      <div class="subgroup-title">スパイラル設定</div>
                      <div class="property-row">
                        <label class="prop-name">制御</label>
                        <select v-model="point.spiralMode" @change="updateCurve" class="prop-select">
                          <option value="auto">自動計算</option>
                          <option value="manual">手動指定</option>
                        </select>
                      </div>

                      <div v-if="point.spiralMode === 'manual'" class="property-row">
                        <label class="prop-name">スパイラル長 (Ls)</label>
                        <input type="number" v-model.number="point.spiralLength" min="1" :max="point.radius * 2" step="1"
                          @input="updateCurve" class="prop-input">
                        <span class="prop-unit">m</span>
                      </div>

                      <div class="property-row" :class="{ disabled: point.spiralMode !== 'auto' }">
                        <label class="prop-name">係数</label>
                        <input type="number" v-model.number="point.spiralFactor" min="0.2" step="0.1"
                          @input="updateCurve" class="prop-input"
                          :disabled="point.spiralMode !== 'auto'">
                        <span class="prop-unit" title="大きいほど長いスパイラル">×</span>
                      </div>

                      <div v-if="debugMode" class="property-row debug-info">
                        <div class="debug-values">
                          <small>
                            計算値: Ls={{ point.calculatedSpiral?.length?.toFixed(1) || 0 }}m,
                            θs={{ (point.calculatedSpiral?.angle * 180 / Math.PI)?.toFixed(1) || 0 }}°
                          </small>
                        </div>
                      </div>
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

<script>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { generateClothoidCurve } from './utils/curveGenerator.js'
import { CanvasRenderer } from './utils/canvasRenderer.js'
import { detectOverlaps, formatOverlapReport } from './utils/overlapDetector.js'
import { 
  getUnifiedTotalSegments, 
  calculateCorrectSegmentIndex, 
  getUnifiedLabelIndex 
} from './utils/loopProtection.js'

export default {
  name: 'App',
  setup() {
    const canvas = ref(null)
    const imageInput = ref(null)
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
    
    // サイドバー展開状態管理
    const sidebarExpanded = ref({
      display: true,
      background: true,
      controls: true
    })

    // 背景画像関連
    const backgroundImage = ref(null)
    const showBackgroundImage = ref(true) // 画像表示切り替えフラグ
    const imageSettings = ref({
      x: 0,
      y: 0,
      scale: 1.0,
      opacity: 0.5,
      flipX: false,
      flipY: false
    })

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
        overlapResults: overlapResults,
        backgroundImage: backgroundImage.value && showBackgroundImage.value ? backgroundImage.value : null,
        imageSettings: imageSettings.value
      })
    }

    // 画像ファイルの読み込み処理
    const handleImageLoad = (event) => {
      const file = event.target.files[0]
      if (!file) return

      // 既に画像が設定されている場合は確認
      if (backgroundImage.value) {
        if (!confirm('現在の画像を新しい画像に変更してもよろしいですか？')) {
          // キャンセルされた場合、ファイル入力をリセット
          event.target.value = ''
          return
        }
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          backgroundImage.value = img
          showBackgroundImage.value = true // 画像読み込み時に表示を有効化
          // 画像の中央に配置
          imageSettings.value.x = -img.width / 2
          imageSettings.value.y = -img.height / 2
          updateCanvas()
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    }

    // 画像をクリア
    const clearImage = () => {
      if (confirm('背景画像を削除してもよろしいですか？')) {
        backgroundImage.value = null
        showBackgroundImage.value = false // 表示フラグもリセット
        imageInput.value.value = ''
        updateCanvas()
      }
    }

    // 曲線を再計算・再描画
    const updateCurve = () => {
      if (!renderer) {
        return
      }

      // レンダラーの制御点を更新
      renderer.points = points.value

      let result
      // 統一版の緩和曲線生成関数を使用
      if (points.value.length >= 3) {
        const speed = 60 // デフォルト速度
        result = generateClothoidCurve(points.value, speed, isLoopMode.value, defaultSpiralFactor.value)
      } else {
        result = {
          data: {
            curve: points.value,
            clothoidData: { segments: [] }
          },
          debug: '制御点が3点未満のため直線として処理'
        }
      }

      if (result.error) {
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
          overlapResults: null,
          backgroundImage: backgroundImage.value && showBackgroundImage.value ? backgroundImage.value : null,
          imageSettings: imageSettings.value
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
        if (overlapResults.hasOverlaps) {
          console.warn('⚠️ オーバーラップ検出:', formatOverlapReport(overlapResults))
        }
      } else {
        overlapResults = null
      }

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
        overlapResults: overlapResults,
        backgroundImage: backgroundImage.value && showBackgroundImage.value ? backgroundImage.value : null,
        imageSettings: imageSettings.value
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
      points.value.forEach((point, index) => {
        if (point.spiralFactor !== undefined) {
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
    /**
     * 指定位置が既存の制御点に近すぎるかチェック
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {number} threshold - 距離の閾値（デフォルト: 30ピクセル）
     * @returns {boolean} 近すぎる場合はtrue
     */
    const isTooCloseToExistingPoints = (x, y, threshold = 30) => {
      return points.value.some(point => {
        const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2)
        return distance < threshold
      })
    }

    /**
     * セグメントから統一的な点列を生成
     * 描画されている実際の線と一致する点列を作成
     */
    const generateUnifiedCurvePoints = (curveData) => {
      if (!curveData.segments || curveData.segments.length === 0) {
        return curveData.curve || []
      }
      
      const unifiedPoints = []
      
      for (const segment of curveData.segments) {
        let segmentPoints = null
        
        // セグメントから点列を抽出（canvasRenderer.jsのextractRenderPointsと同じロジック）
        if (segment.curve && segment.curve.length > 0) {
          segmentPoints = segment.curve
        } else if (segment.drawingSegments && segment.drawingSegments.length > 0) {
          // drawingSegmentsを連結
          segmentPoints = []
          for (const drawSeg of segment.drawingSegments) {
            if (drawSeg.points && drawSeg.points.length > 0) {
              // 最初のセグメント以外は重複する最初の点をスキップ
              const startIndex = segmentPoints.length > 0 ? 1 : 0
              segmentPoints.push(...drawSeg.points.slice(startIndex))
            }
          }
        } else if (segment.points && segment.points.length > 0) {
          segmentPoints = segment.points
        }
        
        if (segmentPoints && segmentPoints.length > 0) {
          // 最初のセグメント以外は重複する最初の点をスキップ
          const startIndex = unifiedPoints.length > 0 ? 1 : 0
          unifiedPoints.push(...segmentPoints.slice(startIndex))
        }
      }
      
      return unifiedPoints
    }

    const findSegmentOnCurve = (mouseX, mouseY, tolerance = 8) => {
      if (!currentCurveData) {
        return null
      }

      // 統一的な点列を生成（描画と一致）
      const curve = generateUnifiedCurvePoints(currentCurveData)
      
      if (!curve || curve.length < 2) {
        return null
      }

      let closestDistance = Infinity
      let closestSegment = null
      let closestPoint = null
      let closestIndex = -1

      // 曲線上の各線分との最短距離を計算（点だけでなく線分も含む）
      for (let i = 0; i < curve.length - 1; i++) {
        const p1 = curve[i]
        const p2 = curve[i + 1]

        if (!p1 || !p2 || typeof p1.x !== 'number' || typeof p1.y !== 'number' || 
            typeof p2.x !== 'number' || typeof p2.y !== 'number') {
          continue
        }

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

      // 【統一化】loopProtection.jsの統一関数を使用
      const result = calculateCorrectSegmentIndex(
        closestIndex, 
        points.value.length, 
        isLoopMode.value, 
        totalPoints
      )

      if (!result) {
        return null
      }

      const { segmentIndex, totalSegments, pointsPerSegment } = result

      return {
        segmentIndex: segmentIndex,
        curveIndex: closestIndex,
        point: closestPoint,
        distance: closestDistance
      }
    }

    // 制御点間に新しい制御点を挿入
    const insertPointAtSegment = (segmentIndex, mouseX, mouseY) => {
      let insertIndex
      if (isLoopMode.value) {
        // ループモードでは、セグメントインデックスに基づいて適切な位置を計算
        // セグメント0 = P0→P1→P2の角P1処理 → P0-P1間の直線部分ならP1前に挿入
        // セグメント1 = P1→P2→P3の角P2処理 → P1-P2間の直線部分ならP2前に挿入
        
        // 曲線上の位置から適切な挿入位置を判定
        if (segmentIndex === 0) {
          // セグメント0: P0-P1間の直線部分またはP1の角部分
          insertIndex = 1 // P1の前に挿入
        } else {
          // その他のセグメント: セグメントの中心点の後に挿入
          insertIndex = (segmentIndex + 2) % points.value.length
          if (insertIndex === 0) {
            insertIndex = points.value.length // 最後に追加
          }
        }
      } else {
        // 非ループモードでは、セグメントの中心点の後に挿入
        // セグメント0: P0→P1→P2の角P1を処理 → P1の後に挿入
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
        
        // ドラッグ中は文書全体でマウスイベントを監視
        document.addEventListener('mousemove', handleDocumentMouseMove)
        document.addEventListener('mouseup', handleDocumentMouseUp)
      }
    }

    // 文書全体でのマウス移動ハンドラー（ドラッグ中専用）
    const handleDocumentMouseMove = (event) => {
      if (isDragging.value) {
        // キャンバス座標に変換
        const rect = canvas.value.getBoundingClientRect()
        const canvasX = (event.clientX - rect.left - panX.value) / zoom.value
        const canvasY = (event.clientY - rect.top - panY.value) / zoom.value
        
        const newX = canvasX - dragOffset.value.x
        const newY = canvasY - dragOffset.value.y

        // 既存のプロパティを保持しながら座標を更新
        points.value[dragPointIndex.value] = {
          ...points.value[dragPointIndex.value],
          x: newX,
          y: newY
        }
        updateCurve()
      }
    }

    // 文書全体でのマウスアップハンドラー（ドラッグ中専用）
    const handleDocumentMouseUp = () => {
      if (isDragging.value) {
        isDragging.value = false
        dragPointIndex.value = -1
        canvas.value.style.cursor = 'crosshair'
        
        // 文書レベルのイベントリスナーを削除
        document.removeEventListener('mousemove', handleDocumentMouseMove)
        document.removeEventListener('mouseup', handleDocumentMouseUp)
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

      // ドラッグ中は文書レベルで処理するため、ここでは何もしない
      if (isDragging.value) {
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
                  overlapResults: overlapResults,
                  backgroundImage: backgroundImage.value && showBackgroundImage.value ? backgroundImage.value : null,
                  imageSettings: imageSettings.value
                })
              }
            })
          }
        } else {
          // 線上かどうかをチェックしてプレビュー点を設定
          const segmentInfo = findSegmentOnCurve(coords.x, coords.y, 20)
          if (segmentInfo) {
            // 既存の制御点に近すぎる場合はプレビューを表示しない
            if (isTooCloseToExistingPoints(segmentInfo.point.x, segmentInfo.point.y, 30)) {
              previewPoint.value = null
            } else {
              canvas.value.style.cursor = 'copy'
              // プレビュー点を線上の実際の点に設定（スナップ）
              previewPoint.value = {
                x: segmentInfo.point.x,  // マウス位置ではなく曲線上の実際の点
                y: segmentInfo.point.y,  // マウス位置ではなく曲線上の実際の点
                segmentIndex: segmentInfo.segmentIndex
              }
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
                  overlapResults: overlapResults,
                  backgroundImage: backgroundImage.value && showBackgroundImage.value ? backgroundImage.value : null,
                  imageSettings: imageSettings.value
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
                    overlapResults: overlapResults,
                    backgroundImage: backgroundImage.value && showBackgroundImage.value ? backgroundImage.value : null,
                    imageSettings: imageSettings.value
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
              overlapResults: overlapResults,
              backgroundImage: backgroundImage.value && showBackgroundImage.value ? backgroundImage.value : null,
              imageSettings: imageSettings.value
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
          // 既存の制御点に近すぎる場合は挿入を阻止
          if (!isTooCloseToExistingPoints(previewPoint.value.x, previewPoint.value.y, 30)) {
            insertPointAtSegment(previewPoint.value.segmentIndex, previewPoint.value.x, previewPoint.value.y)
          }
          previewPoint.value = null // 挿入後にプレビュー点をクリア
        } else {
          // プレビュー点がない場合は線上検索を実行
          const segmentInfo = findSegmentOnCurve(coords.x, coords.y, 12)

          if (segmentInfo && segmentInfo.segmentIndex >= 0) {
            // 既存の制御点に近すぎる場合は挿入を阻止
            if (!isTooCloseToExistingPoints(segmentInfo.point.x, segmentInfo.point.y, 30)) {
              // 線上の場合：制御点間に新しい制御点を挿入（線上の実際の点を使用）
              insertPointAtSegment(segmentInfo.segmentIndex, segmentInfo.point.x, segmentInfo.point.y)
            }
          } else {
            // 空いている場所の場合：既存の制御点に近すぎなければ最後に新しい制御点を追加
            if (!isTooCloseToExistingPoints(coords.x, coords.y, 30)) {
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
    }

    // 全制御点にデフォルト値を適用
    const applyDefaultToAll = () => {
      // 制御点のプロパティを初期化（不足分を補完）
      points.value.forEach((point, index) => {
        if (index > 0 && index < points.value.length - 1) {
          if (!point.spiralMode) {
            point.spiralMode = 'auto'
          }
          if (point.spiralFactor === undefined) {
            point.spiralFactor = defaultSpiralFactor.value
          }
          if (point.radius === undefined) {
            point.radius = defaultRadius.value
          }
          if (point.spiralLength === undefined) {
            point.spiralLength = 50  // デフォルト50m
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

    // アンマウント時にスクロール復元とイベントリスナークリーンアップ
    onUnmounted(() => {
      document.body.style.overflow = 'auto'
      // 文書レベルのイベントリスナーをクリーンアップ
      document.removeEventListener('mousemove', handleDocumentMouseMove)
      document.removeEventListener('mouseup', handleDocumentMouseUp)
    })

    return {
      canvas,
      imageInput,
      showGrid,
      lineOnlyMode,
      fillInsideMode,
      isLoopMode, // ループモードを追加
      showConnectionLines, // 制御点間点線表示
      debugMode, // デバッグモードを追加
      showDefaultSettings, // デフォルト設定パネル表示フラグを追加
      showLegend, // 凡例表示フラグを追加
      sidebarExpanded, // サイドバー展開状態を追加
      backgroundImage, // 背景画像を追加
      imageSettings, // 画像設定を追加
      showBackgroundImage, // 背景画像表示切り替えを追加
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
      updateCanvasTransform,
      handleImageLoad, // 画像読み込み関数を追加
      clearImage, // 画像削除関数を追加
      applyDefaultToAllSimple
    }
  }
}
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
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 3px;
  /* max-height制限を削除してサイドバー全体でスクロール */
}

.point-item-blender {
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.point-item-blender:hover {
  background: #f3f4f6;
}

.point-item-blender.selected {
  background: #3b82f6;
  color: white;
}

.point-item-blender.disabled {
  opacity: 0.5;
  cursor: default;
}

.point-header-blender {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  gap: 6px;
}

.point-summary {
  padding: 4px 8px;
  background: #f3f4f6;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.summary-label {
  font-size: 10px;
  color: #6b7280;
  font-weight: 600;
  min-width: 16px;
}

.summary-input {
  width: 45px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 2px;
  color: #374151;
  padding: 2px 4px;
  font-size: 10px;
}

.summary-unit {
  font-size: 9px;
  color: #6b7280;
}

.point-icon {
  font-size: 8px;
  color: #3b82f6;
  width: 10px;
}

.point-name {
  font-weight: 600;
  font-size: 11px;
  min-width: 20px;
}

.point-coords-compact {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
}

.coord-input-mini {
  width: 40px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 2px;
  color: #374151;
  padding: 2px 4px;
  font-size: 9px;
}

.point-details {
  padding: 8px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.debug-info {
  background: #f3f4f6;
  border-radius: 2px;
  padding: 4px;
}

.debug-values {
  font-family: 'Courier New', monospace;
  color: #6b7280;
}

/* 無効化スタイル */
.property-row.disabled {
  opacity: 0.4;
  pointer-events: none;
}

/* ファイル入力のスタイル（ライトモード） */
.file-input {
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 2px;
  color: #374151;
  padding: 4px 6px;
  font-size: 10px;
  cursor: pointer;
  flex: 1;
}

.file-input::-webkit-file-upload-button {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 2px;
  color: #374151;
  padding: 2px 6px;
  font-size: 9px;
  cursor: pointer;
  margin-right: 6px;
}

.file-input::-webkit-file-upload-button:hover {
  background: #e5e7eb;
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
  overflow: hidden; /* オーバーフローを隠す */
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
  height: 100%;
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
    height: 100%;
  }
}

@media (min-width: 1400px) {
  .container {
    max-width: 1400px;
  }

  canvas {
    height: 100%;
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
  top: 10px;
  right: 220px;
  /* 凡例の左側に配置 */
  z-index: 20;
  display: flex;
  gap: 8px;
  pointer-events: none; /* ドラッグ時の干渉を防ぐ */
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
  pointer-events: auto; /* ボタン自体はクリック可能 */
}

.overlay-btn:hover {
  background: rgba(248, 249, 250, 0.95);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* 凡例オーバーレイ */
.legend-overlay {
  position: absolute;
  top: 10px;
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
  pointer-events: none; /* ドラッグ時の干渉を防ぐ */
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
  pointer-events: auto; /* ヘッダーはクリック可能 */
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

/* 画像設定関連のスタイル */
.image-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-input {
  font-size: 11px;
  padding: 2px;
  border: 1px solid #ddd;
  border-radius: 3px;
  flex: 1;
}

.clear-btn {
  padding: 2px 6px;
  background: #d4342c;
  color: white;
  border: none;
  border-radius: 2px;
  font-size: 10px;
  cursor: pointer;
  margin-left: 4px;
}

.clear-btn:hover {
  background: #b8302a;
}

.image-settings {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.opacity-slider {
  flex: 1;
  margin: 0 8px;
}

.param-row-compact .checkbox-item {
  margin: 0;
  gap: 4px;
}

.param-row-compact .checkbox-item input[type="checkbox"] {
  margin: 0;
}

.param-row-compact .checkbox-item span {
  font-size: 11px;
}
</style>
