<script setup lang="ts">
import type { StackBB, Position } from '~/types/range'

const props = defineProps<{
  stackBb: StackBB
  position: Position
  spot: string
  availableSpots: string[]
  gameStarted: boolean
}>()

const emit = defineEmits<{
  'update:stackBb': [value: StackBB]
  'update:position': [value: Position]
  'update:spot': [value: string]
}>()

const stackItems = [
  { label: '15bb', value: 15 },
  { label: '10bb', value: 10 },
  { label: '7bb', value: 7 }
]

const positionItems = [
  { label: 'BTN', value: 'BTN' as Position },
  { label: 'SB', value: 'SB' as Position },
  { label: 'BB', value: 'BB' as Position }
]

const spotItems = computed(() =>
  props.availableSpots.map(s => ({ label: s, value: s }))
)

</script>

<template>
  <div class="space-y-4">
    <UFormField label="Stack effectif (BB)">
      <UTabs
        :model-value="stackBb"
        :items="stackItems"
        variant="pill"
        :content="false"
        class="w-full"
        @update:model-value="emit('update:stackBb', Number($event) as StackBB)"
      />
    </UFormField>

    <UFormField label="Position">
      <UTabs
        v-if="!gameStarted"
        :model-value="position"
        :items="positionItems"
        variant="pill"
        :content="false"
        class="w-full"
        @update:model-value="emit('update:position', $event as Position)"
      />
      <div
        v-else
        class="flex items-center justify-center px-4 py-3 rounded-lg bg-primary-100 dark:bg-primary-950 border border-primary-300 dark:border-primary-800"
      >
        <span class="text-2xl font-bold text-primary-700 dark:text-primary-300">
          {{ position }}
        </span>
      </div>
    </UFormField>

    <UFormField label="Spot">
      <UTabs
        :model-value="spot"
        :items="spotItems"
        variant="pill"
        :content="false"
        class="w-full"
        @update:model-value="emit('update:spot', String($event))"
      />
    </UFormField>
  </div>
</template>
