import { useEffect, useMemo } from 'react'
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
  return kind.replace(/_/g, ' ')
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
    const edgeOpacity = selectedNodeId ? (connected ? 1 : 0.2) : 0.72
    const strokeWidth = selectedNodeId && connected ? 1.15 : 1.05
    const labelOpacity = selectedNodeId ? (connected ? 1 : 0.35) : 1

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
        fillOpacity: selectedNodeId ? (connected ? 0.95 : 0.55) : 0.95,
      },
      labelBgPadding: [4, 2] as [number, number],
    }
  })
}

export interface GraphViewProps {
  nodes: Node[]
  edges: Edge[]
  selectedNodeId?: string | null
  onNodeClick?: (nodeId: string) => void
  onPaneClick?: () => void
}

export function GraphView({
  nodes,
  edges,
  selectedNodeId = null,
  onNodeClick,
  onPaneClick,
}: GraphViewProps) {
  const flowNodes = useMemo(() => {
    const positions = layoutWithDagre(nodes, edges)
    return nodes.map((node) => ({
      id: node.id,
      type: 'org',
      data: {
        label: node.team?.trim() ? `${node.name} (${node.team.trim()})` : node.name,
        team: node.team?.trim() ?? '',
      },
      position: positions.get(node.id) ?? { x: 0, y: 0 },
      selected: node.id === selectedNodeId,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    }))
  }, [nodes, edges, selectedNodeId])

  const flowEdges = useMemo(
    () => buildFlowEdges(edges, selectedNodeId),
    [edges, selectedNodeId],
  )

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(flowNodes)
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(flowEdges)

  useEffect(() => {
    setRfNodes(flowNodes)
  }, [flowNodes, setRfNodes])

  useEffect(() => {
    setRfEdges(flowEdges)
  }, [flowEdges, setRfEdges])

  return (
    <div
      style={{
        width: '100%',
        height: 420,
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
        onNodeClick={(_, node) => onNodeClick?.(node.id)}
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
