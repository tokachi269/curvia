import { dist, getAngle, normalizeAngle } from './mathUtils.js'
import { calculateSingleClothoid, generateSpiralPoints, generateArcPoints } from './clothoidUtils.js'
import { logger, formatDebugInfo, PerformanceTimer } from './logger.js'
import { createError, createSuccess, isError, validate, safeExecute, ERROR_CODES } from './errorHandler.js'
import { getUnifiedLabelIndex } from './loopProtection.js'

// ========================================
// セグメントインデックス定数（保守性向上）
// ========================================
const SEGMENT_INDEX = {
  FIRST: 0,   // 最初のセグメント（P1の角を処理、TS1を含む）
  SECOND: 1,  // 2番目のセグメント（P2の角を処理、TS2を含む）
  THIRD: 2    // 3番目のセグメント（P0の角を処理、ST0を含む）
}

// ループ接続の仕様を明確化
const LOOP_CONNECTION_SPEC = {
  SOURCE_POINT: 'ST0',      // ループ開始点（最後のセグメントのST - P0の角処理セグメント）
  TARGET_POINT: 'TS1',      // ループ終了点（最初のセグメントのTS - P1の角処理セグメント）
  CONNECTION_TYPE: 'loop-connection'
}

// ========================================
// 緩和曲線生成システム - メインエントリーポイント
// ========================================

/**
 * メイン緩和曲線生成関数 - 3点以上の制御点から緩和曲線を生成
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
    const validationResult = validateCurveInputs(points, null, { minPoints: 3 })
    if (validationResult) {
      return { ...validationResult, debug: debugInfo }
    }

    logger.curve.debug('制御点詳細', points.map((p, i) =>
      `P${i}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) R=${p.radius || '未設定'}`
    ))

    // セグメント処理
    const segmentResult = processAllSegments(points, isLoop, defaultSpiralFactor, debugInfo)
    
    if (isError(segmentResult)) {
      return segmentResult
    }

    const { allCurvePoints, segments, totalSegments } = segmentResult.data

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

// ========================================
// セグメント処理関数群
// ========================================

/**
 * 全セグメントを処理して曲線を生成
 * @param {Array} points - 制御点配列
 * @param {boolean} isLoop - ループモード
 * @param {number} defaultSpiralFactor - デフォルトスパイラル係数
 * @param {string} debugInfo - デバッグ情報
 * @returns {Object} 処理結果
 */
function processAllSegments(points, isLoop, defaultSpiralFactor, debugInfo) {
  const segments = []
  const allCurvePoints = []
  let totalSegments = 0
  let previousSegmentST = null

  const segmentCount = isLoop ? points.length : points.length - 2
  logger.curve.info(`セグメント計算開始: ${segmentCount}個のセグメントを処理`)

  // 各セグメントを処理
  for (let i = 0; i < segmentCount; i++) {
    const segmentResult = processSingleSegment(
      points, i, segmentCount, isLoop, defaultSpiralFactor, 
      previousSegmentST, debugInfo
    )

    if (isError(segmentResult)) {
      return segmentResult
    }

    const { segmentData, curveToAdd, segmentInfo } = segmentResult.data

    // 曲線点を追加
    allCurvePoints.push(...curveToAdd)
    
    // セグメント情報を追加
    if (segmentInfo) {
      // 最初のセグメントの場合、P0→TS1の初期接続線を処理（非ループモードのみ）
      if (i === 0 && !isLoop) {
        const startPoint = points[0] // P0
        const firstTS = segmentInfo.TS // TS1
        const initialConnectionDistance = Math.hypot(firstTS.x - startPoint.x, firstTS.y - startPoint.y)
        
        logger.curve.debug(`P0-TS1初期接続チェック: 距離:${initialConnectionDistance.toFixed(3)}m`)
        
        if (initialConnectionDistance > 0.1) {
          const initialConnectionPoints = generateConnectionPoints(startPoint, firstTS, initialConnectionDistance)
          
          const initialConnectionSegment = {
            segmentIndex: 'P0-TS1',
            type: 'connection',
            isLine: true,
            curve: initialConnectionPoints,
            points: initialConnectionPoints,
            drawingSegments: [{ 
              type: 'straight', 
              points: initialConnectionPoints 
            }],
            startPoint: startPoint,
            endPoint: firstTS,
            renderSettings: {
              color: 'connection',
              lineWidth: 3,
              visible: true
            }
          }
          
          segments.push(initialConnectionSegment)
          // 初期接続線の点をallCurvePointsの先頭に追加（重複除去）
          allCurvePoints.unshift(...initialConnectionPoints.slice(0, -1))
          logger.curve.info(`P0-TS1初期接続線追加: ${initialConnectionDistance.toFixed(3)}m, ${initialConnectionPoints.length}点`)
        }
      }
      
      segments.push(segmentInfo)
      
      // セグメント間接続線を処理
      if (i > 0 && previousSegmentST) {
        const connectionResult = addSegmentConnection(
          previousSegmentST, segmentInfo.TS, i, allCurvePoints, curveToAdd, segments
        )
        if (connectionResult.pointsAdded > 0) {
          // 接続線が追加された場合、allCurvePointsを更新
          allCurvePoints.splice(
            allCurvePoints.length - curveToAdd.length, 
            0, 
            ...connectionResult.connectionPoints
          )
        }
      }

      previousSegmentST = segmentInfo.ST
    }

    // 最終直線を処理（通常モードの最後のセグメント）
    if (i === segmentCount - 1 && !isLoop) {
      const finalLineResult = addFinalStraightLine(
        segmentData, points, allCurvePoints
      )
      if (finalLineResult.pointsAdded > 0) {
        allCurvePoints.push(...finalLineResult.straightPoints)
        
        // 最終直線をセグメントとして追加
        const finalLineSegment = {
          segmentIndex: `${i + 1}-final`,
          type: 'straight',
          isLine: true,
          curve: finalLineResult.straightPoints,
          points: finalLineResult.straightPoints,
          drawingSegments: [{ 
            type: 'straight', 
            points: finalLineResult.straightPoints 
          }],
          startPoint: finalLineResult.straightPoints[0],
          endPoint: finalLineResult.straightPoints[finalLineResult.straightPoints.length - 1]
        }
        segments.push(finalLineSegment)
      }
    }

    totalSegments++
  }

  // ループ接続線を処理
  if (isLoop) {
    const loopConnectionResult = addLoopConnections(segments, allCurvePoints)
    if (loopConnectionResult.connectionAdded) {
      allCurvePoints.push(...loopConnectionResult.connectionPoints)
      segments.push(loopConnectionResult.connectionSegment)
    }
  }

  return createSuccess({
    allCurvePoints,
    segments,
    totalSegments
  })
}

/**
 * 単一セグメントを処理
 */
function processSingleSegment(points, segmentIndex, segmentCount, isLoop, defaultSpiralFactor, previousSegmentST, debugInfo) {
  const timer = new PerformanceTimer(`セグメント${segmentIndex + 1}`)

  // セグメントの3点を取得
  const segmentPoints = getSegmentPoints(points, segmentIndex)
  
  logger.curve.debug(`セグメント ${segmentIndex + 1}/${segmentCount}`,
    `P${segmentIndex} → P${(segmentIndex + 1) % points.length} → P${(segmentIndex + 2) % points.length}`
  )

  // セグメント設定を取得
  const segmentConfig = getSegmentConfiguration(segmentPoints[1])
  
  // セグメント点を調整
  const adjustedPoints = adjustSegmentPoints(
    segmentPoints, segmentIndex, isLoop, previousSegmentST
  )

  // 緩和曲線を計算
  const segmentResult = generateUnifiedCurve(adjustedPoints, {
    radius: segmentConfig.radius,
    spiralLength: segmentConfig.spiralLength,
    curveType: CURVE_TYPES.CLOTHOID,
    spiralFactor: defaultSpiralFactor,
    isMultiPoint: true,
    isLastSegment: segmentIndex === segmentCount - 1 && !isLoop
  })

  timer.end()

  if (isError(segmentResult)) {
    logger.curve.error(`セグメント ${segmentIndex + 1} でエラー`, segmentResult.error)
    return segmentResult
  }

  const segmentData = segmentResult.data || segmentResult
  logger.curve.debug(`セグメント完了: ${segmentData.curve?.length || 0}点生成`)

  // 曲線を調整
  const curveToAdd = adjustSegmentCurve(segmentData, segmentIndex)

  // セグメント情報を作成
  const segmentInfo = createSegmentInfo(segmentData, segmentIndex, segmentCount, isLoop, points)

  return createSuccess({
    segmentData,
    curveToAdd,
    segmentInfo
  })
}

/**
 * セグメントの3点を取得
 */
function getSegmentPoints(points, segmentIndex) {
  return [
    points[segmentIndex],
    points[(segmentIndex + 1) % points.length],
    points[(segmentIndex + 2) % points.length]
  ]
}

/**
 * セグメント設定を取得
 */
function getSegmentConfiguration(centerPoint) {
  return {
    radius: centerPoint.radius || 50,
    spiralLength: (centerPoint.spiralMode === 'manual' && centerPoint.spiralLength) 
      ? centerPoint.spiralLength : null
  }
}

/**
 * セグメント点を調整
 */
function adjustSegmentPoints(segmentPoints, segmentIndex, isLoop, previousSegmentST) {
  const adjustedPoints = [...segmentPoints]

  // 前のセグメントのSTから開始するように調整
  if (segmentIndex > 0 && previousSegmentST) {
    adjustedPoints[0] = {
      x: previousSegmentST.x,
      y: previousSegmentST.y,
      radius: segmentPoints[0].radius,
      spiralMode: segmentPoints[0].spiralMode,
      spiralLength: segmentPoints[0].spiralLength
    }
    logger.curve.debug(`セグメント${segmentIndex + 1}の開始点を前のST(${previousSegmentST.x.toFixed(2)}, ${previousSegmentST.y.toFixed(2)})に設定`)
  }

  // 後続セグメントフラグを設定
  if (adjustedPoints[0].isSubsequentSegment !== undefined) {
    delete adjustedPoints[0].isSubsequentSegment
  }

  if (segmentIndex > 0 || isLoop) {
    adjustedPoints[0].isSubsequentSegment = true
  }

  return adjustedPoints
}

/**
 * セグメント曲線を調整
 */
function adjustSegmentCurve(segmentData, segmentIndex) {
  let curveToAdd = segmentData.curve

  // 最初のセグメントのTS調整
  if (segmentIndex === 0) {
    const actualTS = segmentData.clothoidData?.actualTS || segmentData.clothoidData?.TS
    
    if (actualTS && curveToAdd && curveToAdd.length > 0) {
      const firstPoint = curveToAdd[0]
      const distanceFromTS = Math.hypot(firstPoint.x - actualTS.x, firstPoint.y - actualTS.y)

      if (distanceFromTS > 1.0) {
        const tsIndex = curveToAdd.findIndex(point =>
          Math.hypot(point.x - actualTS.x, point.y - actualTS.y) < 1.0
        )

        if (tsIndex > 0) {
          curveToAdd = curveToAdd.slice(tsIndex)
          logger.curve.debug(`セグメント${segmentIndex + 1}をTS座標から開始に調整 (${tsIndex}点除去)`)
        }
      }
    }
  }

  // 後続セグメントの重複点除去
  if (segmentIndex > 0) {
    curveToAdd = curveToAdd.slice(1)
    logger.curve.debug(`セグメント${segmentIndex + 1}の重複開始点を除去`)
  }

  return curveToAdd
}

/**
 * セグメント情報を作成（レンダリング対応強化）
 */
function createSegmentInfo(segmentData, segmentIndex, segmentCount, isLoop, points) {
  if (!segmentData.clothoidData) {
    return null
  }

  // 【統一化】統一されたラベルインデックス計算を使用
  const labelIndex = getUnifiedLabelIndex(segmentIndex, points.length, isLoop)

  logger.curve.debug(`セグメント${segmentIndex}ラベル生成: isLoop=${isLoop}, segmentIndex=${segmentIndex}, labelIndex=${labelIndex}, pointsLength=${points.length}`)

  // ループモードでの追加デバッグ情報
  if (isLoop) {
    const processedPointIndex = (segmentIndex + 1) % points.length
    logger.curve.debug(`ループモード対応: セグメント${segmentIndex} → P${processedPointIndex}の角を処理 → ラベル番号${labelIndex}`)
  }

  return {
    segmentIndex: segmentIndex, // 0ベースインデックスを保持（検索用）
    type: 'clothoid',
    // 座標情報
    TS: segmentData.clothoidData.actualTS || segmentData.clothoidData.TS,
    ST: segmentData.clothoidData.actualST || segmentData.clothoidData.ST,
    SC: segmentData.clothoidData.SC,
    CS: segmentData.clothoidData.CS,
    center: segmentData.clothoidData.center || segmentData.clothoidData.actualCenter,
    radius: segmentData.clothoidData.radius,
    // ラベル情報（表示用、正しい番号付け）
    TSLabel: `TS${labelIndex}`,
    STLabel: `ST${labelIndex}`,
    SCLabel: `SC${labelIndex}`,
    CSLabel: `CS${labelIndex}`,
    // レンダリング用データ（確実に描画されるよう）
    curve: segmentData.curve || [],
    drawingSegments: segmentData.clothoidData.segments || [],
    // レンダリング設定
    renderSettings: {
      color: 'clothoid',
      lineWidth: 3,
      visible: true
    }
  }
}

// ========================================
// 接続線処理関数群
// ========================================

/**
 * セグメント間接続線を追加（確実な生成）
 */
function addSegmentConnection(previousST, currentTS, segmentIndex, allCurvePoints, curveToAdd, segments) {
  const connectionDistance = Math.hypot(currentTS.x - previousST.x, currentTS.y - previousST.y)
  
  logger.curve.debug(`ST${segmentIndex}-TS${segmentIndex + 1}接続チェック: 距離:${connectionDistance.toFixed(3)}m`)
  
  if (connectionDistance <= 0.1) {
    logger.curve.debug(`接続線スキップ: 距離が小さい ${connectionDistance.toFixed(3)}m`)
    return { pointsAdded: 0 }
  }

  const connectionPoints = generateConnectionPoints(previousST, currentTS, connectionDistance)
  
  const connectionSegment = {
    segmentIndex: `${segmentIndex}-${segmentIndex + 1}`,
    type: 'connection',
    isLine: true,
    // レンダリング確実化のため複数のデータ形式を提供
    curve: connectionPoints,
    points: connectionPoints, // 旧形式互換
    drawingSegments: [{ 
      type: 'straight', 
      points: connectionPoints 
    }],
    startPoint: previousST,
    endPoint: currentTS,
    // レンダリング設定
    renderSettings: {
      color: 'connection',
      lineWidth: 3,
      visible: true
    }
  }
  
  segments.push(connectionSegment)
  logger.curve.info(`ST${segmentIndex}-TS${segmentIndex + 1}間接続線追加: ${connectionDistance.toFixed(3)}m, ${connectionPoints.length}点`)

  return { 
    pointsAdded: connectionPoints.length - 1,
    connectionPoints: connectionPoints.slice(0, -1) // 重複除去
  }
}

/**
 * 最終直線を追加
 */
function addFinalStraightLine(segmentData, points, allCurvePoints) {
  const lastST = segmentData.clothoidData?.actualST || segmentData.clothoidData?.ST
  const finalPoint = points[points.length - 1]

  if (!lastST || !finalPoint) {
    return { pointsAdded: 0 }
  }

  const stToFinalDistance = Math.hypot(finalPoint.x - lastST.x, finalPoint.y - lastST.y)

  if (stToFinalDistance <= 10.0) {
    logger.curve.debug(`最終直線スキップ: 距離が小さい ${stToFinalDistance.toFixed(2)}m`)
    return { pointsAdded: 0 }
  }

  const straightSteps = 10
  const straightPoints = []
  for (let j = 0; j <= straightSteps; j++) {
    const t = j / straightSteps
    straightPoints.push({
      x: lastST.x + t * (finalPoint.x - lastST.x),
      y: lastST.y + t * (finalPoint.y - lastST.y)
    })
  }

  logger.curve.debug(`最終直線追加: STから最終点まで ${stToFinalDistance.toFixed(2)}m`)

  return { 
    pointsAdded: straightPoints.length,
    straightPoints: straightPoints // ST座標を含む完全な直線
  }
}

/**
 * ループ接続の入力検証（保守性向上）
 */
function validateLoopConnectionInput(segments) {
  if (!segments || segments.length === 0) {
    return { valid: false, reason: 'セグメント配列が空です' }
  }

  const clothoidSegments = segments.filter(seg => seg.type === 'clothoid')
  if (clothoidSegments.length === 0) {
    return { valid: false, reason: 'clothoidセグメントが見つかりません' }
  }

  // ST0を持つセグメント（P0の角を処理するセグメント）を検索
  const lastSegmentIndex = Math.max(...segments.filter(s => s.type === 'clothoid').map(s => s.segmentIndex))
  const sourceSegment = segments.find(seg => seg.type === 'clothoid' && seg.segmentIndex === lastSegmentIndex)
  
  if (!sourceSegment) {
    return { valid: false, reason: `ST0を持つセグメント(index=${lastSegmentIndex})が見つかりません` }
  }

  if (!sourceSegment.ST) {
    return { valid: false, reason: `${LOOP_CONNECTION_SPEC.SOURCE_POINT}座標が見つかりません` }
  }

  return { valid: true }
}

/**
 * ループ接続線を追加（確実な生成）
 */
function addLoopConnections(segments, allCurvePoints) {
  // 入力検証を追加
  const validation = validateLoopConnectionInput(segments)
  if (!validation.valid) {
    logger.curve.warn(`ループ接続: ${validation.reason}`)
    return { connectionAdded: false }
  }

  // セグメント検索を定数で明確化
  logger.curve.debug('ループ接続: セグメント検索開始', {
    全セグメント数: segments.length,
    clothoidセグメント: segments.filter(s => s.type === 'clothoid').map(s => `index:${s.segmentIndex}`)
  })

  // ST0を持つセグメント（P0の角を処理するセグメント、通常は最後のセグメント）を探す
  const lastSegmentIndex = Math.max(...segments.filter(s => s.type === 'clothoid').map(s => s.segmentIndex))
  const sourceSegment = segments.find(seg => seg.type === 'clothoid' && seg.segmentIndex === lastSegmentIndex)
  
  // TS1を持つセグメント（P1の角を処理するセグメント、通常は最初のセグメント）を探す
  const targetSegment = segments.find(seg => seg.type === 'clothoid' && seg.segmentIndex === SEGMENT_INDEX.FIRST)

  logger.curve.debug('ループ接続: セグメント検索結果', {
    sourceSegment: sourceSegment ? `found(index:${sourceSegment.segmentIndex})` : 'not found',
    targetSegment: targetSegment ? `found(index:${targetSegment.segmentIndex})` : 'not found',
    sourceST: sourceSegment?.ST ? `(${sourceSegment.ST.x.toFixed(2)}, ${sourceSegment.ST.y.toFixed(2)})` : 'none'
  })

  if (!sourceSegment?.ST) {
    logger.curve.warn(`ループ接続: ST0を持つセグメント(index=${lastSegmentIndex})のST座標が見つかりません`)
    return { connectionAdded: false }
  }

  // ST0 → TS1 の接続（仕様明確化）
  const targetTS = targetSegment?.TS

  if (!targetTS) {
    logger.curve.warn(`ループ接続: ターゲット${LOOP_CONNECTION_SPEC.TARGET_POINT}座標が見つかりません`)
    return { connectionAdded: false }
  }

  const sourceST = sourceSegment.ST
  const connectionDistance = Math.hypot(targetTS.x - sourceST.x, targetTS.y - sourceST.y)

  // ログに明確な仕様を記録
  logger.curve.info(`${LOOP_CONNECTION_SPEC.SOURCE_POINT}→${LOOP_CONNECTION_SPEC.TARGET_POINT}接続生成: ${LOOP_CONNECTION_SPEC.SOURCE_POINT}(${sourceST.x.toFixed(2)}, ${sourceST.y.toFixed(2)}) → ${LOOP_CONNECTION_SPEC.TARGET_POINT}(${targetTS.x.toFixed(2)}, ${targetTS.y.toFixed(2)}) 距離:${connectionDistance.toFixed(3)}m`)

  const connectionPoints = generateConnectionPoints(sourceST, targetTS, connectionDistance)

  const connectionSegment = {
    segmentIndex: `${lastSegmentIndex}-${SEGMENT_INDEX.FIRST}`, // ST0からTS1への接続
    type: LOOP_CONNECTION_SPEC.CONNECTION_TYPE,
    isLine: true,
    // レンダリング確実化のため複数のデータ形式を提供
    curve: connectionPoints,
    points: connectionPoints, // 旧形式互換
    drawingSegments: [{ 
      type: 'straight', 
      points: connectionPoints 
    }],
    startPoint: sourceST,
    endPoint: targetTS,
    // レンダリング設定
    renderSettings: {
      color: LOOP_CONNECTION_SPEC.CONNECTION_TYPE,
      lineWidth: 3,
      visible: true,
      priority: 'high' // 高優先度で描画
    },
    // メタデータ（デバッグ用）
    metadata: {
      sourceSegment: sourceSegment.segmentIndex,
      targetSegment: targetSegment.segmentIndex,
      specification: `${LOOP_CONNECTION_SPEC.SOURCE_POINT}→${LOOP_CONNECTION_SPEC.TARGET_POINT}`
    }
  }

  logger.curve.info(`${LOOP_CONNECTION_SPEC.SOURCE_POINT}→${LOOP_CONNECTION_SPEC.TARGET_POINT}接続線生成完了: ${connectionDistance.toFixed(3)}m, ${connectionPoints.length}点`)

  return {
    connectionAdded: true,
    connectionPoints,
    connectionSegment
  }
}

/**
 * 接続点を生成
 */
function generateConnectionPoints(startPoint, endPoint, distance) {
  const connectionSteps = Math.max(2, Math.ceil(Math.max(distance, 10) / 5))
  const connectionPoints = []

  for (let j = 0; j <= connectionSteps; j++) {
    const t = j / connectionSteps
    connectionPoints.push({
      x: startPoint.x + t * (endPoint.x - startPoint.x),
      y: startPoint.y + t * (endPoint.y - startPoint.y)
    })
  }

  return connectionPoints
}

// ========================================
// 共通ユーティリティ関数
// ========================================

// ========================================
// 共通ユーティリティ関数
// ========================================

/**
 * 入力検証関数（共通）
 */
function validateCurveInputs(points, radius, options = {}) {
  const pointValidation = validate.points(points, options.minPoints || 3)
  if (pointValidation) {
    logger.curve.error('点検証エラー', pointValidation.error)
    return pointValidation
  }

  // radiusがnullでない場合のみ検証
  if (radius !== null && radius !== undefined) {
    const radiusValidation = validate.radius(radius)
    if (radiusValidation) {
      logger.curve.error('半径検証エラー', radiusValidation.error)
      return radiusValidation
    }
  }

  return null // 検証成功
}

/**
 * 3点間基本幾何計算（距離・角度・偏角）
 */
function calculateBasicGeometry(p0, p1, p2) {
  const P0 = Array.isArray(p0) ? p0 : [p0.x, p0.y]
  const P1 = Array.isArray(p1) ? p1 : [p1.x, p1.y]
  const P2 = Array.isArray(p2) ? p2 : [p2.x, p2.y]

  const d01 = dist(P0, P1)
  const d12 = dist(P1, P2)
  const angle01 = getAngle(P0, P1)
  const angle12 = getAngle(P1, P2)
  let deltaAngle = normalizeAngle(angle12 - angle01)

  return {
    points: { P0, P1, P2 },
    distances: { d01, d12 },
    angles: { angle01, angle12 },
    deltaAngle
  }
}

/**
 * 直線判定関数
 */
function isStraightLine(deltaAngle, tolerance = 0.0017) {
  return Math.abs(deltaAngle) < tolerance // 0.1度 = 0.0017ラジアン
}

//ー 統一曲線生成システム ========================================
// 全ての曲線タイプを統一的に処理する中核システム

// 曲線タイプ列挙
export const CURVE_TYPES = {
  CLOTHOID: 'clothoid',
  STRAIGHT: 'straight'
}

/**
 * 統一曲線生成関数 - 内部実装
 * @param {Array} points - 制御点配列
 * @param {Object} options - オプション設定
 * @returns {Object} 曲線データ
 */
export function generateUnifiedCurve(points, options = {}) {
  const config = {
    radius: null,
    spiralLength: null,
    curveType: CURVE_TYPES.CLOTHOID,
    spiralFactor: 2.0,
    isMultiPoint: false,
    isLastSegment: false,
    ...options
  }

  const timer = new PerformanceTimer('統一曲線生成')

  logger.curve.info('統一曲線生成開始', {
    点数: points.length,
    タイプ: config.curveType,
    半径: config.radius,
    スパイラル長: config.spiralLength || '自動'
  })

  try {
    // 共通検証
    const validationResult = validateCurveInputs(points, config.radius)
    if (validationResult) {
      return validationResult
    }

    // 基本幾何計算
    const geometry = calculateBasicGeometry(points[0], points[1], points[2])
    const debugInfo = buildGeometryDebugInfo(geometry, config)

    // 直線判定
    if (isStraightLine(geometry.deltaAngle)) {
      return handleStraightLine(geometry, debugInfo)
    }

    // タイプ別処理
    switch (config.curveType) {
      case CURVE_TYPES.CLOTHOID:
        return generateClothoidCurveSegment(
          points, config.radius, config.spiralLength, 
          config.spiralFactor, debugInfo, config.isLastSegment
        )
      default:
        return createError(ERROR_CODES.INVALID_PARAMETER, `未知の曲線タイプ: ${config.curveType}`, debugInfo)
    }

  } catch (error) {
    logger.curve.error('統一曲線生成エラー', error.message)
    return createError(
      ERROR_CODES.CALCULATION_ERROR,
      `予期しないエラー: ${error.message}`,
      `\n例外: ${error.message}\n`
    )
  } finally {
    timer.end()
  }
}

/**
 * 幾何データのデバッグ情報を構築
 */
function buildGeometryDebugInfo(geometry, config) {
  let debugInfo = formatDebugInfo('統一曲線生成', {
    タイプ: config.curveType,
    P0: `(${geometry.points.P0[0]}, ${geometry.points.P0[1]})`,
    P1: `(${geometry.points.P1[0]}, ${geometry.points.P1[1]})`,
    P2: `(${geometry.points.P2[0]}, ${geometry.points.P2[1]})`,
    半径: config.radius
  })

  debugInfo += `距離: d01=${geometry.distances.d01.toFixed(2)}, d12=${geometry.distances.d12.toFixed(2)}\n`
  debugInfo += `角度: angle01=${(geometry.angles.angle01 * 180 / Math.PI).toFixed(2)}°, angle12=${(geometry.angles.angle12 * 180 / Math.PI).toFixed(2)}°\n`
  debugInfo += `偏角: Δ=${(geometry.deltaAngle * 180 / Math.PI).toFixed(2)}°\n`

  return debugInfo
}

/**
 * 直線の場合の処理
 */
function handleStraightLine(geometry, debugInfo) {
  debugInfo += '直線として処理（角度が小さすぎます）\n'
  return createSuccess({
    curve: [
      { x: geometry.points.P0[0], y: geometry.points.P0[1] },
      { x: geometry.points.P1[0], y: geometry.points.P1[1] },
      { x: geometry.points.P2[0], y: geometry.points.P2[1] }
    ],
    type: CURVE_TYPES.STRAIGHT
  }, debugInfo)
}

/**
 * 緩和曲線セグメント生成 - 内部関数
 * @param {Array} points - 制御点
 * @param {number} radius - 半径
 * @param {number} spiralLength - スパイラル長
 * @param {number} spiralFactor - スパイラル係数
 * @param {string} debugInfo - デバッグ情報
 * @param {boolean} isLastSegment - 最後のセグメントか
 * @returns {Object} 緩和曲線データ
 */
function generateClothoidCurveSegment(points, radius, spiralLength, spiralFactor, debugInfo, isLastSegment = false) {
  // clothoidUtils.jsの関数を活用
  const clothoidResult = safeExecute(calculateSingleClothoid, [points, radius, spiralLength, spiralFactor], '緩和曲線計算')

  if (isError(clothoidResult)) {
    return clothoidResult
  }

  const clothoidData = clothoidResult.data || clothoidResult

  logger.curve.debug('緩和曲線データ構造確認', {
    isLine: clothoidData.isLine,
    hasStartPoint: !!clothoidData.startPoint,
    hasTS: !!clothoidData.TS,
    hasST: !!clothoidData.ST,
    keys: Object.keys(clothoidData)
  })

  // 直線の場合の処理
  if (clothoidData.isLine) {
    return handleClothoidStraightLine(clothoidData, debugInfo)
  }

  // 緩和曲線の場合の処理
  return generateClothoidCurvePoints(clothoidData, points, isLastSegment, debugInfo)
}

/**
 * 緩和曲線が直線の場合の処理
 */
function handleClothoidStraightLine(clothoidData, debugInfo) {
  debugInfo += '直線として処理\n'
  return createSuccess({
    curve: clothoidData.curve,
    type: CURVE_TYPES.STRAIGHT,
    clothoidData: {
      isLine: true,
      startPoint: clothoidData.startPoint,
      endPoint: clothoidData.endPoint,
      segments: []
    }
  }, debugInfo)
}

/**
 * 緩和曲線の点列を生成
 */
function generateClothoidCurvePoints(clothoidData, points, isLastSegment, debugInfo) {
  try {
    // 必要なプロパティの確認
    if (!clothoidData.TS || !clothoidData.ST) {
      throw new Error(`必要なプロパティが不足: TS=${!!clothoidData.TS}, ST=${!!clothoidData.ST}`)
    }

    const allPoints = []
    const segments = []

    const startPoint = { x: points[0].x, y: points[0].y }
    const endPoint = { x: points[2].x, y: points[2].y }

    // 各セクションを生成
    generateInletSection(allPoints, segments, startPoint, clothoidData, points[0])
    generateSpiralInSection(allPoints, segments, clothoidData)
    generateArcSection(allPoints, segments, clothoidData)
    generateSpiralOutSection(allPoints, segments, clothoidData)
    
    if (isLastSegment) {
      generateOutletSection(allPoints, segments, endPoint, clothoidData)
    }

    debugInfo += `緩和曲線生成完了: 総点数${allPoints.length}\n`

    return createSuccess({
      curve: allPoints,
      type: CURVE_TYPES.CLOTHOID,
      clothoidData: {
        ...clothoidData,
        segments
      }
    }, debugInfo)

  } catch (error) {
    return createError(
      ERROR_CODES.CALCULATION_ERROR,
      `緩和曲線点列生成エラー: ${error.message}`,
      debugInfo
    )
  }
}

/**
 * 入口直線セクションを生成
 */
function generateInletSection(allPoints, segments, startPoint, clothoidData, firstPoint) {
  const shouldGenerateInlet = !firstPoint.isSubsequentSegment

  if (shouldGenerateInlet) {
    const inletPoints = generateStraightLinePoints(startPoint, clothoidData.TS, 10)
    allPoints.push(...inletPoints)
    segments.push({ type: 'straight', points: inletPoints })
    logger.curve.debug('入口直線を生成しました')
  } else {
    allPoints.push({ x: clothoidData.TS.x, y: clothoidData.TS.y })
    logger.curve.debug('入口直線をスキップ（後続セグメント）')
  }
}

/**
 * 入口スパイラルセクションを生成
 */
function generateSpiralInSection(allPoints, segments, clothoidData) {
  const spiralInPoints = generateSpiralPoints(
    clothoidData.spiralLength,
    clothoidData.radius,
    clothoidData.Az_in,
    clothoidData.TS,
    clothoidData.sgn,
    20,
    false // 入口スパイラル
  )
  allPoints.push(...spiralInPoints.slice(1)) // 重複回避
  segments.push({ type: 'spiral', points: spiralInPoints })
}

/**
 * 円弧セクションを生成
 */
function generateArcSection(allPoints, segments, clothoidData) {
  if (clothoidData.defl_c > 1e-6) {
    const scToCenterAngle = Math.atan2(clothoidData.SC.y - clothoidData.center.y, clothoidData.SC.x - clothoidData.center.x)
    const arcPoints = generateArcPoints(
      clothoidData.center,
      clothoidData.radius,
      scToCenterAngle,
      clothoidData.sgn * clothoidData.defl_c,
      Math.max(10, Math.floor(clothoidData.defl_c * 20))
    )
    allPoints.push(...arcPoints.slice(1)) // 重複回避
    segments.push({ type: 'arc', points: arcPoints })
  }
}

/**
 * 出口スパイラルセクションを生成
 */
function generateSpiralOutSection(allPoints, segments, clothoidData) {
  const spiralOutPoints = generateSpiralPoints(
    clothoidData.spiralLength,
    clothoidData.radius,
    clothoidData.Az_CS,
    clothoidData.CS,
    clothoidData.sgn,
    20,
    true // 出口スパイラル
  )
  allPoints.push(...spiralOutPoints.slice(1)) // 重複回避
  segments.push({ type: 'spiral', points: spiralOutPoints })
}

/**
 * 出口直線セクションを生成
 */
function generateOutletSection(allPoints, segments, endPoint, clothoidData) {
  const outletPoints = generateStraightLinePoints(clothoidData.ST, endPoint, 10, true)
  allPoints.push(...outletPoints)
  segments.push({ type: 'straight', points: outletPoints })
  logger.curve.debug('出口直線を生成しました（最後のセグメント）')
}

/**
 * 直線の点列を生成
 */
function generateStraightLinePoints(startPoint, endPoint, steps, skipFirst = false) {
  const points = []
  const startIndex = skipFirst ? 1 : 0
  
  for (let i = startIndex; i <= steps; i++) {
    const t = i / steps
    points.push({
      x: startPoint.x + t * (endPoint.x - startPoint.x),
      y: startPoint.y + t * (endPoint.y - startPoint.y)
    })
  }
  
  return points
}
