/**
 * 重複解消ユーティリティ - CSSライクな高速一発計算
 * CSS border-radius縮小と同じアプローチで、制御点の半径とスパイラル係数を調整
 */

import { logger } from './logger.js'
import { createError, createSuccess, ERROR_CODES } from './errorHandler.js'

/**
 * CSSライクな全体一括スケール計算（O(n)）
 * @param {ControlPoint[]} points - 制御点配列
 * @param {OverlapResolutionSettings} settings - 重複解消設定
 * @returns {Object} 調整済み制御点配列
 */
export function resolveOverlapsCSSLike(points, settings = {}) {
  const timer = performance.now()
  
  const {
    enabled = true
  } = settings

  if (!enabled || points.length < 3) {
    logger.curve.debug('重複解消スキップ', { enabled, pointsLength: points.length })
    return createSuccess({
      adjustedPoints: points,
      adjustmentApplied: false,
      globalScale: 1.0
    })
  }

  // 固定設定値
  const minSeparation = 2
  const maxReductionFactor = 0.1

  logger.curve.info('CSS風重複解消開始', { 
    pointsCount: points.length,
    minSeparation,
    maxReductionFactor
  })

  try {
    // Phase 1: 各セグメントの消費距離を計算
    const segmentConsumptions = calculateSegmentConsumptions(points)
    
    // Phase 2: 全体スケール係数を一発計算
    const globalScale = calculateGlobalScale(points, segmentConsumptions, minSeparation, maxReductionFactor)
    
    // Phase 3: 調整後の制御点を生成
    const adjustedPoints = applyGlobalScale(points, globalScale)
    
    const processingTime = performance.now() - timer
    
    logger.curve.info('CSS風重複解消完了', {
      globalScale: globalScale.toFixed(3),
      adjustmentApplied: globalScale < 1.0,
      processingTime: `${processingTime.toFixed(2)}ms`
    })

    return createSuccess({
      adjustedPoints,
      adjustmentApplied: globalScale < 1.0,
      globalScale,
      processingTime
    })

  } catch (error) {
    logger.curve.error('重複解消エラー', error.message)
    return createError(
      ERROR_CODES.CALCULATION_ERROR,
      `重複解消計算エラー: ${error.message}`
    )
  }
}

/**
 * 各セグメントの消費距離を計算
 * @param {ControlPoint[]} points - 制御点配列
 * @returns {Array} セグメント消費距離配列
 */
function calculateSegmentConsumptions(points) {
  const consumptions = []
  
  for (let i = 0; i < points.length - 1; i++) {
    const point1 = points[i]
    const point2 = points[i + 1]
    
    // 各コーナーの影響範囲を概算
    // 実際のTS/SC/CS計算の簡易版
    const radius1 = point1.adjustedRadius || point1.radius
    const radius2 = point2.adjustedRadius || point2.radius
    const spiral1 = point1.adjustedSpiralFactor || point1.spiralFactor
    const spiral2 = point2.adjustedSpiralFactor || point2.spiralFactor
    
    // 消費距離の近似計算（実際のクロソイド計算より軽量）
    const consumption1 = estimateCornerConsumption(radius1, spiral1)
    const consumption2 = estimateCornerConsumption(radius2, spiral2)
    
    consumptions.push({
      segmentIndex: i,
      point1Index: i,
      point2Index: i + 1,
      consumption1,
      consumption2,
      totalConsumption: consumption1 + consumption2,
      segmentLength: calculateDistance(point1, point2)
    })
    
    logger.curve.trace('セグメント消費距離計算', {
      segment: `${i}-${i+1}`,
      consumption1: consumption1.toFixed(2),
      consumption2: consumption2.toFixed(2),
      segmentLength: consumptions[i].segmentLength.toFixed(2)
    })
  }
  
  return consumptions
}

/**
 * コーナーの消費距離を概算
 * @param {number} radius - 半径
 * @param {number} spiralFactor - スパイラル係数
 * @returns {number} 消費距離
 */
function estimateCornerConsumption(radius, spiralFactor) {
  // より現実的な消費距離計算
  // 実際のTs計算の近似版（半径とスパイラル係数を考慮）
  const spiralLength = radius * (spiralFactor || 2.0) / 50  // スパイラル長概算
  const baseConsumption = radius * 0.8  // 基本的な半径影響（Ts概算）
  const spiralInfluence = spiralLength * 0.5  // スパイラル影響
  
  const totalConsumption = baseConsumption + spiralInfluence
  
  logger.curve.trace('消費距離計算', {
    radius: radius.toFixed(2),
    spiralFactor: (spiralFactor || 2.0).toFixed(2),
    spiralLength: spiralLength.toFixed(2),
    baseConsumption: baseConsumption.toFixed(2),
    spiralInfluence: spiralInfluence.toFixed(2),
    totalConsumption: totalConsumption.toFixed(2)
  })
  
  return totalConsumption
}

/**
 * 全体スケール係数を一発計算
 * @param {ControlPoint[]} points - 制御点配列
 * @param {Array} consumptions - セグメント消費距離配列
 * @param {number} minSeparation - 最小分離距離
 * @param {number} maxReductionFactor - 最大縮小率
 * @returns {number} 全体スケール係数
 */
function calculateGlobalScale(points, consumptions, minSeparation, maxReductionFactor) {
  let minScale = 1.0
  
  // 各セグメントで必要なスケール係数を計算
  for (const consumption of consumptions) {
    const { totalConsumption, segmentLength } = consumption
    
    // 実際に利用可能なスペース
    const availableSpace = segmentLength - minSeparation
    
    if (availableSpace <= 0 || totalConsumption <= 0) {
      continue
    }
    
    // このセグメントで必要なスケール係数
    const requiredScale = availableSpace / totalConsumption
    
    // 全体の最小スケール係数を更新
    minScale = Math.min(minScale, requiredScale)
    
    logger.curve.trace('セグメントスケール計算', {
      segment: consumption.segmentIndex,
      totalConsumption: totalConsumption.toFixed(2),
      availableSpace: availableSpace.toFixed(2),
      requiredScale: requiredScale.toFixed(3)
    })
  }
  
  // 最大縮小率で制限
  const finalScale = Math.max(maxReductionFactor, minScale)
  
  logger.curve.debug('全体スケール決定', {
    rawMinScale: minScale.toFixed(3),
    maxReductionFactor: maxReductionFactor.toFixed(3),
    finalScale: finalScale.toFixed(3)
  })
  
  return finalScale
}

/**
 * 全体スケールを適用して調整済み制御点を生成
 * @param {ControlPoint[]} points - 元の制御点配列
 * @param {number} globalScale - 全体スケール係数
 * @returns {ControlPoint[]} 調整済み制御点配列
 */
function applyGlobalScale(points, globalScale) {
  if (globalScale >= 1.0) {
    // 調整不要
    return points.map(point => ({ ...point }))
  }
  
  return points.map((point, index) => {
    const adjustedRadius = point.radius * globalScale
    const adjustedSpiralFactor = point.spiralFactor * globalScale
    
    const adjustmentInfo = {
      type: 'radius-scaling',
      originalRadius: point.radius,
      originalSpiralFactor: point.spiralFactor,
      radiusScale: globalScale,
      spiralScale: globalScale,
      reason: 'overlap-prevention',
      affectedSegments: getAffectedSegments(index, points.length)
    }
    
    logger.curve.trace('制御点調整適用', {
      pointIndex: index,
      originalRadius: point.radius.toFixed(2),
      adjustedRadius: adjustedRadius.toFixed(2),
      scale: globalScale.toFixed(3)
    })
    
    return {
      ...point,
      adjustedRadius,
      adjustedSpiralFactor,
      adjustment: adjustmentInfo
    }
  })
}

/**
 * 個別コーナー調整（より詳細な制御が必要な場合）
 * @param {ControlPoint[]} points - 制御点配列
 * @param {OverlapResolutionSettings} settings - 重複解消設定
 * @returns {Object} 調整済み制御点配列
 */
export function resolveOverlapsIndividual(points, settings = {}) {
  const timer = performance.now()
  
  logger.curve.info('個別コーナー重複解消開始', { pointsCount: points.length })
  
  try {
    const adjustedPoints = [...points]
    let adjustmentCount = 0
    
    // 各制御点に対して個別にスケール係数を計算
    for (let i = 1; i < points.length - 1; i++) {
      const cornerScale = calculateCornerScale(points, i)
      
      if (cornerScale < 1.0) {
        adjustedPoints[i] = {
          ...adjustedPoints[i],
          adjustedRadius: points[i].radius * cornerScale,
          adjustedSpiralFactor: points[i].spiralFactor * cornerScale,
          adjustment: {
            type: 'radius-scaling',
            originalRadius: points[i].radius,
            originalSpiralFactor: points[i].spiralFactor,
            radiusScale: cornerScale,
            spiralScale: cornerScale,
            reason: 'overlap-prevention',
            affectedSegments: [i - 1, i]
          }
        }
        adjustmentCount++
        
        logger.curve.debug('個別コーナー調整', {
          pointIndex: i,
          cornerScale: cornerScale.toFixed(3),
          originalRadius: points[i].radius.toFixed(2),
          adjustedRadius: (points[i].radius * cornerScale).toFixed(2)
        })
      }
    }
    
    const processingTime = performance.now() - timer
    
    logger.curve.info('個別コーナー重複解消完了', {
      adjustmentCount,
      processingTime: `${processingTime.toFixed(2)}ms`
    })
    
    return createSuccess({
      adjustedPoints,
      adjustmentApplied: adjustmentCount > 0,
      adjustmentCount,
      processingTime
    })
    
  } catch (error) {
    logger.curve.error('個別重複解消エラー', error.message)
    return createError(
      ERROR_CODES.CALCULATION_ERROR,
      `個別重複解消計算エラー: ${error.message}`
    )
  }
}

/**
 * 個別コーナーのスケール係数を計算（ループモード対応）
 * @param {ControlPoint[]} points - 制御点配列
 * @param {number} cornerIndex - コーナーインデックス
 * @returns {number} コーナースケール係数
 */
function calculateCornerScale(points, cornerIndex) {
  // 固定設定値
  const minSeparation = 2
  const maxReductionFactor = 0.1
  
  const point = points[cornerIndex]
  
  // ループモード対応: 前後の制御点を取得
  const prevIndex = (cornerIndex - 1 + points.length) % points.length
  const nextIndex = (cornerIndex + 1) % points.length
  const prevPoint = points[prevIndex]
  const nextPoint = points[nextIndex]
  
  // 左側セグメント制約
  const leftSegmentLength = calculateDistance(prevPoint, point)
  const leftConsumption = estimateCornerConsumption(point.radius, point.spiralFactor)
  const leftScale = leftSegmentLength > minSeparation ? 
    Math.max(maxReductionFactor, (leftSegmentLength - minSeparation) / leftConsumption) : 
    maxReductionFactor
  
  // 右側セグメント制約
  const rightSegmentLength = calculateDistance(point, nextPoint)
  const rightConsumption = estimateCornerConsumption(point.radius, point.spiralFactor)
  const rightScale = rightSegmentLength > minSeparation ? 
    Math.max(maxReductionFactor, (rightSegmentLength - minSeparation) / rightConsumption) : 
    maxReductionFactor
  
  // より厳しい制約を適用
  const finalScale = Math.min(1.0, leftScale, rightScale)
  
  logger.curve.trace('コーナースケール計算', {
    cornerIndex,
    leftSegmentLength: leftSegmentLength.toFixed(2),
    rightSegmentLength: rightSegmentLength.toFixed(2),
    leftConsumption: leftConsumption.toFixed(2),
    rightConsumption: rightConsumption.toFixed(2),
    leftScale: leftScale.toFixed(3),
    rightScale: rightScale.toFixed(3),
    finalScale: finalScale.toFixed(3)
  })
  
  return finalScale
}

/**
 * 統合された重複解消API（制御点個別設定優先）
 * @param {ControlPoint[]} points - 制御点配列
 * @param {OverlapResolutionSettings} settings - 重複解消設定
 * @returns {Object} 調整済み制御点配列
 */
export function resolveOverlaps(points, settings = {}) {
  const { enabled = true } = settings
  
  if (!enabled) {
    return createSuccess({
      adjustedPoints: points,
      adjustmentApplied: false
    })
  }
  
  logger.curve.info('重複解消開始（制御点個別設定優先）', { pointsCount: points.length })
  
  // 制御点の個別設定またはグループ設定を確認
  const hasIndividualSettings = points.some(point => point.overlapResolution?.enabled)
  const hasGroupSettings = points.some(point => point.groupOverlapResolution?.enabled)
  
  logger.curve.debug('重複解消設定確認', {
    hasIndividualSettings,
    hasGroupSettings,
    individualEnabledPoints: points.map((p, i) => ({ index: i, enabled: p.overlapResolution?.enabled })).filter(p => p.enabled),
    groupEnabledPoints: points.map((p, i) => ({ index: i, enabled: p.groupOverlapResolution?.enabled })).filter(p => p.enabled)
  })
  
  if (hasIndividualSettings || hasGroupSettings) {
    // 個別制御点設定または全体設定がある場合
    return resolveOverlapsWithIndividualPriority(points, settings)
  } else {
    // 設定がない場合でも開発時は強制実行
    if (process.env.NODE_ENV !== 'production') {
      logger.curve.debug('開発時強制実行：設定なしでも重複解消を実行')
      return resolveOverlapsWithIndividualPriority(points, settings)
    }
    
    // 設定がない場合はそのまま返す
    return createSuccess({
      adjustedPoints: points,
      adjustmentApplied: false
    })
  }
}

/**
 * 制御点個別設定を優先した重複解消
 * @param {ControlPoint[]} points - 制御点配列
 * @param {OverlapResolutionSettings} settings - 重複解消設定
 * @returns {Object} 調整済み制御点配列
 */
function resolveOverlapsWithIndividualPriority(points, settings) {
  const timer = performance.now()
  
  logger.curve.info('制御点個別設定優先処理開始', { pointsCount: points.length })
  
  try {
    const adjustedPoints = points.map(point => ({ ...point }))
    let adjustmentCount = 0
    
    // 各制御点を個別に処理（ループモードでは全制御点が角を持つため全て処理）
    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      
      logger.curve.trace('制御点重複解消チェック', {
        pointIndex: i,
        hasIndividualSetting: !!point.overlapResolution?.enabled,
        hasGroupSetting: !!point.groupOverlapResolution?.enabled,
        radius: point.radius,
        spiralFactor: point.spiralFactor
      })
      
      // 制御点個別設定がある場合のみ処理
      if (point.overlapResolution?.enabled) {
        const cornerScale = calculateCornerScale(points, i)
        
        if (cornerScale < 1.0) {
          adjustedPoints[i] = {
            ...adjustedPoints[i],
            adjustedRadius: point.radius * cornerScale,
            adjustedSpiralFactor: point.spiralFactor * cornerScale,
            adjustment: {
              type: 'radius-scaling',
              originalRadius: point.radius,
              originalSpiralFactor: point.spiralFactor,
              radiusScale: cornerScale,
              spiralScale: cornerScale,
              reason: 'overlap-prevention',
              affectedSegments: [i - 1, i]
            }
          }
          adjustmentCount++
          
          logger.curve.debug('制御点個別調整適用', {
            pointIndex: i,
            cornerScale: cornerScale.toFixed(3),
            originalRadius: point.radius.toFixed(2),
            adjustedRadius: (point.radius * cornerScale).toFixed(2)
          })
        }
      } else if (point.groupOverlapResolution?.enabled) {
        // グループ設定がある場合は全体設定として処理
        const cornerScale = calculateCornerScale(points, i)
        
        if (cornerScale < 1.0) {
          adjustedPoints[i] = {
            ...adjustedPoints[i],
            adjustedRadius: point.radius * cornerScale,
            adjustedSpiralFactor: point.spiralFactor * cornerScale,
            adjustment: {
              type: 'radius-scaling',
              originalRadius: point.radius,
              originalSpiralFactor: point.spiralFactor,
              radiusScale: cornerScale,
              spiralScale: cornerScale,
              reason: 'overlap-prevention',
              affectedSegments: [i - 1, i]
            }
          }
          adjustmentCount++
          
          logger.curve.debug('グループ設定による調整適用', {
            pointIndex: i,
            cornerScale: cornerScale.toFixed(3),
            originalRadius: point.radius.toFixed(2),
            adjustedRadius: (point.radius * cornerScale).toFixed(2)
          })
        }
      } else if (process.env.NODE_ENV !== 'production') {
        // 開発時：設定がなくても強制実行
        const cornerScale = calculateCornerScale(points, i)
        
        if (cornerScale < 1.0) {
          adjustedPoints[i] = {
            ...adjustedPoints[i],
            adjustedRadius: point.radius * cornerScale,
            adjustedSpiralFactor: point.spiralFactor * cornerScale,
            adjustment: {
              type: 'radius-scaling',
              originalRadius: point.radius,
              originalSpiralFactor: point.spiralFactor,
              radiusScale: cornerScale,
              spiralScale: cornerScale,
              reason: 'overlap-prevention-dev',
              affectedSegments: [i - 1, i]
            }
          }
          adjustmentCount++
          
          logger.curve.debug('開発時強制調整適用', {
            pointIndex: i,
            cornerScale: cornerScale.toFixed(3),
            originalRadius: point.radius.toFixed(2),
            adjustedRadius: (point.radius * cornerScale).toFixed(2)
          })
        }
      }
    }
    
    const processingTime = performance.now() - timer
    
    logger.curve.info('制御点個別設定優先処理完了', {
      adjustmentCount,
      processingTime: `${processingTime.toFixed(2)}ms`
    })
    
    return createSuccess({
      adjustedPoints,
      adjustmentApplied: adjustmentCount > 0,
      adjustmentCount,
      processingTime
    })
    
  } catch (error) {
    logger.curve.error('制御点個別設定優先処理エラー', error.message)
    return createError(
      ERROR_CODES.CALCULATION_ERROR,
      `制御点個別設定優先処理エラー: ${error.message}`
    )
  }
}

// ========================================
// ユーティリティ関数
// ========================================

/**
 * 2点間の距離を計算
 * @param {Object} point1 - 点1
 * @param {Object} point2 - 点2
 * @returns {number} 距離
 */
function calculateDistance(point1, point2) {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + 
    Math.pow(point2.y - point1.y, 2)
  )
}

/**
 * 制御点が影響するセグメントのインデックスを取得
 * @param {number} pointIndex - 制御点インデックス
 * @param {number} totalPoints - 総制御点数
 * @returns {number[]} 影響するセグメントインデックス配列
 */
function getAffectedSegments(pointIndex, totalPoints) {
  const segments = []
  
  // 前のセグメント
  if (pointIndex > 0) {
    segments.push(pointIndex - 1)
  }
  
  // 次のセグメント
  if (pointIndex < totalPoints - 1) {
    segments.push(pointIndex)
  }
  
  return segments
}

/**
 * デフォルト重複解消設定を取得
 * @returns {OverlapResolutionSettings} デフォルト設定
 */
export function getDefaultOverlapResolutionSettings() {
  return {
    enabled: true,
    mode: 'global'
  }
}
