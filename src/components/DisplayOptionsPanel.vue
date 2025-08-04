<template>
  <BasePanel 
    title="表示オプション" 
    v-model:isExpanded="uiStore.sidebarExpanded.display"
    :zIndex="103"
  >
    <PropertyRow>
      <label class="prop-label">
        <input type="checkbox" v-model="showGrid" @change="updateCanvas" class="prop-checkbox">
        <span class="prop-name">グリッド表示</span>
      </label>
    </PropertyRow>
    
    <PropertyRow>
      <label class="prop-label">
        <input type="checkbox" v-model="lineOnlyMode" @change="updateCanvas" class="prop-checkbox">
        <span class="prop-name">線のみ表示</span>
      </label>
    </PropertyRow>
    
    <PropertyRow>
      <label class="prop-label">
        <input type="checkbox" v-model="fillInsideMode" @change="updateCanvas" class="prop-checkbox">
        <span class="prop-name">曲線内塗りつぶし</span>
      </label>
    </PropertyRow>
    
    <PropertyRow>
      <label class="prop-label">
        <input type="checkbox" v-model="showConnectionLines" @change="updateCanvas" :disabled="lineOnlyMode" class="prop-checkbox">
        <span class="prop-name">制御点間点線</span>
      </label>
    </PropertyRow>
    
    <PropertyRow>
      <label class="prop-label">
        <input type="checkbox" v-model="debugMode" @change="updateCanvas" class="prop-checkbox">
        <span class="prop-name">デバッグモード</span>
      </label>
    </PropertyRow>
  </BasePanel>
</template>

<script setup lang="ts">
import { computed, defineEmits } from 'vue'
import { useCanvasStore, useUIStore } from '@/stores'
import BasePanel from '@/components/ui/BasePanel.vue'
import PropertyRow from '@/components/ui/PropertyRow.vue'

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

.prop-checkbox {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--color-primary);
}

.prop-checkbox:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
