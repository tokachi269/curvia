<template>
  <BasePanel 
    title="背景画像" 
    v-model:isExpanded="uiStore.sidebarExpanded.background"
    :zIndex="102"
  >
    <PropertyRow>
      <input type="file" ref="imageInput" @change="handleImageLoad" accept="image/*" class="file-input">
      <BaseButton v-if="backgroundStore.backgroundImage" @click="backgroundStore.clearImage" variant="danger">
        削除
      </BaseButton>
    </PropertyRow>
    
    <PropertyRow v-if="backgroundStore.backgroundImage">
      <label class="prop-label">
        <input type="checkbox" v-model="backgroundStore.showBackgroundImage" @change="updateCanvas" class="prop-checkbox">
        <span class="prop-name">画像を表示</span>
      </label>
    </PropertyRow>
    
    <PropertySubgroup v-if="backgroundStore.backgroundImage" title="位置・変形">
      <PropertyRow>
        <label class="prop-name">X座標</label>
        <input type="number" v-model.number="backgroundStore.imageSettings.x" @input="updateCanvas" class="prop-input" step="10">
        <span class="prop-unit">px</span>
      </PropertyRow>
      
      <PropertyRow>
        <label class="prop-name">Y座標</label>
        <input type="number" v-model.number="backgroundStore.imageSettings.y" @input="updateCanvas" class="prop-input" step="10">
        <span class="prop-unit">px</span>
      </PropertyRow>
      
      <PropertyRow>
        <label class="prop-name">スケール</label>
        <input type="number" v-model.number="backgroundStore.imageSettings.scale" @input="updateCanvas" class="prop-input" min="0.1" max="5" step="0.1">
        <span class="prop-unit">×</span>
      </PropertyRow>
      
      <PropertyRow>
        <label class="prop-name">透過度</label>
        <input type="range" v-model.number="backgroundStore.imageSettings.opacity" @input="updateCanvas" class="prop-slider" min="0" max="1" step="0.1">
        <span class="prop-value">{{ Math.round(backgroundStore.imageSettings.opacity * 100) }}%</span>
      </PropertyRow>
      
      <PropertyRow>
        <label class="prop-label">
          <input type="checkbox" v-model="backgroundStore.imageSettings.flipX" @change="updateCanvas" class="prop-checkbox">
          <span class="prop-name">水平反転</span>
        </label>
      </PropertyRow>
      
      <PropertyRow>
        <label class="prop-label">
          <input type="checkbox" v-model="backgroundStore.imageSettings.flipY" @change="updateCanvas" class="prop-checkbox">
          <span class="prop-name">垂直反転</span>
        </label>
      </PropertyRow>
    </PropertySubgroup>
  </BasePanel>
</template>

<script setup lang="ts">
import { ref, defineEmits } from 'vue'
import { useBackgroundStore, useUIStore } from '@/stores'
import BasePanel from '@/components/ui/BasePanel.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import PropertyRow from '@/components/ui/PropertyRow.vue'
import PropertySubgroup from '@/components/ui/PropertySubgroup.vue'

const emit = defineEmits<{
  updateCanvas: []
}>()

const backgroundStore = useBackgroundStore()
const uiStore = useUIStore()
const imageInput = ref<HTMLInputElement | null>(null)

const updateCanvas = () => {
  emit('updateCanvas')
}

// 画像ファイルの読み込み処理
const handleImageLoad = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (backgroundStore.backgroundImage) {
    if (!confirm('現在の画像を新しい画像に変更してもよろしいですか？')) {
      target.value = ''
      return
    }
  }

  try {
    await backgroundStore.loadImage(file)
    updateCanvas()
  } catch (error) {
    console.error('画像読み込みエラー:', error)
    alert('画像の読み込みに失敗しました')
  }
}
</script>

<style scoped>
/* コンポーネント固有のスタイルのみ */
.prop-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  cursor: pointer;
  flex: 1;
}

.prop-name {
  font-size: 11px;
  color: var(--color-text-secondary);
  min-width: 60px;
  flex-shrink: 0;
}

.prop-input {
  background: var(--color-bg-secondary);
  border: var(--border-width) solid var(--color-border-secondary);
  border-radius: var(--border-radius-sm);
  color: var(--color-text-secondary);
  padding: 3px var(--spacing-md);
  font-size: 11px;
  width: 60px;
  flex-shrink: 0;
}

.prop-input:focus {
  outline: none;
  border-color: var(--color-focus);
  background: #fefefe;
}

.prop-checkbox {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--color-primary);
}

.prop-slider {
  flex: 1;
  height: 16px;
  background: var(--color-bg-quaternary);
  border-radius: var(--border-radius-sm);
  accent-color: var(--color-primary);
}

.prop-unit {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  min-width: 20px;
  text-align: right;
}

.prop-value {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  min-width: 30px;
  text-align: right;
}

.file-input {
  font-size: 10px;
  padding: 4px;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  background: #ffffff;
  flex: 1;
}
</style>
