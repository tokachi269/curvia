import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CanvasTransform } from '@/types'
import { APP_CONFIG } from '@/config/app'

export const useCanvasStore = defineStore('canvas', () => {
  // State
  const transform = ref<CanvasTransform>({
    zoom: APP_CONFIG.canvas.defaultZoom,
    panX: 0,
    panY: 0
  })
  
  const showGrid = ref(true)
  const lineOnlyMode = ref(false)
  const fillInsideMode = ref(false)
  const showConnectionLines = ref(true)
  const debugMode = ref(false)
  const lineWidth = ref(2) // 線の太さ（デフォルト: 2px）

  // Canvas element ref
  const canvasElement = ref<HTMLCanvasElement | null>(null)

  // Getters
  const canvasCenter = computed(() => {
    if (!canvasElement.value) return { x: 400, y: 300 }
    return {
      x: canvasElement.value.width / 2,
      y: canvasElement.value.height / 2
    }
  })

  const transformMatrix = computed(() => {
    const { zoom, panX, panY } = transform.value
    const center = canvasCenter.value
    
    return {
      a: zoom,
      b: 0,
      c: 0,
      d: zoom,
      e: center.x + panX,
      f: center.y + panY
    }
  })

  // Actions
  const setCanvasElement = (element: HTMLCanvasElement) => {
    canvasElement.value = element
  }

  const zoomIn = () => {
    transform.value.zoom = Math.min(transform.value.zoom * APP_CONFIG.canvas.zoomFactor, APP_CONFIG.canvas.maxZoom)
  }

  const zoomOut = () => {
    transform.value.zoom = Math.max(transform.value.zoom / APP_CONFIG.canvas.zoomFactor, APP_CONFIG.canvas.minZoom)
  }

  const resetZoom = () => {
    transform.value.zoom = APP_CONFIG.canvas.defaultZoom
  }

  const resetPan = () => {
    transform.value.panX = 0
    transform.value.panY = 0
  }

  const pan = (deltaX: number, deltaY: number) => {
    transform.value.panX += deltaX
    transform.value.panY += deltaY
  }

  const setTransform = (zoom: number, panX: number, panY: number) => {
    transform.value.zoom = zoom
    transform.value.panX = panX
    transform.value.panY = panY
  }

  const screenToWorld = (screenX: number, screenY: number) => {
    const { zoom, panX, panY } = transform.value
    const center = canvasCenter.value
    
    return {
      x: (screenX - center.x - panX) / zoom,
      y: (screenY - center.y - panY) / zoom
    }
  }

  const worldToScreen = (worldX: number, worldY: number) => {
    const { zoom, panX, panY } = transform.value
    const center = canvasCenter.value
    
    return {
      x: worldX * zoom + center.x + panX,
      y: worldY * zoom + center.y + panY
    }
  }

  // Toggle actions
  const toggleShowGrid = () => {
    showGrid.value = !showGrid.value
  }

  const toggleLineOnlyMode = () => {
    lineOnlyMode.value = !lineOnlyMode.value
  }

  const toggleFillInsideMode = () => {
    fillInsideMode.value = !fillInsideMode.value
  }

  const toggleShowConnectionLines = () => {
    showConnectionLines.value = !showConnectionLines.value
  }

  const toggleDebugMode = () => {
    debugMode.value = !debugMode.value
  }

  return {
    // State
    transform,
    showGrid,
    lineOnlyMode,
    fillInsideMode,
    showConnectionLines,
    debugMode,
    lineWidth,
    canvasElement,
    
    // Getters
    canvasCenter,
    transformMatrix,
    
    // Actions
    setCanvasElement,
    zoomIn,
    zoomOut,
    resetZoom,
    resetPan,
    pan,
    setTransform,
    screenToWorld,
    worldToScreen,
    toggleShowGrid,
    toggleLineOnlyMode,
    toggleFillInsideMode,
    toggleShowConnectionLines,
    toggleDebugMode
  }
})
