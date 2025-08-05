<template>
  <div :class="['legend-indicator', `indicator-${variant}`, `shape-${shape}`]"></div>
</template>

<script setup lang="ts">
import { withDefaults } from 'vue'

interface Props {
  variant: 'straight' | 'spiral' | 'arc' | 'transition' | 'curve' | 'center'
  shape?: 'line' | 'point'
}

const props = withDefaults(defineProps<Props>(), {
  shape: 'line'
})
</script>

<style scoped>
.legend-indicator {
  flex-shrink: 0;
}

.shape-line {
  width: 12px;
  height: 2px;
  border-radius: 1px;
}

.shape-point {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

/* 曲線色バリエーション */
.indicator-straight {
  background-color: var(--color-curve-straight);
}

.indicator-spiral {
  background-color: var(--color-curve-spiral);
}

.indicator-arc {
  background-color: var(--color-curve-arc);
}

/* 制御点色バリエーション */
.indicator-transition {
  background-color: var(--color-point-transition);
}

.indicator-curve {
  background-color: var(--color-point-curve);
}

.indicator-center {
  background-color: var(--color-point-center);
}
</style>
