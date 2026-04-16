import { MarkerType } from 'reactflow'
import type { Edge } from '../api/client'
import { GRAPH_THEME } from './graphTheme'

const FOCUS_INACTIVE_EDGE_OPACITY = 0.15
const FOCUS_ACTIVE_EDGE_STROKE = 2.75
const OPACITY_TRANSITION = 'opacity 0.15s ease'

function formatKindLabel(kind: string): string {
  const spaced = kind.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
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

function buildFlowEdges(
  edges: Edge[],
  hasNodeFocus: boolean,
  activeEdgeIds: Set<string>,
  highlightedEdgeId: string | null,
) {
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
    const isEdgeActive = !hasNodeFocus || activeEdgeIds.has(edge.id)
    const edgeOpacity = hasNodeFocus
      ? (isEdgeActive ? 1 : FOCUS_INACTIVE_EDGE_OPACITY)
      : GRAPH_THEME.edge.defaultOpacity
    const strokeWidth = hasNodeFocus
      ? (isEdgeActive ? FOCUS_ACTIVE_EDGE_STROKE : GRAPH_THEME.edge.defaultStrokeWidth)
      : GRAPH_THEME.edge.defaultStrokeWidth
    const labelOpacity = hasNodeFocus
      ? (isEdgeActive ? 1 : GRAPH_THEME.edge.labelDimmedOpacity * 0.75)
      : GRAPH_THEME.edge.labelDefaultOpacity

    const showFlow =
      (hasNodeFocus && isEdgeActive) ||
      (highlightedEdgeId != null && edge.id === highlightedEdgeId)

    return {
      id: edge.id,
      source: edge.from_id,
      target: edge.to_id,
      type: 'custom',
      data: { offset },
      label: formatKindLabel(edge.type),
      style: {
        stroke,
        strokeWidth,
        opacity: edgeOpacity,
        strokeLinecap: 'round',
        transition: `${OPACITY_TRANSITION}, stroke-width 0.15s ease`,
        ...(showFlow
          ? {
              strokeDasharray: '6 6',
              animation: 'flow 1.2s linear infinite',
              filter: `drop-shadow(0 0 2px ${stroke}66)`,
            }
          : {}),
      },
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
        fill: `rgba(${GRAPH_THEME.edge.labelFillRgb}, ${labelOpacity})`,
        fontWeight: 500,
      },
      labelShowBg: true,
      labelBgStyle: {
        fill: GRAPH_THEME.edge.labelBg,
        fillOpacity: hasNodeFocus
          ? (isEdgeActive ? GRAPH_THEME.edge.labelBgConnectedOpacity : GRAPH_THEME.edge.labelBgDimmedOpacity)
          : GRAPH_THEME.edge.labelBgDefaultOpacity,
      },
      labelBgPadding: GRAPH_THEME.edge.labelBgPadding,
    }
  })
}

export function buildFlowEdgesWithHighlight(
  edges: Edge[],
  hasNodeFocus: boolean,
  activeEdgeIds: Set<string>,
  highlightedEdgeId: string | null,
) {
  return buildFlowEdges(edges, hasNodeFocus, activeEdgeIds, highlightedEdgeId).map((edge) => {
    if (!highlightedEdgeId || edge.id !== highlightedEdgeId) return edge
    const style =
      (edge.style as {
        strokeWidth?: number
        opacity?: number
        stroke?: string
        strokeDasharray?: string
        animation?: string
        filter?: string
      } | undefined) ?? {}
    return {
      ...edge,
      style: {
        ...style,
        opacity: 1,
        strokeWidth: Math.max(Number(style.strokeWidth ?? 1), GRAPH_THEME.edge.highlightedStrokeWidth),
      },
      zIndex: 9999,
    }
  })
}
