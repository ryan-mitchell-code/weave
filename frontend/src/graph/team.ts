import type { Node } from '../api/client'
import { capitalizeDisplayWords } from '../lib/displayFormat'

/** Shown in UI for nodes with no team (display and PersonNode styling). */
export const UNASSIGNED_TEAM = 'Unassigned'

export function getTeamDisplay(node: Pick<Node, 'team'>): string {
  const t = node.team?.trim()
  if (!t) return UNASSIGNED_TEAM
  return capitalizeDisplayWords(t)
}
