# Components Directory Structure

コンポーネントは機能別とドメイン別に整理されています。

## 全体構成

```
src/components/
├── ui/                     # 純粋UIコンポーネント
│   ├── base/              # 基本UI要素
│   ├── layout/            # レイアウト・構造
│   ├── property/          # プロパティ入力
│   ├── display/           # 表示・装飾
│   └── index.ts
├── domain/                # ビジネスロジック特化
│   ├── curve/             # 曲線関連
│   ├── point/             # 制御点関連
│   └── index.ts
├── ControlPointsPanel.vue # 制御点設定パネル
├── CanvasArea.vue         # Canvas描画エリア
├── BackgroundImagePanel.vue # 背景画像設定
├── ErrorToast.vue        # エラー表示
└── README.md              # このファイル
```

## UIコンポーネント (`ui/`)

純粋なUIコンポーネントで、ビジネスロジックを含まない再利用可能な要素です。

### UI詳細構造

```
src/components/ui/
├── base/           # 基本UIコンポーネント
│   ├── BaseButton.vue
│   ├── BaseCheckbox.vue
│   ├── BaseInput.vue
│   ├── BaseSlider.vue
│   └── index.ts
├── layout/         # レイアウト・構造コンポーネント
│   ├── BasePanel.vue
│   ├── ListPanel.vue
│   ├── ListItem.vue
│   ├── ButtonRow.vue
│   └── index.ts
├── property/       # プロパティ入力関連
│   ├── PropertyRow.vue
│   ├── PropertySubgroup.vue
│   ├── PropLabel.vue
│   ├── PropUnit.vue
│   └── index.ts
├── display/        # 表示・装飾コンポーネント
│   ├── TruncateText.vue
│   ├── Divider.vue
│   └── index.ts
└── index.ts        # 全体のエクスポート
```

## ドメインコンポーネント (`domain/`)

ビジネスロジックに特化したコンポーネントで、特定の機能やデータ構造に依存します。

### Domain組織構造

```
src/components/domain/
├── {domain-name}/      # ドメイン名別フォルダ
│   ├── *.vue          # ドメイン固有コンポーネント
│   └── index.ts       # ドメイン内エクスポート
└── index.ts           # 全体のエクスポート
```

**現在のドメイン:**
- `curve/` - 曲線関連（描画、凡例等）
- `point/` - 制御点関連（情報表示、詳細等）

## 使用方法

### 個別インポート
```typescript
import { BaseButton, BaseInput } from '@/components/ui'
```

### カテゴリ別インポート
```typescript
import { BaseButton } from '@/components/ui/base'
import { PropertyRow } from '@/components/ui/property'
```

## カテゴリ別説明

### Base
- **BaseButton**: 基本ボタンコンポーネント
- **BaseCheckbox**: チェックボックス
- **BaseInput**: 入力フィールド
- **BaseSlider**: スライダー

### Layout
- **BasePanel**: 折りたたみ可能パネル
- **ListPanel**: リスト専用パネル
- **ListItem**: 展開可能リストアイテム
- **ButtonRow**: ボタン配置用行

### Property
- **PropertyRow**: プロパティ入力行
- **PropertySubgroup**: プロパティグループ
- **PropLabel**: プロパティラベル
- **PropUnit**: 単位表示

### Display
- **TruncateText**: 省略表示テキスト
- **Divider**: 区切り線（ラベル付き/なし、水平/垂直、各種スタイル対応）

## ドメイン固有コンポーネント

### 現在実装されているドメイン

**Curve Domain (`@/components/domain/curve`)**
- 曲線の描画、表示、凡例に関連するコンポーネント
- 直線/スパイラル/円弧の色分け表示等

**Point Domain (`@/components/domain/point`)**  
- 制御点の情報表示、詳細表示に関連するコンポーネント
- レスポンシブ表示、拡張可能な詳細情報等

## 主要パネルコンポーネント

### ControlPointsPanel.vue
制御点の設定・管理を行うメインパネル。UIコンポーネントとドメインコンポーネントを組み合わせて構築。

### CanvasArea.vue
Canvas描画エリア。曲線の描画とインタラクション機能を提供。

### BackgroundImagePanel.vue
背景画像の設定・管理パネル。

### ErrorToast.vue
エラーメッセージの表示コンポーネント。

## 使用例

### UI Components
```typescript
import { BaseButton, ListPanel, PropertyRow, Divider } from '@/components/ui'
```

### Domain Components
```typescript
import { LegendIndicator } from '@/components/domain'
import { PointInfo, PointDetail } from '@/components/domain'
```

### Divider使用例
```typescript
// ラベルなし区切り線
<Divider spacing="md" />

// ラベル付き区切り線
<Divider variant="dashed" spacing="lg">セクション名</Divider>

// 垂直区切り線
<Divider orientation="vertical" />
```

## アーキテクチャ原則

### UIコンポーネント設計原則
1. **単一責任**: 一つの明確なUI機能のみを担当
2. **ビジネスロジック分離**: データ処理や計算ロジックを含まない
3. **再利用性**: 異なるコンテキストで使い回し可能
4. **CSS変数統一**: デザインシステムに基づく一貫したスタイリング

### ドメインコンポーネント設計原則
1. **ビジネス特化**: 特定のドメイン知識・データ構造に特化
2. **UIコンポーネント活用**: 基本UIを組み合わせて構築
3. **ドメイン別分類**: 関連する機能ごとにフォルダを分割

## 新しいコンポーネント追加時のガイドライン

### UIコンポーネント追加時 (`@/components/ui`)
1. **適切なカテゴリに配置** (base, layout, property, display)
2. **純粋なUI機能のみ** (ビジネスロジックを含まない)
3. **該当フォルダの index.ts にエクスポートを追加**
4. **CSS変数を使用したスタイリング**
5. **既存の命名規則に従う** (Base*, Property*, etc.)

### ドメインコンポーネント追加時 (`@/components/domain`)
1. **ビジネス領域別に分類** (curve, point, 新規ドメイン等)
2. **UIコンポーネントを組み合わせて構築**
3. **特定の機能・データ構造に特化した実装**
4. **該当ドメインフォルダの index.ts にエクスポートを追加**
