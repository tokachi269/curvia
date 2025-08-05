<template>
  <BasePanel 
    title="表示オプション" 
    v-model:isExpanded="uiStore.sidebarExpanded.display"
    :zIndex="103"
  >
    <PropertyRow>
      <BaseCheckbox 
        v-model="showGrid" 
        @change="updateCanvas" 
        label="グリッド表示"
      />
    </PropertyRow>
    
    <PropertyRow>
      <BaseCheckbox 
        v-model="lineOnlyMode" 
        @change="updateCanvas" 
        label="線のみ表示"
      />
    </PropertyRow>
    
    <PropertyRow>
      <BaseCheckbox 
        v-model="fillInsideMode" 
        @change="updateCanvas" 
        label="曲線内塗りつぶし"
      />
    </PropertyRow>
    
    <PropertyRow>
      <BaseCheckbox 
        v-model="showConnectionLines" 
        @change="updateCanvas" 
        :disabled="lineOnlyMode" 
        label="制御点間点線"
      />
    </PropertyRow>
    
    <PropertyRow>
      <BaseCheckbox 
        v-model="debugMode" 
        @change="updateCanvas" 
        label="デバッグモード"
      />
    </PropertyRow>
  </BasePanel>
</template>

<script setup lang="ts">
import { computed, defineEmits } from 'vue'
import { useCanvasStore, useUIStore } from '@/stores'
import { BasePanel, BaseCheckbox, PropertyRow } from '@/components/ui'

const emit = defineEmits<{
  updateCanvas: []
}>()

const canvasStore = useCanvasStore()
const uiStore = useUIStore()

// リアクティブな状態として個別に取得
const showGrid = computed({
  get: () => canvasStore.showGrid,
  set: (value: boolean) => {
    canvasStore.showGrid = value
  }
})

const lineOnlyMode = computed({
  get: () => canvasStore.lineOnlyMode,
  set: (value: boolean) => {
    canvasStore.lineOnlyMode = value
  }
})

const fillInsideMode = computed({
  get: () => canvasStore.fillInsideMode,
  set: (value: boolean) => {
    canvasStore.fillInsideMode = value
  }
})

const showConnectionLines = computed({
  get: () => canvasStore.showConnectionLines,
  set: (value: boolean) => {
    canvasStore.showConnectionLines = value
  }
})

const debugMode = computed({
  get: () => canvasStore.debugMode,
  set: (value: boolean) => {
    canvasStore.debugMode = value
  }
})

const updateCanvas = () => {
  emit('updateCanvas')
}
</script>

<style scoped>
/* このコンポーネントには固有のスタイルは不要 */
</style>
