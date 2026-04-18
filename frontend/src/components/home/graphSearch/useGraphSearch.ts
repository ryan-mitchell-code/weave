import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Node } from '../../../api/client'
import {
  GRAPH_SEARCH_RESULTS_LIMIT,
  buildGraphSearchMatchingSet,
  rankGraphSearchResults,
  type GraphSearchResultRow,
} from '../../../lib/graphSearchMatch'

export type UseGraphSearchOptions = {
  onResultPick: (nodeId: string) => void
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
 */
export function useGraphSearch(
  nodes: Node[],
  options: UseGraphSearchOptions,
): UseGraphSearchReturn {
  const { onResultPick } = options
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)

  const searchActive = query.trim().length > 0

  const results = useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed) return []
    return rankGraphSearchResults(nodes, trimmed, GRAPH_SEARCH_RESULTS_LIMIT)
  }, [nodes, query])

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
    return buildGraphSearchMatchingSet(nodes, query.trim().toLowerCase())
  }, [nodes, query, searchActive])

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
