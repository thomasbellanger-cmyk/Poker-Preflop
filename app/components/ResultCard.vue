<script setup lang="ts">
import type { RangeResult } from '~/types/range'
import { ACTION_COLORS } from '~/types/range'

const props = defineProps<{
  result: RangeResult
  hand: string
  isDefaultFold: boolean
  isPrimary: boolean
}>()

const actionColor = computed(() => ACTION_COLORS[props.result.actionType] as any)

const actionTextClass = computed(() => {
  const colorMap: Record<string, string> = {
    green: 'text-green-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
    orange: 'text-orange-600',
    neutral: 'text-gray-500'
  }
  return colorMap[ACTION_COLORS[props.result.actionType]] || 'text-gray-500'
})
</script>

<template>
  <UCard :class="{ 'opacity-75': !isPrimary }">
    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <UBadge :color="actionColor" size="lg">
          {{ result.action }}
        </UBadge>
        <span v-if="isDefaultFold" class="text-sm text-gray-500">
          (fold par défaut)
        </span>
      </div>

      <p :class="isPrimary ? 'text-lg font-medium' : 'text-base'">
        Avec <span class="font-mono font-bold">{{ hand }}</span>,
        tu dois <span :class="actionTextClass" class="font-bold">{{ result.action }}</span>
      </p>

      <div v-if="result.hands" class="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
        <p class="text-xs text-gray-500 mb-1">Range complète :</p>
        <p class="font-mono text-sm break-all">{{ result.hands }}</p>
      </div>

      <p v-if="result.notes" class="text-sm text-gray-600 dark:text-gray-400 italic">
        {{ result.notes }}
      </p>
    </div>
  </UCard>
</template>
