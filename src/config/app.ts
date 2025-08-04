/**
 * アプリケーション設定
 */

export const APP_CONFIG = {
  // キャンバス設定
  canvas: {
    defaultZoom: 1,
    minZoom: 0.01,
    maxZoom: 5,
    zoomStep: 0.1,
    zoomFactor: 1.2
  },

  // 制御点設定
  controlPoints: {
    minPoints: 3,
    maxPoints: 50,
    defaultRadius: 100,
    defaultSpiralFactor: 1.0,
    clickThreshold: 15, // ピクセル
    minRadius: 10,
    maxRadius: 500
  },

  // UI設定
  ui: {
    sidebarMinWidth: 200,
    sidebarMaxWidth: 500,
    sidebarDefaultWidth: 300,
    animationDuration: 150
  },

  // 背景画像設定
  backgroundImage: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    defaultOpacity: 0.5,
    defaultScale: 1.0
  },

  // パフォーマンス設定
  performance: {
    maxCurvePoints: 10000,
    renderThrottle: 16, // 60fps
    updateThrottle: 100
  }
} as const

export type AppConfig = typeof APP_CONFIG
