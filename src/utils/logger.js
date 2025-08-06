/**
 * 統一ログ管理システム
 * 開発時のデバッグログを一元管理し、ON/OFF切り替えを可能にする
 */

// ログレベル設定
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
}

// グローバル状態管理（ドラッグ検出用）
let globalState = {
  isDragging: false,      // ドラッグ操作中フラグ
  isRendering: false,     // レンダリング中フラグ
  showFinalResult: false  // 最終結果表示フラグ
}

// ログ設定（環境変数または設定で変更可能）
let logConfig = {
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
 * @param {Object} config - 新しい設定
 */
export function setLogConfig(config) {
  logConfig = { ...logConfig, ...config }
}

/**
 * グローバル状態を更新
 * @param {Object} state - 新しい状態
 */
export function setGlobalState(state) {
  globalState = { ...globalState, ...state }
}

/**
 * ログ出力の有効性をチェック
 * @param {string} category - ログカテゴリ
 * @param {number} level - ログレベル
 * @param {string} message - ログメッセージ（特定メッセージの判定用）
 * @returns {boolean} ログ出力すべきかどうか
 */
function shouldLog(category, level, message = '') {
  if (!logConfig.enabled) return false
  if (level > logConfig.level) return false
  if (logConfig.categories[category] === false) return false
  
  // ドラッグ操作中の抑制
  if (globalState.isDragging && logConfig.suppress.dragOperations) {
    // ドラッグ中は最終結果フラグが立っていても抑制
    if (category === 'curve') {
      return false  // ドラッグ中はすべてのcurveログを抑制
    }
    if (category === 'performance' && level === LOG_LEVELS.INFO) {
      return false
    }
  }
  
  // ドラッグ終了後の最終結果表示
  if (globalState.showFinalResult && category === 'curve' && level === LOG_LEVELS.INFO && message.includes('曲線生成完了')) {
    return true  // 最終結果ログは必ず出力
  }
  
  return true
}

/**
 * タイムスタンプを取得
 * @returns {string} フォーマットされたタイムスタンプ
 */
function getTimestamp() {
  if (!logConfig.showTimestamp) return ''
  const now = new Date()
  return `[${now.toLocaleTimeString()}.${now.getMilliseconds().toString().padStart(3, '0')}]`
}

/**
 * 呼び出し元情報を取得（簡易版）
 * @returns {string} 呼び出し元情報
 */
function getCaller() {
  if (!logConfig.showCaller) return ''
  try {
    const stack = new Error().stack
    const lines = stack.split('\n')
    // 3番目の行が実際の呼び出し元（0: Error, 1: getCaller, 2: log関数, 3: 実際の呼び出し元）
    const callerLine = lines[3] || ''
    const match = callerLine.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/) || 
                  callerLine.match(/at\s+(.+):(\d+):(\d+)/)
    if (match) {
      const functionName = match[1] || 'anonymous'
      return `[${functionName}]`
    }
  } catch (e) {
    // スタック取得に失敗した場合は無視
  }
  return ''
}

/**
 * オブジェクトを文字列に変換（コピペしやすい形式）
 * @param {any} obj - 変換対象
 * @returns {string} 文字列表現
 */
function stringify(obj) {
  if (obj === null) return 'null'
  if (obj === undefined) return 'undefined'
  if (typeof obj === 'string') return obj
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj)
  
  try {
    if (Array.isArray(obj)) {
      return `[${obj.map(item => stringify(item)).join(', ')}]`
    }
    
    if (typeof obj === 'object') {
      const entries = Object.entries(obj)
        .map(([key, value]) => `${key}: ${stringify(value)}`)
        .join(', ')
      return `{${entries}}`
    }
    
    return String(obj)
  } catch (e) {
    return '[Object (stringify failed)]'
  }
}

/**
 * 基本ログ関数
 * @param {string} category - ログカテゴリ
 * @param {number} level - ログレベル
 * @param {string} message - メッセージ
 * @param {...any} args - 追加引数
 */
function log(category, level, message, ...args) {
  if (!shouldLog(category, level, message)) return
  
  const timestamp = getTimestamp()
  const caller = getCaller()
  const categoryTag = `[${category.toUpperCase()}]`
  
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
export const logger = {
  // 曲線計算ログ
  curve: {
    info: (message, ...args) => log('curve', LOG_LEVELS.INFO, message, ...args),
    debug: (message, ...args) => log('curve', LOG_LEVELS.DEBUG, message, ...args),
    warn: (message, ...args) => log('curve', LOG_LEVELS.WARN, message, ...args),
    error: (message, ...args) => log('curve', LOG_LEVELS.ERROR, message, ...args),
    trace: (message, ...args) => log('curve', LOG_LEVELS.TRACE, message, ...args),
  },
  
  // 描画ログ
  render: {
    info: (message, ...args) => log('render', LOG_LEVELS.INFO, message, ...args),
    debug: (message, ...args) => log('render', LOG_LEVELS.DEBUG, message, ...args),
    warn: (message, ...args) => log('render', LOG_LEVELS.WARN, message, ...args),
    error: (message, ...args) => log('render', LOG_LEVELS.ERROR, message, ...args),
    trace: (message, ...args) => log('render', LOG_LEVELS.TRACE, message, ...args),
  },
  
  // パフォーマンス計測
  performance: {
    start: (label) => {
      if (shouldLog('performance', LOG_LEVELS.INFO)) {
        console.time(`[PERF] ${label}`)
      }
    },
    end: (label) => {
      if (shouldLog('performance', LOG_LEVELS.INFO)) {
        console.timeEnd(`[PERF] ${label}`)
      }
    },
    info: (message, ...args) => log('performance', LOG_LEVELS.INFO, message, ...args),
  },
  
  // デバッグ情報
  debug: {
    info: (message, ...args) => log('debug', LOG_LEVELS.INFO, message, ...args),
    debug: (message, ...args) => log('debug', LOG_LEVELS.DEBUG, message, ...args),
    trace: (message, ...args) => log('debug', LOG_LEVELS.TRACE, message, ...args),
  },
  
  // エラーログ
  error: {
    error: (message, ...args) => log('error', LOG_LEVELS.ERROR, message, ...args),
    warn: (message, ...args) => log('error', LOG_LEVELS.WARN, message, ...args),
    trace: (message, ...args) => log('error', LOG_LEVELS.TRACE, message, ...args),
  },
  
  // 汎用トレース関数
  trace: (message, ...args) => log('debug', LOG_LEVELS.TRACE, message, ...args),
}

/**
 * デバッグ情報文字列を生成するヘルパー
 * @param {string} title - デバッグセクションのタイトル
 * @param {Object} data - デバッグデータ
 * @returns {string} フォーマットされたデバッグ文字列
 */
export function formatDebugInfo(title, data) {
  let debug = `=== ${title} ===\n`
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'number') {
      debug += `${key}: ${value.toFixed(3)}\n`
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
  constructor(label) {
    this.label = label
    this.startTime = performance.now()
    logger.performance.info(`${label} 開始`)
  }
  
  lap(description) {
    const currentTime = performance.now()
    const elapsed = currentTime - this.startTime
    logger.performance.info(`${this.label} - ${description}: ${elapsed.toFixed(2)}ms`)
    return elapsed
  }
  
  end() {
    const elapsed = performance.now() - this.startTime
    logger.performance.info(`${this.label} 完了: ${elapsed.toFixed(2)}ms`)
    return elapsed
  }
}

// デバッグ用：ログ設定を一時的に変更
export function enableDebugLogs() {
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

export function disableDebugLogs() {
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
