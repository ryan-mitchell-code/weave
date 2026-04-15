export const GRAPH_THEME = {
  node: {
    width: 180,
    height: 48,
    baseBackground: '#1e293b',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: 1.35,
    selectedShadow: '0 0 0 3px rgba(59, 130, 246, 0.35), 0 6px 20px rgba(2, 6, 23, 0.45)',
    highlightedShadow: '0 0 0 3px rgba(250, 204, 21, 0.4), 0 8px 24px rgba(2, 6, 23, 0.5)',
    defaultShadow: '0 2px 10px rgba(2, 6, 23, 0.4)',
  },
  edge: {
    defaultOpacity: 0.42,
    dimmedOpacity: 0.05,
    defaultStrokeWidth: 1,
    connectedStrokeWidth: 2,
    highlightedStrokeWidth: 2.8,
    selectedStrokeWidth: 2.4,
    labelDefaultOpacity: 0.88,
    labelDimmedOpacity: 0.2,
    labelFillRgb: '226, 232, 240',
    labelBg: '#1e293b',
    labelBgDefaultOpacity: 0.85,
    labelBgConnectedOpacity: 0.95,
    labelBgDimmedOpacity: 0.35,
    labelBgPadding: [4, 2] as [number, number],
  },
  canvas: {
    border: '#1e293b',
    background: '#1e293b',
    dots: '#475569',
    borderRadius: 12,
  },
  layout: {
    nodesep: 48,
    ranksep: 72,
    marginx: 24,
    marginy: 24,
  },
} as const

export const TEAM_PALETTES = [
  {
    bg: GRAPH_THEME.node.baseBackground,
    border: '#16a34a',
    text: '#dcfce7',
    handle: '#22c55e',
  },
  {
    bg: GRAPH_THEME.node.baseBackground,
    border: '#0284c7',
    text: '#e0f2fe',
    handle: '#38bdf8',
  },
  {
    bg: GRAPH_THEME.node.baseBackground,
    border: '#ca8a04',
    text: '#fef3c7',
    handle: '#f59e0b',
  },
  {
    bg: GRAPH_THEME.node.baseBackground,
    border: '#9333ea',
    text: '#f3e8ff',
    handle: '#a855f7',
  },
] as const
