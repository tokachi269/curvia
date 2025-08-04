import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ImageSettings } from '@/types'
import { APP_CONFIG } from '@/config/app'

export const useBackgroundStore = defineStore('background', () => {
  // State
  const backgroundImage = ref<HTMLImageElement | null>(null)
  const showBackgroundImage = ref(false)
  const imageSettings = ref<ImageSettings>({
    x: 0,
    y: 0,
    scale: APP_CONFIG.backgroundImage.defaultScale,
    opacity: APP_CONFIG.backgroundImage.defaultOpacity,
    flipX: false,
    flipY: false
  })

  // Actions
  const loadImage = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      // ファイルサイズチェック
      if (file.size > APP_CONFIG.backgroundImage.maxFileSize) {
        reject(new Error(`ファイルサイズが大きすぎます。最大${APP_CONFIG.backgroundImage.maxFileSize / 1024 / 1024}MBまでです。`))
        return
      }

      // ファイルタイプチェック
      if (!APP_CONFIG.backgroundImage.allowedTypes.includes(file.type as any)) {
        reject(new Error('サポートされていないファイル形式です。JPEG、PNG、GIF、WebPのみ対応しています。'))
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          backgroundImage.value = img
          showBackgroundImage.value = true
          // 画像の中央に配置
          imageSettings.value.x = -img.width / 2
          imageSettings.value.y = -img.height / 2
          resolve()
        }
        img.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'))
      reader.readAsDataURL(file)
    })
  }

  const clearImage = () => {
    if (confirm('背景画像を削除してもよろしいですか？')) {
      backgroundImage.value = null
      showBackgroundImage.value = false
      resetImageSettings()
    }
  }

  const resetImageSettings = () => {
    imageSettings.value = {
      x: 0,
      y: 0,
      scale: 1.0,
      opacity: 0.5,
      flipX: false,
      flipY: false
    }
  }

  const updateImageSettings = (updates: Partial<ImageSettings>) => {
    Object.assign(imageSettings.value, updates)
  }

  const toggleShowBackgroundImage = () => {
    showBackgroundImage.value = !showBackgroundImage.value
  }

  return {
    // State
    backgroundImage,
    showBackgroundImage,
    imageSettings,
    
    // Actions
    loadImage,
    clearImage,
    resetImageSettings,
    updateImageSettings,
    toggleShowBackgroundImage
  }
})
