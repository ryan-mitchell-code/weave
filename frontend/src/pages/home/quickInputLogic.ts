import type { Node } from '../../api/client'

export type QuickContext =
  | {
      mode: 'edge'
      delimiter: 'arrow' | 'to'
      left: string
      right: string
      trimmed: string
    }
  | {
      mode: 'node'
      delimiter: null
      left: ''
      right: ''
      trimmed: string
    }

export function parseQuickContext(raw: string): QuickContext {
  const trimmed = raw.trim()
  const arrowIdx = raw.indexOf('->')
  if (arrowIdx >= 0) {
    return {
      mode: 'edge',
      delimiter: 'arrow',
      left: raw.slice(0, arrowIdx).trim(),
      right: raw.slice(arrowIdx + 2).trim(),
      trimmed,
    }
  }
  const toMatch = raw.match(/^(.+?)\s+to\s*(.*)$/i)
  if (toMatch) {
    return {
      mode: 'edge',
      delimiter: 'to',
      left: toMatch[1].trim(),
      right: toMatch[2].trim(),
      trimmed,
    }
  }
  return {
    mode: 'node',
    delimiter: null,
    left: '',
    right: '',
    trimmed,
  }
}

export function findNodeByName(nodes: Node[], rawName: string): Node | undefined {
  const q = rawName.trim().toLowerCase()
  if (!q) return undefined
  return nodes.find((n) => n.name.trim().toLowerCase() === q)
}

/** Full-string name match in node (non-edge) quick input; used for viewing vs create UX. */
export function getExactNodeMatchForQuickInput(
  nodes: Node[],
  quickContext: QuickContext,
): Node | undefined {
  if (quickContext.mode !== 'node') return undefined
  if (!quickContext.trimmed) return undefined
  return findNodeByName(nodes, quickContext.trimmed)
}

export function rankSuggestedNodes(
  list: Node[],
  query: string,
  recentNodeIds: string[],
): Node[] {
  const q = query.trim().toLowerCase()
  const recentRank = new Map(recentNodeIds.map((id, i) => [id, i]))
  return [...list].sort((a, b) => {
    const aRecent = recentRank.get(a.id) ?? Number.POSITIVE_INFINITY
    const bRecent = recentRank.get(b.id) ?? Number.POSITIVE_INFINITY
    if (aRecent !== bRecent) return aRecent - bRecent
    const aName = a.name.trim().toLowerCase()
    const bName = b.name.trim().toLowerCase()
    const aStarts = q ? (aName.startsWith(q) ? 0 : 1) : 0
    const bStarts = q ? (bName.startsWith(q) ? 0 : 1) : 0
    if (aStarts !== bStarts) return aStarts - bStarts
    return aName.localeCompare(bName)
  })
}

export function buildQuickSuggestions(
  nodes: Node[],
  quickContext: QuickContext,
  recentNodeIds: string[],
): Node[] {
  if (!quickContext.trimmed) return []
  if (quickContext.mode === 'edge') {
    const fromNode = findNodeByName(nodes, quickContext.left)
    const q = quickContext.right.toLowerCase()
    const pool = fromNode ? nodes.filter((n) => n.id !== fromNode.id) : nodes
    const filtered = q ? pool.filter((n) => n.name.toLowerCase().includes(q)) : pool
    return rankSuggestedNodes(filtered, q, recentNodeIds).slice(0, 8)
  }
  const q = quickContext.trimmed.toLowerCase()
  const filtered = nodes.filter((n) => n.name.toLowerCase().includes(q))
  return rankSuggestedNodes(filtered, q, recentNodeIds).slice(0, 8)
}
