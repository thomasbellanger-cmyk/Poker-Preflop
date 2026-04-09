/**
 * Nitro plugin : surveille le dossier hand history Winamax et émet des events
 * sur le hhEventBus à chaque nouvelle main détectée.
 *
 * Le plugin démarre au boot du serveur Nitro et reste actif tant que le process
 * tourne. Il ne consomme pratiquement aucune ressource quand il n'y a pas d'activité.
 */
import { readFileSync, readdirSync, statSync, watch, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  parseAllHands,
  computeFinalStacks,
  predictNextHand,
  extractTournamentId
} from '../utils/handHistoryParser'
import { hhEventBus } from '../utils/hhEventBus'

const HH_DIR = 'C:/Users/Tomvi/AppData/Roaming/winamax/documents/accounts/StormSand921/history'
const HERO = 'StormSand921'
const DEBOUNCE_MS = 200

interface WatcherState {
  lastTournamentId: string | null
  lastHandId: string | null
}

const state: WatcherState = {
  lastTournamentId: null,
  lastHandId: null
}

let debounceTimer: NodeJS.Timeout | null = null

function findMostRecentExpressoFile(): string | null {
  try {
    const files = readdirSync(HH_DIR)
      .filter(f =>
        f.endsWith('.txt')
        && !f.includes('_summary')
        && f.toLowerCase().includes('expresso')
      )
      .map(f => ({
        name: f,
        mtime: statSync(join(HH_DIR, f)).mtimeMs
      }))
      .sort((a, b) => b.mtime - a.mtime)
    return files[0]?.name ?? null
  } catch {
    return null
  }
}

function processLatestHand(): void {
  const filename = findMostRecentExpressoFile()
  if (!filename) return

  const tournamentId = extractTournamentId(filename)
  if (!tournamentId) return

  let content: string
  try {
    content = readFileSync(join(HH_DIR, filename), 'utf8')
  } catch {
    return
  }

  const hands = parseAllHands(content, HERO)
  if (hands.length === 0) return

  const lastHand = hands[hands.length - 1]!

  // Dédoublonnage : si on a déjà traité cette main, on ignore
  if (state.lastHandId === lastHand.handId) return

  // Détection d'un nouveau tournoi
  const isNewTournament = state.lastTournamentId !== tournamentId
  if (isNewTournament) {
    state.lastTournamentId = tournamentId
    hhEventBus.emitGameStarted({
      type: 'game-started',
      tournamentId,
      firstHandId: hands[0]!.handId
    })
  }

  // Calcul de la prédiction pour la main suivante
  const finalStacks = computeFinalStacks(lastHand)
  const prediction = predictNextHand(lastHand, finalStacks, tournamentId)

  state.lastHandId = lastHand.handId
  hhEventBus.emitNewHand({
    type: 'new-hand',
    prediction
  })
}

function scheduleProcessing(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    processLatestHand()
  }, DEBOUNCE_MS)
}

export default defineNitroPlugin(() => {
  if (!existsSync(HH_DIR)) {
    console.warn(`[hh-watcher] dossier HH introuvable : ${HH_DIR}`)
    return
  }

  try {
    watch(HH_DIR, { persistent: false }, (eventType, filename) => {
      if (!filename) return
      if (!filename.toString().toLowerCase().includes('expresso')) return
      if (filename.toString().includes('_summary')) return
      scheduleProcessing()
    })
    console.log(`[hh-watcher] surveillance active sur ${HH_DIR}`)
  } catch (err) {
    console.error('[hh-watcher] impossible de démarrer le watcher', err)
  }
})
