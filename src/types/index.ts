// 制御点の型定義
export interface ControlPoint {
  x: number
  y: number
  radius: number
  spiralFactor: number
  spiralMode?: 'auto' | 'manual'
  spiralLength?: number
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
