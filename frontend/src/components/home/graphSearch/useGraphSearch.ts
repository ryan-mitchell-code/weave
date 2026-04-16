import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Node } from '../../../api/client'
import {
  GRAPH_SEARCH_RESULTS_LIMIT,
  buildGraphSearchMatchingSet,
  rankGraphSearchResults,
} from '../../../lib/graphSearchMatch'

export type UseGraphSearchOptions = {
  onResultPick: (nodeId: string) => void
}

export function useGraphSearch(nodes: Node[], options: UseGraphSearchOptions) {
  const { onResultPick } = options
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // When the result set shrinks, keep the active row in range (or clear it).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing list index to derived result count has no better single render-phase API
    setActiveIndex((i) => {
      if (results.length === 0) return -1
      if (i >= results.length) return results.length - 1
      return i
    })
  }, [results.length])

  useEffect(() => {
    const timerRef = blurTimerRef
    return () => {
      const t = timerRef.current
      if (t) clearTimeout(t)
    }
  }, [blurTimerRef])

  const matchingNodeIds = useMemo(() => {
    if (!searchActive) return null
    const q = query.trim().toLowerCase()
    return buildGraphSearchMatchingSet(nodes, q)
  }, [nodes, query, searchActive])

  const pickResult = useCallback(
    (nodeId: string) => {
      onResultPick(nodeId)
      setDropdownOpen(false)
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
    dropdownOpen,
    setDropdownOpen,
    blurTimerRef,
    pickResult,
  }
}
