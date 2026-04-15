import { useEffect, useMemo, useState } from 'react'
import dagre from 'dagre'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  Position,
  useEdgesState,
  useNodesState,
} from 'reactflow'
import type { Edge, Node } from '../api/client'
import CustomEdge from './CustomEdge'
import OrgNode from './OrgNode'

import 'reactflow/dist/style.css'

const edgeTypes = { custom: CustomEdge }
const nodeTypes = { org: OrgNode }

/** Match OrgNode outer dimensions for Dagre. */
const NODE_WIDTH = 180
const NODE_HEIGHT = 48

function formatKindLabel(kind: string): string {
  const spaced = kind.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function layoutWithDagre(
  nodes: Node[],
  edges: Edge[],
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  if (nodes.length === 0) return positions

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: 'TB',
    nodesep: 48,
    ranksep: 72,
    marginx: 24,
    marginy: 24,
  })

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
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
        x: laidOut.x - NODE_WIDTH / 2,
        y: laidOut.y - NODE_HEIGHT / 2,
      })
    }
  }
  return positions
}

function edgeStrokeForType(relType: string): string {
  switch (relType) {
    case 'reports_to':
      return '#be123c'
    case 'depends_on':
      return '#ea580c'
    case 'works_with':
      return '#2563eb'
    default:
      return '#64748b'
  }
}

function buildFlowEdges(edges: Edge[], selectedNodeId: string | null) {
  const pairKey = (from: string, to: string) => `${from}-${to}`
  const counts = new Map<string, number>()
  for (const e of edges) {
    const k = pairKey(e.from_id, e.to_id)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const nextIdx = new Map<string, number>()
  return edges.map((edge, edgeIndex) => {
    const k = pairKey(edge.from_id, edge.to_id)
    const n = counts.get(k) ?? 1
    const i = nextIdx.get(k) ?? 0
    nextIdx.set(k, i + 1)
    const offset = n === 1 ? 0 : (i - (n - 1) / 2) * 80
    const stroke = edgeStrokeForType(edge.type)
    const connected =
      !selectedNodeId ||
      edge.from_id === selectedNodeId ||
      edge.to_id === selectedNodeId
    const edgeOpacity = selectedNodeId ? (connected ? 1 : 0.05) : 0.42
    const strokeWidth = selectedNodeId && connected ? 2 : 1
    const labelOpacity = selectedNodeId ? (connected ? 1 : 0.2) : 0.88

    return {
      id: edge.id,
      source: edge.from_id,
      target: edge.to_id,
      type: 'custom',
      data: { offset },
      label: formatKindLabel(edge.type),
      style: { stroke, strokeWidth, opacity: edgeOpacity },
      zIndex: edgeIndex,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: stroke,
        width: 11,
        height: 11,
        strokeWidth: 1,
      },
      labelStyle: {
        fontSize: 11,
        fill: `rgba(51, 65, 85, ${labelOpacity})`,
        fontWeight: 500,
      },
      labelShowBg: true,
      labelBgStyle: {
        fill: '#f8fafc',
        fillOpacity: selectedNodeId ? (connected ? 0.95 : 0.35) : 0.85,
      },
      labelBgPadding: [4, 2] as [number, number],
    }
  })
}

function buildFlowEdgesWithHighlight(
  edges: Edge[],
  selectedNodeId: string | null,
  highlightedEdgeId: string | null,
) {
  return buildFlowEdges(edges, selectedNodeId).map((edge) => {
    if (!highlightedEdgeId || edge.id !== highlightedEdgeId) return edge
    const style =
      (edge.style as { strokeWidth?: number; opacity?: number; stroke?: string } | undefined) ??
      {}
    return {
      ...edge,
      style: {
        ...style,
        opacity: 1,
        strokeWidth: Math.max(Number(style.strokeWidth ?? 1), 2.8),
      },
      animated: true,
      zIndex: 9999,
    }
  })
}

export interface GraphViewProps {
  nodes: Node[]
  edges: Edge[]
  selectedNodeId?: string | null
  selectedEdgeId?: string | null
  highlightedNodeId?: string | null
  highlightedEdgeId?: string | null
  focusMode?: boolean
  onNodeClick?: (nodeId: string) => void
  onEdgeClick?: (edgeId: string) => void
  onPaneClick?: () => void
  height?: number | string
}

export function GraphView({
  nodes,
  edges,
  selectedNodeId = null,
  selectedEdgeId = null,
  highlightedNodeId = null,
  highlightedEdgeId = null,
  focusMode = false,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  height = 420,
}: GraphViewProps) {
  const [rfInstance, setRfInstance] = useState<{
    setCenter: (
      x: number,
      y: number,
      options?: { zoom?: number; duration?: number },
    ) => void
  } | null>(null)
  const [positionCache] = useState<Map<string, { x: number; y: number }>>(
    () => new Map(),
  )

  const visibleGraph = useMemo(() => {
    if (!focusMode || !selectedNodeId) return { nodes, edges }
    const relatedEdges = edges.filter(
      (e) => e.from_id === selectedNodeId || e.to_id === selectedNodeId,
    )
    const visibleNodeIds = new Set<string>([selectedNodeId])
    for (const e of relatedEdges) {
      visibleNodeIds.add(e.from_id)
      visibleNodeIds.add(e.to_id)
    }
    return {
      nodes: nodes.filter((n) => visibleNodeIds.has(n.id)),
      edges: relatedEdges,
    }
  }, [nodes, edges, focusMode, selectedNodeId])

  const flowNodes = useMemo(() => {
    const laidOut = layoutWithDagre(visibleGraph.nodes, visibleGraph.edges)
    const next = new Map<string, { x: number; y: number }>(positionCache)
    const existingNodeIds = new Set(nodes.map((n) => n.id))

    for (const node of visibleGraph.nodes) {
      if (next.has(node.id)) continue
      next.set(node.id, laidOut.get(node.id) ?? { x: 0, y: 0 })
    }
    for (const id of [...next.keys()]) {
      if (!existingNodeIds.has(id)) next.delete(id)
    }
    positionCache.clear()
    for (const [id, pos] of next.entries()) positionCache.set(id, pos)

    return visibleGraph.nodes.map((node) => ({
      id: node.id,
      type: 'org',
      data: {
        label: node.team?.trim() ? `${node.name} (${node.team.trim()})` : node.name,
        team: node.team?.trim() ?? '',
        highlighted: node.id === highlightedNodeId,
      },
      position: next.get(node.id) ?? { x: 0, y: 0 },
      selected: node.id === selectedNodeId,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    }))
  }, [visibleGraph, selectedNodeId, highlightedNodeId, nodes, positionCache])

  const flowEdges = useMemo(
    () =>
      buildFlowEdgesWithHighlight(
        visibleGraph.edges,
        selectedNodeId,
        highlightedEdgeId,
      ).map((edge) => {
        if (edge.id !== selectedEdgeId) return edge
        const style =
          (edge.style as { strokeWidth?: number; opacity?: number; stroke?: string } | undefined) ??
          {}
        return {
          ...edge,
          style: {
            ...style,
            opacity: 1,
            strokeWidth: Math.max(Number(style.strokeWidth ?? 1), 2.4),
          },
          zIndex: 9998,
        }
      }),
    [visibleGraph.edges, selectedNodeId, highlightedEdgeId, selectedEdgeId],
  )

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(flowNodes)
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(flowEdges)

  useEffect(() => {
    setRfNodes(flowNodes)
  }, [flowNodes, setRfNodes])

  useEffect(() => {
    setRfEdges(flowEdges)
  }, [flowEdges, setRfEdges])

  useEffect(() => {
    if (!rfInstance || !selectedNodeId) return
    const target = rfNodes.find((n) => n.id === selectedNodeId)
    if (!target) return
    rfInstance.setCenter(
      target.position.x + NODE_WIDTH / 2,
      target.position.y + NODE_HEIGHT / 2,
      { zoom: 1.15, duration: 320 },
    )
  }, [rfInstance, selectedNodeId, rfNodes])

  return (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        background: '#f8fafc',
      }}
    >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={(instance) => setRfInstance(instance)}
        onNodeClick={(_, node) => onNodeClick?.(node.id)}
        onEdgeClick={(_, edge) => onEdgeClick?.(edge.id)}
        onPaneClick={() => onPaneClick?.()}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag={true}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={14}
          size={1}
          color="#cbd5e1"
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
