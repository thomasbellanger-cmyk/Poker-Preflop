import type { RangeEntry, StackBB, Position } from '~/types/range'
import rangesData from '~/data/ranges.json'

export function getAllRanges(): RangeEntry[] {
  return rangesData as RangeEntry[]
}

export function getSpotsForSituation(stackBb: StackBB, position: Position): string[] {
  const spots = new Set<string>()
  for (const entry of getAllRanges()) {
    if (entry.stack_bb === stackBb && entry.position === position) {
      spots.add(entry.spot)
    }
  }
  return [...spots]
}

export function getRangesForSituation(
  stackBb: StackBB,
  position: Position,
  spot: string
): RangeEntry[] {
  return getAllRanges().filter(
    entry =>
      entry.stack_bb === stackBb
      && entry.position === position
      && entry.spot === spot
  )
}
