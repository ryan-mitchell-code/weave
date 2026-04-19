import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { searchNodes, type Node, type SearchNodeHit } from '../../../api/client'
import {
  GRAPH_SEARCH_RESULTS_LIMIT,
  buildGraphSearchMatchingSet,
  graphSearchResultRowForMatch,
  nodeMatchesSearchQuery,
  rankGraphSearchResults,
  type GraphSearchResultRow,
} from '../../../lib/graphSearchMatch'

const SEARCH_BACKEND_DEBOUNCE_MS = 150
/** When backend order differs a lot from what we last showed, defer swap to reduce list jump. */
const SEARCH_RANK_STABILIZE_DELAY_MS = 50
/** Max index positions that may differ in the top-N id list to still apply ranking immediately. */
const SEARCH_RANK_STABILIZE_MAX_MISMATCH = 2

function isAbortError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name: string }).name === 'AbortError'
  )
}

/** Compare ordered id lists position-by-position (length up to `GRAPH_SEARCH_RESULTS_LIMIT`; shorter lists pad with undefined). */
function topNodeIdMismatches(a: string[], b: string[]): number {
  let n = 0
  for (let i = 0; i < GRAPH_SEARCH_RESULTS_LIMIT; i++) {
    if (a[i] !== b[i]) n++
  }
  return n
}

function selectedNodeIdForSearch(
  id: string | null | undefined,
): string | undefined {
  if (id == null || id === '') return undefined
  return id
}

export type UseGraphSearchOptions = {
  onResultPick: (nodeId: string) => void
  /** Passed to GET /search for graph-proximity ranking; optional. */
  selectedNodeId?: string | null
}

export type UseGraphSearchReturn = {
  query: string
  setQuery: (value: string) => void
  searchActive: boolean
  matchingNodeIds: Set<string> | null
  previewNodeId: string | null
  results: GraphSearchResultRow[]
  activeIndex: number
  setActiveIndex: (next: number | ((prev: number) => number)) => void
  pickResult: (nodeId: string) => void
  resetActive: () => void
}

/**
 * Owns all graph-search state: the query, the ranked result rows, and the
 * currently-previewed row (keyboard/hover). DOM concerns (dropdown open,
 * input blur debounce, combobox wiring) live in `GraphSearchInput`.
 *
 * IMPORTANT:
 * Matching (which nodes match the query) is frontend-owned — see
 * `nodeMatchesSearchQuery` / `buildGraphSearchMatchingSet` (graph overlay).
 * Backend is ranking-only. That keeps overlay and dropdown aligned.
 */
export function useGraphSearch(
  nodes: Node[],
  options: UseGraphSearchOptions,
): UseGraphSearchReturn {
  const { onResultPick, selectedNodeId } = options
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [backendResults, setBackendResults] = useState<SearchNodeHit[]>([])
  const [displayedBackendResults, setDisplayedBackendResults] = useState<
    SearchNodeHit[]
  >([])

  const prevTrimmedQueryForStaleClearRef = useRef<string | null>(null)
  const lastDisplayedTopIdsRef = useRef<string[]>([])

  const trimmedQuery = query.trim()
  const qLower = trimmedQuery.toLowerCase()

  const searchActive = trimmedQuery.length > 0

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  /**
   * Drop backend payload as soon as the trimmed query changes so we never mix
   * one request’s hits with another query’s `qLower` (avoids a stale frame).
   * `selectedNodeId` changes alone do not clear — ranking refetches in the effect below.
   */
  useLayoutEffect(() => {
    if (prevTrimmedQueryForStaleClearRef.current === trimmedQuery) return
    prevTrimmedQueryForStaleClearRef.current = trimmedQuery
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale search payload when trimmed query changes (before paint)
    setBackendResults([])
  }, [trimmedQuery])

  /** Backend hits that also pass frontend match rules (same as graph overlay). */
  const eligibleBackendHits = useMemo(() => {
    if (backendResults.length === 0) return []
    const out: SearchNodeHit[] = []
    for (const hit of backendResults) {
      const node = nodeById.get(hit.node.id) ?? hit.node
      if (!nodeMatchesSearchQuery(node, qLower)) continue
      out.push(hit)
    }
    return out
  }, [backendResults, qLower, nodeById])

  /**
   * Smooth handoff from client-ranked → server-ranked list: if the top few
   * row ids barely change (e.g. proximity tweak), apply immediately; if the
   * order jumps a lot, defer one frame tick so the swap is less jarring.
   */
  /* eslint-disable react-hooks/set-state-in-effect -- sync displayedBackendResults from eligibleBackendHits (derived list + delayed swap) */
  useEffect(() => {
    if (eligibleBackendHits.length === 0) {
      setDisplayedBackendResults([])
      lastDisplayedTopIdsRef.current = []
      return
    }

    const newTopIds = eligibleBackendHits
      .slice(0, GRAPH_SEARCH_RESULTS_LIMIT)
      .map((h) => h.node.id)
    const prevTop = lastDisplayedTopIdsRef.current

    if (prevTop.length === 0) {
      setDisplayedBackendResults(eligibleBackendHits)
      lastDisplayedTopIdsRef.current = newTopIds
      return
    }

    const mismatches = topNodeIdMismatches(prevTop, newTopIds)
    if (mismatches <= SEARCH_RANK_STABILIZE_MAX_MISMATCH) {
      setDisplayedBackendResults(eligibleBackendHits)
      lastDisplayedTopIdsRef.current = newTopIds
      return
    }

    const t = window.setTimeout(() => {
      setDisplayedBackendResults(eligibleBackendHits)
      lastDisplayedTopIdsRef.current = newTopIds
    }, SEARCH_RANK_STABILIZE_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [eligibleBackendHits])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!trimmedQuery) return

    const ac = new AbortController()
    let alive = true

    const timer = window.setTimeout(() => {
      void searchNodes(trimmedQuery, selectedNodeIdForSearch(selectedNodeId), {
        signal: ac.signal,
      })
        .then((hits) => {
          if (!alive) return
          setBackendResults(hits)
        })
        .catch((err: unknown) => {
          if (!alive) return
          if (isAbortError(err)) return
          console.error('Graph search backend ranking failed:', err)
        })
    }, SEARCH_BACKEND_DEBOUNCE_MS)

    return () => {
      alive = false
      window.clearTimeout(timer)
      ac.abort()
    }
  }, [trimmedQuery, selectedNodeId])

  const results = useMemo(() => {
    if (!trimmedQuery) return []

    // No server-ranked rows yet → client ranking (instant while debounced fetch runs).
    if (displayedBackendResults.length === 0) {
      return rankGraphSearchResults(
        nodes,
        trimmedQuery,
        GRAPH_SEARCH_RESULTS_LIMIT,
      )
    }

    const rows: GraphSearchResultRow[] = []
    for (const hit of displayedBackendResults) {
      if (rows.length >= GRAPH_SEARCH_RESULTS_LIMIT) break
      const node = nodeById.get(hit.node.id) ?? hit.node
      // Defensive: `nodes` may update while displayed list still reflects a prior fetch.
      if (!nodeMatchesSearchQuery(node, qLower)) continue
      const row = graphSearchResultRowForMatch(node, trimmedQuery)
      if (row) rows.push(row)
    }

    if (rows.length > 0) return rows

    return rankGraphSearchResults(
      nodes,
      trimmedQuery,
      GRAPH_SEARCH_RESULTS_LIMIT,
    )
  }, [nodes, trimmedQuery, qLower, displayedBackendResults, nodeById])

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug('search:', {
        query: trimmedQuery,
        backendCount: backendResults.length,
        finalCount: results.length,
      })
    }
  }, [trimmedQuery, backendResults.length, results.length])

  const previewNodeId = useMemo(() => {
    if (results.length === 0) return null
    if (activeIndex >= 0) return results[activeIndex]?.node.id ?? null
    return results[0]?.node.id ?? null
  }, [results, activeIndex])

  // Keep the active row in range when the result set shrinks.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing list index to derived result count has no better single render-phase API
    setActiveIndex((i) => {
      if (results.length === 0) return -1
      if (i >= results.length) return results.length - 1
      return i
    })
  }, [results.length])

  const matchingNodeIds = useMemo(() => {
    if (!searchActive) return null
    return buildGraphSearchMatchingSet(nodes, qLower)
  }, [nodes, qLower, searchActive])

  const resetActive = useCallback(() => setActiveIndex(-1), [])

  const pickResult = useCallback(
    (nodeId: string) => {
      onResultPick(nodeId)
      setActiveIndex(-1)
    },
    [onResultPick],
  )

  return {
    query,
    setQuery,
    searchActive,
    matchingNodeIds,
    previewNodeId,
    results,
    activeIndex,
    setActiveIndex,
    pickResult,
    resetActive,
  }
}
