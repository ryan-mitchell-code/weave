import type { Node } from '../../api/client'
import { formatDisplayName } from '../../lib/displayFormat'

export function formatEdgeTypeLabel(type: string): string {
  const withSpaces = type.replace(/_/g, ' ')
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

export function formatNodeLabel(nodes: Node[], id: string): string {
  const n = nodes.find((x) => x.id === id)
  if (!n) return id
  const nameLabel = formatDisplayName(n.name)
  const teamLabel = n.team?.trim() ? formatDisplayName(n.team.trim()) : ''
  return teamLabel ? `${nameLabel} (${teamLabel})` : nameLabel
}
