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
        :model-value="position"
        :items="positionItems"
        variant="pill"
        :content="false"
        class="w-full"
        @update:model-value="emit('update:position', $event as Position)"
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
