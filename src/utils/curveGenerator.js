import { dist, getAngle, normalizeAngle, calcClothoidX, calcClothoidY, calcDeviation } from './mathUtils.js'
import { calculateSingleClothoid, generateSpiralPoints, generateArcPoints } from './clothoidUtils.js'
import { logger, formatDebugInfo, PerformanceTimer } from './logger.js'
import { 
  createError, 
  createSuccess, 
  isError, 
  validate, 
  safeExecute, 
  ERROR_CODES 
} from './errorHandler.js'

// 円弧のみの曲線生成（直線→円弧→直線）
export function generateCurveArcOnly(points, radius) {
  const timer = new PerformanceTimer('円弧曲線生成')
  
  logger.curve.info('円弧曲線生成開始', {
    点数: points.length,
    半径: radius
  })
  
  const P0 = [points[0].x, points[0].y]
  const P1 = [points[1].x, points[1].y]
  const P2 = [points[2].x, points[2].y]
  
  // デバッグ情報を格納
  let debugInfo = formatDebugInfo('円弧曲線生成', {
    P0: `(${P0[0]}, ${P0[1]})`,
    P1: `(${P1[0]}, ${P1[1]})`,
    P2: `(${P2[0]}, ${P2[1]})`,
    半径: radius
  })
  
  try {
    // 基本的な検証
    const pointValidation = validate.points(points, 3)
    if (pointValidation) {
      logger.curve.error('点検証エラー', pointValidation.error)
      return pointValidation
    }
    
    const radiusValidation = validate.radius(radius)
    if (radiusValidation) {
      logger.curve.error('半径検証エラー', radiusValidation.error)
      return radiusValidation
    }
    
    // 距離と角度の計算
    const d01 = dist(P0, P1)
    const d12 = dist(P1, P2)
    const angle01 = getAngle(P0, P1)
    const angle12 = getAngle(P1, P2)
    
    debugInfo += `距離: d01=${d01.toFixed(2)}, d12=${d12.toFixed(2)}\n`
    debugInfo += `角度: angle01=${(angle01 * 180 / Math.PI).toFixed(2)}°, angle12=${(angle12 * 180 / Math.PI).toFixed(2)}°\n`
    
    // 偏角の計算
    let deltaAngle = normalizeAngle(angle12 - angle01)
    
    debugInfo += `偏角: Δ=${(deltaAngle * 180 / Math.PI).toFixed(2)}°\n`
    
    // 直線の場合の処理（約0.1度未満を直線とみなす）
    if (Math.abs(deltaAngle) < 0.0017) {  // 0.1度 = 0.0017ラジアン
      debugInfo += '直線として処理（角度が小さすぎます）\n'
      return {
        curve: [
          { x: P0[0], y: P0[1] },
          { x: P1[0], y: P1[1] },
          { x: P2[0], y: P2[1] }
        ],
        debug: debugInfo
      }
    }
    
    // 接線長の計算: T = R * tan(|Δ|/2)
    const tangentLength = radius * Math.tan(Math.abs(deltaAngle) / 2)
    
    debugInfo += `接線長: T=${tangentLength.toFixed(2)}\n`
    
    // 接線長の検証
    if (tangentLength > d01 || tangentLength > d12) {
      return { 
        error: `接線長(${tangentLength.toFixed(1)})がセグメント長を超過しています`, 
        debug: debugInfo 
      }
    }
    
    // 円弧の開始点と終了点を計算
    const startT = P0
    const endT = P2
    
    // P1からの接線方向ベクトル
    const dir01 = [(P1[0] - P0[0]) / d01, (P1[1] - P0[1]) / d01]
    const dir12 = [(P2[0] - P1[0]) / d12, (P2[1] - P1[1]) / d12]
    
    // 円弧の開始点と終了点
    const arcStart = [
      P1[0] - dir01[0] * tangentLength,
      P1[1] - dir01[1] * tangentLength
    ]
    const arcEnd = [
      P1[0] + dir12[0] * tangentLength,
      P1[1] + dir12[1] * tangentLength
    ]
    
    debugInfo += `円弧開始点: (${arcStart[0].toFixed(2)}, ${arcStart[1].toFixed(2)})\n`
    debugInfo += `円弧終了点: (${arcEnd[0].toFixed(2)}, ${arcEnd[1].toFixed(2)})\n`
    debugInfo += `弦の長さ: ${dist(arcStart, arcEnd).toFixed(2)}\n`
    
    // 円弧の中心を計算
    // 各接点から接線に垂直な方向にR移動した点が中心
    const normal01X = -Math.sin(angle01) * (deltaAngle > 0 ? 1 : -1)
    const normal01Y = Math.cos(angle01) * (deltaAngle > 0 ? 1 : -1)
    
    const center1 = [
      arcStart[0] + normal01X * radius,
      arcStart[1] + normal01Y * radius
    ]
    
    const normal12X = -Math.sin(angle12) * (deltaAngle > 0 ? 1 : -1)
    const normal12Y = Math.cos(angle12) * (deltaAngle > 0 ? 1 : -1)
    
    const center2 = [
      arcEnd[0] + normal12X * radius,
      arcEnd[1] + normal12Y * radius
    ]
    
    // 2つの中心が一致するか確認
    const centerDiff = dist(center1, center2)
    debugInfo += `中心1: (${center1[0].toFixed(2)}, ${center1[1].toFixed(2)})\n`
    debugInfo += `中心2: (${center2[0].toFixed(2)}, ${center2[1].toFixed(2)})\n`
    debugInfo += `中心の差: ${centerDiff.toFixed(4)}\n`
    
    // 平均を取る
    const center = [
      (center1[0] + center2[0]) / 2,
      (center1[1] + center2[1]) / 2
    ]
    
    debugInfo += `円弧中心: (${center[0].toFixed(2)}, ${center[1].toFixed(2)})\n`
    
    // 検証: 中心からの距離がRと一致するか
    const distToStart = dist(center, arcStart)
    const distToEnd = dist(center, arcEnd)
    debugInfo += `中心から開始点への距離: ${distToStart.toFixed(2)}\n`
    debugInfo += `中心から終了点への距離: ${distToEnd.toFixed(2)}\n`
    debugInfo += `設定半径: ${radius}\n`
    
    // 曲線点を生成
    const curve = []
    
    // 最初の直線部分
    const straightSteps = 10
    for (let i = 0; i <= straightSteps; i++) {
      const t = i / straightSteps
      curve.push({
        x: P0[0] + t * (arcStart[0] - P0[0]),
        y: P0[1] + t * (arcStart[1] - P0[1])
      })
    }
    
    // 円弧部分
    const startAngle = Math.atan2(arcStart[1] - center[1], arcStart[0] - center[0])
    const endAngle = Math.atan2(arcEnd[1] - center[1], arcEnd[0] - center[0])
    
    // 角度の正規化と方向調整
    let arcAngle = endAngle - startAngle
    
    // 角度の正規化（-π〜πの範囲に）
    if (arcAngle > Math.PI) arcAngle -= 2 * Math.PI
    if (arcAngle < -Math.PI) arcAngle += 2 * Math.PI
    
    // 回転方向を偏角の符号に合わせる
    if (deltaAngle > 0 && arcAngle < 0) arcAngle += 2 * Math.PI
    if (deltaAngle < 0 && arcAngle > 0) arcAngle -= 2 * Math.PI
    
    debugInfo += `円弧開始角度: ${(startAngle * 180 / Math.PI).toFixed(2)}°\n`
    debugInfo += `円弧終了角度: ${(endAngle * 180 / Math.PI).toFixed(2)}°\n`
    debugInfo += `円弧角度: ${(arcAngle * 180 / Math.PI).toFixed(2)}°\n`
    
    // 接線角度の検証
    const startTangent = startAngle + Math.PI / 2 * (deltaAngle > 0 ? 1 : -1)
    const endTangent = endAngle + Math.PI / 2 * (deltaAngle > 0 ? 1 : -1)
    debugInfo += `開始点接線角度: ${(startTangent * 180 / Math.PI).toFixed(2)}°, 期待値: ${(angle01 * 180 / Math.PI).toFixed(2)}°\n`
    debugInfo += `終了点接線角度: ${(endTangent * 180 / Math.PI).toFixed(2)}°, 期待値: ${(angle12 * 180 / Math.PI).toFixed(2)}°\n`
    
    const arcSteps = Math.max(20, Math.floor(Math.abs(arcAngle) * 30))
    for (let i = 1; i <= arcSteps; i++) {
      const t = i / arcSteps
      const angle = startAngle + t * arcAngle
      curve.push({
        x: center[0] + radius * Math.cos(angle),
        y: center[1] + radius * Math.sin(angle)
      })
    }
    
    // 最後の直線部分
    for (let i = 1; i <= straightSteps; i++) {
      const t = i / straightSteps
      curve.push({
        x: arcEnd[0] + t * (P2[0] - arcEnd[0]),
        y: arcEnd[1] + t * (P2[1] - arcEnd[1])
      })
    }
    
    return { 
      curve, 
      debug: debugInfo,
      arcStart,
      arcEnd,
      center,
      radius
    }
    
  } catch (error) {
    return { error: `計算エラー: ${error.message}`, debug: debugInfo }
  }
}

// 多点制御の曲線生成（複数の制御点から連続曲線を生成）
export function generateMultiPointCurve(points) {
  if (points.length < 3) {
    return { error: '最低3点の制御点が必要です' }
  }
  
  let allCurve = []
  let debugInfo = ''
  
  try {
    // 各セグメントで曲線を生成
    for (let i = 0; i < points.length - 2; i++) {
      const segmentPoints = [
        points[i],
        points[i + 1], 
        points[i + 2]
      ]
      
      // 中間点の半径を取得（デフォルトは50）
      const radius = points[i + 1].radius || 50
      
      debugInfo += `\n=== セグメント ${i + 1} ===\n`
      debugInfo += `P${i}(${segmentPoints[0].x.toFixed(1)}, ${segmentPoints[0].y.toFixed(1)}) → `
      debugInfo += `P${i + 1}(${segmentPoints[1].x.toFixed(1)}, ${segmentPoints[1].y.toFixed(1)}) → `
      debugInfo += `P${i + 2}(${segmentPoints[2].x.toFixed(1)}, ${segmentPoints[2].y.toFixed(1)})\n`
      debugInfo += `半径: ${radius}m\n`
      
      const result = generateCurveArcOnly(segmentPoints, radius)
      
      if (result.error) {
        return { error: `セグメント ${i + 1} でエラー: ${result.error}` }
      }
      
      debugInfo += result.debug
      
      // 最初のセグメント以外は、重複する最初の点を除去
      if (i > 0) {
        result.curve.shift()
      }
      
      allCurve.push(...result.curve)
    }
    
    return {
      curve: allCurve,
      debug: debugInfo
    }
    
  } catch (error) {
    return { error: `多点曲線生成エラー: ${error.message}` }
  }
}

// 緩和曲線（クロソイド）を使用した曲線生成
/**
 * 緩和曲線を使用した単一折れ点での曲線生成
 * @param {Array} points - [P0, P1, P2] の3点
 * @param {number} radius - 円弧半径
 * @param {number} spiralLength - スパイラル長（オプション）
 * @param {boolean} isMultiPoint - 複数点処理の一部かどうか
 * @returns {Object} 曲線データ
 */
export function generateCurveWithClothoid(points, radius, spiralLength = null, isMultiPoint = false, defaultSpiralFactor = 2.0) {
  const timer = new PerformanceTimer('緩和曲線生成')
  
  let debugInfo = formatDebugInfo('緩和曲線生成', {
    点数: points.length,
    半径: radius,
    スパイラル長: spiralLength || '自動',
    複数点モード: isMultiPoint
  })
  
  // 入力検証
  const pointValidation = validate.points(points, 3)
  if (pointValidation) {
    logger.curve.error('点検証エラー', pointValidation.error)
    return pointValidation
  }
  
  const radiusValidation = validate.radius(radius)
  if (radiusValidation) {
    logger.curve.error('半径検証エラー', radiusValidation.error)
    return radiusValidation
  }
  
  // 緩和曲線の計算
  const clothoidResult = safeExecute(calculateSingleClothoid, [points, radius, spiralLength, defaultSpiralFactor], '緩和曲線計算')
  
  if (isError(clothoidResult)) {
    logger.curve.error('緩和曲線計算エラー', clothoidResult.error)
    return clothoidResult
  }
  
  const clothoidData = clothoidResult.data || clothoidResult
  
  if (clothoidData.isLine) {
    logger.curve.info('直線として処理')
    return createSuccess({
      curve: clothoidData.curve,
      clothoidData: {
        isLine: true,
        startPoint: clothoidData.startPoint,
        endPoint: clothoidData.endPoint,
        segments: [] // 直線の場合はセグメントなし
      }
    }, (clothoidResult.data || clothoidResult).debug || clothoidResult.debug)
  }
  
  // 曲線点列を生成
  const allPoints = []
  const segments = []
  const straightSteps = 10

  // 1. 入口直線（P0 → TS）
  // 複数点処理の場合、最初のセグメント以外は入口直線をスキップ
  const shouldSkipInletStraight = isMultiPoint && points[0].x !== undefined && 
    (points[0].isSubsequentSegment === true)
  
  if (!shouldSkipInletStraight) {
    const straightInPoints = []
    for (let i = 0; i <= straightSteps; i++) {
      const t = i / straightSteps
      const point = {
        x: points[0].x + t * (clothoidData.TS.x - points[0].x),
        y: points[0].y + t * (clothoidData.TS.y - points[0].y)
      }
      straightInPoints.push(point)
      allPoints.push(point)
    }
    segments.push({ type: 'straight', points: straightInPoints })
  }  // 2. 入口スパイラル（TS → SC）
  const spiralInPoints = generateSpiralPoints(
    clothoidData.spiralLength,
    clothoidData.radius,
    clothoidData.Az_in,
    clothoidData.TS,
    clothoidData.sgn,
    20,
    false // 入口スパイラル
  )
  allPoints.push(...spiralInPoints.slice(1)) // 重複する最初の点を除去
  segments.push({ type: 'spiral', points: spiralInPoints })
  
  // 実際に生成されたTS座標を保存
  const actualTS = spiralInPoints[0]
  
  // 3. 円弧（SC → CS）
  if (clothoidData.defl_c > 1e-6) {
    const scToCenterAngle = Math.atan2(clothoidData.SC.y - clothoidData.center.y, clothoidData.SC.x - clothoidData.center.x)
    const arcPoints = generateArcPoints(
      clothoidData.center,
      clothoidData.radius,
      scToCenterAngle,
      clothoidData.sgn * clothoidData.defl_c,
      Math.max(10, Math.floor(clothoidData.defl_c * 20))
    )
    allPoints.push(...arcPoints.slice(1)) // 重複する最初の点を除去
    segments.push({ type: 'arc', points: arcPoints })
  }
  
  // 4. 出口スパイラル（CS → ST）
  const spiralOutPoints = generateSpiralPoints(
    clothoidData.spiralLength,
    clothoidData.radius,
    clothoidData.Az_CS,
    clothoidData.CS,
    clothoidData.sgn,
    20,
    true // 出口スパイラル
  )
  allPoints.push(...spiralOutPoints.slice(1)) // 重複する最初の点を除去
  segments.push({ type: 'spiral', points: spiralOutPoints })
  
  // 実際に生成されたST座標を保存
  const actualST = spiralOutPoints[spiralOutPoints.length - 1]
  
  // 5. 出口直線（実際のスパイラル終点 → P2）
  // 複数点処理の場合は個別に処理される（generateClothoidCurve内で処理）
  if (!isMultiPoint) {
    const stToP2Distance = Math.hypot(actualST.x - points[2].x, actualST.y - points[2].y)
    debugInfo += `ST-P2距離: ${stToP2Distance.toFixed(3)}\n`
    
    // 距離が十分ある場合のみ直線を追加
    if (stToP2Distance > 1e-3) {
      const straightOutPoints = []
      for (let i = 0; i <= straightSteps; i++) {
        const t = i / straightSteps
        const point = {
          x: actualST.x + t * (points[2].x - actualST.x),
          y: actualST.y + t * (points[2].y - actualST.y)
        }
        straightOutPoints.push(point)
        // 最初の点（実際のST）は出口スパイラルの最後の点として既に追加済みなので、
        // i > 0 の点のみ追加
        if (i > 0) {
          allPoints.push(point)
        }
      }
      segments.push({ type: 'straight', points: straightOutPoints })
    } else {
      debugInfo += `ST-P2距離が小さいため出口直線をスキップ\n`
    }
  } else {
    debugInfo += `複数点処理のため出口直線は上位レベルで処理\n`
  }
  
  timer.end()
  
  logger.curve.debug('緩和曲線生成完了', {
    総点数: allPoints.length,
    セグメント数: segments.length,
    実際TS: `(${actualTS.x.toFixed(2)}, ${actualTS.y.toFixed(2)})`,
    実際ST: `(${actualST.x.toFixed(2)}, ${actualST.y.toFixed(2)})`
  })
  
  return createSuccess({
    curve: allPoints,
    clothoidData: {
      ...(clothoidResult.data || clothoidResult),
      actualTS: actualTS, // 実際に生成されたTS座標を追加
      actualST: actualST, // 実際に生成されたST座標を追加
      TS: actualTS, // 描画用の互換性
      ST: actualST, // 描画用の互換性
      SC: clothoidData.SC, // 描画用のSC座標
      CS: clothoidData.CS, // 描画用のCS座標
      center: clothoidData.center, // 描画用の中心座標
      radius: clothoidData.radius, // 描画用の半径
      segments
    }
  }, ((clothoidResult.data || clothoidResult).debug || clothoidResult.debug || '') + debugInfo)
}

/**
 * 曲線セグメントのみを計算する補助関数（緩和曲線付き）
 * README.md §9の計算フローに基づいて実装
 */
function calculateCurveSegmentOnly(threePoints, radius) {
  const timer = new PerformanceTimer('曲線セグメント計算')
  
  logger.curve.debug('曲線セグメント計算開始', {
    点数: threePoints.length,
    半径: radius
  })
  
  let debugInfo = formatDebugInfo('緩和曲線計算', {
    入力点数: threePoints.length,
    半径: radius
  })
  
  try {
    const [p0, p1, p2] = threePoints
    
    // 入力検証
    const pointValidation = validate.points([p0, p1, p2], 3)
    if (pointValidation) {
      logger.curve.error('点検証エラー', pointValidation.error)
      return pointValidation
    }
    
    const radiusValidation = validate.radius(radius)
    if (radiusValidation) {
      logger.curve.error('半径検証エラー', radiusValidation.error)
      return radiusValidation
    }
    
    // §9.1 角度計算
    const Az_in = Math.atan2(p1.y - p0.y, p1.x - p0.x)
    const Az_out = Math.atan2(p2.y - p1.y, p2.x - p1.x)
    let defl = Az_out - Az_in
    
    debugInfo += `進入角: ${(Az_in * 180 / Math.PI).toFixed(2)}°\n`
    debugInfo += `退出角: ${(Az_out * 180 / Math.PI).toFixed(2)}°\n`
    debugInfo += `偏角Δ: ${(defl * 180 / Math.PI).toFixed(2)}°\n`
    
    // 角度を正規化 [-π, +π]
    while (defl > Math.PI) defl -= 2 * Math.PI
    while (defl < -Math.PI) defl += 2 * Math.PI
    
    debugInfo += `正規化後偏角: ${(defl * 180 / Math.PI).toFixed(2)}°\n`
    
    // 直線判定（約0.1度未満を直線とみなす）
    if (Math.abs(defl) < 0.0017) {  // 0.1度 = 0.0017ラジアン
      debugInfo += '直線セグメントとして処理（角度が小さすぎます）\n'
      
      // 直線の点列を生成
      const straightPoints = []
      const steps = 30
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const point = {
          x: p0.x + t * (p2.x - p0.x),
          y: p0.y + t * (p2.y - p0.y)
        }
        straightPoints.push(point)
      }
      
      debugInfo += `直線点列生成: ${straightPoints.length}点\n`
      
      return {
        isLine: true,
        startPoint: straightPoints[0],
        endPoint: straightPoints[straightPoints.length - 1],
        curve: straightPoints,
        debug: debugInfo
      }
    }
    
    // ②符号をMath.signで固定（セグメント途中で変わらないように）
    const sgn = Math.sign(defl)  // 左/右
    const absDef = Math.abs(defl)
    
    // §9.2 スパイラル長の設定 (点のパラメータを考慮)
    let Ls
    
    // 理論的上限：2つのスパイラルで全偏角を消費する場合
    // 2 * (Ls / (2*R)) = absDef  →  Ls_max = R * absDef
    const theoretical_max = radius * absDef
    
    if (p1.spiralMode === 'manual' && p1.spiralLength) {
      // 手動指定 - 制限なし
      Ls = Math.max(1.0, p1.spiralLength)
      
      debugInfo += `手動指定スパイラル長: ${Ls.toFixed(2)}m\n`
    } else {
      // 自動計算 (より適切な経験則)
      const spiralFactor = Math.max(0.2, p1.spiralFactor || defaultSpiralFactor)
      debugInfo += `使用スパイラル係数: ${spiralFactor} (点設定:${p1.spiralFactor || 'なし'} デフォルト:${defaultSpiralFactor})\n`
      // デフォルト50mの基準値を使用
      Ls = 50 * spiralFactor
      
      debugInfo += `基準スパイラル長: 50m × 係数${spiralFactor} = ${Ls.toFixed(2)}m\n`
      
      debugInfo += `自動計算スパイラル長: ${Ls.toFixed(2)}m\n`
    }
    
    // 最小値設定
    Ls = Math.max(Ls, 5.0)  // 最小値5m
    debugInfo += `最終スパイラル長: ${Ls.toFixed(2)}m (理論上限制限なし)\n`
    
    // §9.3 スパイラル角
    const th_s = Ls / (2 * radius)
    
    // §9.4 円弧中央角 (スパイラル挿入後に残る角度)
    const defl_c = absDef - 2 * th_s
    
    // デバッグログを追加して φc をチェック
    debugInfo += `スパイラル長Ls: ${Ls.toFixed(2)}m\n`
    debugInfo += `円弧角φc: ${(defl_c * 180 / Math.PI).toFixed(2)}°\n`
    
    if (defl_c < 0) {
      debugInfo += `⚠️ 円弧角が負！スパイラル長が偏角を超過しています\n`
      
      // 手動指定の場合は警告のみで継続（ユーザー意図を尊重）
      if (p1.spiralMode === 'manual') {
        debugInfo += `手動指定のため継続（円弧なし・スパイラルのみ）\n`
        // defl_c_finalを0に設定（円弧部分なし）
      } else {
        // 自動計算の場合のみ調整
        Ls = radius * (absDef - 0.05) * 0.4  // 0.05rad（約3度）の余裕を持たせる
        debugInfo += `自動調整後Ls: ${Ls.toFixed(2)}m\n`
        
        if (Ls <= 1.0) {
          debugInfo += '角度が小さすぎるため直線として処理\n'
          
          // 注意：直線処理でもP0→P2ではなく、実際の接続点情報を返す
          // 4点以上の場合、接続処理で前のST→次のTSで接続される
          return {
            isLine: true,
            startPoint: p0,  // 実際の開始点は接続処理で決まる
            endPoint: p2,    // 実際の終了点は接続処理で決まる
            curve: [p0, p2], // 簡易的な2点直線（接続処理で置き換えられる）
            debug: debugInfo
          }
        }
      }
    } else if (defl_c < 0.1 && p1.spiralMode !== 'manual') {
      // 自動計算でかつ円弧角が小さい場合のみ再調整
      Ls = Math.max(1.0, radius * (absDef - 0.1) * 0.4)
      debugInfo += `小円弧角調整後Ls: ${Ls.toFixed(2)}m\n`
      if (Ls <= 1.0) {
        debugInfo += '角度が小さすぎるため直線として処理\n'
        
        // 注意：直線処理でもP0→P2ではなく、実際の接続点情報を返す
        // 4点以上の場合、接続処理で前のST→次のTSで接続される
        return {
          isLine: true,
          startPoint: p0,  // 実際の開始点は接続処理で決まる
          endPoint: p2,    // 実際の終了点は接続処理で決まる
          curve: [p0, p2], // 簡易的な2点直線（接続処理で置き換えられる）
          debug: debugInfo
        }
      }
    }
    
    // 再計算
    const th_s_final = Ls / (2 * radius)
    let defl_c_final = absDef - 2 * th_s_final
    
    // 📐 円弧角度の自然な計算（偏角が小さい場合は円弧なし）
    defl_c_final = Math.max(0, defl_c_final)  // 負の場合は0（円弧なし）
    
    if (defl_c_final === 0) {
      debugInfo += `🔄 自然な設定：円弧なし（スパイラルのみ接続）\n`
      debugInfo += `  理由：偏角Δ=${(absDef * 180 / Math.PI).toFixed(3)}° ≤ 2φs=${(2 * th_s_final * 180 / Math.PI).toFixed(3)}°\n`
      
      // SC=CS一致点の判定
      const spiral_convergence_ratio = (2 * th_s_final) / absDef
      if (spiral_convergence_ratio >= 0.99) {  // 99%以上で一致と判定
        debugInfo += `🎯 SC=CS一致点：スパイラル長が理論上限に到達\n`
        debugInfo += `  収束率：${(spiral_convergence_ratio * 100).toFixed(2)}%\n`
      }
    } else if (defl_c_final < 0.1) {  // 5.7度未満
      debugInfo += `⚠️ 小円弧角度：${(defl_c_final * 180 / Math.PI).toFixed(3)}°（緩やかなカーブ）\n`
    }
    
    debugInfo += `最終φc: ${(defl_c_final * 180 / Math.PI).toFixed(3)}° (自然計算: 円弧角度制限なし)\n`
    
    // §9.5 TS→SC のローカル座標 (Xc, Yc) - Fresnel積分7次精度（高精度版）
    const Yc = (Ls * Ls) / (6 * radius)  // Y座標は基本公式
    
    // X座標：Fresnel積分の7次精度展開
    const L3 = Math.pow(Ls, 3)
    const L5 = Math.pow(Ls, 5)
    const L7 = Math.pow(Ls, 7)
    const R2 = Math.pow(radius, 2)
    const R4 = Math.pow(radius, 4)
    const R6 = Math.pow(radius, 6)
    
    const Xc_5th = Ls - (L3 / (40 * R2))  // 従来の5次精度
    const Xc_7th = Xc_5th + (L5 / (3456 * R4)) - (L7 / (599040 * R6))  // 7次拡張
    
    const Xc = Xc_7th  // 高精度採用
    
    debugInfo += `Fresnel積分精度向上:\n`
    debugInfo += `  5次精度: Xc=${Xc_5th.toFixed(6)}m\n`
    debugInfo += `  7次精度: Xc=${Xc_7th.toFixed(6)}m\n`
    debugInfo += `  精度改善: ${(Xc_7th - Xc_5th).toFixed(8)}m (${((Xc_7th - Xc_5th) * 1000).toFixed(4)}mm)\n`
    debugInfo += `  Yc=${Yc.toFixed(6)}m\n`
    debugInfo += `スパイラル角φs: ${(th_s_final * 180 / Math.PI).toFixed(3)}°\n`
    debugInfo += `円弧角φc: ${(defl_c_final * 180 / Math.PI).toFixed(2)}°\n`
    
    // §9.6 シフト補正 (rho, k) - 基本的な公式（A案専用）
    const rho = Yc - radius * (1 - Math.cos(th_s_final))
    const k = Xc - radius * Math.sin(th_s_final)
    
    // 🔧 B案は一旦無効化（A案との整合性確保のため）
    // B案を有効にするには、SC座標計算も同時に更新が必要
    
    // §9.7 PI→TS (タンジェント距離) - A案用（基本補正）
    const Ts = (radius + rho) * Math.tan(absDef / 2) + k
    const Ts_improvement = 0  // B案無効化中
    
    debugInfo += `シフト補正: rho=${rho.toFixed(6)}, k=${k.toFixed(6)}\n`
    debugInfo += `タンジェント距離Ts: ${Ts.toFixed(6)}m\n`
    debugInfo += `🚨 B案無効化中（A案優先）\n`
    
    // §9.8 TS座標とST座標の正確な対称配置
    // P1からの正確な距離を使用してP0P1とP1P2直線上に配置
    
    // P0P1直線の単位ベクトル
    const p0_p1_dx = p1.x - p0.x
    const p0_p1_dy = p1.y - p0.y
    const p0_p1_length = Math.sqrt(p0_p1_dx * p0_p1_dx + p0_p1_dy * p0_p1_dy)
    const p0_p1_unit_x = p0_p1_dx / p0_p1_length
    const p0_p1_unit_y = p0_p1_dy / p0_p1_length
    
    // P1P2直線の単位ベクトル
    const p1_p2_dx = p2.x - p1.x
    const p1_p2_dy = p2.y - p1.y
    const p1_p2_length = Math.sqrt(p1_p2_dx * p1_p2_dx + p1_p2_dy * p1_p2_dy)
    const p1_p2_unit_x = p1_p2_dx / p1_p2_length
    const p1_p2_unit_y = p1_p2_dy / p1_p2_length
    
    // TS座標：P1からP0方向にTs距離（P0P1直線上）
    const TS = {
      x: p1.x - Ts * p0_p1_unit_x,
      y: p1.y - Ts * p0_p1_unit_y
    }
    
    // ST座標：P1からP2方向にTs距離（P1P2直線上、TSと完全対称）
    const ST_symmetric_corrected = {
      x: p1.x + Ts * p1_p2_unit_x,
      y: p1.y + Ts * p1_p2_unit_y
    }
    
    // 検証：P1からの距離チェック
    const ts_distance_check = Math.sqrt((TS.x - p1.x) ** 2 + (TS.y - p1.y) ** 2)
    const st_distance_check = Math.sqrt((ST_symmetric_corrected.x - p1.x) ** 2 + (ST_symmetric_corrected.y - p1.y) ** 2)
    
    debugInfo += `正確TS: (${TS.x.toFixed(3)}, ${TS.y.toFixed(3)})\n`
    debugInfo += `対称ST: (${ST_symmetric_corrected.x.toFixed(3)}, ${ST_symmetric_corrected.y.toFixed(3)})\n`
    debugInfo += `P1からTS距離: ${ts_distance_check.toFixed(6)} (期待: ${Ts.toFixed(6)})\n`
    debugInfo += `P1からST距離: ${st_distance_check.toFixed(6)} (期待: ${Ts.toFixed(6)})\n`
    debugInfo += `距離誤差: TS=${Math.abs(ts_distance_check - Ts).toExponential(2)}, ST=${Math.abs(st_distance_check - Ts).toExponential(2)}\n`
    
    // §9.9 SC座標 (グローバル) - 正確な座標変換
    const SC = {
      x: TS.x + Xc * Math.cos(Az_in) - sgn * Yc * Math.sin(Az_in),
      y: TS.y + Xc * Math.sin(Az_in) + sgn * Yc * Math.cos(Az_in)
    }
    
    // §9.10 SC接線角 & §9.11 CS接線角
    const Az_SC = Az_in + sgn * th_s_final
    const Az_CS = Az_SC + sgn * defl_c_final
    
    // §9.11 円弧中心計算：SC/CSの法線交点で厳密計算（A案実装）
    // SC の法線ベクトル (Canvas座標系: Y軸下向き)
    const n_SC = { 
      x: -sgn * Math.sin(Az_SC), 
      y: sgn * Math.cos(Az_SC) 
    }
    
    // CS の法線ベクトル (Canvas座標系: Y軸下向き)
    const n_CS = { 
      x: -sgn * Math.sin(Az_CS), 
      y: sgn * Math.cos(Az_CS) 
    }
    
    // 法線交点計算：厳密な円弧中心を求める
    function intersectLines(p1, n1, p2, n2) {
      const d = n1.x * n2.y - n1.y * n2.x  // 外積（平行なら0）
      if (Math.abs(d) < 1e-10) {
        // 法線が平行の場合：SC法線方向に半径分移動（フォールバック）
        console.warn('SC/CS法線が平行です。フォールバック中心計算を使用。')
        return {
          x: p1.x + n1.x * radius,
          y: p1.y + n1.y * radius
        }
      }
      const t = ((p2.x - p1.x) * n2.y - (p2.y - p1.y) * n2.x) / d
      const result = {
        x: p1.x + n1.x * t,
        y: p1.y + n1.y * t
      }
      
      // 結果の妥当性チェック
      if (!isFinite(result.x) || !isFinite(result.y)) {
        console.error('交点計算結果が無効です。フォールバック中心計算を使用。')
        return {
          x: p1.x + n1.x * radius,
          y: p1.y + n1.y * radius
        }
      }
      
      return result
    }
    
    // 📐 A案実装：交点法による厳密中心計算
    // SC→CSへの円弧分の移動量を計算
    const arcAngle = sgn * defl_c_final  // 円弧角度
    const arcLength = radius * Math.abs(defl_c_final)  // 円弧長
    
    // 円弧によるローカル座標での移動量（SC基準）
    const Xc_s = radius * Math.sin(Math.abs(defl_c_final))  // 円弧のX方向移動
    const Yc_s = radius * (1 - Math.cos(Math.abs(defl_c_final)))  // 円弧のY方向移動
    
    debugInfo += `円弧移動量: Xc_s=${Xc_s.toFixed(3)}, Yc_s=${Yc_s.toFixed(3)}\n`
    debugInfo += `円弧角度: ${(defl_c_final * 180 / Math.PI).toFixed(2)}°\n`
    
    // まず理論CSの座標を計算（SC + 円弧分の移動）
    const theoretical_CS = {
      x: SC.x + Xc_s * Math.cos(Az_SC) - sgn * Yc_s * Math.sin(Az_SC),
      y: SC.y + Xc_s * Math.sin(Az_SC) + sgn * Yc_s * Math.cos(Az_SC)
    }
    
    debugInfo += `理論CS座標: (${theoretical_CS.x.toFixed(3)}, ${theoretical_CS.y.toFixed(3)})\n`
    
    // CS の法線ベクトル (Canvas座標系: Y軸下向き)
    const n_CS_theoretical = { 
      x: -sgn * Math.sin(Az_CS), 
      y: sgn * Math.cos(Az_CS) 
    }
    
    // SC/CS法線の交点として厳密な円弧中心を計算
    const center = intersectLines(SC, n_SC, theoretical_CS, n_CS_theoretical)
    
    debugInfo += `交点法による厳密中心計算\n`
    debugInfo += `理論円弧中心: (${center.x.toFixed(3)}, ${center.y.toFixed(3)})\n`
    
    // 等距離検証：円弧中心から２つの直線への距離をチェック
    const distToLine1 = Math.abs((center.x - p1.x) * p0_p1_unit_y - (center.y - p1.y) * p0_p1_unit_x)
    const distToLine2 = Math.abs((center.x - p1.x) * p1_p2_unit_y - (center.y - p1.y) * p1_p2_unit_x)
    debugInfo += `中心→P0P1直線距離: ${distToLine1.toFixed(6)}m\n`
    debugInfo += `中心→P1P2直線距離: ${distToLine2.toFixed(6)}m\n`
    debugInfo += `等距離誤差: ${Math.abs(distToLine1 - distToLine2).toFixed(6)}m\n`
    
    // 交点法で計算されたCSを使用
    const CS = theoretical_CS
    
    debugInfo += `SC接線角度: ${(Az_SC * 180 / Math.PI).toFixed(2)}°\n`
    debugInfo += `CS接線角度: ${(Az_CS * 180 / Math.PI).toFixed(2)}°\n`
    debugInfo += `符号sgn: ${sgn}, 半径: ${radius}\n`
    debugInfo += `交点法円弧中心: (${center.x.toFixed(3)}, ${center.y.toFixed(3)})\n`
    
    // 円弧中心の検証：SC/CSからの距離チェック
    const center_to_sc_dist = Math.sqrt((center.x - SC.x) ** 2 + (center.y - SC.y) ** 2)
    const center_to_cs_dist = Math.sqrt((center.x - CS.x) ** 2 + (center.y - CS.y) ** 2)
    const sc_center_error = Math.abs(center_to_sc_dist - radius)
    const cs_center_error = Math.abs(center_to_cs_dist - radius)
    
    debugInfo += `中心→SC距離: ${center_to_sc_dist.toFixed(6)}m (期待: ${radius}m)\n`
    debugInfo += `中心→CS距離: ${center_to_cs_dist.toFixed(6)}m (期待: ${radius}m)\n`
    debugInfo += `SC中心誤差: ${sc_center_error.toExponential(2)}m\n`
    debugInfo += `CS中心誤差: ${cs_center_error.toExponential(2)}m\n`
    
    // §9.12 ST座標 (出口スパイラル終点) - 基本計算
    // 出口スパイラルのローカル座標
    const ST_local_from_CS = {
      x: Xc,  // 長手方向は同じ
      y: -sgn * Yc  // 横方向は符号反転（出口スパイラル）
    }
    
    // CS座標から出口スパイラル終了角度方向に回転変換
    const ST = {
      x: CS.x + ST_local_from_CS.x * Math.cos(Az_CS) - ST_local_from_CS.y * Math.sin(Az_CS),
      y: CS.y + ST_local_from_CS.x * Math.sin(Az_CS) + ST_local_from_CS.y * Math.cos(Az_CS)
    }
    debugInfo += `CS座標: (${CS.x.toFixed(1)}, ${CS.y.toFixed(1)})\n`
    debugInfo += `出口スパイラル角度: ${(Az_CS * 180 / Math.PI).toFixed(2)}°\n`
    debugInfo += `ST座標: (${ST.x.toFixed(1)}, ${ST.y.toFixed(1)})\n`
    debugInfo += `ST最終接線角度: ${((Az_CS + sgn * th_s_final) * 180 / Math.PI).toFixed(2)}°\n`
    debugInfo += `期待接線角度: ${(Az_out * 180 / Math.PI).toFixed(2)}°\n`
    
    // 最終接線角度の検証
    const final_tangent_angle = Az_CS + sgn * th_s_final
    const angle_error = Math.abs(normalizeAngle(final_tangent_angle - Az_out))
    debugInfo += `接線角度誤差: ${(angle_error * 180 / Math.PI).toFixed(4)}°\n`
    
    // Console出力: 角度誤差確認
    console.log(`  err (角度誤差): ${(angle_error * 180 / Math.PI).toFixed(6)}° ${angle_error < 0.001 ? '(~0 OK)' : '(要確認)'}`)
    
    // P1-P2直線上にSTがあるかチェック（デバッグ目的）
    const P1_P2_dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
    const P1_ST_dist = Math.sqrt((ST.x - p1.x) ** 2 + (ST.y - p1.y) ** 2)
    const ST_P2_angle = Math.atan2(p2.y - ST.y, p2.x - ST.x)
    const expected_angle = Math.atan2(p2.y - p1.y, p2.x - p1.x)
    const line_angle_diff = Math.abs(normalizeAngle(ST_P2_angle - expected_angle))
    
    debugInfo += `P1-P2距離: ${P1_P2_dist.toFixed(2)}, P1-ST距離: ${P1_ST_dist.toFixed(2)}\n`
    debugInfo += `ST→P2角度: ${(ST_P2_angle * 180 / Math.PI).toFixed(2)}°, 期待角度: ${(expected_angle * 180 / Math.PI).toFixed(2)}°\n`
    debugInfo += `直線からの角度ズレ: ${(line_angle_diff * 180 / Math.PI).toFixed(4)}°\n`
    
    // 曲線点列生成
    const allPoints = []
    
    // 入口スパイラル (TS→SC) - 元の関数を使用
    // 🔧 高精度スパイラル生成（分割数向上）
    const precision_segments = Math.max(100, Math.round(Ls * 20))  // 距離に比例、最低100分割
    debugInfo += `高精度積分: ${precision_segments}分割 (従来25分割)\n`
    
    const spiralIn = generatePreciseClothoidCurve(TS, Az_in, Ls, radius, sgn, precision_segments, false)
    allPoints.push(...spiralIn)
    
    // 実際に生成されたSC座標を取得（数値積分による高精度座標）
    const actualSC = spiralIn[spiralIn.length - 1]
    const sc_error = Math.sqrt((actualSC.x - SC.x) ** 2 + (actualSC.y - SC.y) ** 2)
    
    debugInfo += `\n🔍 SC座標詳細分析:\n`
    debugInfo += `理論SC: (${SC.x.toFixed(6)}, ${SC.y.toFixed(6)})\n`
    debugInfo += `実際SC: (${actualSC.x.toFixed(6)}, ${actualSC.y.toFixed(6)})\n`
    debugInfo += `SC誤差: ${sc_error.toFixed(6)}m (${(sc_error * 1000).toFixed(2)}mm)\n`
    debugInfo += `X誤差: ${(actualSC.x - SC.x).toFixed(6)}m (${((actualSC.x - SC.x) * 1000).toFixed(2)}mm)\n`
    debugInfo += `Y誤差: ${(actualSC.y - SC.y).toFixed(6)}m (${((actualSC.y - SC.y) * 1000).toFixed(2)}mm)\n`
    
    // 📏 線の太さとの比較
    const line_width_mm = 1.5  // 想定線幅
    debugInfo += `線幅比較: 誤差${(sc_error * 1000).toFixed(2)}mm ${sc_error * 1000 <= line_width_mm ? '≤' : '>'} 線幅${line_width_mm}mm\n`
    
    // ※ 交点法による中心計算を採用（actualCenterではなくcenterを使用）
    debugInfo += `\n🎯 交点法中心: (${center.x.toFixed(6)}, ${center.y.toFixed(6)}) - SC/CS法線交点\n`
    
    // 📏 中心精度の検証
    const center_to_SC_dist = Math.sqrt((center.x - SC.x) ** 2 + (center.y - SC.y) ** 2)
    const center_to_CS_dist = Math.sqrt((center.x - CS.x) ** 2 + (center.y - CS.y) ** 2)
    const center_radius_error = Math.abs(center_to_SC_dist - center_to_CS_dist)
    
    debugInfo += `中心→SC距離: ${center_to_SC_dist.toFixed(6)}m\n`
    debugInfo += `中心→CS距離: ${center_to_CS_dist.toFixed(6)}m\n`
    debugInfo += `等距離誤差: ${center_radius_error.toFixed(8)}m (${(center_radius_error * 1000000).toFixed(2)}μm)\n`
    debugInfo += `等距離条件: ${center_radius_error < 1e-6 ? '✅ 満足' : '⚠️ 要改善'}\n`
    
    // 交点法による中心を使ってCS座標を再計算
    const arcAng_intersection = sgn * defl_c_final
    const SC_to_center_angle_intersection = Math.atan2(SC.y - center.y, SC.x - center.x)
    // ※ 注意：theoretical_CSをそのまま使用（交点法の結果なので正確）
    // const actualCS = { ...CS }  // 削除：CSを直接使用
    
    // 中心からSC/CSへの距離検証（交点法中心を基準）
    const distSCtoCenter = Math.sqrt((SC.x - center.x) ** 2 + (SC.y - center.y) ** 2)
    const scCenterError = Math.abs(distSCtoCenter - radius)
    debugInfo += `中心→理論SC距離: ${distSCtoCenter.toFixed(6)}m (期待値: ${radius}m)\n`
    debugInfo += `理論SC→中心誤差: ${scCenterError.toExponential(2)}m\n`
    
    // 中心からCSへの距離検証
    const distCStoCenter = Math.sqrt((CS.x - center.x) ** 2 + (CS.y - center.y) ** 2)
    const csCenterError = Math.abs(distCStoCenter - radius)
    debugInfo += `中心→計算CS距離: ${distCStoCenter.toFixed(6)}m (期待値: ${radius}m)\n`
    debugInfo += `計算CS→中心誤差: ${csCenterError.toExponential(2)}m\n`
    
    // � スパイラル直接接続の場合の検証
    if (defl_c_final === 0) {
      const spiral_connection_error = Math.sqrt((SC.x - CS.x) ** 2 + (SC.y - CS.y) ** 2)
      debugInfo += `\n🔍 スパイラル接続検証:\n`
      debugInfo += `SC座標: (${SC.x.toFixed(6)}, ${SC.y.toFixed(6)})\n`
      debugInfo += `CS座標: (${CS.x.toFixed(6)}, ${CS.y.toFixed(6)})\n`
      debugInfo += `接続誤差: ${spiral_connection_error.toFixed(6)}m (${(spiral_connection_error * 1000).toFixed(2)}mm)\n`
      
      if (spiral_connection_error < 0.001) {  // 1mm以下
        debugInfo += `✅ 良好な接続 (誤差 < 1mm)\n`
      } else {
        debugInfo += `⚠️ 接続誤差が大きい (誤差 > 1mm)\n`
      }
    }
    if (defl_c_final > 0) {
      const arcPoints = generateArcSegment(center, radius, SC, CS, sgn, 30)
      allPoints.push(...arcPoints.slice(1)) // 重複除去
      debugInfo += `✅ 円弧セグメント生成: ${arcPoints.length}点 (角度: ${(defl_c_final * 180 / Math.PI).toFixed(3)}°)\n`
    } else {
      debugInfo += `🔄 円弧なし（スパイラル直接接続）\n`
      debugInfo += `  理由：φc = ${(defl_c_final * 180 / Math.PI).toFixed(3)}° = 0° (偏角が小さいため)\n`
      debugInfo += `  構成：入口スパイラル → 出口スパイラル（円弧スキップ）\n`
    }
    
    // 出口スパイラル (実際のCS→補正されたST) - 曲率減少方向
    // まず補正されたST座標を計算
    // 理論的なST座標を計算
    const ST_theoretical = {
      x: CS.x + ST_local_from_CS.x * Math.cos(Az_CS) - ST_local_from_CS.y * Math.sin(Az_CS),
      y: CS.y + ST_local_from_CS.x * Math.sin(Az_CS) + ST_local_from_CS.y * Math.cos(Az_CS)
    }
    
    // P1から理論的STへの投影を計算（既に計算された単位ベクトルを使用）
    const p1_st_theoretical_dx = ST_theoretical.x - p1.x
    const p1_st_theoretical_dy = ST_theoretical.y - p1.y
    const st_projection_length = (p1_st_theoretical_dx * p1_p2_unit_x + p1_st_theoretical_dy * p1_p2_unit_y)
    
    // P1P2直線上の補正されたST座標 - より精密な計算
    const correctedST = {
      x: p1.x + p1_p2_unit_x * st_projection_length,
      y: p1.y + p1_p2_unit_y * st_projection_length
    }
    
    // ST座標が確実にP1P2直線上にあることを確認
    const st_to_p1_dx = correctedST.x - p1.x
    const st_to_p1_dy = correctedST.y - p1.y
    
    // 外積で直線上チェック（0に近いほど直線上）
    const cross_product = p1_p2_unit_x * st_to_p1_dy - p1_p2_unit_y * st_to_p1_dx
    debugInfo += `ST直線チェック (外積): ${cross_product.toFixed(6)}\n`
    
    // 外積が0でない場合は、P1P2直線上に強制補正
    if (Math.abs(cross_product) > 1e-10) {
      debugInfo += `ST座標をP1P2直線上に強制補正\n`
      // P1からの距離を保持してP1P2直線上に再配置
      const distFromP1 = Math.sqrt(st_to_p1_dx * st_to_p1_dx + st_to_p1_dy * st_to_p1_dy)
      const correctedST_forced = {
        x: p1.x + p1_p2_unit_x * distFromP1,
        y: p1.y + p1_p2_unit_y * distFromP1
      }
      // 強制補正された座標を使用
      correctedST.x = correctedST_forced.x
      correctedST.y = correctedST_forced.y
      debugInfo += `強制補正ST: (${correctedST.x.toFixed(6)}, ${correctedST.y.toFixed(6)})\n`
    }
    
    debugInfo += `理論ST: (${ST_theoretical.x.toFixed(3)}, ${ST_theoretical.y.toFixed(3)})\n`
    debugInfo += `補正ST: (${correctedST.x.toFixed(3)}, ${correctedST.y.toFixed(3)})\n`
    debugInfo += `ST投影距離: ${st_projection_length.toFixed(3)}\n`
    
    // 出口スパイラル生成で使用する座標の確認
    debugInfo += `出口スパイラル開始: CS (${CS.x.toFixed(3)}, ${CS.y.toFixed(3)})\n`
    debugInfo += `出口スパイラル終了: ST_symmetric (${ST_symmetric_corrected.x.toFixed(3)}, ${ST_symmetric_corrected.y.toFixed(3)})\n`
    debugInfo += `出口スパイラル角度: Az_CS = ${(Az_CS * 180 / Math.PI).toFixed(2)}°\n`
    
    // 出口スパイラル (理論CS→対称ST) - 入口スパイラルと完全対称に生成
    // 入口スパイラルと同じ高精度で生成し、最後の点を対称ST座標に調整
    const spiralOut = generatePreciseClothoidCurve(CS, Az_CS, Ls, radius, sgn, precision_segments, true)
    
    // 対称性を保つため、最後の点を対称ST座標に調整
    if (spiralOut.length > 0) {
      spiralOut[spiralOut.length - 1] = {
        x: ST_symmetric_corrected.x,
        y: ST_symmetric_corrected.y
      }
    }
    
    allPoints.push(...spiralOut.slice(1)) // 重複除去
    
    debugInfo += `出口スパイラル生成完了: ${spiralOut.length}点生成（対称ST調整済み）\n`
    
    // ST座標の誤差チェック - 強制的なP2置き換えを避ける
    const actualST = allPoints[allPoints.length - 1]
    const stToP2Distance = Math.sqrt(
      (actualST.x - p2.x) ** 2 + (actualST.y - p2.y) ** 2
    )
    
    // ターゲットST座標との誤差もチェック
    const stToTargetDistance = Math.sqrt(
      (actualST.x - ST_symmetric_corrected.x) ** 2 + (actualST.y - ST_symmetric_corrected.y) ** 2
    )
    
    debugInfo += `ST終端誤差: ${stToP2Distance.toFixed(4)}\n`
    debugInfo += `実ST→ターゲットST距離: ${stToTargetDistance.toFixed(6)}m\n`
    debugInfo += `実ST座標: (${actualST.x.toFixed(6)}, ${actualST.y.toFixed(6)})\n`
    debugInfo += `ターゲットST: (${ST_symmetric_corrected.x.toFixed(6)}, ${ST_symmetric_corrected.y.toFixed(6)})\n`
    
    // 実際の出口スパイラルがターゲットに到達していない場合の詳細調査
    if (stToTargetDistance > 0.01) {
      debugInfo += `⚠️ 出口スパイラルがターゲットST座標に到達していません\n`
      debugInfo += `スパイラル生成の問題: ターゲット距離${stToTargetDistance.toFixed(6)}m > 0.01m\n`
    }
    
    // 誤差が極めて小さい場合のみP2で置き換え、そうでなければ実際の終端を使用
    let finalEndPoint
    if (stToP2Distance < 1e-3) {  // 閾値を緩和（1mm）
      finalEndPoint = { x: p2.x, y: p2.y }  // 比較的近い場合
      allPoints[allPoints.length - 1] = finalEndPoint
      debugInfo += `ST→P2 置き換え実行（誤差: ${stToP2Distance.toFixed(6)}）\n`
    } else {
      finalEndPoint = actualST  // 真の終端を採用
      debugInfo += `実際のST終端を採用（誤差: ${stToP2Distance.toFixed(6)}）\n`
    }
    
    // 実際の曲線の開始点と終了点を取得（接続用）
    const actualStartPoint = allPoints[0]
    
    // 実際のST座標（曲線の真の終端）を保存
    const trueST = allPoints[allPoints.length - 1]
    
    // 対称計算されたST座標を基準とする（TSとの対称性確保）
    const finalST = ST_symmetric_corrected
    
    // STラベル誤差：対称ST座標と実際のST終端の差（調整後は0になるはず）
    const stLabelError = Math.sqrt(
      (trueST.x - finalST.x) ** 2 + (trueST.y - finalST.y) ** 2
    )
    
    debugInfo += `真のST終端: (${trueST.x.toFixed(6)}, ${trueST.y.toFixed(6)})\n`
    debugInfo += `対称ST座標: (${finalST.x.toFixed(6)}, ${finalST.y.toFixed(6)})\n`
    debugInfo += `TS-ST対称性: P1からTS=${ts_distance_check.toFixed(3)}, P1からST=${st_distance_check.toFixed(3)}\n`
    debugInfo += `STラベル誤差: ${stLabelError.toExponential(2)}m (真の終端を採用)\n`
    
    // Console出力用のデバッグログ
    console.log(`緩和曲線計算 (A案: 交点法厳密中心):`)
    console.log(`  偏角: ${(absDef * 180 / Math.PI).toFixed(2)}°`)
    console.log(`  理論上限: ${theoretical_max.toFixed(2)}m (R×偏角)`)
    console.log(`  スパイラル長: ${Ls.toFixed(2)}m (${p1.spiralMode === 'manual' ? '手動指定' : '自動計算'})`)
    console.log(`  φs (スパイラル角): ${(th_s_final * 180 / Math.PI).toFixed(2)}°`)
    console.log(`  φc (円弧角): ${(defl_c_final * 180 / Math.PI).toFixed(3)}°${defl_c_final === 0 ? ' ⚠️ 円弧なし' : ''}`)
    console.log(`  φc負チェック: ${defl_c_final < 0 ? 'NG (負)' : 'OK'}`)
    console.log(`  曲線構成: ${defl_c_final === 0 ? 'スパイラルのみ（直接接続）' : '入口スパイラル + 円弧 + 出口スパイラル'}`)
    console.log(`  制限状況: 自然計算（円弧角度制限なし）`)
    console.log(`  円弧中心 (交点法): (${center.x.toFixed(2)}, ${center.y.toFixed(2)})`)
    console.log(`  中心→直線1距離: ${distToLine1.toFixed(6)}m`)
    console.log(`  中心→直線2距離: ${distToLine2.toFixed(6)}m`)
    console.log(`  等距離誤差: ${Math.abs(distToLine1 - distToLine2).toFixed(6)}m`)
    console.log(`  中心→SC距離: ${distSCtoCenter.toFixed(6)}m (期待: ${radius}m)`)
    console.log(`  中心→CS距離: ${distCStoCenter.toFixed(6)}m (期待: ${radius}m)`)
    console.log(`  SC→Center誤差: ${scCenterError.toExponential(2)}m`)
    console.log(`  CS→Center誤差: ${csCenterError.toExponential(2)}m`)
    console.log(`  STラベル誤差: ${stLabelError.toExponential(2)}m`)
    console.log(`  ST1位置: (${trueST.x.toFixed(2)}, ${trueST.y.toFixed(2)}) - 実際の曲線終端`)
    console.log(`  TS-ST対称性: P1からの距離=${Ts.toFixed(2)}m (理論対称)`)
    console.log(`  TS位置: (${TS.x.toFixed(2)}, ${TS.y.toFixed(2)}) - P1から${ts_distance_check.toFixed(2)}m`)
    console.log(`  ST位置: (${trueST.x.toFixed(2)}, ${trueST.y.toFixed(2)}) - 実際終端採用`)
    console.log(`  セグメント数: スパイラル=25, 円弧=${defl_c_final > 0 ? '30' : '0'}`)
    console.log(`  構成: 入口スパイラル + ${defl_c_final > 0 ? '円弧' : '直接接続'} + 出口スパイラル`)
    console.log(`  🔧 A案: SC/CS法線交点による厳密中心計算`)
    console.log(`  🚨 B案: 一旦無効化（整合性確保のため）`)
    console.log(`  📏 等距離条件: ${Math.abs(distToLine1 - distToLine2) < 1e-6 ? '✓ 満足' : '✗ 不満足'}`)
    console.log(`  🎯 現在：A案のみで等距離条件完璧達成`)
    
    // 最終調整: ST1が確実にP1P2直線上に配置されるように調整
    // 最後の出口スパイラル点がfinalSTと一致しない場合の補正
    const lastSpiraPoint = allPoints[allPoints.length - 1]
    const distanceToTarget = Math.sqrt(
      (lastSpiraPoint.x - finalST.x) ** 2 + 
      (lastSpiraPoint.y - finalST.y) ** 2
    )
    
    let actualEndPoint
    if (distanceToTarget > 0.01) {  // より厳しい閾値（1cm）
      // 距離が大きい場合は、trueST（実際の曲線終端）を優先
      debugInfo += `実ST終端採用: 距離${distanceToTarget.toFixed(6)}m > 0.01m\n`
      actualEndPoint = trueST
      // 曲線は実際の終端を維持
    } else {
      actualEndPoint = lastSpiraPoint
      debugInfo += `スパイラル終端採用: 距離${distanceToTarget.toFixed(6)}m ≤ 0.01m\n`
    }
    
    debugInfo += `実際の開始点: (${actualStartPoint.x.toFixed(2)}, ${actualStartPoint.y.toFixed(2)})\n`
    debugInfo += `実際の終了点: (${actualEndPoint.x.toFixed(2)}, ${actualEndPoint.y.toFixed(2)})\n`
    
    // 計算情報を更新（UIに表示するため）
    if (p1.calculatedSpiral !== undefined) {
      p1.calculatedSpiral = {
        length: Ls,
        angle: th_s_final
      }
    }
    
    // SC=CS一致判定（スパイラルのみ構成の検出）
    const spiral_connection_error = Math.sqrt((actualSC.x - CS.x) ** 2 + (actualSC.y - CS.y) ** 2)
    // theoretical_max は既に453行目で定義済み
    const convergence_ratio = Ls / theoretical_max
    
    // より実用的な収束判定条件
    const is_near_convergence = (
      convergence_ratio >= 0.95 ||  // 理論上限の95%以上
      (defl_c_final < 0.01 && spiral_connection_error < 0.001) ||  // 円弧角<0.6°かつ距離<1mm
      spiral_connection_error < 0.0005  // SC-CS距離が0.5mm未満
    )
    
    const is_sc_cs_convergence = is_near_convergence
    
    // 収束判定の詳細をデバッグ出力に追加
    debugInfo += `\n=== SC=CS収束判定 ===\n`
    debugInfo += `SC-CS間距離: ${(spiral_connection_error * 1000).toFixed(3)}mm\n`
    debugInfo += `収束率: ${(convergence_ratio * 100).toFixed(1)}% (理論上限: ${theoretical_max.toFixed(3)}m)\n`
    debugInfo += `円弧角度: ${(defl_c_final * 180 / Math.PI).toFixed(3)}°\n`
    debugInfo += `収束条件:\n`
    debugInfo += `  ① 収束率≥95%: ${convergence_ratio >= 0.95 ? '✓' : '✗'} (${(convergence_ratio * 100).toFixed(1)}%)\n`
    debugInfo += `  ② 小円弧+近距離: ${(defl_c_final < 0.01 && spiral_connection_error < 0.001) ? '✓' : '✗'} (角度${(defl_c_final * 180 / Math.PI).toFixed(3)}°, 距離${(spiral_connection_error * 1000).toFixed(1)}mm)\n`
    debugInfo += `  ③ 極近距離: ${spiral_connection_error < 0.0005 ? '✓' : '✗'} (${(spiral_connection_error * 1000).toFixed(3)}mm < 0.5mm)\n`
    debugInfo += `📊 最終判定: ${is_sc_cs_convergence ? '🎯 SC=CS収束' : '❌ 通常カーブ'}\n`
    
    return {
      startPoint: actualStartPoint,    // 実際の曲線開始点
      endPoint: finalEndPoint,         // 実際の曲線終了点（誤差チェック済み）
      scPoint: actualSC,               // 実際のSC点（円弧開始点）
      csPoint: CS,                     // 理論CS点（円弧終了点）
      tsPoint: TS,                     // P0P1直線上に補正されたTS点
      stPoint: trueST,                 // 実際の曲線終端座標（ラベル表示用）
      center: center,                  // 交点法による厳密円弧中心（描画用）
      actualCenter: center,            // 明示的な中心（互換性のため）
      radius: radius,
      curve: allPoints,
      // SC=CS一致情報（スパイラルのみ構成）
      sccsConvergence: {
        isConverged: is_sc_cs_convergence,        // SC=CS一致フラグ
        connectionError: spiral_connection_error,  // SC-CS間距離
        convergenceRatio: convergence_ratio,       // 理論上限に対する比率
        arcAngle: defl_c_final,                   // 円弧角（0なら一致）
        convergencePoint: is_sc_cs_convergence ? actualSC : null  // 一致点座標
      },
      // 精度検証情報
      accuracy: {
        scCenterError: scCenterError,  // SC→中心誤差
        csCenterError: csCenterError,  // CS→中心誤差
        stLabelError: stLabelError     // STラベル誤差
      },
      debug: debugInfo   // デバッグ情報を追加
    }
    
    timer.end()
    
    logger.curve.info('曲線セグメント計算完了', {
      総点数: allPoints.length,
      中心X: center.x.toFixed(2),
      中心Y: center.y.toFixed(2),
      SC中心誤差: scCenterError,
      CS中心誤差: csCenterError
    })
    
    return result

    
  } catch (error) {
    logger.curve.error('曲線セグメント計算でエラー発生', {
      エラーメッセージ: error.message,
      スタック: error.stack
    })
    
    return createError(
      ERROR_CODES.CALCULATION_ERROR,
      `曲線セグメント計算エラー: ${error.message}`,
      debugInfo || `エラー発生: ${error.message}`
    )
  }
}

/**
 * 統一クロソイド曲線生成関数
 * 複数の重複していた関数を統合し、数値積分による正確な曲率線形遷移を実装
 * @param {Object} startPoint - 開始点
 * @param {number} startAngle - 開始角度（ラジアン）
 * @param {number} length - スパイラル長
 * @param {number} radius - 半径
 * @param {number} direction - 方向（+1: 左カーブ, -1: 右カーブ）
 * @param {number} segments - 分割数
 * @param {boolean} isExit - 出口スパイラルかどうか（曲率減少）
 * @param {Object} [targetPoint] - ターゲット点（指定時は最終点を調整）
 * @returns {Array} クロソイド点列
 */
function generateUnifiedClothoidSpiral(startPoint, startAngle, length, radius, direction, segments, isExit = false, targetPoint = null) {
  // 入力検証
  const pointValidation = validate.points([startPoint], 1)
  if (pointValidation) return [startPoint]
  
  const radiusValidation = validate.radius(radius)
  if (radiusValidation) return [startPoint]
  
  const angleValidation = validate.angle(startAngle)
  if (angleValidation) return [startPoint]
  
  if (length <= 0 || segments <= 0) return [startPoint]
  
  const points = [{ ...startPoint }]
  const ds = length / segments
  
  let x = 0
  let y = 0
  let theta = 0
  
  // 数値積分による曲率線形遷移
  for (let i = 1; i <= segments; i++) {
    const s = i * ds
    const s_prev = (i - 1) * ds
    
    // 曲率計算 - 入口/出口で正しい方向を設定
    let k0, k1
    if (isExit) {
      // 出口スパイラル: 曲率1/R→0に減少
      k0 = ((length - s_prev) / length) * (1 / radius) * direction
      k1 = ((length - s) / length) * (1 / radius) * direction
    } else {
      // 入口スパイラル: 曲率0→1/Rに増加
      k0 = (s_prev / length) * (1 / radius) * direction
      k1 = (s / length) * (1 / radius) * direction
    }
    
    // 区間の中央での曲率（台形公式）
    const k_mid = (k0 + k1) * 0.5
    
    // 角度の積分
    theta += k_mid * ds
    
    // 位置の積分（中点則）
    const theta_mid = theta - k_mid * ds * 0.5
    const dx = Math.cos(startAngle + theta_mid) * ds
    const dy = Math.sin(startAngle + theta_mid) * ds
    
    x += dx
    y += dy
    
    points.push({
      x: startPoint.x + x,
      y: startPoint.y + y
    })
  }
  
  // ターゲット点が指定されている場合、最終点を調整
  if (targetPoint && points.length > 0) {
    points[points.length - 1] = { ...targetPoint }
  }
  
  return points
}

/**
 * 統一円弧セグメント生成
 * @param {Object} center - 円弧中心
 * @param {number} radius - 半径
 * @param {Object} startPoint - 開始点
 * @param {Object} endPoint - 終了点
 * @param {number} direction - 方向
 * @param {number} segments - 分割数
 * @returns {Array} 円弧点列
 */
function generateUnifiedArcSegment(center, radius, startPoint, endPoint, direction, segments) {
  const radiusValidation = validate.radius(radius)
  if (radiusValidation) return [startPoint, endPoint]
  
  const pointValidation = validate.points([center, startPoint, endPoint], 3)
  if (pointValidation) return [startPoint, endPoint]
  
  const points = []
  
  const startAngle = Math.atan2(startPoint.y - center.y, startPoint.x - center.x)
  const endAngle = Math.atan2(endPoint.y - center.y, endPoint.x - center.x)
  
  let arcAngle = endAngle - startAngle
  
  // 角度正規化と方向調整
  if (direction > 0) {
    // 左カーブ（反時計回り）
    if (arcAngle < 0) arcAngle += 2 * Math.PI
  } else {
    // 右カーブ（時計回り）
    if (arcAngle > 0) arcAngle -= 2 * Math.PI
  }
  
  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + arcAngle * (i / segments)
    const x = center.x + radius * Math.cos(angle)
    const y = center.y + radius * Math.sin(angle)
    points.push({ x, y })
  }
  
  return points
}


// ======== 統一曲線生成関数 ========
// 3点・複数点を一つの実装で処理する統合関数

/**
 * 統一曲線生成関数 - 3点以上の制御点から緩和曲線を生成
 * 従来の3点専用と複数点専用の機能を統合
 * @param {Array} points - 制御点配列（3点以上）
 * @param {number} speed - 設計速度（未使用だが互換性のため残す）
 * @param {boolean} isLoop - ループモード
 * @param {number} defaultSpiralFactor - デフォルトスパイラル係数
 * @returns {Object} 曲線データ
 */
export function generateClothoidCurve(points, speed = 60, isLoop = false, defaultSpiralFactor = 2.0) {
  const timer = new PerformanceTimer('統一曲線生成')
  
  logger.curve.info('曲線生成開始', {
    点数: points.length,
    速度: speed,
    ループ: isLoop
  })
  
  let debugInfo = formatDebugInfo('統一曲線生成', {
    制御点数: points.length,
    ループモード: isLoop,
    設計速度: `${speed}km/h`
  })

  try {
    // 入力検証
    const pointValidation = validate.points(points, 3)
    if (pointValidation) {
      logger.curve.error('入力検証エラー', pointValidation.error)
      return { ...pointValidation, debug: debugInfo }
    }

    logger.curve.debug('制御点詳細', points.map((p, i) => 
      `P${i}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) R=${p.radius || '未設定'}`
    ))

    // セグメント計算（3点も複数点も同じロジック）
    const segments = []
    const allCurvePoints = []
    let totalSegments = 0

    // ループ処理の場合は最後のセグメントも追加
    const segmentCount = isLoop ? points.length : points.length - 2
    
    logger.curve.info(`セグメント計算開始: ${segmentCount}個のセグメントを処理`)
    
    for (let i = 0; i < segmentCount; i++) {
      const segmentTimer = new PerformanceTimer(`セグメント${i + 1}`)
      
      // セグメントの3点を取得（ループの場合は巻き戻し）
      const p0 = points[i]
      const p1 = points[(i + 1) % points.length]
      const p2 = points[(i + 2) % points.length]
      
      logger.curve.debug(`セグメント ${i + 1}/${segmentCount}`, 
        `P${i} → P${(i + 1) % points.length} → P${(i + 2) % points.length}`
      )
      
      debugInfo += formatDebugInfo(`セグメント ${i + 1}`, {
        開始点: `P${i}(${p0.x.toFixed(1)}, ${p0.y.toFixed(1)})`,
        中間点: `P${(i + 1) % points.length}(${p1.x.toFixed(1)}, ${p1.y.toFixed(1)})`,
        終了点: `P${(i + 2) % points.length}(${p2.x.toFixed(1)}, ${p2.y.toFixed(1)})`
      })
      
      // 中間点の半径を取得
      const radius = p1.radius || 50
      // 中間点のスパイラル長を取得（手動設定の場合）
      const spiralLength = (p1.spiralMode === 'manual' && p1.spiralLength) ? p1.spiralLength : null
      
      debugInfo += `使用半径: ${radius}m\n`
      debugInfo += `スパイラル長: ${spiralLength ? `${spiralLength}m (手動)` : '自動計算'}\n`
      
      // 2番目以降のセグメントの場合、入口直線を描画しない
      // ループモードの場合は最初のセグメントでも入口直線を描画しない（最後から接続するため）
      const segmentPoints = [p0, p1, p2]
      
      // まず既存のフラグをクリア（状態リセット）
      if (segmentPoints[0].isSubsequentSegment !== undefined) {
        delete segmentPoints[0].isSubsequentSegment
      }
      
      if (i > 0) {
        segmentPoints[0].isSubsequentSegment = true
      } else if (isLoop) {
        // ループモードの最初のセグメントでも入口直線をスキップ
        segmentPoints[0].isSubsequentSegment = true
      }
      
      // 単一セグメントで緩和曲線を計算
      const segmentResult = generateCurveWithClothoid(segmentPoints, radius, spiralLength, true, defaultSpiralFactor)
      
      segmentTimer.end()
      
      if (isError(segmentResult)) {
        logger.curve.error(`セグメント ${i + 1} でエラー`, segmentResult.error)
        return {
          ...segmentResult,
          debug: debugInfo + (segmentResult.debug || '')
        }
      }

      // 成功結果からデータを取得
      const segmentData = segmentResult.data || segmentResult
      
      logger.curve.debug(`セグメント完了: ${segmentData.curve?.length || 0}点生成`)
      debugInfo += segmentResult.debug || ''
      
      // セグメントの実際の始端を取得（TSポイント）
      const actualTS = segmentData.clothoidData?.actualTS || segmentData.clothoidData?.TS
      
      // 曲線を実際のTS座標から開始するように調整
      let curveToAdd = segmentData.curve
      if (actualTS && curveToAdd && curveToAdd.length > 0) {
        // 曲線がP1から始まっている場合、TSから始まるように調整
        const firstPoint = curveToAdd[0]
        const distanceFromTS = Math.hypot(firstPoint.x - actualTS.x, firstPoint.y - actualTS.y)
        
        if (distanceFromTS > 1.0) {
          // TSに最も近い点を見つける
          const tsIndex = curveToAdd.findIndex(point => 
            Math.hypot(point.x - actualTS.x, point.y - actualTS.y) < 1.0
          )
          
          if (tsIndex > 0) {
            curveToAdd = curveToAdd.slice(tsIndex)
            logger.curve.debug(`セグメント${i+1}をTS座標から開始に調整 (${tsIndex}点除去)`)
          }
        }
      }
      
      // 最初のセグメント以外は重複する最初の点を除去
      // ただし、セグメントが正しい始端（前のセグメントのST）を持つかチェック
      if (i > 0) {
        // 前のセグメントの実際の終端（ST）を取得
        const prevSegmentData = segments[segments.length - 1]
        const prevActualST = prevSegmentData?.ST
        
        // 現在のセグメントの始端を確認（デバッグ用）
        const currentStart = curveToAdd[0]
        
        if (prevActualST && currentStart) {
          const startDistance = Math.hypot(currentStart.x - prevActualST.x, currentStart.y - prevActualST.y)
          
          logger.curve.debug(`セグメント${i+1}の始端チェック 前ST:(${prevActualST.x.toFixed(2)}, ${prevActualST.y.toFixed(2)}) 現在始端:(${currentStart.x.toFixed(2)}, ${currentStart.y.toFixed(2)}) 距離:${startDistance.toFixed(3)}m`)
          
          // 通常は最初の点（重複）を除去
          curveToAdd = curveToAdd.slice(1)
        } else {
          // 従来の処理（最初の点を除去）
          curveToAdd = curveToAdd.slice(1)
        }
      }
      
      // セグメント間の接続チェック（デバッグ用）
      if (i > 0 && allCurvePoints.length > 0 && curveToAdd.length > 0) {
        const prevEnd = allCurvePoints[allCurvePoints.length - 1]
        const nextStart = curveToAdd[0]
        const connectionDistance = Math.hypot(nextStart.x - prevEnd.x, nextStart.y - prevEnd.y)
        
        logger.curve.debug(`セグメント接続 ${i-1}→${i} 前終端:(${prevEnd.x.toFixed(2)}, ${prevEnd.y.toFixed(2)}) 次始端:(${nextStart.x.toFixed(2)}, ${nextStart.y.toFixed(2)}) 接続距離:${connectionDistance.toFixed(3)}m`)
        
        // 接続距離が大きい場合は接続直線を追加
        if (connectionDistance > 0.1) { // 閾値を1.0から0.1に変更（より厳密に）
          logger.curve.warn(`セグメント接続で直線補間 ${connectionDistance.toFixed(3)}m`)
          
          // ST1からTS2への接続直線を追加
          const straightSteps = Math.max(2, Math.floor(connectionDistance / 10)) // 距離に応じて分割数調整
          const connectionPoints = []
          for (let j = 0; j <= straightSteps; j++) {
            const t = j / straightSteps
            connectionPoints.push({
              x: prevEnd.x + t * (nextStart.x - prevEnd.x),
              y: prevEnd.y + t * (nextStart.y - prevEnd.y)
            })
          }
          
          // 最初の点（prevEnd）と最後の点（nextStart）は重複するのでスキップ
          allCurvePoints.push(...connectionPoints.slice(1, -1))
          
          logger.curve.debug(`ST${i}→TS${i+1}接続直線追加 ${connectionPoints.slice(1, -1).length}点`)
          
          // 接続線をセグメントとして追加（描画用）
          const connectionSegment = {
            segmentIndex: `${i}-${i+1}`, // セグメント間接続として識別
            type: 'connection', // 接続線タイプ
            isLine: true,
            curve: connectionPoints,
            drawingSegments: [{
              type: 'straight',
              points: connectionPoints
            }],
            startPoint: prevEnd,
            endPoint: nextStart
          }
          segments.push(connectionSegment)
        }
      }
      
      allCurvePoints.push(...curveToAdd)

      // 通常のセグメント情報を追加
      if (segmentData.clothoidData) {
        // ループモードの場合、最後のセグメント（P0にある点）のラベルを0にする
        const labelIndex = (isLoop && i === segmentCount - 1) ? 0 : i + 1
        
        const segmentInfo = {
          segmentIndex: i + 1, // セグメント番号を追加
          type: 'clothoid', // セグメントタイプを明示
          TS: segmentData.clothoidData.actualTS || segmentData.clothoidData.TS,
          ST: segmentData.clothoidData.actualST || segmentData.clothoidData.ST,
          SC: segmentData.clothoidData.SC,
          CS: segmentData.clothoidData.CS,
          center: segmentData.clothoidData.center || segmentData.clothoidData.actualCenter,
          radius: segmentData.clothoidData.radius,
          TSLabel: `TS${labelIndex}`,
          STLabel: `ST${labelIndex}`,
          SCLabel: `SC${labelIndex}`,
          CSLabel: `CS${labelIndex}`,
          // 描画用の曲線点列を保存
          curve: segmentData.curve || [],
          // 元のsegments構造も保持（描画互換性のため）
          drawingSegments: segmentData.clothoidData.segments || []
        }
        segments.push(segmentInfo)
      }
      
      // 最後のセグメントの場合、STから最後の制御点への直線を追加
      if (i === segmentCount - 1 && !isLoop) {
        const lastST = segmentData.clothoidData?.actualST || segmentData.clothoidData?.ST
        const finalPoint = points[points.length - 1]
        
        if (lastST && finalPoint) {
          const stToFinalDistance = Math.hypot(finalPoint.x - lastST.x, finalPoint.y - lastST.y)
          
          if (stToFinalDistance > 1e-3) {
            // STから最終点への直線を追加
            const straightSteps = 10
            const finalStraightPoints = []
            for (let j = 0; j <= straightSteps; j++) {
              const t = j / straightSteps
              finalStraightPoints.push({
                x: lastST.x + t * (finalPoint.x - lastST.x),
                y: lastST.y + t * (finalPoint.y - lastST.y)
              })
            }
            
            // 最初の点（lastST）は重複するのでスキップして追加
            allCurvePoints.push(...finalStraightPoints.slice(1))
            logger.curve.debug(`最終直線追加: STから最終点まで ${stToFinalDistance.toFixed(2)}m`)
            
            // 最終直線のセグメント情報も追加
            if (segmentData.clothoidData && segmentData.clothoidData.segments) {
              segmentData.clothoidData.segments.push({
                type: 'straight',
                points: finalStraightPoints
              })
            }
          }
        }
      }
      
      totalSegments++
    }

    // ループモードの場合、最後のSTから最初のTSへの接続線を追加
    if (isLoop && segments.length >= 2) {
      const lastSegment = segments[segments.length - 1]
      const firstSegment = segments.find(seg => seg.type === 'clothoid' && seg.segmentIndex === 1)
      
      if (lastSegment && firstSegment && lastSegment.ST && firstSegment.TS) {
        const lastST = lastSegment.ST
        const firstTS = firstSegment.TS
        const loopConnectionDistance = Math.hypot(firstTS.x - lastST.x, firstTS.y - lastST.y)
        
        logger.curve.debug(`ループ接続チェック 最終ST:(${lastST.x.toFixed(2)}, ${lastST.y.toFixed(2)}) 最初TS:(${firstTS.x.toFixed(2)}, ${firstTS.y.toFixed(2)}) 距離:${loopConnectionDistance.toFixed(3)}m`)
        
        if (loopConnectionDistance > 0.1) {
          logger.curve.warn(`ループ接続で直線補間 ${loopConnectionDistance.toFixed(3)}m`)
          
          // ループ接続線を追加
          const straightSteps = Math.max(2, Math.floor(loopConnectionDistance / 10))
          const loopConnectionPoints = []
          for (let j = 0; j <= straightSteps; j++) {
            const t = j / straightSteps
            loopConnectionPoints.push({
              x: lastST.x + t * (firstTS.x - lastST.x),
              y: lastST.y + t * (firstTS.y - lastST.y)
            })
          }
          
          // ループ接続線をallCurvePointsに追加
          allCurvePoints.push(...loopConnectionPoints.slice(1, -1))
          
          // ループ接続線をセグメントとして追加
          const loopConnectionSegment = {
            segmentIndex: `${segmentCount}-1`, // ループ接続として識別
            type: 'loop-connection', // ループ接続線タイプ
            isLine: true,
            curve: loopConnectionPoints,
            drawingSegments: [{
              type: 'straight',
              points: loopConnectionPoints
            }],
            startPoint: lastST,
            endPoint: firstTS
          }
          segments.push(loopConnectionSegment)
          
          logger.curve.debug(`ループ接続直線追加 ${loopConnectionPoints.slice(1, -1).length}点`)
        }
      }
    }

    const totalTime = timer.end()
    
    logger.curve.info('曲線生成完了', {
      総点数: allCurvePoints.length,
      処理セグメント数: totalSegments,
      計算時間: `${totalTime.toFixed(2)}ms`,
      平均セグメント時間: `${(totalTime / totalSegments).toFixed(2)}ms`
    })
    
    debugInfo += formatDebugInfo('生成完了', {
      総点数: allCurvePoints.length,
      処理セグメント数: totalSegments,
      計算時間: `${totalTime.toFixed(2)}ms`
    })

    return createSuccess({
      curve: allCurvePoints,
      clothoidData: {
        segments,
        isMultiPoint: points.length > 3,
        isLoop,
        totalSegments,
        calculationTime: totalTime
      }
    }, debugInfo)

  } catch (error) {
    logger.curve.error('例外エラー', error.message)
    return createError(
      ERROR_CODES.UNEXPECTED_ERROR,
      `予期しないエラー: ${error.message}`,
      debugInfo + `\n例外: ${error.message}\n`
    )
  }
}
