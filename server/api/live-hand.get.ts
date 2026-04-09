/**
 * Endpoint SSE : stream les events du hh-watcher vers les clients connectés.
 *
 * Usage côté client :
 *   const es = new EventSource('/api/live-hand')
 *   es.onmessage = (ev) => { const data = JSON.parse(ev.data); ... }
 */
import { hhEventBus, type HhEvent } from '../utils/hhEventBus'

export default defineEventHandler(async (event) => {
  const stream = createEventStream(event)

  const unsubscribe = hhEventBus.onEvent((hhEvent: HhEvent) => {
    stream.push(JSON.stringify(hhEvent))
  })

  // Ping toutes les 30s pour garder la connexion ouverte et détecter les déconnexions
  const pingInterval = setInterval(() => {
    stream.push(JSON.stringify({ type: 'ping' })).catch(() => {
      // connexion fermée, on nettoie
      clearInterval(pingInterval)
      unsubscribe()
    })
  }, 30000)

  // Nettoyage quand le client se déconnecte
  stream.onClosed(() => {
    clearInterval(pingInterval)
    unsubscribe()
  })

  return stream.send()
})
