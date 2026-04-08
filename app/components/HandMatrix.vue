<script setup lang="ts">
import type { Action } from '~/types/range'

const props = defineProps<{
  matrixActions: Action[][]
  selectedHand: string
  getHandLabel: (row: number, col: number) => string
}>()

const emit = defineEmits<{
  selectHand: [hand: string]
}>()

const cells = computed(() => {
  const result: { row: number; col: number; label: string }[] = []
  for (let row = 0; row < 13; row++) {
    for (let col = 0; col < 13; col++) {
      result.push({ row, col, label: props.getHandLabel(row, col) })
    }
  }
  return result
})

const bgClasses: Record<Action, string> = {
  'shove': 'bg-green-200 dark:bg-green-900/60 text-green-900 dark:text-green-100',
  '3-bet jam': 'bg-red-200 dark:bg-red-900/60 text-red-900 dark:text-red-100',
  'call': 'bg-blue-200 dark:bg-blue-900/60 text-blue-900 dark:text-blue-100',
  'raise': 'bg-orange-200 dark:bg-orange-900/60 text-orange-900 dark:text-orange-100',
  'fold': 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
}

function getCellClasses(row: number, col: number): string {
  const action = props.matrixActions[row]?.[col] ?? 'fold'
  const hand = props.getHandLabel(row, col)
  const isSelected = hand === props.selectedHand
  const bg = bgClasses[action]
  const ring = isSelected ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-950 z-10' : ''
  return `${bg} ${ring}`
}
</script>

<template>
  <div>
    <div class="grid grid-cols-13 gap-px bg-gray-300 dark:bg-gray-700 rounded-lg overflow-hidden">
      <button
        v-for="cell in cells"
        :key="cell.label"
        :class="getCellClasses(cell.row, cell.col)"
        class="relative aspect-square flex items-center justify-center text-[10px] sm:text-xs font-mono font-medium cursor-pointer hover:brightness-90 transition-all"
        @click="emit('selectHand', cell.label)"
      >
        {{ cell.label }}
      </button>
    </div>

    <div class="flex flex-wrap gap-3 mt-3 text-xs text-gray-600 dark:text-gray-400">
      <div class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded bg-green-200 dark:bg-green-900/60" />
        <span>Shove</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded bg-red-200 dark:bg-red-900/60" />
        <span>3-bet jam</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded bg-blue-200 dark:bg-blue-900/60" />
        <span>Call</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded bg-orange-200 dark:bg-orange-900/60" />
        <span>Raise</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800" />
        <span>Fold</span>
      </div>
    </div>
  </div>
</template>
