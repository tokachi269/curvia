/**
 * 曲線オーバーラップ検出ユーティリティ
 * Pn→Pn+1の方向とSTn→TSn+1の向きが反対の場合をオーバーラップとする
 */

import { logger } from './logger.js'

/**
 * セグメント間の方向オーバーラップを検出
 * @param {Object} curveData 曲線データ
 * @param {Array} controlPoints 制御点座標配列
 * @returns {Object} 検出結果
 */
export function detectOverlaps(curveData, controlPoints = []) {
  const results = {
    hasOverlaps: false,
    overlaps: [],
    summary: {
      totalIssues: 0
    }
  }
  
  try {
    if (!curveData.clothoidData || !curveData.clothoidData.segments) {
      logger.curve.debug('セグメントデータが存在しません')
      return results
    }
    
    const segments = curveData.clothoidData.segments
    const isLoopMode = curveData.clothoidData.isLoop || false
    
    logger.curve.debug('オーバーラップ検出開始', {
      セグメント数: segments.length,
      ループモード: isLoopMode,
      制御点数: controlPoints.length,
      セグメント構造: segments.map((seg, i) => `${i}: ${Object.keys(seg).join(', ')}`)
    })
    
    // 緩和曲線セグメントのみを抽出（直線セグメントは除外）
    const clothoidSegments = segments.filter(seg => !seg.isLine && seg.TS && seg.ST)
    logger.curve.debug('緩和曲線セグメント抽出', {
      全セグメント: segments.length,
      緩和曲線セグメント: clothoidSegments.length
    })
    
    if (clothoidSegments.length === 0) {
      logger.curve.debug('緩和曲線セグメントが存在しません')
      return results
    }
    
    // 制御点が不足している場合は処理を終了
    const requiredPoints = isLoopMode ? clothoidSegments.length : clothoidSegments.length + 1
    if (controlPoints.length < requiredPoints) {
      logger.curve.debug('制御点不足でオーバーラップ検出を中断', {
        必要制御点数: requiredPoints,
        実際制御点数: controlPoints.length,
        ループモード: isLoopMode
      })
      return results
    }
    
    // 1. 制御点と緩和曲線始点の方向チェック（P0→P1 vs P0→TS1等）
    logger.curve.debug('制御点→緩和曲線チェック開始')
    checkControlPointToClothoidOverlaps(clothoidSegments, controlPoints, isLoopMode, results)
    
    // 2. セグメント間接続の方向チェック（STn→TSn+1 vs Pn→Pn+1）
    logger.curve.debug('セグメント間接続チェック開始')
    checkSegmentConnectionOverlaps(clothoidSegments, controlPoints, isLoopMode, results)
    
    logger.curve.debug('オーバーラップ検出完了', {
      検出数: results.overlaps.length,
      hasOverlaps: results.hasOverlaps,
      結果詳細: results.overlaps.map(o => `${o.category}:${o.label1}vs${o.label2}`)
    })
    
    results.hasOverlaps = results.overlaps.length > 0
    results.summary.totalIssues = results.overlaps.length
    
    if (results.hasOverlaps) {
      logger.curve.warn('方向オーバーラップ検出', {
        オーバーラップ数: results.overlaps.length,
        詳細: results.overlaps.map(o => `内積${o.dotProduct.toFixed(3)}`)
      })
    } else {
      logger.curve.info('方向オーバーラップなし')
    }
    
  } catch (error) {
    logger.curve.error('オーバーラップ検出エラー', {
      エラーメッセージ: error.message,
      スタック: error.stack,
      制御点数: controlPoints.length,
      緩和曲線セグメント数: clothoidSegments?.length,
      ループモード: isLoopMode
    })
    results.error = error.message
  }
  
  return results
}

/**
 * 制御点と緩和曲線始点・終点の方向オーバーラップをチェック
 */
function checkControlPointToClothoidOverlaps(clothoidSegments, controlPoints, isLoopMode, results) {
  logger.curve.debug('制御点→緩和曲線オーバーラップチェック開始', {
    緩和曲線セグメント数: clothoidSegments.length,
    制御点数: controlPoints.length,
    ループモード: isLoopMode
  })
  
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
    
    checkDirectionOverlap(
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
      checkDirectionOverlap(
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
 * セグメント間接続の方向オーバーラップをチェック
 */
function checkSegmentConnectionOverlaps(clothoidSegments, controlPoints, isLoopMode, results) {
  logger.curve.debug('セグメント間接続オーバーラップチェック開始', {
    緩和曲線セグメント数: clothoidSegments.length,
    制御点数: controlPoints.length,
    ループモード: isLoopMode
  })
  
  const totalChecks = isLoopMode ? clothoidSegments.length : clothoidSegments.length - 1
  logger.curve.debug(`チェック回数: ${totalChecks}`)
  
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
    
    checkDirectionOverlap(
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
 * 2つのベクトルの方向オーバーラップをチェック
 */
function checkDirectionOverlap(vector1, vector2, label1, label2, points1, points2, type, segmentIndex, results) {
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
  
  logger.curve.debug(`${type} ${label1} vs ${label2}`, {
    ベクトル1: `(${vector1[0].toFixed(1)}, ${vector1[1].toFixed(1)})`,
    ベクトル2: `(${vector2[0].toFixed(1)}, ${vector2[1].toFixed(1)})`,
    長さ1: length1.toFixed(1),
    長さ2: length2.toFixed(1),
    内積: dotProduct.toFixed(3),
    向き判定: dotProduct < 0 ? '反対' : '同方向'
  })
  
  // オーバーラップ条件：方向が反対の場合
  if (dotProduct < 0) {
    const overlapCenter = [
      (points2[0].x + points2[1].x) / 2,
      (points2[0].y + points2[1].y) / 2
    ]
    
    results.overlaps.push({
      type: 'direction_overlap',
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
    
    logger.curve.warn(`${type}オーバーラップ検出`, {
      セグメント: segmentIndex,
      方向1: label1,
      方向2: label2,
      内積: dotProduct.toFixed(3)
    })
  }
}

/**
 * オーバーラップ情報を人間可読な形式でフォーマット
 * @param {Object} overlapResults オーバーラップ検出結果
 * @returns {string} フォーマットされたテキスト
 */
export function formatOverlapReport(overlapResults) {
  // 入力データの安全性チェック
  if (!overlapResults) {
    logger.curve.debug('formatOverlapReport: overlapResultsが未定義')
    return '❌ オーバーラップ結果が未定義'
  }
  
  if (!overlapResults.hasOverlaps) {
    return '✅ 方向オーバーラップなし'
  }
  
  // overlaps配列の安全性チェック
  if (!overlapResults.overlaps || !Array.isArray(overlapResults.overlaps)) {
    logger.curve.debug('formatOverlapReport: overlaps配列が未定義または配列でない', {
      overlaps: overlapResults.overlaps,
      hasOverlaps: overlapResults.hasOverlaps,
      summary: overlapResults.summary
    })
    return '❌ オーバーラップデータが不正'
  }
  
  if (overlapResults.overlaps.length === 0) {
    return '✅ 方向オーバーラップなし（空配列）'
  }
  
  let report = `⚠️ 方向オーバーラップ検出 (総計: ${overlapResults.summary?.totalIssues || overlapResults.overlaps.length}件)\n`
  
  overlapResults.overlaps.forEach((overlap, index) => {
    // 各オーバーラップデータの安全性チェック
    if (!overlap) {
      logger.curve.debug(`formatOverlapReport: overlap[${index}]が未定義`)
      report += `❌ オーバーラップ${index}: データ不正\n`
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
 * オーバーラップ結果から制御点の調整を計算
 * @param {Array} controlPoints 制御点配列
 * @param {Object} overlapResults オーバーラップ検出結果
 * @param {boolean} isLoopMode ループモード
 * @returns {Array} 調整された制御点配列
 */
export function adjustPointsForOverlaps(controlPoints, overlapResults, isLoopMode = false) {
  if (!overlapResults.hasOverlaps || !overlapResults.overlaps || overlapResults.overlaps.length === 0) {
    return controlPoints // 重複なしの場合はそのまま返す
  }
  
  logger.curve.info('実重複量純粋比例調整開始', {
    制御点数: controlPoints.length,
    重複数: overlapResults.overlaps.length,
    ループモード: isLoopMode,
    調整方針: '実重複量純粋比例・係数なしシステム'
  })
  
  // 調整済み制御点をコピー
  const adjustedPoints = controlPoints.map(point => ({ ...point }))
  
  // 各制御点の調整係数を計算（複数の重複が影響する場合は最小値を採用）
  const adjustmentFactors = new Array(controlPoints.length).fill(1.0)
  
  overlapResults.overlaps.forEach((overlap, overlapIndex) => {
    const { category, segmentIndex, dotProduct, vector1, vector2 } = overlap
    
    // 実際の直線部の長さを計算
    const vector1Length = Math.sqrt(vector1[0] * vector1[0] + vector1[1] * vector1[1])
    const vector2Length = Math.sqrt(vector2[0] * vector2[0] + vector2[1] * vector2[1])
    
    // 実際の幾何学的重複量を計算
    // 内積が-1に近いほど完全に反対方向 = より大きな重複
    const directionOppositeStrength = Math.abs(dotProduct) // 0〜1の範囲（1が完全反対）
    
    // 重複の実際の長さ = より短いベクトルの長さ × 方向反対強度
    const actualOverlapLength = Math.min(vector1Length, vector2Length) * directionOppositeStrength
    
    // 制御点間距離（調整の基準となる距離）
    const controlDistance = Math.max(vector1Length, vector2Length)
    
    // 実際の重複比率
    const actualOverlapRatio = actualOverlapLength / controlDistance
    
    // 純粋比例調整係数の計算
    // 実重複量に完全比例、係数なし
    const reductionFactor = 1.0 - actualOverlapRatio
    
    logger.curve.debug('実重複量比例調整計算', {
      内積: dotProduct.toFixed(3),
      方向反対強度: directionOppositeStrength.toFixed(3),
      実重複長: actualOverlapLength.toFixed(1),
      制御点間距離: controlDistance.toFixed(1),
      実重複比率: actualOverlapRatio.toFixed(3),
      調整係数: reductionFactor.toFixed(3),
      削減率: (actualOverlapRatio * 100).toFixed(1) + '%',
      理由: '実重複量純粋比例・係数なし'
    })
    
    // セグメントに関連する制御点のインデックスを特定
    let affectedPointIndices = []
    
    if (category === '制御点始点' || category === '制御点終点') {
      // 制御点関連の重複：該当セグメントの中心制御点を調整
      if (isLoopMode) {
        affectedPointIndices = [(segmentIndex + 1) % controlPoints.length]
      } else {
        affectedPointIndices = [segmentIndex + 1]
      }
    } else if (category === 'セグメント接続' || category === 'セグメント接続(ループ)') {
      // セグメント間接続の重複：両セグメントの中心制御点を調整
      if (isLoopMode) {
        affectedPointIndices = [
          (segmentIndex + 1) % controlPoints.length,
          (segmentIndex + 2) % controlPoints.length
        ]
      } else {
        affectedPointIndices = [segmentIndex + 1, segmentIndex + 2].filter(i => i < controlPoints.length)
      }
    }
    
    // 影響する制御点の調整係数を更新（最小値を採用）
    affectedPointIndices.forEach(pointIndex => {
      if (pointIndex >= 0 && pointIndex < adjustmentFactors.length) {
        adjustmentFactors[pointIndex] = Math.min(adjustmentFactors[pointIndex], reductionFactor)
        
        logger.curve.debug('制御点調整係数更新', {
          重複インデックス: overlapIndex,
          制御点インデックス: pointIndex,
          重複カテゴリ: category,
          内積: dotProduct.toFixed(3),
          方向反対強度: directionOppositeStrength.toFixed(3),
          実重複長: actualOverlapLength.toFixed(1),
          制御点間距離: controlDistance.toFixed(1),
          実重複比率: actualOverlapRatio.toFixed(3),
          調整係数: reductionFactor.toFixed(3),
          実削減率: `${(actualOverlapRatio * 100).toFixed(1)}%`,
          調整目的: '実重複量純粋比例調整',
          調整方式: '実重複量比例・係数なし'
        })
      }
    })
  })
  
  // 調整係数を適用
  let adjustmentCount = 0
  const adjustmentSummary = {}
  
  adjustmentFactors.forEach((factor, pointIndex) => {
    if (factor < 1.0) {
      const originalRadius = adjustedPoints[pointIndex].radius || 100
      const originalSpiral = adjustedPoints[pointIndex].spiralFactor || 2.0
      const reductionPercent = ((1 - factor) * 100).toFixed(1)
      
      adjustedPoints[pointIndex].adjustedRadius = originalRadius * factor
      adjustedPoints[pointIndex].adjustedSpiralFactor = originalSpiral * factor
      adjustedPoints[pointIndex].adjustment = {
        type: 'overlap-reduction',
        originalRadius,
        originalSpiralFactor: originalSpiral,
        adjustmentFactor: factor,
        reductionPercent: reductionPercent,
        reason: 'direction-overlap-detected'
      }
      
      adjustmentCount++
      const summaryKey = `${reductionPercent}%削減`
      adjustmentSummary[summaryKey] = (adjustmentSummary[summaryKey] || 0) + 1
      
      logger.curve.info('制御点調整適用', {
        制御点インデックス: pointIndex,
        元の半径: originalRadius.toFixed(2),
        調整後半径: (originalRadius * factor).toFixed(2),
        調整係数: factor.toFixed(3),
        削減率: `${reductionPercent}%`,
        調整目的: '実重複量純粋比例・係数なし'
      })
    }
  })
  
  logger.curve.info('実重複量純粋比例調整完了', {
    調整制御点数: adjustmentCount,
    総制御点数: controlPoints.length,
    調整内訳: adjustmentSummary,
    調整詳細: Object.entries(adjustmentSummary)
      .filter(([_, count]) => count > 0)
      .map(([level, count]) => `${level}:${count}件`)
      .join(', '),
    結果: '実重複量純粋比例・係数なし調整済み'
  })
  
  return adjustedPoints
}
