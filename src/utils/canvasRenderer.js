import { logger } from './logger.js'

// 色設定を一箇所に集約（ダークモード対応準備）
const COLORS = {
  // 基本色
  background: '#ffffff',
  text: '#000000',
  
  // グリッド
  gridMajor: '#e0e0e0',
  gridMinor: '#f0f0f0',
  
  // 曲線
  straight: '#5a9fd4',      // 直線（青系）
  spiral: '#e53e3e',        // スパイラル（赤系）
  arc: '#f7931e',          // 円弧（オレンジ系）
  clothoid: '#e53e3e',     // 緩和曲線（スパイラルと同色）
  
  // 制御点
  controlPoint: '#2d3748',  // 制御点
  controlPointHover: '#4a5568',
  controlPointSelected: '#3182ce',
  
  // 補助線（目立たない）
  auxiliaryLine: '#a0aec0', // 点線（薄いグレー）
  radiusLine: '#cbd5e0',    // 半径線（更に薄いグレー）
  angleMark: '#9ca3af',     // 角度表示（薄いグレー）
  
  // ホバー・プレビュー
  hoverPoint: '#ed8936',
  previewLine: '#48bb78',
  
  // デバッグ・警告
  overlapWarning: '#dc2626',      // オーバーラップ警告（赤）
  overlapWarningBorder: '#991b1b' // オーバーラップ警告枠（濃い赤）
}

export class CanvasRenderer {
  constructor(canvas, points) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.points = points
    this.zoom = 1
    this.panX = 0
    this.panY = 0
  }

  setTransform(zoom, panX, panY) {
    this.zoom = zoom
    this.panX = panX
    this.panY = panY
  }

  // 背景画像を描画
  drawBackgroundImage(image, settings) {
    // 透過度が0の場合は描画しない
    if (settings.opacity === 0) {
      return
    }
    
    this.ctx.save()
    
    // キャンバス変換を適用
    this.applyTransform()
    
    // 透過度を設定
    this.ctx.globalAlpha = settings.opacity || 0.5
    
    // スケールと反転を計算
    const scaleX = settings.flipX ? -settings.scale : settings.scale
    const scaleY = settings.flipY ? -settings.scale : settings.scale
    
    // 反転時の位置調整
    const x = settings.flipX ? settings.x + image.width * settings.scale : settings.x
    const y = settings.flipY ? settings.y + image.height * settings.scale : settings.y
    
    // 変換を適用
    this.ctx.scale(scaleX, scaleY)
    
    // 画像を描画
    this.ctx.drawImage(
      image,
      x / scaleX,
      y / scaleY,
      image.width,
      image.height
    )
    
    this.ctx.restore()
  }

  applyTransform() {
    this.ctx.setTransform(this.zoom, 0, 0, this.zoom, this.panX, this.panY)
  }

  resetTransform() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
  }

  clear() {
    this.resetTransform()
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.applyTransform()
  }

  drawGrid() {
    const ctx = this.ctx
    
    // ズーム・パンを考慮した表示範囲を計算
    const canvasWidth = this.canvas.width
    const canvasHeight = this.canvas.height
    
    // 変換されたキャンバス座標での表示範囲
    const startX = -this.panX / this.zoom
    const startY = -this.panY / this.zoom
    const endX = (canvasWidth - this.panX) / this.zoom
    const endY = (canvasHeight - this.panY) / this.zoom
    
    // グリッド間隔（ズームに応じて調整）
    let gridSize = 20
    if (this.zoom < 0.5) gridSize = 100
    else if (this.zoom < 1) gridSize = 50
    else if (this.zoom > 2) gridSize = 10
    
    ctx.strokeStyle = COLORS.gridMinor
    ctx.lineWidth = 1 / this.zoom
    
    // グリッドの開始位置を計算
    const gridStartX = Math.floor(startX / gridSize) * gridSize
    const gridStartY = Math.floor(startY / gridSize) * gridSize
    const gridEndX = Math.ceil(endX / gridSize) * gridSize
    const gridEndY = Math.ceil(endY / gridSize) * gridSize
    
    // 縦線
    for (let x = gridStartX; x <= gridEndX; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, gridStartY)
      ctx.lineTo(x, gridEndY)
      ctx.stroke()
    }
    
    // 横線
    for (let y = gridStartY; y <= gridEndY; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(gridStartX, y)
      ctx.lineTo(gridEndX, y)
      ctx.stroke()
    }
  }

  drawCurve(curve) {
    if (curve.length === 0) return
    
    const ctx = this.ctx
    ctx.strokeStyle = COLORS.straight
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    ctx.beginPath()
    ctx.moveTo(curve[0].x, curve[0].y)
    for (let i = 1; i < curve.length; i++) {
      ctx.lineTo(curve[i].x, curve[i].y)
    }
    ctx.stroke()
  }

  drawClothoidCurve(segments, options = {}) {
    if (!segments || segments.length === 0) return
    
    // デバッグ用ログ
    logger.curve.debug(`drawClothoidCurve - セグメント情報 ${segments.length}個`)
    
    const ctx = this.ctx
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    // 線のみ表示モードの場合は全て直線色に統一
    const colors = options.lineOnlyMode ? {
      straight: COLORS.straight,
      spiral: COLORS.straight,
      arc: COLORS.straight,
      clothoid: COLORS.straight,
      connection: COLORS.straight // 接続線
    } : {
      straight: COLORS.straight,
      spiral: COLORS.spiral,
      arc: COLORS.arc,
      clothoid: COLORS.clothoid,
      connection: COLORS.straight // 接続線は直線色
    }
    
    // 新しいセグメント構造かチェック
    const hasOldStructure = segments.some(seg => seg.points && seg.points.length > 0)
    const hasDrawingSegments = segments.some(seg => seg.drawingSegments && seg.drawingSegments.length > 0)
    const hasCurveData = segments.some(seg => seg.curve && seg.curve.length > 0)
    
    if (!hasOldStructure && !hasDrawingSegments && !hasCurveData) {
      console.log('新しいセグメント構造を検出 - 描画用データなし')
      // 新しい構造では、セグメントデータは表示情報のみで、
      // 実際の曲線は外部の curve 配列で描画される
      return false // 呼び出し元にフォールバックを指示
    }
    
    // 描画処理
    segments.forEach((segment, index) => {
      logger.curve.debug(`セグメント ${index}: ${JSON.stringify({
        isLine: segment.isLine,
        TS: segment.TS,
        SC: segment.SC,
        CS: segment.CS,
        ST: segment.ST
      })}`)
      
      let pointsToRender = null
      let segmentType = segment.type || 'clothoid'
      
      // 描画用データの優先順位: points > drawingSegments > curve
      if (segment.points && segment.points.length > 0) {
        // 旧形式のpoints配列
        pointsToRender = segment.points
        logger.curve.debug(`セグメント ${index}: 旧形式points使用 (${segment.points.length}点)`)
      } else if (segment.drawingSegments && segment.drawingSegments.length > 0) {
        // drawingSegments内の各セグメントを個別描画
        segment.drawingSegments.forEach((drawSeg, drawIndex) => {
          if (drawSeg.points && drawSeg.points.length >= 2) {
            const drawType = drawSeg.type || 'clothoid'
            ctx.strokeStyle = colors[drawType] || '#5a9fd4'
            ctx.beginPath()
            ctx.moveTo(drawSeg.points[0].x, drawSeg.points[0].y)
            
            for (let i = 1; i < drawSeg.points.length; i++) {
              ctx.lineTo(drawSeg.points[i].x, drawSeg.points[i].y)
            }
            ctx.stroke()
            
            logger.curve.debug(`セグメント ${index}-${drawIndex} (${drawType}) 描画完了 ${drawSeg.points.length}点`)
          }
        })
        return // 個別描画完了なので次のセグメントへ
      } else if (segment.curve && segment.curve.length > 0) {
        // セグメント用curve配列
        pointsToRender = segment.curve
        logger.curve.debug(`セグメント ${index}: curve配列使用 (${segment.curve.length}点)`)
      }
      
      if (!pointsToRender || pointsToRender.length < 2) {
        logger.curve.debug(`セグメント ${index} をスキップ: 描画データなし`)
        return
      }
      
      ctx.strokeStyle = colors[segmentType] || '#5a9fd4'
      ctx.beginPath()
      ctx.moveTo(pointsToRender[0].x, pointsToRender[0].y)
      
      for (let i = 1; i < pointsToRender.length; i++) {
        ctx.lineTo(pointsToRender[i].x, pointsToRender[i].y)
      }
      ctx.stroke()
      
      logger.curve.debug(`セグメント ${index} (${segmentType}) 描画完了 ${pointsToRender.length}点`)
    })
    
    return true // 正常に描画完了
  }

  drawControlLines() {
    const ctx = this.ctx
    ctx.strokeStyle = '#bbb'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
  }

  drawPoints(showConnectionLines = true, showAngles = false, isLoopMode = false) {
    if (this.points.length === 0) return

    const ctx = this.ctx

    // 制御点間の点線を描画
    if (showConnectionLines && this.points.length > 1) {
      ctx.strokeStyle = COLORS.auxiliaryLine
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5]) // 点線
      
      ctx.beginPath()
      ctx.moveTo(this.points[0].x, this.points[0].y)
      for (let i = 1; i < this.points.length; i++) {
        ctx.lineTo(this.points[i].x, this.points[i].y)
      }
      
      // ループモードの場合、最後の点から最初の点に戻る線を描画
      if (isLoopMode && this.points.length > 2) {
        ctx.lineTo(this.points[0].x, this.points[0].y)
      }
      
      ctx.stroke()
      ctx.setLineDash([]) // 点線リセット
    }

    // 角度表示
    if (showAngles) {
      this.drawAngles(isLoopMode)
    }

    // 全ての制御点を線で結ぶ
    this.points.forEach((point, index) => {
      let color = '#5a9fd4'  // 中間点（青）
      if (index === 0) color = '#d4342c'  // 始点（赤）
      if (index === this.points.length - 1) color = '#2e7d32'  // 終点（緑）
      
      // 点を描画
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI)
      ctx.fill()
      
      // 外枠を描画
      ctx.strokeStyle = COLORS.controlPoint
      ctx.lineWidth = 1
      ctx.stroke()
      
      // ラベルを描画
      ctx.fillStyle = COLORS.text
      ctx.font = '13px Arial'
      ctx.fillText(`P${index}`, point.x + 12, point.y - 12)
      
      // 中間点には半径も表示
      if (index > 0 && index < this.points.length - 1 && point.radius) {
        ctx.font = '11px Arial'
        ctx.fillStyle = COLORS.text
        ctx.fillText(`R${point.radius}`, point.x + 12, point.y + 4)
      }
    })
  }

  // 角度表示メソッド
  drawAngles(isLoopMode = false) {
    const ctx = this.ctx
    
    // 通常モード: 中間点のみ
    for (let i = 1; i < this.points.length - 1; i++) {
      const p0 = this.points[i - 1]
      const p1 = this.points[i]
      const p2 = this.points[i + 1]
      
      this.drawAngleAtPoint(p0, p1, p2, ctx)
    }
    
    // ループモード: 最初と最後の点も角度表示
    if (isLoopMode && this.points.length >= 3) {
      // 最初の点の角度 (最後の点 - 最初の点 - 2番目の点)
      const lastPoint = this.points[this.points.length - 1]
      const firstPoint = this.points[0]
      const secondPoint = this.points[1]
      this.drawAngleAtPoint(lastPoint, firstPoint, secondPoint, ctx)
      
      // 最後の点の角度 (最後から2番目の点 - 最後の点 - 最初の点)
      const secondLastPoint = this.points[this.points.length - 2]
      this.drawAngleAtPoint(secondLastPoint, lastPoint, firstPoint, ctx)
    }
  }
  
  // 指定した3点での角度を描画するヘルパーメソッド
  drawAngleAtPoint(p0, p1, p2, ctx) {
    // ベクトル計算
    const v1 = { x: p0.x - p1.x, y: p0.y - p1.y }
    const v2 = { x: p2.x - p1.x, y: p2.y - p1.y }
    
    // 角度計算
    const angle1 = Math.atan2(v1.y, v1.x)
    const angle2 = Math.atan2(v2.y, v2.x)
    let deflectionAngle = angle2 - angle1
    
    // -π to π の範囲に正規化
    while (deflectionAngle > Math.PI) deflectionAngle -= 2 * Math.PI
    while (deflectionAngle < -Math.PI) deflectionAngle += 2 * Math.PI
    
    // 角度値をシンプルに右下に表示
    ctx.fillStyle = COLORS.angleMark
    ctx.font = '12px Arial'
    const angleText = `${(Math.abs(deflectionAngle) * 180 / Math.PI).toFixed(1)}°`
    ctx.fillText(angleText, p1.x + 15, p1.y + 20)
  }

  // 半径線描画メソッド
  drawRadiusLines(center, SC, CS) {
    const ctx = this.ctx
    
    ctx.strokeStyle = COLORS.radiusLine
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3]) // 点線
    
    // SC-C線
    ctx.beginPath()
    ctx.moveTo(SC.x, SC.y)
    ctx.lineTo(center.x, center.y)
    ctx.stroke()
    
    // C-CS線
    ctx.beginPath()
    ctx.moveTo(center.x, center.y)
    ctx.lineTo(CS.x, CS.y)
    ctx.stroke()
    
    // 円弧の中点への線
    const midAngle = Math.atan2(SC.y - center.y, SC.x - center.x) + 
                    (Math.atan2(CS.y - center.y, CS.x - center.x) - Math.atan2(SC.y - center.y, SC.x - center.x)) / 2
    const radius = Math.sqrt((SC.x - center.x) ** 2 + (SC.y - center.y) ** 2)
    const midX = center.x + radius * Math.cos(midAngle)
    const midY = center.y + radius * Math.sin(midAngle)
    
    ctx.beginPath()
    ctx.moveTo(center.x, center.y)
    ctx.lineTo(midX, midY)
    ctx.stroke()
    
    ctx.setLineDash([]) // 点線リセット
  }

  drawPointsOld() {
    if (this.points.length === 0) return

    const ctx = this.ctx

    // 全ての制御点を線で結ぶ
    for (let i = 0; i < this.points.length - 1; i++) {
      if (i === 0) {
        ctx.moveTo(this.points[i].x, this.points[i].y)
      }
      ctx.lineTo(this.points[i + 1].x, this.points[i + 1].y)
    }
    
    ctx.stroke()
    ctx.setLineDash([])
  }

  drawControlPoints() {
    const ctx = this.ctx
    
    this.points.forEach((point, index) => {
      // 始点と終点は異なる色で描画
      let color = '#5a9fd4'  // 中間点（青）
      if (index === 0) color = '#d4342c'  // 始点（赤）
      if (index === this.points.length - 1) color = '#2e7d32'  // 終点（緑）
      
      // 点を描画
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI)
      ctx.fill()
      
      // 外枠を描画
      ctx.strokeStyle = COLORS.controlPoint
      ctx.lineWidth = 1
      ctx.stroke()
      
      // ラベルを描画
      ctx.fillStyle = COLORS.text
      ctx.font = '13px Arial'
      ctx.fillText(`P${index}`, point.x + 12, point.y - 12)
      
      // 中間点には半径も表示
      if (index > 0 && index < this.points.length - 1 && point.radius) {
        ctx.font = '11px Arial'
        ctx.fillStyle = COLORS.text
        ctx.fillText(`R${point.radius}`, point.x + 12, point.y + 4)
      }
    })
  }

  drawClothoidControlPoints(clothoidData, showRadiusLines = false) {
    if (!clothoidData || clothoidData.isLine) return
    
    const ctx = this.ctx
    
    // 半径線を描画（円弧の場合）
    if (showRadiusLines && clothoidData.center && clothoidData.SC && clothoidData.CS) {
      this.drawRadiusLines(clothoidData.center, clothoidData.SC, clothoidData.CS)
    }
    
    // 複数点の場合
    if (clothoidData.isMultiPoint || clothoidData.segments) {
      this.drawMultiPointClothoidControlPoints(clothoidData, showRadiusLines)
      return
    }
    
    // 単一点の場合の既存処理
    // 実際の座標を使用（利用可能な場合）
    const tsPoint = clothoidData.actualTS || clothoidData.TS
    const stPoint = clothoidData.actualST || clothoidData.ST
    
    const points = [
      { point: tsPoint, label: 'TS', color: '#e53e3e' },
      { point: clothoidData.SC, label: 'SC', color: '#f7931e' },
      { point: clothoidData.CS, label: 'CS', color: '#f7931e' },
      { point: stPoint, label: 'ST', color: '#e53e3e' }
    ]
    
    points.forEach(({ point, label, color }) => {
      if (!point) return
      
      // 点を描画（小さく）
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI)
      ctx.fill()
      
      // 外枠を描画
      ctx.strokeStyle = COLORS.controlPoint
      ctx.lineWidth = 1
      ctx.stroke()
      
      // ラベルを描画（小さく）
      ctx.fillStyle = COLORS.text
      ctx.font = '10px Arial'
      ctx.fillText(label, point.x + 6, point.y - 6)
    })
    
    // 円弧中心も表示（小さく）
    if (clothoidData.center) {
      ctx.fillStyle = COLORS.controlPointSelected
      ctx.beginPath()
      ctx.arc(clothoidData.center.x, clothoidData.center.y, 2, 0, 2 * Math.PI)
      ctx.fill()
      
      ctx.strokeStyle = COLORS.controlPoint
      ctx.lineWidth = 1
      ctx.stroke()
      
      ctx.fillStyle = COLORS.text
      ctx.font = '10px Arial'
      ctx.fillText('C', clothoidData.center.x + 5, clothoidData.center.y - 5)
      
      // 円の輪郭も描画
      if (clothoidData.radius) {
        ctx.strokeStyle = '#9c27b0'
        ctx.lineWidth = 1
        ctx.setLineDash([5, 5]) // 破線
        ctx.beginPath()
        ctx.arc(clothoidData.center.x, clothoidData.center.y, clothoidData.radius, 0, 2 * Math.PI)
        ctx.stroke()
        ctx.setLineDash([]) // 破線をリセット
      }
    }
    
    // 単一セグメントの場合は円を描画
    if (clothoidData.center && clothoidData.radius) {
      // 円弧の半径円を薄く描画
      ctx.strokeStyle = '#e1bee7'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.arc(clothoidData.center.x, clothoidData.center.y, clothoidData.radius, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  drawMultiPointClothoidControlPoints(clothoidData, showRadiusLines = false) {
    if (!clothoidData.segments) return
    
    const ctx = this.ctx
    
    // 新しい統一形式のセグメントデータかチェック
    if (clothoidData.segments.length > 0 && clothoidData.segments[0].segmentIndex !== undefined) {
      // 新形式: セグメント情報に直接ラベル付きポイント情報がある
      clothoidData.segments.forEach((segment, index) => {
        if (!segment) return
        
        const points = [
          { point: segment.TS, label: segment.TSLabel || `TS${index + 1}`, color: '#e53e3e' },
          { point: segment.SC, label: segment.SCLabel || `SC${index + 1}`, color: '#f7931e' },
          { point: segment.CS, label: segment.CSLabel || `CS${index + 1}`, color: '#f7931e' },
          { point: segment.ST, label: segment.STLabel || `ST${index + 1}`, color: '#e53e3e' }
        ]
        
        points.forEach(({ point, label, color }) => {
          if (!point) return
          
          // 点を描画
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI)
          ctx.fill()
          
          // 外枠を描画
          ctx.strokeStyle = '#333'
          ctx.lineWidth = 1
          ctx.stroke()
          
          // ラベルを描画
          ctx.fillStyle = COLORS.text
          ctx.font = '12px Arial'
          ctx.fillText(label, point.x + 6, point.y - 6)
        })
        
        // 円弧中心も表示
        if (segment.center || segment.actualCenter) {
          const center = segment.center || segment.actualCenter
          
          // 半径線を描画
          if (showRadiusLines && segment.SC && segment.CS) {
            this.drawRadiusLines(center, segment.SC, segment.CS)
          }
          
          ctx.fillStyle = COLORS.controlPointSelected
          ctx.beginPath()
          ctx.arc(center.x, center.y, 3, 0, 2 * Math.PI)
          ctx.fill()
          
          ctx.strokeStyle = COLORS.controlPoint
          ctx.lineWidth = 1
          ctx.stroke()
          
          ctx.fillStyle = COLORS.text
          ctx.font = '12px Arial'
          ctx.fillText(`C${index + 1}`, center.x + 5, center.y - 5)
          
          // 半径円を描画
          if (segment.radius) {
            ctx.strokeStyle = '#9c27b0'
            ctx.lineWidth = 1
            ctx.setLineDash([5, 5])
            ctx.beginPath()
            ctx.arc(center.x, center.y, segment.radius, 0, 2 * Math.PI)
            ctx.stroke()
            ctx.setLineDash([])
          }
        }
      })
      return
    }
    
    // 旧形式: セグメントから制御点を抽出
    const allControlPoints = []
    
    // セグメントから制御点を抽出
    for (let i = 0; i < clothoidData.segments.length; i++) {
      const segment = clothoidData.segments[i]
      
      if (segment.type === 'spiral') {
        // スパイラルセグメントの開始点と終了点
        if (segment.points.length > 0) {
          const startPoint = segment.points[0]
          const endPoint = segment.points[segment.points.length - 1]
          
          // 入口スパイラルか出口スパイラルかを判定
          const prevSegment = i > 0 ? clothoidData.segments[i - 1] : null
          const nextSegment = i < clothoidData.segments.length - 1 ? clothoidData.segments[i + 1] : null
          
          if (prevSegment && prevSegment.type === 'straight') {
            // 入口スパイラル: TS (開始点), SC (終了点)
            allControlPoints.push({ point: startPoint, label: 'TS', color: '#e53e3e' })
            if (nextSegment && nextSegment.type === 'arc') {
              allControlPoints.push({ point: endPoint, label: 'SC', color: '#f7931e' })
            }
          } else if (nextSegment && nextSegment.type === 'straight') {
            // 出口スパイラル: CS (開始点), ST (終了点)
            if (prevSegment && prevSegment.type === 'arc') {
              allControlPoints.push({ point: startPoint, label: 'CS', color: '#f7931e' })
            }
            allControlPoints.push({ point: endPoint, label: 'ST', color: '#e53e3e' })
          }
        }
      }
    }
    
    // 制御点を描画
    allControlPoints.forEach(({ point, label, color }) => {
      if (!point) return
      
      // 点を描画（小さく）
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI)
      ctx.fill()
      
      // 外枠を描画
      ctx.strokeStyle = COLORS.controlPoint
      ctx.lineWidth = 1
      ctx.stroke()
      
      // ラベルを描画（小さく）
      ctx.fillStyle = COLORS.text
      ctx.font = '10px Arial'
      ctx.fillText(label, point.x + 6, point.y - 6)
    })
  }

  drawTangentPoints(arcStart, arcEnd) {
    const ctx = this.ctx
    
    // 接点を描画
    ctx.fillStyle = COLORS.hoverPoint
    ctx.beginPath()
    ctx.arc(arcStart[0], arcStart[1], 4, 0, 2 * Math.PI)
    ctx.fill()
    
    ctx.beginPath()
    ctx.arc(arcEnd[0], arcEnd[1], 4, 0, 2 * Math.PI)
    ctx.fill()
    
    // ラベルを描画
    ctx.fillStyle = COLORS.text
    ctx.font = '12px Arial'
    ctx.fillText('TS', arcStart[0] + 8, arcStart[1] - 8)
    ctx.fillText('ST', arcEnd[0] + 8, arcEnd[1] - 8)
  }

  drawCircleCenter(center, radius) {
    const ctx = this.ctx
    
    // 中心点を描画
    ctx.fillStyle = COLORS.controlPointSelected
    ctx.beginPath()
    ctx.arc(center[0], center[1], 3, 0, 2 * Math.PI)
    ctx.fill()
    
    // 半径円を描画（薄く）
    ctx.strokeStyle = COLORS.radiusLine
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.beginPath()
    ctx.arc(center[0], center[1], radius, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // 🎯 SC=CS一致点の特別な描画
  drawSCCSConvergencePoint(convergenceData) {
    if (!convergenceData.isConverged || !convergenceData.convergencePoint) return
    
    const ctx = this.ctx
    const point = convergenceData.convergencePoint
    
    // 一致点に特別なマーカーを描画
    ctx.save()
    
    // 外側の円（注意を引く）
    ctx.strokeStyle = '#FF4444'
    ctx.fillStyle = 'rgba(255, 68, 68, 0.2)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(point.x, point.y, 12, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()
    
    // 内側の円（SC=CS点）
    ctx.fillStyle = '#FF4444'
    ctx.beginPath()
    ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI)
    ctx.fill()
    
    // 中心の白い点
    ctx.fillStyle = COLORS.background
    ctx.beginPath()
    ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI)
    ctx.fill()
    
    // ラベル表示
    ctx.fillStyle = '#FF4444'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('SC=CS', point.x, point.y - 20)
    
    // 収束率表示
    ctx.font = '10px Arial'
    ctx.fillStyle = COLORS.text
    const ratio = Math.round(convergenceData.convergenceRatio * 100)
    ctx.fillText(`${ratio}%`, point.x, point.y - 6)
    
    ctx.restore()
  }

  fillInsideCurve(curve, isLoopMode = false) {
    if (!curve || curve.length < 3) return
    
    const ctx = this.ctx
    
    // 不透明の塗りつぶし色
    ctx.fillStyle = '#87CEEB' // スカイブルー（不透明）
    
    ctx.beginPath()
    
    if (isLoopMode) {
      // ループモードの場合：曲線の点だけを使用（閉じた曲線として塗りつぶし）
      ctx.moveTo(curve[0].x, curve[0].y)
      for (let i = 1; i < curve.length; i++) {
        ctx.lineTo(curve[i].x, curve[i].y)
      }
      logger.curve.debug(`ループモード塗りつぶし: 曲線点のみ ${curve.length}点`)
    } else {
      // 非ループモードの場合：制御点を含めて閉じた多角形を作成
      // P0 → 曲線 → 最後の制御点 → P0 の順で描画
      
      // 開始点（P0）
      const startPoint = this.points[0]
      ctx.moveTo(startPoint.x, startPoint.y)
      
      // 曲線に沿って描画
      for (let i = 0; i < curve.length; i++) {
        ctx.lineTo(curve[i].x, curve[i].y)
      }
      
      // 最後の制御点（PN）まで直線で戻る
      const endPoint = this.points[this.points.length - 1]
      ctx.lineTo(endPoint.x, endPoint.y)
      
      logger.curve.debug(`非ループモード塗りつぶし: P0→曲線${curve.length}点→PN`)
    }
    
    // パスを閉じて塗りつぶし
    ctx.closePath()
    ctx.fill()
    
    logger.curve.debug(`曲線内塗りつぶし完了 曲線点:${curve.length} ループ:${isLoopMode}`)
  }

  render(curve, options = {}) {
    const {
      showGrid = true,
      clothoidData = null,
      lineOnlyMode = false,
      fillInsideMode = false,
      previewPoint = null,
      showConnectionLines = true,
      showAngles = false,
      showRadiusLines = false,
      isLoopMode = false,
      debugMode = false,
      overlapResults = null,
      backgroundImage = null,
      imageSettings = null
    } = options

    logger.curve.debug(`render() 呼び出し curve:${curve ? `${curve.length}点` : 'null'} clothoidData:${clothoidData ? '存在' : 'null'} segments:${clothoidData?.segments ? `${clothoidData.segments.length}個` : 'なし'} fillInside:${fillInsideMode} preview:${previewPoint ? '有' : '無'} backgroundImage:${backgroundImage ? '有' : '無'}`)
    
    this.clear()
    
    // 背景画像を最初に描画
    if (backgroundImage && imageSettings) {
      this.drawBackgroundImage(backgroundImage, imageSettings)
    }
    
    if (showGrid) {
      this.drawGrid()
    }

    // 塗りつぶしモードの場合、最初に内部を塗りつぶす
    if (fillInsideMode && curve && curve.length > 3) {
      this.fillInsideCurve(curve, isLoopMode)
    }
    
    // 緩和曲線データがある場合は制御線を描画しない（実際の曲線で十分）
    if (!lineOnlyMode && !clothoidData) {
      this.drawControlLines()
    }
    
    // 緩和曲線の場合はセグメント別に描画
    if (clothoidData && clothoidData.segments) {
      logger.curve.debug(`セグメント描画を実行 ${clothoidData.segments.length}個`)
      const segmentDrawResult = this.drawClothoidCurve(clothoidData.segments, { lineOnlyMode })
      
      // セグメント描画が失敗した場合（新しい構造）は通常の曲線描画にフォールバック
      if (segmentDrawResult === false && curve && curve.length > 0) {
        console.log('セグメント描画失敗 - 通常曲線描画にフォールバック')
        this.drawCurve(curve)
      }
    } else if (curve && curve.length > 0) {
      console.log('通常曲線描画を実行:', curve)
      this.drawCurve(curve)
    } else {
      console.log('描画データなし - フォールバック処理')
      // clothoidDataがあるが古い形式の場合、通常の曲線描画にフォールバック
      if (clothoidData && curve && curve.length > 0) {
        console.log('フォールバック: 通常曲線描画')
        this.drawCurve(curve)
      }
    }
    
    if (!lineOnlyMode) {
      this.drawPoints(showConnectionLines && !lineOnlyMode, showAngles && !lineOnlyMode, isLoopMode)
      
      // 緩和曲線の制御点を描画
      if (clothoidData) {
        this.drawClothoidControlPoints(clothoidData, showRadiusLines && !lineOnlyMode)
        
        // 円を描画
        if (clothoidData.circles && clothoidData.circles.length > 0) {
          this.drawCircles(clothoidData.circles)
        }
        
        // 🎯 SC=CS一致点を描画（特別な表示）
        if (clothoidData.segments) {
          clothoidData.segments.forEach(segment => {
            if (segment.sccsConvergence) {
              this.drawSCCSConvergencePoint(segment.sccsConvergence)
            }
          })
        }
      }
    }
    
    // プレビュー点を描画（最後に描画して最前面に表示）
    if (previewPoint) {
      this.drawPreviewPoint(previewPoint)
    }
    
    // デバッグモード：オーバーラップアイコンを描画
    if (debugMode && overlapResults && overlapResults.hasOverlaps) {
      this.drawOverlapIcons(overlapResults, clothoidData)
    }
  }

  drawCircles(circles) {
    const ctx = this.ctx
    
    circles.forEach((circle, index) => {
      if (!circle.center || !circle.radius) return
      
      // 円の輪郭を描画
      ctx.strokeStyle = '#9c27b0'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5]) // 破線
      ctx.beginPath()
      ctx.arc(circle.center.x, circle.center.y, circle.radius, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.setLineDash([]) // 破線をリセット
    })
  }

  // プレビュー点を描画
  drawPreviewPoint(previewPoint) {
    if (!previewPoint || !previewPoint.x || !previewPoint.y) return

    const ctx = this.ctx
    const pointRadius = 4 / this.zoom // ズームに応じてサイズ調整（TS/SC/CSと同じサイズ）
    
    // プレビュー点をP1（中間点）と同じ色で描画
    ctx.fillStyle = '#5a9fd4' // P1と同じ青色
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 1 / this.zoom // ズームに応じて線の太さ調整
    
    ctx.beginPath()
    ctx.arc(previewPoint.x, previewPoint.y, pointRadius, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()
    
    // 小さな十字記号を中央に描画
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 1 / this.zoom
    const crossSize = pointRadius * 0.6
    
    ctx.beginPath()
    ctx.moveTo(previewPoint.x - crossSize, previewPoint.y)
    ctx.lineTo(previewPoint.x + crossSize, previewPoint.y)
    ctx.moveTo(previewPoint.x, previewPoint.y - crossSize)
    ctx.lineTo(previewPoint.x, previewPoint.y + crossSize)
    ctx.stroke()
  }

  // オーバーラップ警告アイコンを描画
  drawOverlapIcons(overlapResults, clothoidData) {
    if (!overlapResults || !overlapResults.overlaps || !clothoidData || !clothoidData.segments) {
      return
    }

    const ctx = this.ctx
    const iconSize = 12 / this.zoom // ズームに応じてサイズ調整

    overlapResults.overlaps.forEach((overlap, index) => {
      // ST-TSの中点を計算
      let centerX, centerY

      if (overlap.points && overlap.points.ST && overlap.points.TS) {
        // オーバーラップデータから直接ST-TS座標を取得
        centerX = (overlap.points.ST[0] + overlap.points.TS[0]) / 2
        centerY = (overlap.points.ST[1] + overlap.points.TS[1]) / 2
      } else if (overlap.segmentIndex !== undefined && clothoidData.segments[overlap.segmentIndex]) {
        // セグメントインデックスからST-TS座標を取得
        const segment = clothoidData.segments[overlap.segmentIndex]
        if (segment.ST && segment.TS) {
          centerX = (segment.ST.x + segment.TS.x) / 2
          centerY = (segment.ST.y + segment.TS.y) / 2
        } else {
          console.warn(`セグメント${overlap.segmentIndex}にST/TSデータが存在しません`)
          return
        }
      } else {
        console.warn(`オーバーラップ${index}の位置情報が不足しています`, overlap)
        return
      }

      // 警告アイコン（三角形）を描画
      ctx.fillStyle = COLORS.overlapWarning
      ctx.strokeStyle = COLORS.overlapWarningBorder
      ctx.lineWidth = 2 / this.zoom

      // 三角形の警告アイコン
      ctx.beginPath()
      ctx.moveTo(centerX, centerY - iconSize)           // 上
      ctx.lineTo(centerX - iconSize * 0.866, centerY + iconSize * 0.5)  // 左下
      ctx.lineTo(centerX + iconSize * 0.866, centerY + iconSize * 0.5)  // 右下
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // 感嘆符を描画
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${Math.max(8, iconSize * 0.8) / this.zoom}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('!', centerX, centerY - iconSize * 0.1)
    })
  }
}
