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
  matrixActions,
  getHandLabel
} = useRanges()
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <div class="max-w-7xl mx-auto py-8 px-4">
      <h1 class="text-3xl font-bold text-center mb-1">
        Nitro Ranges
      </h1>
      <p class="text-center text-gray-500 mb-6">
        Outil de décision preflop poker
      </p>

      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Colonne gauche : situation + matrice -->
        <div class="lg:w-1/2 xl:w-[55%] space-y-4">
          <SituationSelector
            v-model:stack-bb="stackBb"
            v-model:position="position"
            v-model:spot="spot"
            :available-spots="availableSpots"
          />

          <HandMatrix
            :matrix-actions="matrixActions"
            :selected-hand="normalizedHand"
            :get-hand-label="getHandLabel"
            @select-hand="handInput = $event"
          />
        </div>

        <!-- Colonne droite : saisie main + résultats -->
        <div class="lg:w-1/2 xl:w-[45%]">
          <HandInput
            v-model="handInput"
            :is-valid="isHandValid"
            :normalized="normalizedHand"
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
    </div>
  </div>
</template>
