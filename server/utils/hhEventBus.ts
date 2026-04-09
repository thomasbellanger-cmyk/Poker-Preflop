/**
 * Event bus partagé entre le watcher de hand history (server/plugins/hh-watcher.ts)
 * et l'endpoint SSE (server/api/live-hand.get.ts).
 *
 * Le watcher émet des events à chaque nouvelle main/tournoi détecté, et l'endpoint
 * SSE les propage vers les clients connectés.
 */
import { EventEmitter } from 'node:events'
import type { NextHandPrediction } from './handHistoryParser'

export interface GameStartedEvent {
  type: 'game-started'
  tournamentId: string
  firstHandId: string
}

export interface NewHandEvent {
  type: 'new-hand'
  prediction: NextHandPrediction
}

export type HhEvent = GameStartedEvent | NewHandEvent

class HhEventBus extends EventEmitter {
  emitGameStarted(payload: GameStartedEvent): void {
    this.emit('hh-event', payload)
  }

  emitNewHand(payload: NewHandEvent): void {
    this.emit('hh-event', payload)
  }

  onEvent(listener: (event: HhEvent) => void): () => void {
    this.on('hh-event', listener)
    return () => this.off('hh-event', listener)
  }
}

// Singleton partagé pour tout le process Nitro.
export const hhEventBus = new HhEventBus()
// Nitro peut instancier ce module plusieurs fois en dev ; augmente la limite.
hhEventBus.setMaxListeners(50)
