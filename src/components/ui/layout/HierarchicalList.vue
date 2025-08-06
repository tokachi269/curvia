<!-- HierarchicalList.vue - 汎用階層リストコンポーネント -->
<template>
  <div class="hierarchical-list">
    <!-- ヘッダー（オプション） -->
    <div v-if="$slots.header || title" class="list-header">
      <slot name="header">
        <div class="header-content">
          <span v-if="title" class="list-title">{{ title }}</span>
          <span v-if="itemCount !== undefined" class="item-count">{{ itemCount }}</span>
        </div>
      </slot>
    </div>
    
    <!-- アイテムリスト -->
    <div class="list-items">
      <ListItem 
        v-for="(item, index) in items" 
        :key="getItemKey(item, index)"
        :expandable="isExpandable(item, index)"
        :defaultExpanded="getDefaultExpanded(item, index)"
        :class="getItemClass(item, index)"
        @click="handleItemClick(item, index)"
      >
        <!-- アイテムメインコンテンツ -->
        <template #main>
          <slot name="item" :item="item" :index="index">
            <div class="default-item-content">{{ item.name || item.label || `Item ${index + 1}` }}</div>
          </slot>
        </template>

        <!-- アイテムアクション -->
        <template #actions>
          <slot name="item-actions" :item="item" :index="index" :isSelected="isItemSelected(item, index)">
          </slot>
        </template>

        <!-- 子アイテム（展開コンテンツ） -->
        <template #expanded v-if="hasChildren(item)">
          <div class="children-container">
            <ListItem 
              v-for="(child, childIndex) in getChildren(item)" 
              :key="getChildKey(child, childIndex, index)"
              :expandable="isChildExpandable(child, childIndex, item)"
              :isNested="true"
              :class="getChildClass(child, childIndex, item, index)"
              @click="handleChildClick(child, childIndex, item, index)"
            >
              <!-- 子アイテムメインコンテンツ -->
              <template #main>
                <slot name="child" :child="child" :childIndex="childIndex" :parent="item" :parentIndex="index">
                  <div class="default-child-content">{{ child.name || child.label || `Child ${childIndex + 1}` }}</div>
                </slot>
              </template>

              <!-- 子アイテムアクション -->
              <template #actions>
                <slot name="child-actions" 
                  :child="child" 
                  :childIndex="childIndex" 
                  :parent="item" 
                  :parentIndex="index"
                  :isSelected="isChildSelected(child, childIndex, item, index)"
                >
                </slot>
              </template>

              <!-- 子アイテム展開コンテンツ -->
              <template #expanded v-if="isChildExpandable(child, childIndex, item)">
                <slot name="child-expanded" 
                  :child="child" 
                  :childIndex="childIndex" 
                  :parent="item" 
                  :parentIndex="index"
                >
                </slot>
              </template>
            </ListItem>
          </div>
        </template>
      </ListItem>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ListItem from './ListItem.vue'

interface HierarchicalItem {
  id?: string | number
  name?: string
  label?: string
  children?: any[]
  [key: string]: any
}

interface Props {
  items: HierarchicalItem[]
  title?: string
  itemCount?: number
  selectedItemId?: string | number
  selectedChildId?: string | number
  keyProperty?: string
  childrenProperty?: string
  expandableItems?: boolean | ((item: any, index: number) => boolean)
  expandableChildren?: boolean | ((child: any, childIndex: number, parent: any) => boolean)
  defaultExpanded?: boolean | ((item: any, index: number) => boolean)
}

const props = withDefaults(defineProps<Props>(), {
  keyProperty: 'id',
  childrenProperty: 'children',
  expandableItems: true,
  expandableChildren: false,
  defaultExpanded: true
})

const emit = defineEmits<{
  itemClick: [item: any, index: number]
  childClick: [child: any, childIndex: number, parent: any, parentIndex: number]
}>()

// アイテムキー取得
const getItemKey = (item: any, index: number) => {
  return item[props.keyProperty] || `item-${index}`
}

const getChildKey = (child: any, childIndex: number, parentIndex: number) => {
  return child[props.keyProperty] || `child-${parentIndex}-${childIndex}`
}

// 展開可能判定
const isExpandable = (item: any, index: number) => {
  if (typeof props.expandableItems === 'function') {
    return props.expandableItems(item, index)
  }
  return props.expandableItems && hasChildren(item)
}

const isChildExpandable = (child: any, childIndex: number, parent: any) => {
  if (typeof props.expandableChildren === 'function') {
    return props.expandableChildren(child, childIndex, parent)
  }
  return props.expandableChildren
}

// デフォルト展開状態
const getDefaultExpanded = (item: any, index: number) => {
  if (typeof props.defaultExpanded === 'function') {
    return props.defaultExpanded(item, index)
  }
  return props.defaultExpanded
}

// 子要素関連
const hasChildren = (item: any) => {
  const children = item[props.childrenProperty]
  return Array.isArray(children) && children.length > 0
}

const getChildren = (item: any) => {
  return item[props.childrenProperty] || []
}

// 選択状態判定
const isItemSelected = (item: any, index: number) => {
  return props.selectedItemId === getItemKey(item, index)
}

const isChildSelected = (child: any, childIndex: number, parent: any, parentIndex: number) => {
  return props.selectedChildId === getChildKey(child, childIndex, parentIndex)
}

// CSSクラス取得
const getItemClass = (item: any, index: number) => {
  return {
    'list-item': true,
    'selected-item': isItemSelected(item, index)
  }
}

const getChildClass = (child: any, childIndex: number, parent: any, parentIndex: number) => {
  return {
    'list-child': true,
    'selected-child': isChildSelected(child, childIndex, parent, parentIndex)
  }
}

// イベントハンドラー
const handleItemClick = (item: any, index: number) => {
  emit('itemClick', item, index)
}

const handleChildClick = (child: any, childIndex: number, parent: any, parentIndex: number) => {
  emit('childClick', child, childIndex, parent, parentIndex)
}
</script>

<style scoped>
/* 階層リストのスタイル */
.hierarchical-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

/* ヘッダー */
.list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--color-bg-tertiary);
    border-radius: var(--border-radius-sm);
    border: var(--border-width) solid var(--color-border-secondary);
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.list-title {
    font-weight: 600;
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
}

.item-count {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    background: var(--color-bg-primary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius-xs);
    border: var(--border-width) solid var(--color-border-primary);
}

/* リストアイテム */
.list-items {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

/* 選択状態 */
.selected-item {
    border-color: var(--color-primary) !important;
    background: var(--color-primary-alpha-10) !important;
}

.selected-child {
    background: var(--color-primary-alpha-10) !important;
    border-color: var(--color-primary) !important;
}

/* 子要素コンテナ */
.children-container {
    padding: var(--spacing-sm) 0;
    border-top: var(--border-width) solid var(--color-border-tertiary);
    background: var(--color-bg-secondary);
}

/* デフォルトコンテンツ */
.default-item-content,
.default-child-content {
    padding: var(--spacing-md);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
}

/* ネストされたアイテムのスタイル調整 */
:deep(.list-child.is-nested) {
    margin-left: var(--spacing-lg);
    border-left: 2px solid var(--color-border-tertiary);
}
</style>
