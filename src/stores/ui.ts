import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SidebarExpanded } from '@/types'

export const useUIStore = defineStore('ui', () => {
  // State
  const sidebarExpanded = ref<SidebarExpanded>({
    display: true,
    background: true,
    controls: true
  })
  
  const showDefaultSettings = ref(false)

  // Actions
  const toggleSidebarSection = (section: keyof SidebarExpanded) => {
    sidebarExpanded.value[section] = !sidebarExpanded.value[section]
  }

  const expandAllSections = () => {
    sidebarExpanded.value.display = true
    sidebarExpanded.value.background = true
    sidebarExpanded.value.controls = true
  }

  const collapseAllSections = () => {
    sidebarExpanded.value.display = false
    sidebarExpanded.value.background = false
    sidebarExpanded.value.controls = false
  }

  const toggleDefaultSettings = () => {
    showDefaultSettings.value = !showDefaultSettings.value
  }

  return {
    // State
    sidebarExpanded,
    showDefaultSettings,
    
    // Actions
    toggleSidebarSection,
    expandAllSections,
    collapseAllSections,
    toggleDefaultSettings
  }
})
