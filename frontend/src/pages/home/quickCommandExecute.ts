import { createEdge, createNode, type Edge, type Node } from '../../api/client'
import { EDGE_TYPE_OPTIONS } from './constants'
import { findNodeByName } from './quickInputLogic'

export type QuickCommandExecuteResult =
  | { type: 'edge'; edge: Edge }
  | { type: 'node'; node: Node }
  | { type: 'error'; message: string }
  | { type: 'abort' }

/**
 * Parses `raw` (trimmed) and creates an edge or node via API.
 * Does not touch React state — caller applies updates.
 */
export async function executeQuickCommand(
  raw: string,
  nodes: Node[],
): Promise<QuickCommandExecuteResult> {
  const arrowIdx = raw.indexOf('->')
  const toMatch = raw.match(/^(.+?)\s+to\s+(.+)$/i)
  let left = ''
  let right = ''
  let edgeType = 'reports_to'

  if (arrowIdx >= 0) {
    left = raw.slice(0, arrowIdx).trim()
    const rightRaw = raw.slice(arrowIdx + 2).trim()
    const colonMatch = rightRaw.match(/^(.+?)\s*:\s*([a-z_]+)$/i)
    if (colonMatch) {
      right = colonMatch[1].trim()
      edgeType = colonMatch[2].trim().toLowerCase()
    } else {
      const parts = rightRaw.split(/\s+/).filter(Boolean)
      const maybeType = (parts[parts.length - 1] ?? '').toLowerCase()
      if (
        parts.length >= 2 &&
        EDGE_TYPE_OPTIONS.includes(maybeType as (typeof EDGE_TYPE_OPTIONS)[number])
      ) {
        right = parts.slice(0, -1).join(' ')
        edgeType = maybeType
      } else {
        right = rightRaw
      }
    }
  } else if (toMatch) {
    left = toMatch[1].trim()
    right = toMatch[2].trim()
  } else {
    const tokens = raw.split(/\s+/).filter(Boolean)
    if (tokens.length >= 2) {
      const maybeFrom = findNodeByName(nodes, tokens[0])
      const maybeTo = findNodeByName(nodes, tokens[1])
      if (maybeFrom && maybeTo) {
        left = tokens[0]
        right = tokens[1]
      }
    }
  }

  if (left || right) {
    if (!left || !right) {
      return { type: 'error', message: 'Use "alice -> bob" (or "alice to bob") format for edges.' }
    }
    const fromNode = findNodeByName(nodes, left)
    const toNode = findNodeByName(nodes, right)
    if (!fromNode || !toNode) {
      return { type: 'error', message: 'Both nodes must already exist to create an edge.' }
    }
    const newEdge = await createEdge({
      from_id: fromNode.id,
      to_id: toNode.id,
      type: edgeType,
    })
    return { type: 'edge', edge: newEdge }
  }

  const parts = raw.split(/\s+/).filter(Boolean)
  const namePart = parts[0] ?? ''
  const teamPart = parts.slice(1).join(' ')
  if (!namePart) return { type: 'abort' }

  const newNode = await createNode({ name: namePart, team: teamPart || undefined })
  return { type: 'node', node: newNode }
}
