/**
 * Composable client : ouvre une connexion EventSource vers /api/live-hand
 * et expose les prédictions et événements de game détectés côté serveur.
 *
 * Types dupliqués depuis server/utils/handHistoryParser.ts car les imports
 * server→client ne sont pas supportés en Nuxt.
 */
import type { StackBB, Position } from '~/types/range'

export interface NextHandPrediction {
  tournamentId: string
  previousHandId: string
  nextPosition: Position
  nextStackBb: StackBB
  nextStackBbExact: number
  nextBlinds: { sb: number, bb: number }
  heroEliminated: boolean
  threeHanded: boolean
}

interface GameStartedPayload {
  type: 'game-started'
  tournamentId: string
  firstHandId: string
}

interface NewHandPayload {
  type: 'new-hand'
  prediction: NextHandPrediction
}

interface PingPayload {
  type: 'ping'
}

type LiveHandPayload = GameStartedPayload | NewHandPayload | PingPayload

export function useLiveHand() {
  const connected = ref(false)
  const lastPrediction = ref<NextHandPrediction | null>(null)
  const lastGameStarted = ref<string | null>(null)
  const lastError = ref<string | null>(null)

  let eventSource: EventSource | null = null

  function handleMessage(raw: string): void {
    let payload: LiveHandPayload
    try {
      payload = JSON.parse(raw) as LiveHandPayload
    } catch {
      return
    }

    if (payload.type === 'game-started') {
      lastGameStarted.value = payload.tournamentId
    } else if (payload.type === 'new-hand') {
      lastPrediction.value = payload.prediction
    }
    // ping : ignoré
  }

  function connect(): void {
    if (!import.meta.client) return
    if (eventSource) return

    try {
      eventSource = new EventSource('/api/live-hand')
      eventSource.onopen = () => {
        connected.value = true
        lastError.value = null
      }
      eventSource.onmessage = (ev) => {
        handleMessage(ev.data)
      }
      eventSource.onerror = () => {
        connected.value = false
        lastError.value = 'Connexion interrompue'
        // EventSource tente de se reconnecter automatiquement
      }
    } catch (err) {
      lastError.value = err instanceof Error ? err.message : String(err)
      connected.value = false
    }
  }

  function disconnect(): void {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    connected.value = false
  }

  onScopeDispose(() => {
    disconnect()
  })

  return {
    connected,
    lastPrediction,
    lastGameStarted,
    lastError,
    connect,
    disconnect
  }
}
