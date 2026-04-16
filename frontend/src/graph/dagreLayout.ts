import dagre from 'dagre'
import type { Edge, Node } from '../api/client'
import { GRAPH_THEME } from './graphTheme'

/** Match PersonNode outer dimensions for Dagre and viewport centering. */
export const GRAPH_LAYOUT_NODE_WIDTH = GRAPH_THEME.node.width
export const GRAPH_LAYOUT_NODE_HEIGHT = GRAPH_THEME.node.height

export function layoutWithDagre(
  nodes: Node[],
  edges: Edge[],
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  if (nodes.length === 0) return positions

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: 'TB',
    nodesep: GRAPH_THEME.layout.nodesep,
    ranksep: GRAPH_THEME.layout.ranksep,
    marginx: GRAPH_THEME.layout.marginx,
    marginy: GRAPH_THEME.layout.marginy,
  })

  for (const n of nodes) {
    g.setNode(n.id, { width: GRAPH_LAYOUT_NODE_WIDTH, height: GRAPH_LAYOUT_NODE_HEIGHT })
  }

  const seenPairs = new Set<string>()
  for (const e of edges) {
    const key = `${e.from_id}-${e.to_id}`
    if (seenPairs.has(key)) continue
    seenPairs.add(key)
    g.setEdge(e.from_id, e.to_id)
  }

  dagre.layout(g)

  for (const n of nodes) {
    const laidOut = g.node(n.id)
    if (laidOut) {
      positions.set(n.id, {
        x: laidOut.x - GRAPH_LAYOUT_NODE_WIDTH / 2,
        y: laidOut.y - GRAPH_LAYOUT_NODE_HEIGHT / 2,
      })
    }
  }
  return positions
}
