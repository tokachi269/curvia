// 制御点の調整情報
export interface ControlPointAdjustment {
  type: 'radius-scaling' | 'spiral-scaling' | 'auto-fit'
  originalRadius: number
  originalSpiralFactor: number
  radiusScale: number
  spiralScale: number
  reason: 'overlap-prevention' | 'space-optimization'
  affectedSegments: number[]
}

// 制御点の型定義
export interface ControlPoint {
  x: number
  y: number
  radius: number                     // ユーザー設定値
  adjustedRadius?: number            // 調整後の値（実際の描画に使用）
  spiralFactor: number               // ユーザー設定値
  adjustedSpiralFactor?: number      // 調整後の値
  spiralMode?: 'auto' | 'manual'
  spiralLength?: number
  adjustment?: ControlPointAdjustment // 調整情報
  overlapResolution?: OverlapResolutionSettings // 個別制御点の重複解消設定
}

// 線の塊（カーブグループ）の型定義
export interface CurveGroup {
  id: string
  name: string
  points: ControlPoint[]
  visible: boolean
  color?: string
  overlapResolution?: OverlapResolutionSettings
}

// 重複解消設定の型定義
export interface OverlapResolutionSettings {
  enabled: boolean
  mode: 'global' | 'individual'     // 全体一括 or コーナー別調整
}

// キャンバス変換の型定義
export interface CanvasTransform {
  zoom: number
  panX: number
  panY: number
}

// 背景画像設定の型定義
export interface ImageSettings {
  x: number
  y: number
  scale: number
  opacity: number
  flipX: boolean
  flipY: boolean
}

// サイドバー展開状態の型定義
export interface SidebarExpanded {
  display: boolean
  background: boolean
  controls: boolean
}

// 曲線データの型定義
export interface ClothoidSegment {
  startX: number
  startY: number
  endX: number
  endY: number
  startAngle: number
  endAngle: number
  curvature: number
  length: number
}

export interface ClothoidData {
  segments: ClothoidSegment[]
}

export interface CurveResult {
  data: {
    curve: ControlPoint[]
    clothoidData: ClothoidData
  }
  debug: string
  error?: string
}

// レンダラー関連の型定義
export interface RenderOptions {
  showGrid: boolean
  clothoidData: ClothoidData | null
  lineOnlyMode: boolean
  fillInsideMode: boolean
  previewPoint: { x: number, y: number, segmentIndex: number } | null
  showConnectionLines: boolean
  showAngles: boolean
  showRadiusLines: boolean
  isLoopMode: boolean
  debugMode: boolean
  overlapResults: any
  backgroundImage: HTMLImageElement | null
  imageSettings: ImageSettings
}

// マウスイベント関連の型定義
export interface MousePosition {
  x: number
  y: number
}

export interface DragState {
  isDragging: boolean
  pointIndex: number
  offset: MousePosition
}

export interface PanState {
  isPanning: boolean
  startPosition: MousePosition
}
