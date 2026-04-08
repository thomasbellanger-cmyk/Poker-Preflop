export type StackBB = 15 | 10 | 7

export type Position = 'BTN' | 'SB' | 'BB'

export type Action = 'shove' | '3-bet jam' | 'call' | 'raise' | 'fold'

export const ACTION_PRIORITY: Record<Action, number> = {
  'shove': 5,
  '3-bet jam': 4,
  'raise': 3,
  'call': 2,
  'fold': 1
}

export const ACTION_COLORS: Record<Action, string> = {
  'shove': 'green',
  '3-bet jam': 'red',
  'call': 'blue',
  'raise': 'orange',
  'fold': 'neutral'
}

export interface RangeEntry {
  stack_bb: StackBB
  position: Position
  spot: string
  action: string
  hands: string | null
  notes: string | null
}

export interface RangeResult {
  action: string
  actionType: Action
  hands: string
  notes: string
}
