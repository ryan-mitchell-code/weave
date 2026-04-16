/** Focus dimming and hover debounce shared by GraphView. */
export const FOCUS_INACTIVE_NODE_OPACITY = 0.25
export const NODE_OPACITY_TRANSITION = 'opacity 0.15s ease'
export const HOVER_LEAVE_MS = 75

/** Name-search overlay (phase 1): non-matching nodes/edges. */
export const SEARCH_NONMATCH_NODE_OPACITY = 0.2
export const SEARCH_NONMATCH_EDGE_OPACITY = 0.12
/** Glow only — no transform, so node positions stay fixed in the layout. */
export const SEARCH_MATCH_NODE_GLOW = 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.45))'
