<template>
  <Transition name="error-toast">
    <div v-if="error" class="error-toast" @click="clearError">
      <div class="error-icon">⚠️</div>
      <div class="error-content">
        <div class="error-title">エラー</div>
        <div class="error-message">{{ error }}</div>
      </div>
      <button class="error-close" @click.stop="clearError">×</button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// Props
interface Props {
  autoHide?: boolean
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoHide: true,
  duration: 5000
})

// State
const error = ref<string | null>(null)
let hideTimer: number | null = null

// Methods
const showError = (message: string) => {
  error.value = message
  
  if (props.autoHide) {
    clearTimeout(hideTimer!)
    hideTimer = setTimeout(() => {
      clearError()
    }, props.duration)
  }
}

const clearError = () => {
  error.value = null
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

// Global error handler
const handleGlobalError = (event: ErrorEvent) => {
  showError(event.message || '予期しないエラーが発生しました')
}

const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  showError(event.reason?.message || 'ネットワークエラーが発生しました')
}

// Lifecycle
onMounted(() => {
  window.addEventListener('error', handleGlobalError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)
})

onUnmounted(() => {
  window.removeEventListener('error', handleGlobalError)
  window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  if (hideTimer) {
    clearTimeout(hideTimer)
  }
})

// Expose methods
defineExpose({
  showError,
  clearError
})
</script>

<style scoped>
.error-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background: var(--bg-primary);
  border: 1px solid var(--color-danger);
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 12px var(--shadow-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg) var(--spacing-xl);
  max-width: 400px;
  cursor: pointer;
  user-select: none;
}

.error-icon {
  font-size: var(--font-size-lg);
  flex-shrink: 0;
}

.error-content {
  flex: 1;
  min-width: 0;
}

.error-title {
  font-weight: var(--font-weight-semibold);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin-bottom: 2px;
}

.error-message {
  color: var(--text-color);
  font-size: var(--font-size-sm);
  line-height: 1.4;
  word-wrap: break-word;
}

.error-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: var(--font-size-lg);
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color var(--transition-fast);
}

.error-close:hover {
  background: var(--hover-bg);
  color: var(--text-color);
}

/* Toast animations */
.error-toast-enter-active,
.error-toast-leave-active {
  transition: all 0.3s ease;
}

.error-toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.error-toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
