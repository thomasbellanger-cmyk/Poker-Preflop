<script setup lang="ts">
import type { StackBB, Position } from '~/types/range'

const props = defineProps<{
  stackBb: StackBB
  position: Position
  spot: string
  availableSpots: string[]
}>()

const emit = defineEmits<{
  'update:stackBb': [value: StackBB]
  'update:position': [value: Position]
  'update:spot': [value: string]
}>()

const stackOptions = [
  { label: '15bb (12–15bb)', value: 15 },
  { label: '10bb (8–11bb)', value: 10 },
  { label: '7bb (≤7bb)', value: 7 }
]

const positionOptions = [
  { label: 'BTN (Bouton)', value: 'BTN' as Position },
  { label: 'SB (Small Blind)', value: 'SB' as Position },
  { label: 'BB (Big Blind)', value: 'BB' as Position }
]

const spotItems = computed(() =>
  props.availableSpots.map(s => ({ label: s, value: s }))
)
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Stack effectif (BB)">
      <USelect
        :model-value="stackBb"
        :items="stackOptions"
        value-key="value"
        class="w-full"
        @update:model-value="emit('update:stackBb', $event)"
      />
    </UFormField>

    <UFormField label="Position">
      <USelect
        :model-value="position"
        :items="positionOptions"
        value-key="value"
        class="w-full"
        @update:model-value="emit('update:position', $event)"
      />
    </UFormField>

    <UFormField label="Spot">
      <USelect
        :model-value="spot"
        :items="spotItems"
        value-key="value"
        class="w-full"
        @update:model-value="emit('update:spot', $event)"
      />
    </UFormField>
  </div>
</template>
