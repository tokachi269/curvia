/**
 * 数学計算ユーティリティ
 * 緩和曲線（クロソイド）計算の高精度実装
 */

import { logger } from './logger.js'
import { createError, createSuccess, ERROR_CODES } from './errorHandler.js'

// ================= 緩和曲線（クロソイド）計算 =================
// 高精度テイラー級数展開による計算
// 記号: a=クロソイド定数, L=弧長, R=半径

/**
 * 偏角計算: am = a²/(2L²)
 * @param {number} a - クロソイド定数
 * @param {number} L - 弧長
 * @returns {number} 偏角
 */
export function calcDeviation(a, L) {
  if (L === 0) {
    return 0 // ログ削減
  }
  const result = (a * a) / (2 * L * L)
  return result
}

/**
 * X座標 (フレネル積分C近似)
 * 高精度テイラー展開による計算
 * @param {number} a - クロソイド定数
 * @param {number} L - 弧長
 * @returns {number} X座標値
 */
export function calcClothoidX(a, L) {
  if (L === 0) {
    return 0 // ログ削減
  }
  
  const am = calcDeviation(a, L)
  const z = L
  
  let sum = 1
  let term = 1
  let x = z
  let prevX
  
  // テイラー展開による高精度計算
  for (let i = 1; i < 50; i++) {
    term = -term / ((2 * i - 1) * (2 * i)) * am * am
    sum += term / (4 * i + 1)
    prevX = x
    x = z * sum
    if (Math.abs(x - prevX) < 1e-13) {
      logger.curve.trace(`X座標計算収束: ${i}回で収束, x=${x}`)
      break
    }
  }
  
  const result = x * (a >= 0 ? 1 : -1)
  logger.curve.trace(`X座標計算完了: a=${a}, L=${L}, result=${result}`)
  return result
}

/**
 * Y座標 (フレネル積分S近似)
 * 高精度テイラー展開による計算
 * @param {number} a - クロソイド定数
 * @param {number} L - 弧長
 * @returns {number} Y座標値
 */
export function calcClothoidY(a, L) {
  if (L === 0) {
    return 0 // ログ削減
  }
  
  const am = calcDeviation(a, L)
  const z = L * L * L / 6
  
  let sum = 1
  let term = 1
  let y = z * sum
  let prevY
  
  // テイラー展開による高精度計算
  for (let i = 1; i < 50; i++) {
    prevY = y
    term = -term / ((2 * i) * (2 * i + 1)) * am * am
    sum += term / (4 * i + 3)
    y = z * sum
    if (Math.abs(y - prevY) < 1e-13) {
      logger.curve.trace(`Y座標計算収束: ${i}回で収束, y=${y}`)
      break
    }
  }
  
  const result = y * Math.abs(a) / (L * L)
  logger.curve.trace(`Y座標計算完了: a=${a}, L=${L}, result=${result}`)
  return result
}

/**
 * 点の回転変換
 * @param {number} px - X座標
 * @param {number} py - Y座標
 * @param {number} angle - 回転角（ラジアン）
 * @returns {Array} [x, y] 回転後の座標
 */
export function rotatePoint(px, py, angle) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const result = [px * cos - py * sin, px * sin + py * cos]
  logger.curve.trace(`点回転: (${px}, ${py}) → (${result[0]}, ${result[1]}), 角度=${angle}`)
  return result
}

/**
 * 2点間の方位角を計算
 * @param {Array} p1 - 開始点 [x, y]
 * @param {Array} p2 - 終了点 [x, y]
 * @returns {number} 方位角（ラジアン）
 */
export function getAngle(p1, p2) {
  if (!Array.isArray(p1) || !Array.isArray(p2)) {
    logger.curve.error('方位角計算: 無効な点データ', { p1, p2 })
    return 0
  }
  
  const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0])
  logger.curve.trace(`方位角計算: p1=(${p1[0]}, ${p1[1]}) → p2=(${p2[0]}, ${p2[1]}), 角度=${angle}rad`)
  return angle
}

/**
 * 角度を-π to π範囲に正規化
 * @param {number} angle - 角度（ラジアン）
 * @returns {number} 正規化された角度
 */
export function normalizeAngle(angle) {
  const normalized = ((angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
  logger.curve.trace(`角度正規化: ${angle} → ${normalized}`)
  return normalized
}

/**
 * 2点間の距離を計算
 * @param {Array} p1 - 点1 [x, y]
 * @param {Array} p2 - 点2 [x, y]
 * @returns {number} 距離
 */
export function dist(p1, p2) {
  if (!Array.isArray(p1) || !Array.isArray(p2)) {
    logger.curve.error('距離計算: 無効な点データ', { p1, p2 })
    return 0
  }
  
  const distance = Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)
  logger.curve.trace(`距離計算: p1=(${p1[0]}, ${p1[1]}) → p2=(${p2[0]}, ${p2[1]}), 距離=${distance}`)
  return distance
}

/**
 * 2直線の交点を求める
 * @param {Array} p1 - 直線1上の点 [x, y]
 * @param {Array} dir1 - 直線1の方向ベクトル [dx, dy]
 * @param {Array} p2 - 直線2上の点 [x, y]
 * @param {Array} dir2 - 直線2の方向ベクトル [dx, dy]
 * @returns {Array|null} 交点 [x, y] または null（平行の場合）
 */
export function getLineIntersection(p1, dir1, p2, dir2) {
  if (!Array.isArray(p1) || !Array.isArray(dir1) || !Array.isArray(p2) || !Array.isArray(dir2)) {
    logger.curve.error('直線交点計算: 無効な入力データ', { p1, dir1, p2, dir2 })
    return null
  }
  
  const det = dir1[0] * dir2[1] - dir1[1] * dir2[0]
  
  if (Math.abs(det) < 1e-10) {
    return null // 平行（ログ削減）
  }
  
  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  const t = (dx * dir2[1] - dy * dir2[0]) / det
  
  const intersection = [p1[0] + t * dir1[0], p1[1] + t * dir1[1]]
  logger.curve.trace(`直線交点計算: 交点=(${intersection[0]}, ${intersection[1]})`)
  return intersection
}
