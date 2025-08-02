// ================= 緩和曲線（クロソイド）計算 =================
// 高精度テイラー級数展開による計算
// 記号: a=クロソイド定数, L=弧長, R=半径

// 偏角計算: am = a²/(2L²)
export function calcDeviation(a, L) {
  if (L === 0) return 0;
  return (a * a) / (2 * L * L);
}

// X座標 (フレネル積分C近似)
export function calcClothoidX(a, L) {
  if (L === 0) return 0;
  
  const am = calcDeviation(a, L);
  const z = L;
  
  let sum = 1;
  let term = 1;
  let x = z;
  let prevX;
  
  // テイラー展開による高精度計算
  for (let i = 1; i < 50; i++) {
    term = -term / ((2 * i - 1) * (2 * i)) * am * am;
    sum += term / (4 * i + 1);
    prevX = x;
    x = z * sum;
    if (Math.abs(x - prevX) < 1e-13) break;
  }
  
  return x * (a >= 0 ? 1 : -1);
}

// Y座標 (フレネル積分S近似)
export function calcClothoidY(a, L) {
  if (L === 0) return 0;
  
  const am = calcDeviation(a, L);
  const z = L * L * L / 6;
  
  let sum = 1;
  let term = 1;
  let y = z * sum;
  let prevY;
  
  // テイラー展開による高精度計算
  for (let i = 1; i < 50; i++) {
    prevY = y;
    term = -term / ((2 * i) * (2 * i + 1)) * am * am;
    sum += term / (4 * i + 3);
    y = z * sum;
    if (Math.abs(y - prevY) < 1e-13) break;
  }
  
  return y * Math.abs(a) / (L * L);
}

// 点の回転
export function rotatePoint(px, py, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [px * cos - py * sin, px * sin + py * cos];
}

// 2点間の方位角
export function getAngle(p1, p2) {
  return Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
}

// 角度を-π to π範囲に正規化
export function normalizeAngle(angle) {
  return ((angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

// 2点間の距離を計算する補助関数
export function dist(p1, p2) {
  return Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2);
}

// 2直線の交点を求める汎用関数（将来の拡張用）
export function getLineIntersection(p1, dir1, p2, dir2) {
  const det = dir1[0] * dir2[1] - dir1[1] * dir2[0];
  
  if (Math.abs(det) < 1e-10) {
    return null; // 平行
  }
  
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const t = (dx * dir2[1] - dy * dir2[0]) / det;
  
  return [p1[0] + t * dir1[0], p1[1] + t * dir1[1]];
}
