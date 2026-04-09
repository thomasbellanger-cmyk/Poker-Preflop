/**
 * Parser de hand history Winamax (format Expresso 3-max).
 *
 * Format attendu (exemple) :
 *
 *   Winamax Poker - Tournament "Expresso Nitro" ... - HandId: #... - Holdem no limit (10/20) - 2026/04/09 19:14:59 UTC
 *   Table: 'Expresso Nitro(1093015247)#0' 3-max (real money) Seat #1 is the button
 *   Seat 1: godavigo (300)
 *   Seat 2: Car_96331122 (300)
 *   Seat 3: StormSand921 (300)
 *   *** ANTE/BLINDS ***
 *   Car_96331122 posts small blind 10
 *   StormSand921 posts big blind 20
 *   Dealt to StormSand921 [Ks 4d]
 *   *** PRE-FLOP ***
 *   godavigo folds
 *   Car_96331122 calls 10
 *   StormSand921 checks
 *   *** FLOP *** ...
 */

export type StackBB = 15 | 10 | 7
export type Position = 'BTN' | 'SB' | 'BB'

export interface ParsedAction {
  player: string
  type: 'fold' | 'check' | 'call' | 'raise' | 'shove'
  amount?: number
}

export type CanonicalSpot =
  | 'BTN_FIRST_IN'
  | 'SB_FIRST_IN_BTN_FOLDED'
  | 'SB_VS_BTN_LIMP'
  | 'SB_VS_BTN_OPEN'
  | 'SB_VS_BTN_SHOVE'
  | 'BB_VS_BTN_OPEN_SB_FOLDED'
  | 'BB_VS_SHOVE'
  | 'BB_LIMPED_POT'
  | 'UNKNOWN'

export interface ParsedSeat {
  seat: number
  name: string
  initialStack: number
}

export interface ParsedHand {
  handId: string
  timestamp: string
  bb: number
  sb: number
  heroName: string
  heroStack: number
  heroStackBb: number
  stackBbEffective: StackBB
  heroPosition: Position
  heroCards: string // Forme normalisée : "AKs", "77", "K4o"
  rawCards: string // Forme brute : "Ks 4d"
  preflopActions: ParsedAction[]
  actionsBeforeHero: ParsedAction[]
  spotKey: CanonicalSpot
  suggestedSpotNames: string[]
  buttonSeat: number
  seats: ParsedSeat[]
  handText: string // Texte brut complet (pour computeFinalStacks)
}

/**
 * Prédiction de la main suivante, calculée à partir de la main N-1 qui vient
 * d'être écrite dans le fichier HH.
 */
export interface NextHandPrediction {
  tournamentId: string
  previousHandId: string
  nextPosition: Position
  nextStackBb: StackBB
  nextStackBbExact: number
  nextBlinds: { sb: number, bb: number }
  heroEliminated: boolean
  threeHanded: boolean // false si un joueur a été éliminé (heads-up non supporté)
}

const RANK_ORDER: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
}

/**
 * Mapping canonical spot → noms possibles dans ranges.json (par ordre de préférence).
 * Si le premier nom n'est pas dispo pour la situation, on essaie le suivant.
 */
export const CANONICAL_TO_SPOT_NAMES: Record<CanonicalSpot, string[]> = {
  BTN_FIRST_IN: ['BTN first-in'],
  SB_FIRST_IN_BTN_FOLDED: ['SB first-in (BTN fold)', 'SB first-in'],
  SB_VS_BTN_LIMP: ['SB vs BTN limp'],
  SB_VS_BTN_OPEN: ['SB vs BTN open'],
  SB_VS_BTN_SHOVE: ['SB vs BTN shove'],
  BB_VS_BTN_OPEN_SB_FOLDED: ['BB vs BTN open (SB fold)', 'BB vs BTN open'],
  BB_VS_SHOVE: ['BB vs shove'],
  BB_LIMPED_POT: [],
  UNKNOWN: []
}

/**
 * Découpe un fichier HH en blocs de mains séparés par une ligne vide.
 * Ne retourne que les blocs valides (qui commencent par "Winamax Poker").
 */
export function splitHands(fileContent: string): string[] {
  const blocks = fileContent.split(/\r?\n\s*\r?\n/)
  return blocks
    .map(b => b.trim())
    .filter(b => b.length > 0 && b.startsWith('Winamax Poker'))
}

/**
 * Parse toutes les mains valides d'un fichier HH complet.
 */
export function parseAllHands(fileContent: string, heroName: string): ParsedHand[] {
  const results: ParsedHand[] = []
  for (const block of splitHands(fileContent)) {
    const parsed = parseHand(block, heroName)
    if (parsed) results.push(parsed)
  }
  return results
}

/**
 * Parse une main unique. Retourne null si le format est invalide ou si hero
 * n'est pas à cette table.
 */
export function parseHand(handText: string, heroName: string): ParsedHand | null {
  const lines = handText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return null

  // === Header ===
  const headerLine = lines[0]!
  if (!headerLine.startsWith('Winamax Poker')) return null

  const handId = headerLine.match(/HandId: #([\w-]+)/)?.[1] ?? 'unknown'

  const blindsMatch = headerLine.match(/\((\d+)\/(\d+)\)/)
  if (!blindsMatch) return null
  const sb = Number(blindsMatch[1])
  const bb = Number(blindsMatch[2])
  if (!bb || bb <= 0) return null

  const timestamp = headerLine.match(/(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}(?: UTC)?)/)?.[1] ?? ''

  // === Table ===
  const tableLine = lines[1] ?? ''
  if (!tableLine.includes('3-max')) return null

  const buttonSeatMatch = tableLine.match(/Seat #(\d+) is the button/)
  if (!buttonSeatMatch) return null
  const buttonSeat = Number(buttonSeatMatch[1])

  // === Seats ===
  // On ne prend que les lignes Seat dans l'en-tête, avant *** ANTE/BLINDS ***
  // pour ne pas confondre avec les lignes du summary.
  const preBlindsEnd = lines.findIndex(l => l.startsWith('*** ANTE/BLINDS ***'))
  const headerEnd = preBlindsEnd === -1 ? lines.length : preBlindsEnd
  const seats: ParsedSeat[] = []
  for (let i = 0; i < headerEnd; i++) {
    const line = lines[i]!
    const m = line.match(/^Seat (\d+): (.+?) \((\d+)(?:, [\d.]+€)?\)/)
    if (m) {
      seats.push({
        seat: Number(m[1]),
        name: m[2]!,
        initialStack: Number(m[3])
      })
    }
  }
  if (seats.length === 0) return null

  const heroSeat = seats.find(s => s.name === heroName)
  if (!heroSeat) return null

  const heroStack = heroSeat.initialStack
  const heroStackBb = heroStack / bb
  const stackBbEffective = roundToStackBb(heroStackBb)

  // === Position via les lignes de blinds ===
  let sbPlayer = ''
  let bbPlayer = ''
  for (const line of lines) {
    const sbMatch = line.match(/^(.+?) posts small blind \d+/)
    if (sbMatch) sbPlayer = sbMatch[1]!
    const bbMatch = line.match(/^(.+?) posts big blind \d+/)
    if (bbMatch) bbPlayer = bbMatch[1]!
  }

  let heroPosition: Position
  if (heroName === sbPlayer) heroPosition = 'SB'
  else if (heroName === bbPlayer) heroPosition = 'BB'
  else heroPosition = 'BTN'

  // === Cartes de hero ===
  const dealtRegex = new RegExp(`^Dealt to ${escapeRegex(heroName)} \\[([^\\]]+)\\]`)
  let rawCards = ''
  for (const line of lines) {
    const m = line.match(dealtRegex)
    if (m) {
      rawCards = m[1]!
      break
    }
  }
  if (!rawCards) return null
  const heroCards = normalizeCards(rawCards)

  // === Actions préflop ===
  const preflopStart = lines.findIndex(l => l.startsWith('*** PRE-FLOP'))
  if (preflopStart === -1) return null

  let preflopEnd = lines.length
  for (let i = preflopStart + 1; i < lines.length; i++) {
    if (lines[i]!.startsWith('*** ')) {
      preflopEnd = i
      break
    }
  }
  const preflopLines = lines.slice(preflopStart + 1, preflopEnd)

  const preflopActions: ParsedAction[] = []
  for (const line of preflopLines) {
    const action = parseActionLine(line)
    if (action) preflopActions.push(action)
  }

  // Actions avant la première action de hero
  const heroActionIndex = preflopActions.findIndex(a => a.player === heroName)
  const actionsBeforeHero = heroActionIndex === -1
    ? preflopActions
    : preflopActions.slice(0, heroActionIndex)

  const spotKey = determineSpotKey(heroPosition, actionsBeforeHero)
  const suggestedSpotNames = CANONICAL_TO_SPOT_NAMES[spotKey]

  return {
    handId,
    timestamp,
    bb,
    sb,
    heroName,
    heroStack,
    heroStackBb,
    stackBbEffective,
    heroPosition,
    heroCards,
    rawCards,
    preflopActions,
    actionsBeforeHero,
    spotKey,
    suggestedSpotNames,
    buttonSeat,
    seats,
    handText
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Parse une ligne d'action préflop Winamax.
 * Retourne null si la ligne ne correspond à aucun pattern d'action.
 */
function parseActionLine(line: string): ParsedAction | null {
  const foldMatch = line.match(/^(.+?) folds$/)
  if (foldMatch) return { player: foldMatch[1]!, type: 'fold' }

  const checkMatch = line.match(/^(.+?) checks$/)
  if (checkMatch) return { player: checkMatch[1]!, type: 'check' }

  const raiseAllinMatch = line.match(/^(.+?) raises \d+ to (\d+) and is all-in$/)
  if (raiseAllinMatch) {
    return {
      player: raiseAllinMatch[1]!,
      type: 'shove',
      amount: Number(raiseAllinMatch[2])
    }
  }

  const raiseMatch = line.match(/^(.+?) raises \d+ to (\d+)$/)
  if (raiseMatch) {
    return {
      player: raiseMatch[1]!,
      type: 'raise',
      amount: Number(raiseMatch[2])
    }
  }

  const callAllinMatch = line.match(/^(.+?) calls (\d+) and is all-in$/)
  if (callAllinMatch) {
    return {
      player: callAllinMatch[1]!,
      type: 'call',
      amount: Number(callAllinMatch[2])
    }
  }

  const callMatch = line.match(/^(.+?) calls (\d+)$/)
  if (callMatch) {
    return {
      player: callMatch[1]!,
      type: 'call',
      amount: Number(callMatch[2])
    }
  }

  return null
}

/**
 * Arrondit un stack (en BB) vers la valeur discrète la plus proche parmi 7/10/15.
 */
function roundToStackBb(bb: number): StackBB {
  const options: StackBB[] = [7, 10, 15]
  let closest: StackBB = options[0]!
  let minDiff = Math.abs(bb - closest)
  for (const opt of options) {
    const diff = Math.abs(bb - opt)
    if (diff < minDiff) {
      closest = opt
      minDiff = diff
    }
  }
  return closest
}

/**
 * Normalise deux cartes brutes ("Ks 4d") en notation range standard ("K4o", "AA", "AKs").
 */
export function normalizeCards(raw: string): string {
  const cards = raw.split(/\s+/)
  if (cards.length !== 2) return raw

  const c1 = cards[0]!
  const c2 = cards[1]!
  if (c1.length < 2 || c2.length < 2) return raw

  const r1 = c1[0]!
  const s1 = c1[1]!
  const r2 = c2[0]!
  const s2 = c2[1]!

  const rank1Val = RANK_ORDER[r1] ?? 0
  const rank2Val = RANK_ORDER[r2] ?? 0
  const [highRank, lowRank] = rank1Val >= rank2Val ? [r1, r2] : [r2, r1]

  if (r1 === r2) return `${highRank}${lowRank}`

  const suited = s1 === s2 ? 's' : 'o'
  return `${highRank}${lowRank}${suited}`
}

/**
 * Détermine le "canonical spot" à partir de la position et des actions qui ont précédé.
 *
 * Rappel ordre préflop en 3-max : BTN → SB → BB.
 * - BTN est toujours premier à parler (donc toujours first-in).
 * - SB a au maximum une action avant lui (celle du BTN).
 * - BB a au maximum deux actions avant lui (BTN puis SB).
 */
function determineSpotKey(
  heroPosition: Position,
  actionsBeforeHero: ParsedAction[]
): CanonicalSpot {
  const meaningful = actionsBeforeHero.filter(a => a.type !== 'check')
  const hasShove = meaningful.some(a => a.type === 'shove')
  const hasRaise = meaningful.some(a => a.type === 'raise')
  const hasCall = meaningful.some(a => a.type === 'call')
  const allFold = meaningful.length > 0 && meaningful.every(a => a.type === 'fold')

  if (heroPosition === 'BTN') {
    return 'BTN_FIRST_IN'
  }

  if (heroPosition === 'SB') {
    if (meaningful.length === 0 || allFold) return 'SB_FIRST_IN_BTN_FOLDED'
    if (hasShove) return 'SB_VS_BTN_SHOVE'
    if (hasRaise) return 'SB_VS_BTN_OPEN'
    if (hasCall) return 'SB_VS_BTN_LIMP'
    return 'UNKNOWN'
  }

  if (heroPosition === 'BB') {
    if (hasShove) return 'BB_VS_SHOVE'
    if (hasRaise) return 'BB_VS_BTN_OPEN_SB_FOLDED'
    if (hasCall) return 'BB_LIMPED_POT'
    return 'UNKNOWN'
  }

  return 'UNKNOWN'
}

/**
 * Extrait l'ID de tournoi depuis un nom de fichier HH Winamax.
 * Format : "20260409_Expresso Nitro(1093015247)_real_holdem_no-limit.txt"
 */
export function extractTournamentId(filename: string): string | null {
  const m = filename.match(/Expresso Nitro\((\d+)\)/)
  return m ? m[1]! : null
}

/**
 * Parse la section *** SUMMARY *** d'une main et retourne les gains de chaque joueur.
 * Les joueurs qui n'ont pas gagné sont absents de la Map (ou à 0).
 *
 * Formats de ligne supportés :
 *   Seat 3: StormSand921 (big blind) won 60
 *   Seat 1: godavigo (button) showed [As Kd] and won 300 with High card : Ace
 */
export function parseSummaryWinnings(lines: string[]): Map<string, number> {
  const winnings = new Map<string, number>()
  const summaryIdx = lines.findIndex(l => l.startsWith('*** SUMMARY ***'))
  if (summaryIdx === -1) return winnings

  for (let i = summaryIdx + 1; i < lines.length; i++) {
    const line = lines[i]!
    // Regex capture le player puis cherche "won N" plus loin
    const m = line.match(/^Seat \d+: (.+?) .*?won (\d+)/)
    if (m) {
      const player = m[1]!.trim()
      const amount = Number(m[2])
      winnings.set(player, (winnings.get(player) ?? 0) + amount)
    }
  }
  return winnings
}

/**
 * Calcule la contribution totale au pot de chaque joueur pour la main.
 * Gère les 4 streets + blinds/antes, et la sémantique "raises X to Y" de Winamax
 * (Y étant le total mis par le joueur sur cette street).
 *
 * Note importante : les blinds sont comptées comme "déjà en jeu" pour le calcul
 * des deltas de raise en préflop (un raise to 60 du BB vaut 60 - 20 = 40).
 */
export function computeContributions(lines: string[]): Map<string, number> {
  const contributions = new Map<string, number>()
  const streetBets = new Map<string, number>() // reset à chaque nouvelle street post-flop
  let currentStreet: 'none' | 'blinds' | 'preflop' | 'flop' | 'turn' | 'river' = 'none'

  const addContribution = (player: string, delta: number): void => {
    contributions.set(player, (contributions.get(player) ?? 0) + delta)
  }

  for (const line of lines) {
    if (line.startsWith('*** ANTE/BLINDS ***')) {
      currentStreet = 'blinds'
      continue
    }
    if (line.startsWith('*** PRE-FLOP ***')) {
      // Les blinds sont conservées dans streetBets : le BB a déjà 20 posés.
      currentStreet = 'preflop'
      continue
    }
    if (line.startsWith('*** FLOP ***')) {
      currentStreet = 'flop'
      streetBets.clear()
      continue
    }
    if (line.startsWith('*** TURN ***')) {
      currentStreet = 'turn'
      streetBets.clear()
      continue
    }
    if (line.startsWith('*** RIVER ***')) {
      currentStreet = 'river'
      streetBets.clear()
      continue
    }
    if (line.startsWith('*** SHOW DOWN ***') || line.startsWith('*** SUMMARY ***')) {
      break
    }

    if (currentStreet === 'none') continue

    // posts small blind N
    const sbM = line.match(/^(.+?) posts small blind (\d+)/)
    if (sbM) {
      const player = sbM[1]!
      const amount = Number(sbM[2])
      addContribution(player, amount)
      streetBets.set(player, (streetBets.get(player) ?? 0) + amount)
      continue
    }

    // posts big blind N
    const bbM = line.match(/^(.+?) posts big blind (\d+)/)
    if (bbM) {
      const player = bbM[1]!
      const amount = Number(bbM[2])
      addContribution(player, amount)
      streetBets.set(player, (streetBets.get(player) ?? 0) + amount)
      continue
    }

    // posts ante N
    const anteM = line.match(/^(.+?) posts ante (\d+)/)
    if (anteM) {
      addContribution(anteM[1]!, Number(anteM[2]))
      continue
    }

    // calls N (éventuellement "and is all-in")
    const callM = line.match(/^(.+?) calls (\d+)/)
    if (callM) {
      const player = callM[1]!
      const amount = Number(callM[2])
      addContribution(player, amount)
      streetBets.set(player, (streetBets.get(player) ?? 0) + amount)
      continue
    }

    // bets N (flop/turn/river)
    const betM = line.match(/^(.+?) bets (\d+)/)
    if (betM) {
      const player = betM[1]!
      const amount = Number(betM[2])
      addContribution(player, amount)
      streetBets.set(player, (streetBets.get(player) ?? 0) + amount)
      continue
    }

    // raises X to Y (Y = total sur cette street, delta = Y - streetBets)
    const raiseM = line.match(/^(.+?) raises \d+ to (\d+)/)
    if (raiseM) {
      const player = raiseM[1]!
      const totalOnStreet = Number(raiseM[2])
      const alreadyIn = streetBets.get(player) ?? 0
      const delta = totalOnStreet - alreadyIn
      addContribution(player, delta)
      streetBets.set(player, totalOnStreet)
      continue
    }

    // fold / check : pas de contribution
  }

  return contributions
}

/**
 * Calcule les stacks finaux après la main à partir des stacks initiaux,
 * des contributions et des gains.
 *
 * Formule : finalStack = initialStack - contributions + winnings
 */
export function computeFinalStacks(hand: ParsedHand): Map<string, number> {
  const lines = hand.handText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const contributions = computeContributions(lines)
  const winnings = parseSummaryWinnings(lines)

  const finalStacks = new Map<string, number>()
  for (const seat of hand.seats) {
    const contrib = contributions.get(seat.name) ?? 0
    const won = winnings.get(seat.name) ?? 0
    finalStacks.set(seat.name, seat.initialStack - contrib + won)
  }
  return finalStacks
}

/**
 * Donne le siège suivant dans l'ordre horaire parmi les sièges encore en jeu.
 * Si `currentSeat` n'est pas dans la liste, prend le premier > currentSeat,
 * ou le plus petit en cas de wrap-around.
 */
function getNextSeatClockwise(currentSeat: number, aliveSeats: number[]): number {
  if (aliveSeats.length === 0) return currentSeat
  const sorted = [...aliveSeats].sort((a, b) => a - b)
  const next = sorted.find(s => s > currentSeat)
  return next ?? sorted[0]!
}

/**
 * Prédit la position, le stack effectif et les blinds pour la main suivante,
 * à partir de la main N qui vient d'être parsée.
 *
 * - Rotation du BTN : siège suivant horaire parmi les joueurs non éliminés
 * - Position hero :
 *   - 3-max : BTN / SB / BB selon son siège dans la nouvelle rotation
 *   - heads-up : SB (= BTN Winamax, agit en premier) ou BB. On mappe vers SB/BB
 *     car les ranges 3-max "SB first-in (BTN fold)" et "BB vs BTN" couvrent la
 *     même dynamique qu'en HU.
 * - Stack effectif : min(heroFinal, maxOpponentFinal) arrondi à 7/10/15 BB
 * - Blinds : celles de la main N (peuvent être obsolètes si level-up entre-temps)
 */
export function predictNextHand(
  hand: ParsedHand,
  finalStacks: Map<string, number>,
  tournamentId: string
): NextHandPrediction {
  const heroFinal = finalStacks.get(hand.heroName) ?? 0
  const heroEliminated = heroFinal <= 0

  // Liste des sièges encore en jeu (stack > 0)
  const aliveSeats = hand.seats.filter(s => (finalStacks.get(s.name) ?? 0) > 0)
  const threeHanded = aliveSeats.length === 3

  // Si hero éliminé ou seul survivant, rien à prédire.
  if (heroEliminated || aliveSeats.length < 2) {
    return {
      tournamentId,
      previousHandId: hand.handId,
      nextPosition: hand.heroPosition, // placeholder
      nextStackBb: hand.stackBbEffective,
      nextStackBbExact: heroFinal / hand.bb,
      nextBlinds: { sb: hand.sb, bb: hand.bb },
      heroEliminated,
      threeHanded
    }
  }

  // Rotation du BTN (gère aussi le HU : alterne entre les 2 survivants)
  const aliveSeatNumbers = aliveSeats.map(s => s.seat)
  const nextBtnSeat = getNextSeatClockwise(hand.buttonSeat, aliveSeatNumbers)

  const heroSeatObj = hand.seats.find(s => s.name === hand.heroName)!
  let nextPosition: Position

  if (threeHanded) {
    const nextSbSeat = getNextSeatClockwise(nextBtnSeat, aliveSeatNumbers)
    const nextBbSeat = getNextSeatClockwise(nextSbSeat, aliveSeatNumbers)
    if (heroSeatObj.seat === nextBtnSeat) nextPosition = 'BTN'
    else if (heroSeatObj.seat === nextSbSeat) nextPosition = 'SB'
    else if (heroSeatObj.seat === nextBbSeat) nextPosition = 'BB'
    else nextPosition = hand.heroPosition
  } else {
    // Heads-up : en HU Winamax, le BTN poste la SB et agit en premier préflop.
    // On mappe cette situation sur la position SB du 3-max (même dynamique first-in).
    // L'autre joueur est BB.
    nextPosition = heroSeatObj.seat === nextBtnSeat ? 'SB' : 'BB'
  }

  // Stack effectif pour la main suivante : min de hero et du max des adversaires vivants
  const opponentStacks = aliveSeats
    .filter(s => s.name !== hand.heroName)
    .map(s => finalStacks.get(s.name) ?? 0)
  const maxOpponent = Math.max(...opponentStacks, 0)
  const effectiveStack = Math.min(heroFinal, maxOpponent)
  const nextStackBbExact = effectiveStack / hand.bb
  const nextStackBb = roundToStackBb(nextStackBbExact)

  return {
    tournamentId,
    previousHandId: hand.handId,
    nextPosition,
    nextStackBb,
    nextStackBbExact,
    nextBlinds: { sb: hand.sb, bb: hand.bb },
    heroEliminated: false,
    threeHanded
  }
}
