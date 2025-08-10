/**
 * 曲線制約違反検出・調整ユーティリティ
 * クロソイド曲線の消費距離が制御点間距離を超過する問題を統合的に解決
 */

import { logger } from './logger.js'

// 定数定義
const CONSTANTS = {
  // 最小係数制限
  MIN_COEFFICIENT_NORMAL: 0.3,    // 通常時は30%まで（過度の縮小を防止）
  MIN_COEFFICIENT_STRICT: 0.1,    // 制御点チェック時は10%まで
}

/**
 * 制約違反（曲線消費距離の超過）を検出
 * @param {Object} curveData 曲線データ
 * @param {Array} controlPoints 制御点座標配列
 * @returns {Object} 検出結果
 */
export function detectOverlaps(curveData, controlPoints = []) {
  const results = createEmptyResults()
  
  try {
    const { segments, isLoopMode } = extractCurveData(curveData)
    if (!segments) return results
    
    const clothoidSegments = filterClothoidSegments(segments)
    if (!validateSegments(clothoidSegments, controlPoints, isLoopMode)) return results
    
    // 制約違反の検出（曲線消費距離の超過チェック）
    checkConstraintViolations(clothoidSegments, controlPoints, isLoopMode, results)
    checkSegmentConstraintViolations(clothoidSegments, controlPoints, isLoopMode, results)
    
    finalizeResults(results)
    
  } catch (error) {
    handleDetectionError(error, controlPoints, results)
  }
  
  return results
}

// =============================================================================
// ヘルパー関数群
// =============================================================================

/**
 * 空の検出結果オブジェクトを作成
 */
function createEmptyResults() {
  return {
    hasOverlaps: false,
    overlaps: [],
    summary: { totalIssues: 0 }
  }
}

/**
 * 曲線データからセグメントとループモードを抽出
 */
function extractCurveData(curveData) {
  if (!curveData?.clothoidData?.segments) {
    logger.curve.debug('セグメントデータが存在しません')
    return { segments: null, isLoopMode: false }
  }
  
  return {
    segments: curveData.clothoidData.segments,
    isLoopMode: curveData.clothoidData.isLoop || false
  }
}

/**
 * クロソイドセグメントのみを抽出
 */
function filterClothoidSegments(segments) {
  const clothoidSegments = segments.filter(seg => !seg.isLine && seg.TS && seg.ST)
  logger.curve.debug('緩和曲線セグメント抽出', {
    全セグメント: segments.length,
    緩和曲線セグメント: clothoidSegments.length
  })
  return clothoidSegments
}

/**
 * セグメントと制御点の妥当性を検証
 */
function validateSegments(clothoidSegments, controlPoints, isLoopMode) {
  if (clothoidSegments.length === 0) {
    logger.curve.debug('緩和曲線セグメントが存在しません')
    return false
  }
  
  const requiredPoints = isLoopMode ? clothoidSegments.length : clothoidSegments.length + 1
  if (controlPoints.length < requiredPoints) {
    logger.curve.debug('制御点不足で制約違反検出を中断', {
      必要制御点数: requiredPoints,
      実際制御点数: controlPoints.length,
      ループモード: isLoopMode
    })
    return false
  }
  
  return true
}

/**
 * 検出結果を最終化
 */
function finalizeResults(results) {
  results.hasOverlaps = results.overlaps.length > 0
  results.summary.totalIssues = results.overlaps.length
  
  if (results.hasOverlaps) {
    logger.curve.warn('[finalizeResults] 制約違反検出', {
      違反数: results.overlaps.length
    })
  }
}

/**
 * 検出エラーを処理
 */
function handleDetectionError(error, controlPoints, results) {
  logger.curve.error('制約違反検出エラー', {
    エラーメッセージ: error.message,
    スタック: error.stack,
    制御点数: controlPoints.length
  })
  results.error = error.message
}

/**
 * 制御点と緩和曲線の制約違反をチェック
 */
function checkConstraintViolations(clothoidSegments, controlPoints, isLoopMode, results) {
  // ログを大幅削減 - 必要最小限のみ
  
  for (let i = 0; i < clothoidSegments.length; i++) {
    const segment = clothoidSegments[i]
    
    // セグメントに対応する制御点インデックスを計算
    let startControlIndex, midControlIndex, endControlIndex
    
    if (isLoopMode) {
      startControlIndex = i
      midControlIndex = (i + 1) % controlPoints.length
      endControlIndex = (i + 2) % controlPoints.length
    } else {
      startControlIndex = i
      midControlIndex = i + 1
      endControlIndex = i + 2
    }
    
    // インデックス範囲チェック
    if (startControlIndex >= controlPoints.length || 
        midControlIndex >= controlPoints.length || 
        (endControlIndex >= controlPoints.length && !isLoopMode)) {
      continue
    }
    
    // 1. 始点方向チェック: P_start→P_mid vs TS→ST (カーブの進行方向)
    const controlStartToMid = [
      controlPoints[midControlIndex].x - controlPoints[startControlIndex].x,
      controlPoints[midControlIndex].y - controlPoints[startControlIndex].y
    ]
    
    const curveDirection = [
      segment.ST.x - segment.TS.x,
      segment.ST.y - segment.TS.y
    ]
    
    checkConstraintViolation(
      controlStartToMid, curveDirection,
      `P${startControlIndex}→P${midControlIndex}`, `TS${i}→ST${i}`,
      [controlPoints[startControlIndex], controlPoints[midControlIndex]],
      [segment.TS, segment.ST],
      `制御点始点`, i, results
    )
    
    // 2. 終点方向チェック: P_mid→P_end vs TS→ST (非ループまたはループで次のセグメントが存在する場合)
    if (!isLoopMode && endControlIndex < controlPoints.length) {
      const controlMidToEnd = [
        controlPoints[endControlIndex].x - controlPoints[midControlIndex].x,
        controlPoints[endControlIndex].y - controlPoints[midControlIndex].y
      ]
      
      // 同じカーブの進行方向を使用
      checkConstraintViolation(
        controlMidToEnd, curveDirection,
        `P${midControlIndex}→P${endControlIndex}`, `TS${i}→ST${i}`,
        [controlPoints[midControlIndex], controlPoints[endControlIndex]],
        [segment.TS, segment.ST],
        `制御点終点`, i, results
      )
    }
  }
}

/**
 * セグメント間接続の制約違反をチェック
 */
function checkSegmentConstraintViolations(clothoidSegments, controlPoints, isLoopMode, results) {
  // ログを大幅削減 - 必要最小限のみ
  
  const totalChecks = isLoopMode ? clothoidSegments.length : clothoidSegments.length - 1
  
  for (let i = 0; i < totalChecks; i++) {
    const segment1 = clothoidSegments[i]
    const segment2 = clothoidSegments[(i + 1) % clothoidSegments.length]
    
    // STn→TSn+1のベクトル（実際の接続ベクトル）
    const connectionVector = [
      segment2.TS.x - segment1.ST.x,
      segment2.TS.y - segment1.ST.y
    ]
    
    // 対応する制御点方向ベクトルを計算
    let controlPointIndex1, controlPointIndex2
    
    if (isLoopMode) {
      // ループモード：セグメント間の制御点接続
      controlPointIndex1 = (i + 1) % controlPoints.length  // セグメント1の中間制御点
      controlPointIndex2 = (i + 2) % controlPoints.length  // セグメント2の中間制御点
    } else {
      // 非ループモード
      controlPointIndex1 = i + 1  // セグメント接続点
      controlPointIndex2 = i + 2  // 次の制御点
    }
    
    // インデックス安全性チェック
    if (controlPointIndex1 >= controlPoints.length || 
        controlPointIndex2 >= controlPoints.length ||
        !controlPoints[controlPointIndex1] || 
        !controlPoints[controlPointIndex2]) {
      continue
    }
    
    const controlVector = [
      controlPoints[controlPointIndex2].x - controlPoints[controlPointIndex1].x,
      controlPoints[controlPointIndex2].y - controlPoints[controlPointIndex1].y
    ]
    
    const isLoopConnection = isLoopMode && i === clothoidSegments.length - 1
    
    checkConstraintViolation(
      controlVector, connectionVector,
      `P${controlPointIndex1}→P${controlPointIndex2}`, `ST${i}→TS${(i+1)%clothoidSegments.length}`,
      [controlPoints[controlPointIndex1], controlPoints[controlPointIndex2]],
      [segment1.ST, segment2.TS],
      isLoopConnection ? `セグメント接続(ループ)` : `セグメント接続`,
      i, results
    )
  }
}

/**
 * 2つのベクトルの方向から制約違反をチェック
 * 方向が反対 = 曲線消費距離が制御点間距離を超過する指標
 */
function checkConstraintViolation(vector1, vector2, label1, label2, points1, points2, type, segmentIndex, results) {
  // ベクトルの長さを計算
  const length1 = Math.sqrt(vector1[0] * vector1[0] + vector1[1] * vector1[1])
  const length2 = Math.sqrt(vector2[0] * vector2[0] + vector2[1] * vector2[1])
  
  // ゼロベクトル回避
  if (length1 === 0 || length2 === 0) {
    return
  }
  
  // ベクトルを正規化
  const normalized1 = [vector1[0] / length1, vector1[1] / length1]
  const normalized2 = [vector2[0] / length2, vector2[1] / length2]
  
  // 向き判定：内積が負なら反対方向
  const dotProduct = normalized1[0] * normalized2[0] + normalized1[1] * normalized2[1]
  
  // デバッグログは制約違反時のみ
  if (dotProduct < 0) {
    logger.curve.debug(`[checkConstraintViolation] ${type} ${label1} vs ${label2}`, {
      内積: dotProduct.toFixed(3),
      向き判定: '反対'
    })
  }
  
  // 制約違反条件：方向が反対 = 曲線消費距離の超過
  if (dotProduct < 0) {
    const overlapCenter = [
      (points2[0].x + points2[1].x) / 2,
      (points2[0].y + points2[1].y) / 2
    ]
    
    results.overlaps.push({
      type: 'constraint_violation',
      category: type,
      segmentIndex: segmentIndex,
      dotProduct: dotProduct,
      vector1: vector1,
      vector2: vector2,
      label1: label1,
      label2: label2,
      points: {
        P1: [points1[0].x, points1[0].y],
        P2: [points1[1].x, points1[1].y],
        ST: [points2[0].x, points2[0].y],
        TS: [points2[1].x, points2[1].y],
        center: overlapCenter
      }
    })
    
    logger.curve.warn(`[checkConstraintViolation] ${type}制約違反検出`, {
      セグメント: segmentIndex,
      方向1: label1,
      方向2: label2,
      内積: dotProduct.toFixed(3)
    })
  }
}

/**
 * 制約違反情報を人間可読な形式でフォーマット
 * @param {Object} overlapResults 制約違反検出結果
 * @returns {string} フォーマットされたテキスト
 */
export function formatConstraintViolationReport(overlapResults) {
  // 入力データの安全性チェック
  if (!overlapResults) {
    logger.curve.debug('formatConstraintViolationReport: overlapResultsが未定義')
    return '❌ 制約違反結果が未定義'
  }
  
  if (!overlapResults.hasOverlaps) {
    return '✅ 制約違反なし'
  }
  
  // overlaps配列の安全性チェック
  if (!overlapResults.overlaps || !Array.isArray(overlapResults.overlaps)) {
    logger.curve.debug('formatConstraintViolationReport: overlaps配列が未定義または配列でない', {
      overlaps: overlapResults.overlaps,
      hasOverlaps: overlapResults.hasOverlaps,
      summary: overlapResults.summary
    })
    return '❌ 制約違反データが不正'
  }
  
  if (overlapResults.overlaps.length === 0) {
    return '✅ 制約違反なし（空配列）'
  }
  
  let report = `⚠️ 制約違反検出 (総計: ${overlapResults.summary?.totalIssues || overlapResults.overlaps.length}件)\n`
  
  overlapResults.overlaps.forEach((overlap, index) => {
    // 各制約違反データの安全性チェック
    if (!overlap) {
      logger.curve.debug(`formatConstraintViolationReport: overlap[${index}]が未定義`)
      report += `❌ 制約違反${index}: データ不正\n`
      return
    }
    
    const category = overlap.category || '不明'
    const segmentIndex = overlap.segmentIndex !== undefined ? overlap.segmentIndex : '不明'
    const label1 = overlap.label1 || '不明'
    const label2 = overlap.label2 || '不明'
    const dotProduct = overlap.dotProduct !== undefined ? overlap.dotProduct : 0
    
    report += `🔄 ${category} セグメント${segmentIndex}: ${label1} vs ${label2} `
    report += `(内積: ${dotProduct.toFixed(3)})\n`
  })
  
  return report
}

/**
 * 制約違反統合調整 - 一元化調整方式
 * 制約違反検出と調整を一度の計算で完了する
 * @param {Array} controlPoints 制御点配列
 * @param {Array} segments セグメント配列（TS/ST座標含む）
 * @param {boolean} isLoopMode ループモード
 * @param {boolean} enableControlPointCheck 制御点チェック機能有効化
 * @returns {Array} 調整された制御点配列
 */
export function adjustControlPointsForConstraints(controlPoints, segments, isLoopMode = false, enableControlPointCheck = true) {
  // ログ削減（開始ログのみ）
  logger.curve.info('[adjustControlPointsForConstraints] 制約調整開始', {
    制御点数: controlPoints.length,
    ループモード: isLoopMode
  })
  
  const n = controlPoints.length
  
  // セグメントをクロソイドセグメントのみにフィルタリング
  const clothoidSegments = segments.filter(s => s && s.TS && s.ST && !s.isLine)
  const k = clothoidSegments.length  // 実セグメント数
  
  // 非ループ対応：ループ時はk=n、非ループ時はk=n-2が正常
  const ok = isLoopMode ? (k === n) : (k === n - 2)
  if (!ok) {
    logger.curve.warn('[adjustControlPointsForConstraints] セグメント数不一致', {
      制御点数: n,
      クロソイドセグメント数: k,
      ループ: isLoopMode,
      期待: isLoopMode ? n : (n - 2)
    })
    return controlPoints // そのまま返す
  }
  
  const uOut = new Array(n).fill(0)  // 各角の「次セグメント側」消費距離
  const uIn = new Array(n).fill(0)   // 各角の「前セグメント側」消費距離
  const Lseg = new Array(n).fill(0)  // 各セグメントの長さ
  
  // 1) 消費距離計算
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    if (!isLoopMode && j >= n) continue
    
    const Pi = controlPoints[i]
    const Pj = controlPoints[j]
    
    // セグメントi（Pi→Pj）の方向ベクトル
    const e = [Pj.x - Pi.x, Pj.y - Pi.y]
    const len = Math.sqrt(e[0] * e[0] + e[1] * e[1])
    
    if (len === 0) continue // ゼロ除算回避
    
    const d = [e[0] / len, e[1] / len] // 単位方向ベクトル
    
    // 角iの「次セグメント側」消費距離
    const seg_i_prev = clothoidSegments[(i - 1 + n) % n]
    if (seg_i_prev && seg_i_prev.ST) {
      const ST_i = seg_i_prev.ST
      const vecToST = [ST_i.x - Pi.x, ST_i.y - Pi.y]
      // 投影距離ではなく実際の距離を使用
      const distance = Math.sqrt(vecToST[0] * vecToST[0] + vecToST[1] * vecToST[1])
      // 異常値チェック：セグメント長の3倍を超える消費距離は制限
      uOut[i] = Math.min(distance, len * 3.0)
    } else {
      uOut[i] = 0
    }

    // 角j(=i+1)の「前セグメント側」消費距離
    const seg_j = clothoidSegments[i]
    if (seg_j && seg_j.TS) {
      const TS_j = seg_j.TS
      const vecFromTS = [Pj.x - TS_j.x, Pj.y - TS_j.y]
      // 投影距離ではなく実際の距離を使用
      const distance = Math.sqrt(vecFromTS[0] * vecFromTS[0] + vecFromTS[1] * vecFromTS[1])
      // 異常値チェック：セグメント長の3倍を超える消費距離は制限
      uIn[j] = Math.min(distance, len * 3.0)
      
      // 制御点チェック
      if (enableControlPointCheck) {
        const projectionCheck = vecFromTS[0] * d[0] + vecFromTS[1] * d[1]
        if (projectionCheck < 0) {
          logger.curve.warn(`[adjustControlPointsForConstraints] 制御点P${j}逆方向: ${Math.abs(projectionCheck).toFixed(1)}m`)
        }
      }
    } else {
      uIn[j] = 0
    }

    Lseg[i] = len

    // 超過の場合はログ出力
    if (uOut[i] + uIn[j] > len) {
      logger.curve.warn(`[adjustControlPointsForConstraints] セグメント${i}超過検出`, {
        セグメント長: len.toFixed(3),
        合計消費: (uOut[i] + uIn[j]).toFixed(3),
        超過量: `${(uOut[i] + uIn[j] - len).toFixed(3)}m`
      })
    }
  }
  
  // 2) 一度だけの直接調整係数計算（段階的処理を完全排除）
  const t = new Array(n).fill(1.0)
  const adjustmentNeeded = new Array(n).fill(false) // 調整必要フラグ
  
  // 各制御点について必要な調整係数を一度だけ計算
  for (let i = 0; i < n; i++) {
    let requiredRatio = 1.0
    
    // 制御点iに隣接するセグメントのみをチェック（ループモードでも同様）
    const segmentChecks = [
      { segIdx: (i - 1 + n) % n, nextIdx: i },      // 前のセグメント
      { segIdx: i, nextIdx: (i + 1) % n }           // 次のセグメント
    ]
    
    for (const {segIdx, nextIdx} of segmentChecks) {
      // 非ループモードでの境界チェック
      if (!isLoopMode) {
        if (segIdx < 0 || nextIdx >= n) continue
        if (i === 0 && segIdx === n - 1) continue // 最初の制御点は前セグメントなし
        if (i === n - 1 && nextIdx === 0) continue // 最後の制御点は次セグメントなし
      }
      
      const currentConsumption = uOut[segIdx] + uIn[nextIdx]
      const segmentLength = Lseg[segIdx]
      
      // 直接調整：わずかでも超過したら調整
      if (currentConsumption > segmentLength) {
        // 制御点iがこのセグメントに影響する場合
        if (segIdx === i || nextIdx === i) {
          // このセグメントで必要な調整比率を計算
          const segmentAdjustmentRatio = segmentLength / currentConsumption
          
          // より厳しい調整が必要な場合は更新（一度だけ）
          if (segmentAdjustmentRatio < requiredRatio) {
            requiredRatio = segmentAdjustmentRatio
            adjustmentNeeded[i] = true
          }
        }
      }
    }
    
    // 最終調整係数を設定（段階的更新なし）
    t[i] = requiredRatio
  }
  
  // 最小係数制限を適用
  const minCoeff = enableControlPointCheck ? CONSTANTS.MIN_COEFFICIENT_STRICT : CONSTANTS.MIN_COEFFICIENT_NORMAL
  for (let i = 0; i < n; i++) {
    t[i] = Math.max(minCoeff, t[i])
  }
  
  // 3) 調整適用
  const adjustedPoints = controlPoints.map(point => ({ ...point }))
  let adjustmentCount = 0
  
  for (let i = 0; i < n; i++) {
    if (t[i] < 0.999) { // 0.1%以上の調整
      const originalRadius = controlPoints[i].radius || 100
      const originalSpiral = controlPoints[i].spiralFactor || 2.0
      
      adjustedPoints[i].adjustmentFactor = t[i]
      adjustedPoints[i].adjustedRadius = originalRadius * t[i]
      adjustedPoints[i].adjustedSpiralFactor = originalSpiral * t[i]
      adjustedPoints[i].adjustment = {
        type: 'unified-constraint-adjustment',
        originalRadius,
        originalSpiralFactor: originalSpiral,
        adjustmentFactor: t[i],
        reductionPercent: ((1 - t[i]) * 100).toFixed(1),
        reason: 'constraint-violation-resolution'
      }
      
      adjustmentCount++
      
      // 調整が発生した場合はログ出力（簡素化）
      logger.curve.info('[adjustControlPointsForConstraints] 調整適用', {
        制御点: i,
        調整比率: t[i].toFixed(3),
        削減率: `${((1 - t[i]) * 100).toFixed(1)}%`
      })
    }
  }
  
  if (adjustmentCount > 0) {
    logger.curve.info('[adjustControlPointsForConstraints] 制約調整完了', {
      調整制御点数: adjustmentCount,
      総制御点数: n
    })
  }
  
  return adjustedPoints
}
