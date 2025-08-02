// 緩和曲線（クロソイド）計算ユーティリティ
import { dist, getAngle, normalizeAngle } from './mathUtils.js'
import { logger, formatDebugInfo } from './logger.js'
import { createError, createSuccess, validate, ERROR_CODES } from './errorHandler.js'

/**
 * 高精度7次近似によるXc計算
 * Xc = Ls - Ls³/(40R²) + Ls⁵/(3456R⁴) - Ls⁷/(599040R⁶)
 * @param {number} Ls - スパイラル長
 * @param {number} R - 半径
 * @returns {number} X座標
 */
function calculateXcAccurate(Ls, R) {
  if (R === 0) return 0
  
  const L3 = Math.pow(Ls, 3)
  const L5 = Math.pow(Ls, 5)
  const L7 = Math.pow(Ls, 7)
  const R2 = R * R
  const R4 = R2 * R2
  const R6 = R4 * R2
  
  const Xc = Ls
            - L3 / (40 * R2)           // 3次項
            + L5 / (3456 * R4)         // 5次項
            - L7 / (599040 * R6)       // 7次項
  
  return Xc
}

/**
 * 高精度近似によるYc計算
 * Yc = Ls²/(6R)
 * @param {number} Ls - スパイラル長
 * @param {number} R - 半径
 * @returns {number} Y座標
 */
function calculateYcAccurate(Ls, R) {
  if (R === 0) return 0
  return (Ls * Ls) / (6 * R)
}

/**
 * 単一折れ点での緩和曲線計算
 * @param {Array} points - [P0, P1, P2] の3点
 * @param {number} radius - 円弧半径 R
 * @param {number} spiralLength - スパイラル長 Ls (オプション、未指定時は自動計算)
 * @param {number} defaultSpiralFactor - デフォルトスパイラル係数
 * @returns {Object} 緩和曲線の各要素点と詳細情報
 */
export function calculateSingleClothoid(points, radius, spiralLength = null, defaultSpiralFactor = 2.0) {
  logger.curve.debug('単一クロソイド計算開始', {
    点数: points.length,
    半径: radius,
    スパイラル長: spiralLength || '自動'
  })
  
  const [P0, P1, P2] = points
  let debugInfo = formatDebugInfo('単一クロソイド計算', {
    点数: points.length,
    半径: radius,
    スパイラル長: spiralLength || '自動計算'
  })
  
  try {
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
    
    logger.curve.debug('角度計算開始')
    
    // §9.1 角度を計算
    const Az_in = getAngle([P0.x, P0.y], [P1.x, P1.y])
    const Az_out = getAngle([P1.x, P1.y], [P2.x, P2.y])
    const defl = normalizeAngle(Az_out - Az_in)
    const sgn = defl >= 0 ? 1 : -1
    const absDef = Math.abs(defl)
    
    logger.curve.debug('角度計算完了', {
      進入角: `${(Az_in * 180 / Math.PI).toFixed(2)}°`,
      退出角: `${(Az_out * 180 / Math.PI).toFixed(2)}°`,
      折れ角: `${(defl * 180 / Math.PI).toFixed(2)}°`,
      方向: sgn > 0 ? '左' : '右'
    })
    
    debugInfo += formatDebugInfo('角度計算', {
      進入角: `${(Az_in * 180 / Math.PI).toFixed(2)}°`,
      退出角: `${(Az_out * 180 / Math.PI).toFixed(2)}°`,
      折れ角: `${(defl * 180 / Math.PI).toFixed(2)}°`,
      方向: `${sgn > 0 ? '左' : '右'}カーブ`
    })
    
    // 直線の場合（約0.1度未満を直線とみなす）
    if (absDef < 0.0017) {  // 0.1度 = 0.0017ラジアン
      logger.curve.info('直線として処理（角度が小さい）')
      debugInfo += '直線として処理（角度が小さすぎます）\n'
      return createSuccess({
        isLine: true,
        curve: [P0, P1, P2]
      }, debugInfo)
    }
    
    // §9.2 スパイラル長の自動設定
    if (spiralLength === null) {
      // デフォルトスパイラル係数または制御点の設定を使用
      const spiralFactor = P1.spiralFactor || defaultSpiralFactor
      // デフォルト50mの基準値を使用
      spiralLength = 50 * spiralFactor
      debugInfo += `自動スパイラル長計算: 基準50m × 係数${spiralFactor} = ${spiralLength.toFixed(2)}m\n`
    }
    
    // §9.3 スパイラル角
    const th_s = spiralLength / (2 * radius)
    
    // §9.4 円弧中央角
    const defl_c = absDef - 2 * th_s
    if (defl_c < 0) {
      // スパイラルが長すぎる場合は短縮
      spiralLength = absDef * radius * 0.4
      const th_s_new = spiralLength / (2 * radius)
      const defl_c_new = absDef - 2 * th_s_new
      debugInfo += `スパイラル長を調整: ${spiralLength.toFixed(2)} → ${spiralLength.toFixed(2)}\n`
      return calculateSingleClothoid(points, radius, spiralLength, defaultSpiralFactor)
    }
    
    debugInfo += `=== スパイラル計算 ===\n`
    debugInfo += `スパイラル長: ${spiralLength.toFixed(2)}\n`
    debugInfo += `スパイラル角: ${(th_s * 180 / Math.PI).toFixed(2)}°\n`
    debugInfo += `円弧中央角: ${(defl_c * 180 / Math.PI).toFixed(2)}°\n`
    
    // TS→SC のローカル座標計算
    // 高精度7次近似式を使用
    const Yc = calculateYcAccurate(spiralLength, radius)  // Yc = Ls²/(6R)
    const Xc = calculateXcAccurate(spiralLength, radius)  // 7次近似
    
    debugInfo += `=== 高精度緩和曲線計算 ===\n`
    debugInfo += `Yc: ${Yc.toFixed(6)} (Ls²/(6R))\n`
    debugInfo += `Xc: ${Xc.toFixed(6)} (7次近似)\n`
    
    // コンソール出力（検証用）
    console.log(`=== 高精度緩和曲線計算 ===`)
    console.log(`Yc: ${Yc.toFixed(6)} (Ls²/(6R))`)
    console.log(`Xc: ${Xc.toFixed(6)} (7次近似)`)
    
    // シフト補正計算
    const rho = Yc - radius * (1 - Math.cos(th_s))
    const k = Xc - radius * Math.sin(th_s)
    
    // §9.7 PI→TS距離
    const Ts = (radius + rho) * Math.tan(absDef / 2) + k
    
    // デバッグ出力（検証用）
    console.log(`=== 緩和曲線計算完了 ===`)
    console.log(`Ls: ${spiralLength.toFixed(3)}m, R: ${radius}m`)
    console.log(`θs: ${(th_s * 180 / Math.PI).toFixed(2)}°`)
    console.log(`rho: ${rho.toFixed(6)}, k: ${k.toFixed(6)}`)
    console.log(`Ts (旧誤差): 推定 ${(spiralLength + radius * Math.tan(absDef/2)).toFixed(3)}m`)
    console.log(`Ts (正確式): ${Ts.toFixed(3)}m`)
    console.log(`========================================`)
    
    debugInfo += `=== 最終Ts計算（§9.7）===\n`
    debugInfo += `(R+ρ): ${(radius + rho).toFixed(3)}\n`
    debugInfo += `tan(Δ/2): ${Math.tan(absDef/2).toFixed(6)}\n`
    debugInfo += `k: ${k.toFixed(6)}\n`
    debugInfo += `Ts: ${Ts.toFixed(3)}m\n`
    
    // §9.8 TS座標
    const tx = Math.cos(Az_in)
    const ty = Math.sin(Az_in)
    const TS = {
      x: P1.x - Ts * tx,
      y: P1.y - Ts * ty
    }
    
    // §9.9 SC座標
    const SC_local = { x: Xc, y: sgn * Yc }
    const SC = {
      x: TS.x + SC_local.x * Math.cos(Az_in) - SC_local.y * Math.sin(Az_in),
      y: TS.y + SC_local.x * Math.sin(Az_in) + SC_local.y * Math.cos(Az_in)
    }
    
    // §9.10 SC接線角と円弧中心
    const Az_SC = Az_in + sgn * th_s
    const nx = -Math.sin(Az_SC)
    const ny = Math.cos(Az_SC)
    const center = {
      x: SC.x + sgn * radius * nx,
      y: SC.y + sgn * radius * ny
    }
    
    // §9.11 CS座標
    const arcAngle = sgn * defl_c
    const scToCenterAngle = Math.atan2(SC.y - center.y, SC.x - center.x)
    const CS = {
      x: center.x + radius * Math.cos(scToCenterAngle + arcAngle),
      y: center.y + radius * Math.sin(scToCenterAngle + arcAngle)
    }
    
    // §9.12 ST座標（出口スパイラル）
    const Az_CS = Az_SC + sgn * defl_c
    const ST_local = { x: Xc, y: -sgn * Yc }
    const ST = {
      x: CS.x + ST_local.x * Math.cos(Az_CS) - ST_local.y * Math.sin(Az_CS),
      y: CS.y + ST_local.x * Math.sin(Az_CS) + ST_local.y * Math.cos(Az_CS)
    }
    
    debugInfo += formatDebugInfo('制御点座標', {
      TS: `(${TS.x.toFixed(2)}, ${TS.y.toFixed(2)})`,
      SC: `(${SC.x.toFixed(2)}, ${SC.y.toFixed(2)})`,
      Center: `(${center.x.toFixed(2)}, ${center.y.toFixed(2)})`,
      CS: `(${CS.x.toFixed(2)}, ${CS.y.toFixed(2)})`,
      ST: `(${ST.x.toFixed(2)}, ${ST.y.toFixed(2)})`
    })
    
    logger.curve.debug('クロソイド計算完了', {
      スパイラル長: spiralLength.toFixed(2),
      スパイラル角: `${(th_s * 180 / Math.PI).toFixed(2)}°`,
      円弧中央角: `${(defl_c * 180 / Math.PI).toFixed(2)}°`
    })
    
    return createSuccess({
      isLine: false,
      TS, SC, CS, ST,
      center,
      radius,
      spiralLength,
      th_s,
      defl_c,
      Az_in,
      Az_out,
      Az_SC,
      Az_CS,
      sgn
    }, debugInfo)
    
  } catch (error) {
    logger.curve.error('クロソイド計算でエラー', error.message)
    return createError(
      ERROR_CODES.CALCULATION_ERROR,
      `緩和曲線計算エラー: ${error.message}`,
      debugInfo
    )
  }
}

/**
 * スパイラル点列生成（§10.1 数値積分）
 * @param {number} spiralLength - スパイラル長
 * @param {number} radius - 円弧半径
 * @param {number} startAngle - 開始角度
 * @param {Object} startPoint - 開始点
 * @param {number} direction - 方向 (+1: 左, -1: 右)
 * @param {number} steps - 分割数
 * @param {boolean} isExit - 出口スパイラルかどうか
 * @returns {Array} スパイラル点列
 */
export function generateSpiralPoints(spiralLength, radius, startAngle, startPoint, direction, steps = 20, isExit = false) {
  const points = []
  const ds = spiralLength / steps
  
  let s = 0
  let theta = startAngle
  let x = startPoint.x
  let y = startPoint.y
  
  points.push({ x, y })
  
  for (let i = 0; i < steps; i++) {
    s += ds
    
    let k
    if (isExit) {
      // 出口スパイラル: 曲率を1/R から 0 に減少
      k = ((spiralLength - s) / spiralLength) * (1 / radius)
    } else {
      // 入口スパイラル: 曲率を0 から 1/R に増加
      k = (s / spiralLength) * (1 / radius)
    }
    
    theta += direction * k * ds
    
    x += Math.cos(theta) * ds
    y += Math.sin(theta) * ds
    
    points.push({ x, y })
  }
  
  return points
}

/**
 * 円弧点列生成
 * @param {Object} center - 円弧中心
 * @param {number} radius - 半径
 * @param {number} startAngle - 開始角度
 * @param {number} arcAngle - 円弧角度
 * @param {number} steps - 分割数
 * @returns {Array} 円弧点列
 */
export function generateArcPoints(center, radius, startAngle, arcAngle, steps = 20) {
  const points = []
  const dAngle = arcAngle / steps
  
  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + i * dAngle
    points.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle)
    })
  }
  
  return points
}
