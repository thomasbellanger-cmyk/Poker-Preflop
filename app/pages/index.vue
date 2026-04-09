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
  getHandLabel,
  nextHand,
  gameStarted,
  startGame,
  endGame,
  liveConnected,
  connectLive,
  disconnectLive
} = useRanges()

const toast = useToast()

function toggleLive(): void {
  if (liveConnected.value) {
    disconnectLive()
    toast.add({
      title: 'Winamax déconnecté',
      icon: 'i-lucide-unplug',
      color: 'neutral'
    })
  } else {
    connectLive()
    toast.add({
      title: 'Winamax connecté',
      description: 'Détection automatique des mains activée',
      icon: 'i-lucide-plug',
      color: 'success'
    })
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <div class="max-w-7xl mx-auto py-8 px-4">
      <h1 class="text-3xl font-bold text-center mb-1">
        Nitro Ranges
      </h1>
      <p class="text-center text-gray-500 mb-4">
        Outil de décision preflop poker
      </p>

      <div class="flex flex-wrap items-center justify-center gap-3 mb-6">
        <UButton
          :color="liveConnected ? 'success' : 'neutral'"
          :variant="liveConnected ? 'soft' : 'outline'"
          :icon="liveConnected ? 'i-lucide-radio' : 'i-lucide-radio-tower'"
          size="sm"
          @click="toggleLive"
        >
          {{ liveConnected ? 'Winamax connecté' : 'Connecter Winamax' }}
        </UButton>

        <UBadge
          :color="liveConnected ? 'success' : 'neutral'"
          :variant="liveConnected ? 'subtle' : 'outline'"
          size="md"
          :icon="liveConnected ? 'i-lucide-plug' : 'i-lucide-unplug'"
        >
          Winamax : {{ liveConnected ? 'connecté' : 'déconnecté' }}
        </UBadge>

        <UBadge
          :color="gameStarted ? 'primary' : 'neutral'"
          :variant="gameStarted ? 'subtle' : 'outline'"
          size="md"
          :icon="gameStarted ? 'i-lucide-play-circle' : 'i-lucide-pause-circle'"
        >
          Partie : {{ gameStarted ? 'en cours' : 'pas commencée' }}
        </UBadge>
      </div>

      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Colonne gauche : situation + matrice -->
        <div class="lg:w-1/2 xl:w-[55%] space-y-4">
          <SituationSelector
            v-model:stack-bb="stackBb"
            v-model:position="position"
            v-model:spot="spot"
            :available-spots="availableSpots"
            :game-started="gameStarted"
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

          <UButton
            v-if="!gameStarted"
            block
            size="xl"
            color="primary"
            icon="i-lucide-play"
            class="mt-6"
            @click="startGame"
          >
            Commencer la partie
          </UButton>

          <template v-else>
            <UButton
              block
              size="xl"
              color="primary"
              icon="i-lucide-arrow-right"
              class="mt-6"
              @click="nextHand"
            >
              Main suivante
            </UButton>

            <UButton
              block
              size="sm"
              color="neutral"
              variant="ghost"
              icon="i-lucide-square"
              class="mt-2"
              @click="endGame"
            >
              Terminer la partie
            </UButton>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
