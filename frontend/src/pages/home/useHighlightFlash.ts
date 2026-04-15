import { useCallback, useEffect, useRef, useState } from 'react'

const FLASH_MS = 1200

export function useHighlightFlash() {
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null)
  const [highlightedEdgeId, setHighlightedEdgeId] = useState<string | null>(null)
  const nodeHighlightTimerRef = useRef<number | null>(null)
  const edgeHighlightTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (nodeHighlightTimerRef.current) window.clearTimeout(nodeHighlightTimerRef.current)
      if (edgeHighlightTimerRef.current) window.clearTimeout(edgeHighlightTimerRef.current)
    }
  }, [])

  const flashNode = useCallback((nodeId: string, onSelect?: (id: string) => void) => {
    if (nodeHighlightTimerRef.current) window.clearTimeout(nodeHighlightTimerRef.current)
    setHighlightedNodeId(nodeId)
    onSelect?.(nodeId)
    nodeHighlightTimerRef.current = window.setTimeout(() => {
      setHighlightedNodeId((current) => (current === nodeId ? null : current))
    }, FLASH_MS)
  }, [])

  const flashEdge = useCallback((edgeId: string) => {
    if (edgeHighlightTimerRef.current) window.clearTimeout(edgeHighlightTimerRef.current)
    setHighlightedEdgeId(edgeId)
    edgeHighlightTimerRef.current = window.setTimeout(() => {
      setHighlightedEdgeId((current) => (current === edgeId ? null : current))
    }, FLASH_MS)
  }, [])

  const clearNodeHighlightIf = useCallback((nodeId: string) => {
    setHighlightedNodeId((curr) => (curr === nodeId ? null : curr))
  }, [])

  return {
    highlightedNodeId,
    highlightedEdgeId,
    flashNode,
    flashEdge,
    clearNodeHighlightIf,
  }
}
