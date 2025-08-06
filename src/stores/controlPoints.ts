import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ControlPoint } from '@/types'
import { APP_CONFIG } from '@/config/app'
import logger from '@/utils/logger.js'

export const useControlPointsStore = defineStore('controlPoints', () => {
  // State
  const points = ref<ControlPoint[]>([
    { x: 100, y: 200, radius: APP_CONFIG.controlPoints.defaultRadius, spiralFactor: APP_CONFIG.controlPoints.defaultSpiralFactor },
    { x: 300, y: 150, radius: APP_CONFIG.controlPoints.defaultRadius, spiralFactor: APP_CONFIG.controlPoints.defaultSpiralFactor },
    { x: 500, y: 300, radius: APP_CONFIG.controlPoints.defaultRadius, spiralFactor: APP_CONFIG.controlPoints.defaultSpiralFactor }
  ])
  
  const isLoopMode = ref(false)
  const defaultRadius = ref(APP_CONFIG.controlPoints.defaultRadius)
  const defaultSpiralFactor = ref(APP_CONFIG.controlPoints.defaultSpiralFactor)

  // Getters
  const pointCount = computed(() => points.value.length)
  const canDeletePoints = computed(() => points.value.length > 3)

  // Actions
  const addPoint = () => {
    const newPoint: ControlPoint = {
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
      radius: defaultRadius.value,
      spiralFactor: defaultSpiralFactor.value
    }
    points.value.push(newPoint)
  }

  const removePoint = (index: number) => {
    if (points.value.length > APP_CONFIG.controlPoints.minPoints) {
      points.value.splice(index, 1)
    }
  }

  const insertPoint = (index: number, point: ControlPoint) => {
    points.value.splice(index, 0, point)
  }

  const updatePoint = (index: number, updates: Partial<ControlPoint>) => {
    if (index >= 0 && index < points.value.length) {
      const point = points.value[index]
      
      // 数値バリデーション
      if (updates.x !== undefined) {
        if (typeof updates.x === 'number' && isFinite(updates.x)) {
          point.x = updates.x
        }
      }
      
      if (updates.y !== undefined) {
        if (typeof updates.y === 'number' && isFinite(updates.y)) {
          point.y = updates.y
        }
      }
      
      if (updates.radius !== undefined) {
        if (typeof updates.radius === 'number' && isFinite(updates.radius) && updates.radius > 0) {
          point.radius = updates.radius
        }
      }
      
      if (updates.spiralFactor !== undefined) {
        if (typeof updates.spiralFactor === 'number' && isFinite(updates.spiralFactor) && updates.spiralFactor > 0) {
          point.spiralFactor = updates.spiralFactor
        }
      }
    }
  }

  const resetPoints = () => {
    if (confirm('制御点をリセットしてもよろしいですか？')) {
      points.value = [
        { x: 100, y: 200, radius: defaultRadius.value, spiralFactor: defaultSpiralFactor.value },
        { x: 300, y: 150, radius: defaultRadius.value, spiralFactor: defaultSpiralFactor.value },
        { x: 500, y: 300, radius: defaultRadius.value, spiralFactor: defaultSpiralFactor.value }
      ]
    }
  }

  const applyDefaultToAll = () => {
    points.value.forEach(point => {
      point.radius = defaultRadius.value
      point.spiralFactor = defaultSpiralFactor.value
    })
  }

  const applyDefaultToAllSimple = () => {
    if (confirm('全ての制御点にデフォルト設定を適用しますか？')) {
      applyDefaultToAll()
    }
  }

  const canRemovePoint = (index: number): boolean => {
    const totalPoints = points.value.length
    if (totalPoints <= APP_CONFIG.controlPoints.minPoints) return false
    
    if (isLoopMode.value) {
      return totalPoints > 2
    } else {
      return index > 0 && index < totalPoints - 1
    }
  }

  // 制御点データの検証
  const validatePoints = () => {
    const validPoints = points.value.filter(point => 
      point && 
      typeof point.x === 'number' && isFinite(point.x) &&
      typeof point.y === 'number' && isFinite(point.y) &&
      typeof point.radius === 'number' && isFinite(point.radius) && point.radius > 0 &&
      typeof point.spiralFactor === 'number' && isFinite(point.spiralFactor) && point.spiralFactor > 0
    )
    
    if (validPoints.length !== points.value.length) {
      logger.curve.warn('Invalid control points detected, filtering out:', points.value.length - validPoints.length)
      points.value = validPoints
    }
    
    return validPoints.length >= APP_CONFIG.controlPoints.minPoints
  }

  const toggleLoopMode = () => {
    isLoopMode.value = !isLoopMode.value
  }

  return {
    // State
    points,
    isLoopMode,
    defaultRadius,
    defaultSpiralFactor,
    
    // Getters
    pointCount,
    canDeletePoints,
    
    // Actions
    addPoint,
    removePoint,
    insertPoint,
    updatePoint,
    resetPoints,
    applyDefaultToAll,
    applyDefaultToAllSimple,
    canRemovePoint,
    validatePoints,
    toggleLoopMode
  }
})
