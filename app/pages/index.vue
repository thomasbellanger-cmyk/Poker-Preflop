<script setup lang="ts">
const {
  stackBb,
  position,
  spot,
  handInput,
  normalizedHand,
  isHandValid,
  availableSpots,
  results,
  noResult,
  findDecision
} = useRanges()
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <div class="max-w-xl mx-auto py-12 px-4">
      <h1 class="text-3xl font-bold text-center mb-2">
        Nitro Ranges
      </h1>
      <p class="text-center text-gray-500 mb-8">
        Outil de décision preflop poker
      </p>

      <SituationSelector
        v-model:stack-bb="stackBb"
        v-model:position="position"
        v-model:spot="spot"
        :available-spots="availableSpots"
      />

      <HandInput
        v-model="handInput"
        :is-valid="isHandValid"
        :normalized="normalizedHand"
        @submit="findDecision"
      />

      <UButton
        label="Voir la décision"
        color="primary"
        size="lg"
        block
        class="mt-6"
        :disabled="!isHandValid || !handInput"
        @click="findDecision"
      />

      <div v-if="results.length > 0" class="mt-6 space-y-4">
        <ResultCard
          v-for="(result, index) in results"
          :key="index"
          :result="result"
          :hand="normalizedHand"
          :is-default-fold="noResult"
          :is-primary="index === 0"
        />
      </div>
    </div>
  </div>
</template>
