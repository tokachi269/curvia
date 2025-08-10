/**
 * ループ防御機構 - ループON/OFFでのインデックス構造不一致を防ぐ
 * 
 * 主要問題：ループモード切替時のセグメント数計算の不整合
 * - 通常モード: segmentCount = points.length - 2  
 * - ループモード: segmentCount = points.length
 * 
 * この不一致により、App.vueとcurveGenerator.jsで異なるインデックス体系が使われ、
 * セグメント検索・ラベル計算・描画処理で問題が発生する。
 */

import { logger } from './logger.js'

// ========================================
// ループモード対応のインデックス統一化
// ========================================

/**
 * ループモード統一インデックス計算
 */
export class LoopModeIndexCalculator {
  /**
   * 統一されたセグメント数計算
   * curveGenerator.jsと同じロジックを使用
   */
  static getSegmentCount(pointsLength, isLoop) {
    const segmentCount = isLoop ? pointsLength : pointsLength - 2
    
    logger.curve.debug('LoopModeIndexCalculator: セグメント数計算', {
      pointsLength,
      isLoop,
      calculatedSegmentCount: segmentCount
    })
    
    return segmentCount
  }

  /**
   * 統一されたラベルインデックス計算
   */
  static getLabelIndex(segmentIndex, pointsLength, isLoop) {
    let labelIndex
    
    if (isLoop) {
      // ループモード: セグメントが処理する角の制御点番号をラベルに使用
      labelIndex = (segmentIndex + 1) % pointsLength
    } else {
      // 通常モード: 1から開始
      labelIndex = segmentIndex + 1
    }
    
    return labelIndex
  }

  /**
   * セグメント検索での統一インデックス計算（App.vue用）
   */
  static calculateSegmentIndexFromCurve(curveIndex, pointsLength, isLoop, totalCurvePoints) {
    const segmentCount = this.getSegmentCount(pointsLength, isLoop)
    const pointsPerSegment = Math.floor(totalCurvePoints / segmentCount)
    
    if (pointsPerSegment <= 0) {
      logger.curve.warn('LoopModeIndexCalculator: pointsPerSegmentが無効', {
        totalCurvePoints,
        segmentCount,
        pointsPerSegment
      })
      return null
    }
    
    let segmentIndex = Math.floor(curveIndex / pointsPerSegment)
    
    // セグメントインデックスの範囲調整
    if (isLoop) {
      segmentIndex = segmentIndex % pointsLength
    } else {
      segmentIndex = Math.min(segmentIndex, segmentCount - 1)
    }
    
    logger.curve.debug('LoopModeIndexCalculator: セグメント検索計算', {
      curveIndex,
      pointsLength,
      isLoop,
      totalCurvePoints,
      segmentCount,
      pointsPerSegment,
      calculatedSegmentIndex: segmentIndex
    })
    
    return {
      segmentIndex,
      segmentCount,
      pointsPerSegment
    }
  }

  /**
   * ループモード間でのインデックス変換の妥当性チェック
   */
  static validateIndexConsistency(segmentIndex, arrayIndex, pointsLength, isLoop, context = 'unknown') {
    const maxSegmentIndex = this.getSegmentCount(pointsLength, isLoop) - 1
    
    // segmentIndexの範囲チェック
    if (segmentIndex < 0 || segmentIndex > maxSegmentIndex) {
      logger.curve.error(`LoopModeIndexCalculator: segmentIndex範囲外 (${context})`, {
        segmentIndex,
        maxSegmentIndex,
        pointsLength,
        isLoop
      })
      return false
    }
    
    // arrayIndexとの整合性チェック（通常は一致するはず）
    if (arrayIndex !== undefined && Math.abs(segmentIndex - arrayIndex) > 1) {
      logger.curve.warn(`LoopModeIndexCalculator: segmentIndex/arrayIndex大幅不一致 (${context})`, {
        segmentIndex,
        arrayIndex,
        difference: Math.abs(segmentIndex - arrayIndex)
      })
    }
    
    return true
  }
}

// ========================================
// 最小限の配列処理防御（シンプル版）
// ========================================

/**
 * 基本配列イテレータ
 */
export class SimpleArrayIterator {
  static forEach(array, callback, context = 'unknown') {
    if (!Array.isArray(array) || array.length === 0) {
      return false
    }

    try {
      for (let i = 0; i < array.length; i++) {
        if (array[i] != null) {
          const result = callback(array[i], i, array)
          if (result === false) break
        }
      }
      return true
    } catch (error) {
      logger.curve.error(`SimpleArrayIterator: エラー (${context})`, { error: error.message })
      return false
    }
  }
}

// ========================================
// 共通エクスポート - ループON/OFF統一インデックス取得
// ========================================

/**
 * 【重要】統一されたセグメント数計算
 * App.vue と curveGenerator.js で同じ値を返すように統一
 */
export function getUnifiedSegmentCount(pointsLength, isLoop) {
  return LoopModeIndexCalculator.getSegmentCount(pointsLength, isLoop)
}

/**
 * 【重要】統一されたセグメント検索用の総セグメント数計算
 * App.vue の findSegmentAtCurveIndex で使用
 */
export function getUnifiedTotalSegments(pointsLength, isLoop) {
  if (isLoop) {
    return pointsLength  // ループ: 制御点数と同じ
  } else {
    // 非ループ: curveGenerator.jsと同じ計算 (points.length - 2)
    return Math.max(1, pointsLength - 2)  // 最低1セグメント
  }
}

/**
 * 【重要】カーブインデックスからセグメントインデックスを正しく計算
 * App.vue での使用を想定
 */
export function calculateCorrectSegmentIndex(curveIndex, pointsLength, isLoop, totalCurvePoints) {
  const totalSegments = getUnifiedTotalSegments(pointsLength, isLoop)
  const pointsPerSegment = Math.floor(totalCurvePoints / totalSegments)
  
  if (pointsPerSegment <= 0) {
    logger.curve.warn('calculateCorrectSegmentIndex: pointsPerSegmentが無効', {
      totalCurvePoints,
      totalSegments,
      pointsPerSegment
    })
    return null
  }
  
  let segmentIndex = Math.floor(curveIndex / pointsPerSegment)
  
  // セグメントインデックスの範囲調整
  if (isLoop) {
    segmentIndex = segmentIndex % pointsLength
  } else {
    segmentIndex = Math.min(segmentIndex, totalSegments - 1)
  }
  
  logger.curve.debug('calculateCorrectSegmentIndex: 統一セグメント計算', {
    curveIndex,
    pointsLength,
    isLoop,
    totalCurvePoints,
    totalSegments,
    pointsPerSegment,
    calculatedSegmentIndex: segmentIndex
  })
  
  return {
    segmentIndex,
    totalSegments,
    pointsPerSegment
  }
}

/**
 * 【重要】統一されたラベルインデックス計算
 * curveGenerator.js と canvasRenderer.js で同じ値を返す
 */
export function getUnifiedLabelIndex(segmentIndex, pointsLength, isLoop) {
  return LoopModeIndexCalculator.getLabelIndex(segmentIndex, pointsLength, isLoop)
}

/**
 * 統一されたセグメント検索計算（旧版・後方互換）
 */
export function calculateUnifiedSegmentIndex(curveIndex, pointsLength, isLoop, totalCurvePoints) {
  return calculateCorrectSegmentIndex(curveIndex, pointsLength, isLoop, totalCurvePoints)
}

/**
 * ループモードインデックス妥当性チェック
 */
export function validateLoopModeIndex(segmentIndex, arrayIndex, pointsLength, isLoop, context = 'unknown') {
  return LoopModeIndexCalculator.validateIndexConsistency(segmentIndex, arrayIndex, pointsLength, isLoop, context)
}

/**
 * シンプルな安全forEach
 */
export function safeForEach(array, callback, context = 'unknown') {
  return SimpleArrayIterator.forEach(array, callback, context)
}

// ========================================
// 後方互換性エイリアス
// ========================================

export const LightSegmentValidator = {
  validateBasic: (segments) => Array.isArray(segments),
  validateDrawingSegments: (drawingSegments) => Array.isArray(drawingSegments)
}

export function safeGetElement(array, index) {
  return (Array.isArray(array) && index >= 0 && index < array.length) ? array[index] : null
}

export function safeCalculateLoopLabel(segmentIndex, totalPoints, context) {
  return getUnifiedLabelIndex(segmentIndex, totalPoints, true)
}
