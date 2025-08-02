/**
 * 統一エラーハンドリングユーティリティ
 * エラー処理の標準化とエラー情報の統一フォーマット化
 */

import { logger } from './logger.js'

/**
 * エラー結果オブジェクトの標準形式
 * @typedef {Object} ErrorResult
 * @property {string} error - エラーメッセージ
 * @property {string} [debug] - デバッグ情報
 * @property {string} [code] - エラーコード
 * @property {any} [data] - 追加データ
 */

/**
 * 成功結果オブジェクトの標準形式
 * @typedef {Object} SuccessResult
 * @property {any} data - 結果データ
 * @property {string} [debug] - デバッグ情報
 * @property {any} [meta] - メタデータ
 */

/**
 * エラーコード定数
 */
export const ERROR_CODES = {
  // 入力検証エラー
  INVALID_INPUT: 'INVALID_INPUT',
  INSUFFICIENT_POINTS: 'INSUFFICIENT_POINTS',
  INVALID_RADIUS: 'INVALID_RADIUS',
  INVALID_COORDINATES: 'INVALID_COORDINATES',
  
  // 計算エラー
  CALCULATION_ERROR: 'CALCULATION_ERROR',
  CONVERGENCE_ERROR: 'CONVERGENCE_ERROR',
  NUMERICAL_ERROR: 'NUMERICAL_ERROR',
  
  // 幾何学的エラー
  COLLINEAR_POINTS: 'COLLINEAR_POINTS',
  INVALID_ANGLE: 'INVALID_ANGLE',
  TANGENT_LENGTH_EXCEEDED: 'TANGENT_LENGTH_EXCEEDED',
  
  // システムエラー
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
  FUNCTION_NOT_IMPLEMENTED: 'FUNCTION_NOT_IMPLEMENTED'
}

/**
 * エラーメッセージのテンプレート
 */
const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_INPUT]: '入力パラメータが無効です',
  [ERROR_CODES.INSUFFICIENT_POINTS]: '最低3点の制御点が必要です',
  [ERROR_CODES.INVALID_RADIUS]: '半径は正の値である必要があります',
  [ERROR_CODES.INVALID_COORDINATES]: '無効な座標が含まれています',
  [ERROR_CODES.CALCULATION_ERROR]: '計算中にエラーが発生しました',
  [ERROR_CODES.CONVERGENCE_ERROR]: '計算が収束しませんでした',
  [ERROR_CODES.NUMERICAL_ERROR]: '数値計算エラーが発生しました',
  [ERROR_CODES.COLLINEAR_POINTS]: '点が一直線上にあります',
  [ERROR_CODES.INVALID_ANGLE]: '無効な角度です',
  [ERROR_CODES.TANGENT_LENGTH_EXCEEDED]: '接線長がセグメント長を超過しています',
  [ERROR_CODES.UNEXPECTED_ERROR]: '予期しないエラーが発生しました',
  [ERROR_CODES.FUNCTION_NOT_IMPLEMENTED]: '機能が実装されていません'
}

/**
 * エラー結果を作成
 * @param {string} code - エラーコード
 * @param {string} [customMessage] - カスタムメッセージ
 * @param {string} [debugInfo] - デバッグ情報
 * @param {any} [data] - 追加データ
 * @returns {ErrorResult} エラー結果オブジェクト
 */
export function createError(code, customMessage = null, debugInfo = '', data = null) {
  const message = customMessage || ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNEXPECTED_ERROR]
  const error = {
    error: message,
    code,
    debug: debugInfo
  }
  
  if (data !== null) {
    error.data = data
  }
  
  logger.error.error(`${code}: ${message}`, debugInfo ? debugInfo : '')
  
  return error
}

/**
 * 成功結果を作成
 * @param {any} data - 結果データ
 * @param {string} [debugInfo] - デバッグ情報
 * @param {any} [meta] - メタデータ
 * @returns {SuccessResult} 成功結果オブジェクト
 */
export function createSuccess(data, debugInfo = '', meta = null) {
  const result = { data }
  
  if (debugInfo) {
    result.debug = debugInfo
  }
  
  if (meta !== null) {
    result.meta = meta
  }
  
  return result
}

/**
 * 結果がエラーかどうかチェック
 * @param {any} result - チェック対象の結果
 * @returns {boolean} エラーかどうか
 */
export function isError(result) {
  return result && typeof result === 'object' && 'error' in result
}

/**
 * 結果が成功かどうかチェック
 * @param {any} result - チェック対象の結果
 * @returns {boolean} 成功かどうか
 */
export function isSuccess(result) {
  return result && typeof result === 'object' && 'data' in result && !('error' in result)
}

/**
 * 入力検証ヘルパー
 */
export const validate = {
  /**
   * 点の配列を検証
   * @param {Array} points - 点の配列
   * @param {number} minCount - 最小点数
   * @returns {ErrorResult|null} エラーがある場合はエラー結果、なければnull
   */
  points(points, minCount = 3) {
    if (!Array.isArray(points)) {
      return createError(ERROR_CODES.INVALID_INPUT, '制御点は配列である必要があります')
    }
    
    if (points.length < minCount) {
      return createError(ERROR_CODES.INSUFFICIENT_POINTS, `最低${minCount}点の制御点が必要です`)
    }
    
    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
        return createError(ERROR_CODES.INVALID_COORDINATES, `点${i}の座標が無効です`)
      }
      
      if (!isFinite(point.x) || !isFinite(point.y)) {
        return createError(ERROR_CODES.INVALID_COORDINATES, `点${i}の座標が有限値ではありません`)
      }
    }
    
    return null
  },
  
  /**
   * 半径を検証
   * @param {number} radius - 半径
   * @returns {ErrorResult|null} エラーがある場合はエラー結果、なければnull
   */
  radius(radius) {
    if (typeof radius !== 'number' || !isFinite(radius)) {
      return createError(ERROR_CODES.INVALID_RADIUS, '半径は有限の数値である必要があります')
    }
    
    if (radius <= 0) {
      return createError(ERROR_CODES.INVALID_RADIUS, '半径は正の値である必要があります')
    }
    
    return null
  },
  
  /**
   * 角度を検証
   * @param {number} angle - 角度（ラジアン）
   * @returns {ErrorResult|null} エラーがある場合はエラー結果、なければnull
   */
  angle(angle) {
    if (typeof angle !== 'number' || !isFinite(angle)) {
      return createError(ERROR_CODES.INVALID_ANGLE, '角度は有限の数値である必要があります')
    }
    
    return null
  }
}

/**
 * 安全な関数実行ラッパー
 * @param {Function} fn - 実行する関数
 * @param {any[]} args - 関数の引数
 * @param {string} [context] - エラー時のコンテキスト情報
 * @returns {any} 関数の結果またはエラー結果
 */
export function safeExecute(fn, args = [], context = '') {
  try {
    return fn(...args)
  } catch (error) {
    logger.error.error(`安全実行でエラー捕捉: ${context}`, error.message, error.stack)
    return createError(
      ERROR_CODES.UNEXPECTED_ERROR,
      `${context}: ${error.message}`,
      error.stack
    )
  }
}

/**
 * 複数の検証結果をまとめる
 * @param {Array<ErrorResult|null>} validationResults - 検証結果の配列
 * @returns {ErrorResult|null} 最初のエラーまたはnull
 */
export function combineValidations(validationResults) {
  for (const result of validationResults) {
    if (result) return result
  }
  return null
}
