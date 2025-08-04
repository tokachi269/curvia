/**
 * エラーハンドリングユーティリティ
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'info' | 'warning' | 'error' = 'error'
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const errorHandler = {
  /**
   * 一般的なエラーハンドリング
   */
  handle(error: unknown, context: string = ''): void {
    console.error(`[${context}]`, error)
    
    if (error instanceof AppError) {
      this.showUserMessage(error.message, error.severity)
    } else if (error instanceof Error) {
      this.showUserMessage('予期しないエラーが発生しました', 'error')
    } else {
      this.showUserMessage('不明なエラーが発生しました', 'error')
    }
  },

  /**
   * ユーザー向けメッセージ表示
   */
  showUserMessage(message: string, severity: 'info' | 'warning' | 'error'): void {
    // 実装: トースト通知やモーダル表示
    alert(`${severity.toUpperCase()}: ${message}`)
  },

  /**
   * 画像読み込みエラー
   */
  handleImageLoadError(error: unknown): void {
    console.error('画像読み込みエラー:', error)
    this.showUserMessage('画像の読み込みに失敗しました。ファイル形式を確認してください。', 'error')
  },

  /**
   * キャンバス描画エラー
   */
  handleCanvasError(error: unknown): void {
    console.error('キャンバス描画エラー:', error)
    this.showUserMessage('描画処理でエラーが発生しました。', 'error')
  },

  /**
   * 曲線生成エラー
   */
  handleCurveGenerationError(error: unknown): void {
    console.error('曲線生成エラー:', error)
    this.showUserMessage('曲線の生成に失敗しました。制御点の配置を確認してください。', 'warning')
  }
}
