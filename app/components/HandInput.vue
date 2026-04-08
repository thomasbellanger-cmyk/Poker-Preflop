<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  isValid: boolean
  normalized: string
}>()

const errorMessage = computed(() => {
  if (!props.modelValue) return undefined
  if (!props.isValid) return 'Format invalide. Exemples : A5s, KTo, 77'
  return undefined
})
</script>

<template>
  <div>
    <UFormField label="Ta main" :error="errorMessage">
      <UInput
        :model-value="modelValue"
        placeholder="Ex : A5s, KTo, 77"
        size="lg"
        class="w-full"
        @update:model-value="$emit('update:modelValue', $event)"
      />
    </UFormField>
    <p v-if="isValid && modelValue" class="text-sm text-green-600 mt-1">
      Main reconnue : {{ normalized }}
    </p>
  </div>
</template>
