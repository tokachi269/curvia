import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ControlPoint } from '@/types'
import { APP_CONFIG } from '@/config/app'

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
      Object.assign(point, updates)
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
    toggleLoopMode
  }
})
