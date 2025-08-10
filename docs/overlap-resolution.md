# 実重複量ベース調整機能 (Actual Overlap-Based Adjustment)

## 概要

方向オーバーラップを検出し、実際の幾何学的重複量に基づいて比例調整を行うシステムです。制限や段階的調整は一切なく、純粋に重複量に比例した調整を行います。

## 主な特徴

- **実重複量計算**: 方向反対強度×短いベクトル長で実際の重複量を算出
- **内積ベース検出**: ベクトルの方向が反対（内積<0）の場合をオーバーラップとして検出
- **比例調整のみ**: 重複量に完全比例、制限なし
- **係数なし**: 根拠のない適当な係数は使用しない

## 使用方法

### 1. プログラムからの利用

```javascript
import { detectOverlaps, adjustPointsForOverlaps } from '@/utils/overlapDetector.js'

// 基本的な使用例
const controlPoints = [
  { x: 100, y: 100, radius: 50, spiralFactor: 2.0 },
  { x: 200, y: 200, radius: 80, spiralFactor: 2.5 },
  { x: 300, y: 100, radius: 60, spiralFactor: 1.8 }
]

// オーバーラップ検出
const overlapResults = detectOverlaps(curveData, controlPoints)

// 実重複量ベース調整の適用
if (overlapResults.hasOverlaps) {
  const adjustedPoints = adjustPointsForOverlaps(controlPoints, overlapResults, isLoopMode)
  console.log('実重複量に基づく調整が完了しました')
}
```

### 2. 実重複量計算システム

```javascript
// 実重複量の計算方法
const actualOverlapCalculation = {
  directionStrength: Math.abs(dotProduct),        // 方向反対強度 (0-1)
  shortestVector: Math.min(vector1Length, vector2Length),  // 短いベクトル長
  actualOverlap: shortestVector * directionStrength,       // 実際の重複量
  overlapRatio: actualOverlap / controlDistance           // 重複比率
}

// 調整係数の決定（純粋比例）
const reductionFactor = 1.0 - overlapRatio  // 重複比率をそのまま削減
```

### 3. 曲線生成での自動適用

```javascript
import { generateClothoidCurve } from '@/utils/curveGenerator.js'

// 制御点での曲線生成（自動オーバーラップ検出・調整）
const curveResult = generateClothoidCurve(controlPoints, { isLoop: false })

// 実重複量ベース調整が適用されたかチェック
if (curveResult.data.clothoidData.overlapResolution?.overlapResults?.hasOverlaps) {
  console.log('実重複量に基づく調整が自動適用されました')
  console.log('調整された制御点:', curveResult.data.clothoidData.adjustedPoints)
}

// 調整された制御点の確認
curveResult.data.clothoidData.adjustedPoints?.forEach((point, index) => {
  if (point.adjustment) {
    console.log(`制御点${index}: ${point.adjustment.reductionPercent}調整`)
  }
})
```

## 実重複量計算詳細

| 計算要素 | 計算式 | 説明 |
|----------|-------|-----|
| **方向反対強度** | Math.abs(dotProduct) | 内積の絶対値（0-1範囲） |
| **実重複量** | 短いベクトル長 × 方向反対強度 | 実際の幾何学的重複量 |
| **重複比率** | 実重複量 ÷ 制御点間距離 | 調整の基準となる比率 |
| **調整係数** | 1.0 - 重複比率 | 純粋比例調整 |

## オーバーラップ検出条件

| 検出タイプ | 比較対象 | 条件 |
|-----------|----------|------|
| **制御点始点** | P_start→P_mid vs TS→ST | 内積 < 0 |
| **制御点終点** | P_mid→P_end vs TS→ST | 内積 < 0 |
| **セグメント接続** | P_n→P_n+1 vs ST_n→TS_n+1 | 内積 < 0 |

## 調整結果の確認

```javascript
// 調整済み制御点の詳細情報確認
adjustedPoints.forEach((point, index) => {
  if (point.adjustment) {
    console.log(`制御点 ${index}:`)
    console.log(`  元の半径: ${point.adjustment.originalRadius}`)
    console.log(`  調整後半径: ${point.adjustedRadius}`)
    console.log(`  調整係数: ${point.adjustment.adjustmentFactor}`)
    console.log(`  削減率: ${point.adjustment.reductionPercent}`)
    console.log(`  調整理由: ${point.adjustment.reason}`)
  }
})

// オーバーラップ検出詳細
if (overlapResults.hasOverlaps) {
  overlapResults.overlaps.forEach((overlap, index) => {
    console.log(`オーバーラップ ${index}:`)
    console.log(`  カテゴリ: ${overlap.category}`)
    console.log(`  内積: ${overlap.dotProduct.toFixed(3)}`)
    console.log(`  セグメント: ${overlap.segmentIndex}`)
  })
}

## UIコンポーネントでの利用

```vue
<template>
  <div class="overlap-resolution-status">
    <div v-if="overlapStatus.hasOverlaps" class="overlap-detected">
      ⚠️ 方向オーバーラップ検出: {{ overlapStatus.overlaps.length }}件
      <button @click="applyResolution">一発完全解消</button>
    </div>
    <div v-else class="no-overlap">
      ✅ 直線オーバーラップなし
    </div>
  </div>
</template>

<script setup>
import { detectOverlaps, adjustPointsForOverlaps } from '@/utils/overlapDetector.js'

const overlapStatus = ref({
  hasOverlaps: false,
  overlaps: []
})

const applyResolution = () => {
  const adjustedPoints = adjustPointsForOverlaps(controlPoints.value, overlapStatus.value)
  emit('points-adjusted', adjustedPoints)
}
</script>

## パフォーマンス特性

- **計算時間**: オーバーラップ数に線形比例 O(n)
- **調整方式**: 純粋比例調整、制限なし
- **リアルタイム性**: 実重複量に基づく瞬時調整
- **メモリ効率**: 元配列コピーと調整係数配列のみ

## システム仕様

### 検出アルゴリズム
1. **方向ベクトル計算**: 制御点間とST-TS間のベクトル
2. **内積判定**: 内積<0で反対方向（オーバーラップ）を検出
3. **分類**: 制御点始点/終点/セグメント接続の3タイプ

### 調整アルゴリズム
1. **実重複量計算**: 短いベクトル長×方向反対強度
2. **重複比率算出**: 実重複量÷制御点間距離
3. **純粋比例適用**: 1.0 - 重複比率で調整係数決定

## 制限事項

- **純粋比例のみ**: 実重複量に完全比例、特別な調整なし
- **形状変化**: 元の意図された形状から変更される可能性
- **係数なし**: 根拠のない調整係数は使用しない

## トラブルシューティング

### 重複が解消されない場合

1. **内積値確認**: dotProduct < 0 になっているか確認
2. **実重複量確認**: actualOverlapLength が正しく計算されているか
3. **重複比率確認**: actualOverlapRatio = actualOverlapLength / controlDistance の計算

### 調整が過度になる場合

1. **重複比率確認**: 1.0を超えていないか（調整係数が負になる）
2. **制御点配置**: より適切な制御点間距離に調整
3. **ベクトル長確認**: 極端に短いベクトルがないか確認