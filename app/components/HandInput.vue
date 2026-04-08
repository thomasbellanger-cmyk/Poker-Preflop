<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  isValid: boolean
  normalized: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
  submit: []
}>()

const errorMessage = computed(() => {
  if (!props.modelValue) return undefined
  if (!props.isValid) return 'Format invalide. Exemples : A5s, KTo, 77'
  return undefined
})
</script>

<template>
  <div class="mt-6">
    <UFormField label="Ta main" :error="errorMessage">
      <UInput
        :model-value="modelValue"
        placeholder="Ex : A5s, KTo, 77"
        size="lg"
        class="w-full"
        @update:model-value="$emit('update:modelValue', $event)"
        @keydown.enter="$emit('submit')"
      />
    </UFormField>
    <p v-if="isValid && modelValue" class="text-sm text-green-600 mt-1">
      Main reconnue : {{ normalized }}
    </p>
  </div>
</template>
