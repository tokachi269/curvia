/**
 * 統一ログ管理システム
 * 開発時のデバッグログを一元管理し、ON/OFF切り替えを可能にする
 */

// ログレベル設定
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
} as const

// 型定義
export type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS]

export interface GlobalState {
  isDragging: boolean      // ドラッグ操作中フラグ
  isRendering: boolean     // レンダリング中フラグ
  showFinalResult: boolean // 最終結果表示フラグ
}

export interface LogCategories {
  curve: boolean           // 曲線計算ログ
  render: boolean          // 描画ログ（頻繁なので通常OFF）
  performance: boolean     // パフォーマンス計測
  debug: boolean           // デバッグ情報
  error: boolean           // エラーログ
}

export interface SuppressSettings {
  renderLoop: boolean         // レンダリングループ関連を抑制
  mouseMoveEvents: boolean    // マウス移動イベント関連を抑制
  canvasRedraw: boolean       // キャンバス再描画関連を抑制
  canvasRenderer: boolean     // canvasRenderer関連のデバッグログを抑制
  segmentProcessing: boolean  // セグメント処理関連を抑制
  dragOperations: boolean     // ドラッグ操作中のログを抑制
  curveUpdate: boolean        // 曲線更新時のログを抑制
}

export interface LogConfig {
  enabled: boolean                // 全体のログ有効/無効
  level: LogLevel                 // ログレベル
  showTimestamp: boolean          // タイムスタンプ表示
  showCaller: boolean             // 呼び出し元表示
  categories: LogCategories       // カテゴリ別設定
  suppress: SuppressSettings      // 頻繁な操作での抑制設定
}

export interface LogCategory {
  info: (message: string, ...args: any[]) => void
  debug: (message: string, ...args: any[]) => void
  warn: (message: string, ...args: any[]) => void
  error: (message: string, ...args: any[]) => void
  trace: (message: string, ...args: any[]) => void
}

export interface PerformanceCategory {
  start: (label: string) => void
  end: (label: string) => void
  info: (message: string, ...args: any[]) => void
}

export interface Logger {
  curve: LogCategory
  render: LogCategory
  performance: PerformanceCategory
  debug: LogCategory
  error: LogCategory
  trace: (message: string, ...args: any[]) => void
}

// グローバル状態管理（ドラッグ検出用）
let globalState: GlobalState = {
  isDragging: false,      // ドラッグ操作中フラグ
  isRendering: false,     // レンダリング中フラグ
  showFinalResult: false  // 最終結果表示フラグ
}

// ログ設定（環境変数または設定で変更可能）
let logConfig: LogConfig = {
  enabled: true,              // 全体のログ有効/無効
  level: LOG_LEVELS.DEBUG,    // ログレベル
  showTimestamp: true,        // タイムスタンプ表示
  showCaller: true,           // 呼び出し元表示
  categories: {
    curve: true,              // 曲線計算ログ
    render: false,            // 描画ログ（頻繁なので通常OFF）
    performance: true,        // パフォーマンス計測
    debug: true,              // デバッグ情報
    error: true               // エラーログ
  },
  // 頻繁な操作での抑制設定
  suppress: {
    renderLoop: true,         // レンダリングループ関連を抑制
    mouseMoveEvents: true,    // マウス移動イベント関連を抑制
    canvasRedraw: true,       // キャンバス再描画関連を抑制
    canvasRenderer: true,     // canvasRenderer関連のデバッグログを抑制
    segmentProcessing: true,  // セグメント処理関連を抑制
    dragOperations: true,     // ドラッグ操作中のログを抑制
    curveUpdate: true         // 曲線更新時のログを抑制
  }
}

/**
 * ログ設定を更新
 */
export function setLogConfig(config: Partial<LogConfig>): void {
  logConfig = { ...logConfig, ...config }
}

/**
 * グローバル状態を更新
 */
export function setGlobalState(state: Partial<GlobalState>): void {
  globalState = { ...globalState, ...state }
}

/**
 * ログ出力すべきかを判定
 */
function shouldLog(category: keyof LogCategories, level: LogLevel): boolean {
  if (!logConfig.enabled) return false
  if (level > logConfig.level) return false
  if (!logConfig.categories[category]) return false
  
  // グローバル状態による抑制チェック
  if (globalState.isDragging && logConfig.suppress.dragOperations) return false
  if (globalState.isRendering && logConfig.suppress.renderLoop) return false
  
  return true
}

/**
 * オブジェクトを文字列に変換（循環参照対応）
 */
function stringify(obj: any): string {
  if (typeof obj === 'string') return obj
  if (typeof obj === 'number') return obj.toString()
  if (typeof obj === 'boolean') return obj.toString()
  if (obj === null) return 'null'
  if (obj === undefined) return 'undefined'
  
  try {
    return JSON.stringify(obj, null, 2)
  } catch (error) {
    return '[Circular Reference]'
  }
}

/**
 * 呼び出し元の情報を取得
 */
function getCaller(): string {
  if (!logConfig.showCaller) return ''
  
  try {
    const stack = new Error().stack
    if (!stack) return ''
    
    const stackLines = stack.split('\n')
    // スタックの3番目以降を確認（0: Error, 1: getCaller, 2: log）
    for (let i = 3; i < Math.min(6, stackLines.length); i++) {
      const line = stackLines[i]
      if (line && !line.includes('logger.') && !line.includes('node_modules')) {
        const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/) || 
                     line.match(/at\s+(.+):(\d+):(\d+)/)
        if (match) {
          const functionName = match[1] || 'anonymous'
          const fileName = match[2] ? match[2].split('/').pop() : 'unknown'
          return `[${functionName}@${fileName}]`
        }
      }
    }
  } catch (error) {
    // エラーが発生した場合は空文字を返す
  }
  
  return ''
}

/**
 * タイムスタンプを生成
 */
function getTimestamp(): string {
  if (!logConfig.showTimestamp) return ''
  
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')
  const milliseconds = now.getMilliseconds().toString().padStart(3, '0')
  
  return `[${hours}:${minutes}:${seconds}.${milliseconds}]`
}

/**
 * メインログ関数
 */
function log(category: keyof LogCategories, level: LogLevel, message: string, ...args: any[]): void {
  if (!shouldLog(category, level)) return
  
  const timestamp = getTimestamp()
  const caller = getCaller()
  const levelName = Object.keys(LOG_LEVELS)[level] || 'UNKNOWN'
  const categoryTag = `[${levelName}]`
  
  let logMessage = `${timestamp}${caller}${categoryTag} ${message}`
  
  if (args.length > 0) {
    const argsStr = args.map(arg => stringify(arg)).join(' ')
    logMessage += ` ${argsStr}`
  }
  
  // レベルに応じてconsoleメソッドを選択
  switch (level) {
    case LOG_LEVELS.ERROR:
      console.error(logMessage)
      break
    case LOG_LEVELS.WARN:
      console.warn(logMessage)
      break
    default:
      console.log(logMessage)
      break
  }
}

// カテゴリ別ログ関数
export const logger: Logger = {
  // 曲線計算ログ
  curve: {
    info: (message: string, ...args: any[]) => log('curve', LOG_LEVELS.INFO, message, ...args),
    debug: (message: string, ...args: any[]) => log('curve', LOG_LEVELS.DEBUG, message, ...args),
    warn: (message: string, ...args: any[]) => log('curve', LOG_LEVELS.WARN, message, ...args),
    error: (message: string, ...args: any[]) => log('curve', LOG_LEVELS.ERROR, message, ...args),
    trace: (message: string, ...args: any[]) => log('curve', LOG_LEVELS.TRACE, message, ...args),
  },
  
  // 描画ログ
  render: {
    info: (message: string, ...args: any[]) => log('render', LOG_LEVELS.INFO, message, ...args),
    debug: (message: string, ...args: any[]) => log('render', LOG_LEVELS.DEBUG, message, ...args),
    warn: (message: string, ...args: any[]) => log('render', LOG_LEVELS.WARN, message, ...args),
    error: (message: string, ...args: any[]) => log('render', LOG_LEVELS.ERROR, message, ...args),
    trace: (message: string, ...args: any[]) => log('render', LOG_LEVELS.TRACE, message, ...args),
  },
  
  // パフォーマンス計測
  performance: {
    start: (label: string) => {
      if (shouldLog('performance', LOG_LEVELS.INFO)) {
        console.time(`[PERF] ${label}`)
      }
    },
    end: (label: string) => {
      if (shouldLog('performance', LOG_LEVELS.INFO)) {
        console.timeEnd(`[PERF] ${label}`)
      }
    },
    info: (message: string, ...args: any[]) => log('performance', LOG_LEVELS.INFO, message, ...args),
  },
  
  // デバッグ情報
  debug: {
    info: (message: string, ...args: any[]) => log('debug', LOG_LEVELS.INFO, message, ...args),
    debug: (message: string, ...args: any[]) => log('debug', LOG_LEVELS.DEBUG, message, ...args),
    trace: (message: string, ...args: any[]) => log('debug', LOG_LEVELS.TRACE, message, ...args),
    warn: (message: string, ...args: any[]) => log('debug', LOG_LEVELS.WARN, message, ...args),
    error: (message: string, ...args: any[]) => log('debug', LOG_LEVELS.ERROR, message, ...args),
  },
  
  // エラーログ
  error: {
    error: (message: string, ...args: any[]) => log('error', LOG_LEVELS.ERROR, message, ...args),
    warn: (message: string, ...args: any[]) => log('error', LOG_LEVELS.WARN, message, ...args),
    trace: (message: string, ...args: any[]) => log('error', LOG_LEVELS.TRACE, message, ...args),
    info: (message: string, ...args: any[]) => log('error', LOG_LEVELS.INFO, message, ...args),
    debug: (message: string, ...args: any[]) => log('error', LOG_LEVELS.DEBUG, message, ...args),
  },
  
  // 汎用トレース関数
  trace: (message: string, ...args: any[]) => log('debug', LOG_LEVELS.TRACE, message, ...args),
}

/**
 * デバッグ情報文字列を生成するヘルパー
 */
export function formatDebugInfo(title: string, data: Record<string, any>): string {
  let debug = `=== ${title} ===\n`
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'number') {
      debug += `${key}: ${value.toFixed(2)}\n`
    } else if (typeof value === 'object' && value !== null) {
      if (value.x !== undefined && value.y !== undefined) {
        debug += `${key}: (${value.x.toFixed(2)}, ${value.y.toFixed(2)})\n`
      } else {
        debug += `${key}: ${stringify(value)}\n`
      }
    } else {
      debug += `${key}: ${value}\n`
    }
  }
  
  return debug
}

/**
 * パフォーマンス計測用ヘルパークラス
 */
export class PerformanceTimer {
  private label: string
  private startTime: number

  constructor(label: string) {
    this.label = label
    this.startTime = performance.now()
    logger.performance.info(`${this.label} 開始`)
  }
  
  end(): number {
    const elapsed = performance.now() - this.startTime
    logger.performance.info(`${this.label} 完了: ${elapsed.toFixed(2)}ms`)
    return elapsed
  }
}

// デバッグ用：ログ設定を一時的に変更
export function enableDebugLogs(): void {
  setLogConfig({
    enabled: true,
    level: LOG_LEVELS.DEBUG,
    categories: {
      curve: true,
      render: true,
      performance: true,
      debug: true,
      error: true
    }
  })
}

export function disableDebugLogs(): void {
  setLogConfig({
    enabled: true,
    level: LOG_LEVELS.WARN,
    categories: {
      curve: false,
      render: false,
      performance: false,
      debug: false,
      error: true
    }
  })
}

// デフォルトエクスポートとして logger を提供
export default logger
