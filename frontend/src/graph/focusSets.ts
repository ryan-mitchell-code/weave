import type { Edge, Node } from '../api/client'

/**
 * Nodes and edges in the connected component around the focus anchor (BFS).
 * When `focusAnchorId` is null, the full graph is treated as active.
 */
export function computeFocusSets(
  graphNodes: Node[],
  graphEdges: Edge[],
  focusAnchorId: string | null,
): { activeNodeIds: Set<string>; activeEdgeIds: Set<string> } {
  if (!focusAnchorId) {
    return {
      activeNodeIds: new Set(graphNodes.map((n) => n.id)),
      activeEdgeIds: new Set(graphEdges.map((e) => e.id)),
    }
  }
  const activeNodeIds = new Set<string>()
  const queue: string[] = [focusAnchorId]
  activeNodeIds.add(focusAnchorId)
  while (queue.length > 0) {
    const id = queue.shift()!
    for (const e of graphEdges) {
      if (e.from_id === id && !activeNodeIds.has(e.to_id)) {
        activeNodeIds.add(e.to_id)
        queue.push(e.to_id)
      }
      if (e.to_id === id && !activeNodeIds.has(e.from_id)) {
        activeNodeIds.add(e.from_id)
        queue.push(e.from_id)
      }
    }
  }
  const activeEdgeIds = new Set<string>()
  for (const e of graphEdges) {
    if (activeNodeIds.has(e.from_id) && activeNodeIds.has(e.to_id)) {
      activeEdgeIds.add(e.id)
    }
  }
  return { activeNodeIds, activeEdgeIds }
}
