import type { StackBB, Position, Action, RangeResult } from '~/types/range'
import { ACTION_PRIORITY } from '~/types/range'
import { getRangesForSituation, getSpotsForSituation } from '~/repositories/ranges'
import { belongsToRange, normalizeHandInput, isValidHand } from '~/utils/rangeParser'

function resolveActionType(actionText: string): Action {
  const lower = actionText.toLowerCase()
  if (lower.startsWith('call')) return 'call'
  if (lower.includes('3-bet') || lower.includes('3bet')) return '3-bet jam'
  if (lower.includes('shove')) return 'shove'
  if (lower.includes('call')) return 'call'
  if (lower.includes('min-raise') || lower.includes('raise')) return 'raise'
  return 'fold'
}

// "Open shove" et "Open min-raise" sont des alternatives (groupe "open")
// "Call vs 3-bet jam" est un cas conditionnel séparé (groupe "vs-jam")
// Tout le reste (3-bet jam, Call, etc.) = groupe "response"
function getActionGroup(actionText: string): string {
  const lower = actionText.toLowerCase()
  if (lower.startsWith('open')) return 'open'
  if (lower.startsWith('call vs')) return 'vs-jam'
  return 'response'
}

export function useRanges() {
  const stackBb = ref<StackBB>(10)
  const position = ref<Position>('BTN')
  const spot = ref('')
  const handInput = ref('')

  const normalizedHand = computed(() => normalizeHandInput(handInput.value))
  const isHandValid = computed(() => isValidHand(handInput.value))

  const availableSpots = computed(() =>
    getSpotsForSituation(stackBb.value, position.value)
  )

  // Initialiser le spot au premier disponible
  watch(availableSpots, (spots) => {
    if (spots.length > 0 && !spots.includes(spot.value)) {
      spot.value = spots[0]
    }
  }, { immediate: true })

  const results = ref<RangeResult[]>([])
  const noResult = ref(false)

  function findDecision(): void {
    results.value = []
    noResult.value = false

    if (!isHandValid.value) return

    const entries = getRangesForSituation(stackBb.value, position.value, spot.value)
    const matchingEntries: RangeResult[] = []

    for (const entry of entries) {
      if (!entry.hands) continue
      if (belongsToRange(normalizedHand.value, entry.hands)) {
        const actionType = resolveActionType(entry.action)
        matchingEntries.push({
          action: entry.action,
          actionType,
          hands: entry.hands,
          notes: entry.notes || ''
        })
      }
    }

    if (matchingEntries.length === 0) {
      noResult.value = true
      results.value = [{
        action: 'Fold',
        actionType: 'fold',
        hands: '',
        notes: 'Cette main ne fait partie d\'aucune range. Action par défaut : fold.'
      }]
      return
    }

    // Regrouper par catégorie, garder la plus prioritaire de chaque groupe
    const groups = new Map<string, RangeResult>()
    for (const entry of matchingEntries) {
      const group = getActionGroup(entry.action)
      const existing = groups.get(group)
      if (!existing || ACTION_PRIORITY[entry.actionType] > ACTION_PRIORITY[existing.actionType]) {
        groups.set(group, entry)
      }
    }

    const deduplicated = [...groups.values()]
    deduplicated.sort(
      (a, b) => ACTION_PRIORITY[b.actionType] - ACTION_PRIORITY[a.actionType]
    )
    results.value = deduplicated
  }

  return {
    stackBb,
    position,
    spot,
    handInput,
    normalizedHand,
    isHandValid,
    availableSpots,
    results,
    noResult,
    findDecision
  }
}
