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
  SEARCH_MATCH_NODE_GLOW,
  SEARCH_NONMATCH_EDGE_OPACITY,
  SEARCH_NONMATCH_NODE_OPACITY,
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
  /** Name-only search overlay: when true, matching nodes are emphasized; others faded. */
  searchActive?: boolean
  searchMatchingNodeIds?: Set<string> | null
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
  searchActive = false,
  searchMatchingNodeIds = null,
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
        style: (() => {
          let opacity = hasNodeFocus ? (isActive ? 1 : FOCUS_INACTIVE_NODE_OPACITY) : 1
          let filter: string | undefined

          if (searchActive && searchMatchingNodeIds) {
            if (searchMatchingNodeIds.has(node.id)) {
              opacity = 1
              filter = SEARCH_MATCH_NODE_GLOW
            } else {
              opacity = SEARCH_NONMATCH_NODE_OPACITY
            }
          }

          return {
            opacity,
            transition: `${NODE_OPACITY_TRANSITION}, filter 0.15s ease`,
            ...(filter ? { filter } : {}),
          }
        })(),
      }
    })
  }, [
    visibleGraph,
    selectedNodeId,
    highlightedNodeId,
    activeNodeIds,
    hasNodeFocus,
    searchActive,
    searchMatchingNodeIds,
  ])

  const flowEdges = useMemo(
    () =>
      buildFlowEdgesWithHighlight(
        visibleGraph.edges,
        hasNodeFocus,
        activeEdgeIds,
        highlightedEdgeId,
      ).map((edge) => {
        let next = edge

        if (searchActive && searchMatchingNodeIds) {
          const touchesMatch =
            searchMatchingNodeIds.has(edge.source) || searchMatchingNodeIds.has(edge.target)
          const prevStyle = edge.style as { opacity?: number } | undefined
          const baseOp = Number(prevStyle?.opacity ?? 1)
          next = {
            ...edge,
            style: {
              ...edge.style,
              opacity: touchesMatch ? baseOp : SEARCH_NONMATCH_EDGE_OPACITY,
            },
          }
        }

        if (next.id !== selectedEdgeId) return next
        const style =
          (next.style as { strokeWidth?: number; opacity?: number; stroke?: string } | undefined) ??
          {}
        return {
          ...next,
          style: {
            ...style,
            opacity: 1,
            strokeWidth: Math.max(Number(style.strokeWidth ?? 1), GRAPH_THEME.edge.selectedStrokeWidth),
          },
          zIndex: 9998,
        }
      }),
    [
      visibleGraph.edges,
      hasNodeFocus,
      activeEdgeIds,
      highlightedEdgeId,
      selectedEdgeId,
      searchActive,
      searchMatchingNodeIds,
    ],
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
