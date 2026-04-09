/**
 * Endpoint de debug : parse le fichier hand history Winamax le plus récent
 * (ou celui passé en query param) et retourne le résultat du parser.
 *
 * Usage :
 *   GET /api/debug-parse                    -> dernier fichier Expresso
 *   GET /api/debug-parse?file=<filename>    -> fichier précis (dans HH_DIR)
 *   GET /api/debug-parse?limit=10           -> limite le nombre de mains renvoyées
 *   GET /api/debug-parse?tail=1             -> ne renvoie que la dernière main
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  parseAllHands,
  computeFinalStacks,
  predictNextHand,
  extractTournamentId
} from '../utils/handHistoryParser'

const HH_DIR = 'C:/Users/Tomvi/AppData/Roaming/winamax/documents/accounts/StormSand921/history'
const HERO = 'StormSand921'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const explicitFile = typeof query.file === 'string' ? query.file : undefined
  const limit = typeof query.limit === 'string' ? Number(query.limit) : undefined
  const tailOnly = query.tail === '1' || query.tail === 'true'

  let targetFile: string
  if (explicitFile) {
    targetFile = explicitFile
  } else {
    let files: Array<{ name: string, mtime: number }>
    try {
      files = readdirSync(HH_DIR)
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
    } catch (err) {
      return {
        error: 'Impossible de lire le dossier hand history',
        path: HH_DIR,
        details: err instanceof Error ? err.message : String(err)
      }
    }

    if (files.length === 0) {
      return {
        error: 'Aucun fichier Expresso trouvé',
        path: HH_DIR
      }
    }
    targetFile = files[0]!.name
  }

  let content: string
  try {
    content = readFileSync(join(HH_DIR, targetFile), 'utf8')
  } catch (err) {
    return {
      error: 'Impossible de lire le fichier',
      file: targetFile,
      details: err instanceof Error ? err.message : String(err)
    }
  }

  const allHands = parseAllHands(content, HERO)
  const tournamentId = extractTournamentId(targetFile) ?? 'unknown'

  let hands = allHands
  if (tailOnly) {
    hands = allHands.slice(-1)
  } else if (limit && limit > 0) {
    hands = allHands.slice(-limit)
  }

  return {
    file: targetFile,
    hero: HERO,
    tournamentId,
    totalHandsInFile: allHands.length,
    returnedHands: hands.length,
    hands: hands.map((h) => {
      const finalStacks = computeFinalStacks(h)
      const prediction = predictNextHand(h, finalStacks, tournamentId)
      return {
        handId: h.handId,
        timestamp: h.timestamp,
        sb: h.sb,
        bb: h.bb,
        buttonSeat: h.buttonSeat,
        seats: h.seats.map(s => ({
          seat: s.seat,
          name: s.name,
          initialStack: s.initialStack,
          finalStack: finalStacks.get(s.name) ?? 0
        })),
        heroStack: h.heroStack,
        heroStackBbExact: Math.round(h.heroStackBb * 10) / 10,
        stackBbEffective: h.stackBbEffective,
        position: h.heroPosition,
        cards: h.heroCards,
        rawCards: h.rawCards,
        spotKey: h.spotKey,
        suggestedSpotNames: h.suggestedSpotNames,
        actionsBeforeHero: h.actionsBeforeHero.map(
          a => `${a.player} ${a.type}${a.amount !== undefined ? ' ' + a.amount : ''}`
        ),
        fullPreflop: h.preflopActions.map(
          a => `${a.player} ${a.type}${a.amount !== undefined ? ' ' + a.amount : ''}`
        ),
        prediction: {
          nextPosition: prediction.nextPosition,
          nextStackBb: prediction.nextStackBb,
          nextStackBbExact: Math.round(prediction.nextStackBbExact * 10) / 10,
          nextBlinds: prediction.nextBlinds,
          heroEliminated: prediction.heroEliminated,
          threeHanded: prediction.threeHanded
        }
      }
    })
  }
})
