import type { Node } from '../../api/client'

export function formatEdgeTypeLabel(type: string): string {
  const withSpaces = type.replace(/_/g, ' ')
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

export function formatNodeLabel(nodes: Node[], id: string): string {
  const n = nodes.find((x) => x.id === id)
  if (!n) return id
  const teamLabel = n.team?.trim()
  return teamLabel ? `${n.name} (${teamLabel})` : n.name
}
