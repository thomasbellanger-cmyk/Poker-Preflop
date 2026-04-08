export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const
type Rank = typeof RANKS[number]

function rankIndex(rank: string): number {
  const idx = RANKS.indexOf(rank as Rank)
  if (idx === -1) throw new Error(`Invalid rank: ${rank}`)
  return idx
}

interface ParsedHand {
  high: number
  low: number
  type: 'pair' | 'suited' | 'offsuit'
}

export function parseHand(hand: string): ParsedHand | null {
  const trimmed = hand.trim().toUpperCase()
  const match = trimmed.match(/^([AKQJT2-9])([AKQJT2-9])([SO]?)$/)
  if (!match) return null

  const r1 = match[1]!
  const r2 = match[2]!
  const suffix = match[3] ?? ''
  const idx1 = rankIndex(r1)
  const idx2 = rankIndex(r2)

  if (idx1 === idx2) {
    if (suffix) return null
    return { high: idx1, low: idx2, type: 'pair' }
  }

  if (!suffix) return null

  const high = Math.min(idx1, idx2)
  const low = Math.max(idx1, idx2)

  return {
    high,
    low,
    type: suffix === 'S' ? 'suited' : 'offsuit'
  }
}

export function isValidHand(hand: string): boolean {
  return parseHand(hand) !== null
}

export function normalizeHandInput(input: string): string {
  const trimmed = input.trim().toUpperCase()
  const match = trimmed.match(/^([AKQJT2-9])([AKQJT2-9])([SO]?)$/)
  if (!match) return trimmed

  const r1 = match[1]!
  const r2 = match[2]!
  const suffix = match[3] ?? ''
  const idx1 = rankIndex(r1)
  const idx2 = rankIndex(r2)

  if (idx1 === idx2) return `${r1}${r2}`
  if (idx1 < idx2) return `${r1}${r2}${suffix.toLowerCase()}`
  return `${r2}${r1}${suffix.toLowerCase()}`
}

function matchesExact(hand: ParsedHand, pattern: string): boolean {
  const parsed = parseHand(pattern)
  if (!parsed) return false
  return hand.high === parsed.high
    && hand.low === parsed.low
    && hand.type === parsed.type
}

function matchesRangePlus(hand: ParsedHand, basePattern: string): boolean {
  const base = parseHand(basePattern)
  if (!base) return false

  if (base.type === 'pair') {
    return hand.type === 'pair' && hand.high <= base.high
  }

  if (hand.high !== base.high) return false
  if (hand.type !== base.type) return false
  return hand.low <= base.low
}

function matchesRangeDash(hand: ParsedHand, pattern: string): boolean {
  const parts = pattern.split('-').map(s => s.trim())
  const start = parseHand(parts[0]!)
  const end = parseHand(parts[1]!)
  if (!start || !end) return false

  if (start.type !== end.type) return false
  if (hand.type !== start.type) return false

  if (start.type === 'pair') {
    const minIdx = Math.min(start.high, end.high)
    const maxIdx = Math.max(start.high, end.high)
    return hand.high >= minIdx && hand.high <= maxIdx
  }

  if (start.high !== end.high) return false
  if (hand.high !== start.high) return false

  const minLow = Math.min(start.low, end.low)
  const maxLow = Math.max(start.low, end.low)
  return hand.low >= minLow && hand.low <= maxLow
}

function matchesPart(hand: ParsedHand, part: string): boolean {
  const trimmed = part.trim().toUpperCase()

  if (trimmed.includes('-')) {
    return matchesRangeDash(hand, trimmed)
  }

  if (trimmed.endsWith('+')) {
    return matchesRangePlus(hand, trimmed.slice(0, -1))
  }

  return matchesExact(hand, trimmed)
}

export function belongsToRange(hand: string, rangeString: string): boolean {
  const parsed = parseHand(hand)
  if (!parsed) return false

  const parts = rangeString.split(',').map(s => s.trim()).filter(Boolean)
  return parts.some(part => matchesPart(parsed, part))
}
