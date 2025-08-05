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
      <BaseCheckbox 
        v-model="backgroundStore.showBackgroundImage" 
        @change="updateCanvas" 
        label="画像を表示"
      />
    </PropertyRow>
    
    <PropertySubgroup v-if="backgroundStore.backgroundImage" title="位置・変形">
      <PropertyRow>
        <PropLabel label="X座標" />
        <BaseInput 
          v-model="backgroundStore.imageSettings.x" 
          type="number" 
          :step="10" 
          @input="updateCanvas"
        />
        <PropUnit unit="px" />
      </PropertyRow>
      
      <PropertyRow>
        <PropLabel label="Y座標" />
        <BaseInput 
          v-model="backgroundStore.imageSettings.y" 
          type="number" 
          :step="10" 
          @input="updateCanvas"
        />
        <PropUnit unit="px" />
      </PropertyRow>
      
      <PropertyRow>
        <PropLabel label="スケール" />
        <BaseInput 
          v-model="backgroundStore.imageSettings.scale" 
          type="number" 
          :min="0.1" 
          :max="5" 
          :step="0.1" 
          @input="updateCanvas"
        />
        <PropUnit unit="×" />
      </PropertyRow>
      
      <PropertyRow>
        <PropLabel label="透過度" />
        <BaseSlider 
          v-model="backgroundStore.imageSettings.opacity" 
          :min="0" 
          :max="1" 
          :step="0.1" 
          :formatter="(val) => Math.round(val * 100).toString()"
          unit="%" 
          @input="updateCanvas"
        />
      </PropertyRow>
      
      <PropertyRow>
        <BaseCheckbox 
          v-model="backgroundStore.imageSettings.flipX" 
          @change="updateCanvas" 
          label="水平反転"
        />
      </PropertyRow>
      
      <PropertyRow>
        <BaseCheckbox 
          v-model="backgroundStore.imageSettings.flipY" 
          @change="updateCanvas" 
          label="垂直反転"
        />
      </PropertyRow>
    </PropertySubgroup>
  </BasePanel>
</template>

<script setup lang="ts">
import { ref, defineEmits } from 'vue'
import { useBackgroundStore, useUIStore } from '@/stores'
import { 
  BasePanel, 
  BaseButton, 
  BaseInput, 
  BaseCheckbox, 
  BaseSlider,
  PropertyRow,
  PropertySubgroup,
  PropLabel,
  PropUnit
} from '@/components/ui'

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
.file-input {
  font-size: var(--font-size-xs);
  padding: var(--spacing-xs);
  border: var(--border-width) solid var(--color-border-secondary);
  border-radius: var(--border-radius-sm);
  background: var(--color-bg-primary);
  flex: 1;
}
</style>
