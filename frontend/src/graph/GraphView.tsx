import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Position,
  useEdgesState,
  useNodesState,
} from 'reactflow'
import type { Node as RFNode } from 'reactflow'
import type { Edge, Node } from '../api/client'
import { buildFlowEdgesWithHighlight } from './buildFlowEdges'
import CustomEdge from './CustomEdge'
import { GRAPH_LAYOUT_NODE_HEIGHT, GRAPH_LAYOUT_NODE_WIDTH, layoutWithDagre } from './dagreLayout'
import { computeFocusSets } from './focusSets'
import { GRAPH_THEME } from './graphTheme'
import PersonNode from './PersonNode'
import {
  FOCUS_INACTIVE_NODE_OPACITY,
  HOVER_LEAVE_MS,
  NODE_OPACITY_TRANSITION,
} from './viewConstants'
import { formatDisplayName } from '../lib/displayFormat'
import { getTeamDisplay } from './team'

import 'reactflow/dist/style.css'

const edgeTypes = { custom: CustomEdge }
const nodeTypes = { person: PersonNode }

export interface GraphViewProps {
  nodes: Node[]
  edges: Edge[]
  selectedNodeId?: string | null
  selectedEdgeId?: string | null
  highlightedNodeId?: string | null
  highlightedEdgeId?: string | null
  /** Preview focus while hovering (takes precedence over selection for dimming only). */
  hoveredNodeId?: string | null
  focusMode?: boolean
  onNodeClick?: (nodeId: string) => void
  onEdgeClick?: (edgeId: string) => void
  onPaneClick?: () => void
  onNodeHover?: (nodeId: string) => void
  onNodeHoverEnd?: () => void
  height?: number | string
}

export function GraphView({
  nodes,
  edges,
  selectedNodeId = null,
  selectedEdgeId = null,
  highlightedNodeId = null,
  highlightedEdgeId = null,
  hoveredNodeId = null,
  focusMode = false,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onNodeHover,
  onNodeHoverEnd,
  height = 420,
}: GraphViewProps) {
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current)
    }
  }, [])

  const handleNodeMouseEnter = useCallback(
    (_: MouseEvent, node: RFNode) => {
      if (hoverLeaveTimerRef.current) {
        clearTimeout(hoverLeaveTimerRef.current)
        hoverLeaveTimerRef.current = null
      }
      onNodeHover?.(node.id)
    },
    [onNodeHover],
  )

  const handleNodeMouseLeave = useCallback(() => {
    if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current)
    hoverLeaveTimerRef.current = setTimeout(() => {
      hoverLeaveTimerRef.current = null
      onNodeHoverEnd?.()
    }, HOVER_LEAVE_MS)
  }, [onNodeHoverEnd])

  const [rfInstance, setRfInstance] = useState<{
    setCenter: (
      x: number,
      y: number,
      options?: { zoom?: number; duration?: number },
    ) => void
  } | null>(null)

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

  const focusNodeId = hoveredNodeId ?? selectedNodeId

  const { activeNodeIds, activeEdgeIds } = useMemo(
    () => computeFocusSets(visibleGraph.nodes, visibleGraph.edges, focusNodeId),
    [visibleGraph.nodes, visibleGraph.edges, focusNodeId],
  )
  const hasNodeFocus = focusNodeId != null

  const flowNodes = useMemo(() => {
    const laidOut = layoutWithDagre(visibleGraph.nodes, visibleGraph.edges)

    return visibleGraph.nodes.map((node) => {
      const isActive = activeNodeIds.has(node.id)
      return {
        id: node.id,
        type: 'person',
        data: {
          name: formatDisplayName(node.name),
          team: getTeamDisplay(node),
          highlighted: node.id === highlightedNodeId,
          isActive,
        },
        position: laidOut.get(node.id) ?? { x: 0, y: 0 },
        selected: node.id === selectedNodeId,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        style: {
          opacity: hasNodeFocus ? (isActive ? 1 : FOCUS_INACTIVE_NODE_OPACITY) : 1,
          transition: NODE_OPACITY_TRANSITION,
        },
      }
    })
  }, [
    visibleGraph,
    selectedNodeId,
    highlightedNodeId,
    activeNodeIds,
    hasNodeFocus,
  ])

  const flowEdges = useMemo(
    () =>
      buildFlowEdgesWithHighlight(
        visibleGraph.edges,
        hasNodeFocus,
        activeEdgeIds,
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
            strokeWidth: Math.max(Number(style.strokeWidth ?? 1), GRAPH_THEME.edge.selectedStrokeWidth),
          },
          zIndex: 9998,
        }
      }),
    [visibleGraph.edges, hasNodeFocus, activeEdgeIds, highlightedEdgeId, selectedEdgeId],
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
      target.position.x + GRAPH_LAYOUT_NODE_WIDTH / 2,
      target.position.y + GRAPH_LAYOUT_NODE_HEIGHT / 2,
      { zoom: 1.15, duration: 320 },
    )
  }, [rfInstance, selectedNodeId, rfNodes])

  return (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: GRAPH_THEME.canvas.borderRadius,
        overflow: 'hidden',
        border: `1px solid ${GRAPH_THEME.canvas.border}`,
        background: GRAPH_THEME.canvas.background,
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
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
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
          color={GRAPH_THEME.canvas.dots}
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
