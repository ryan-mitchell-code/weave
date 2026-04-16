import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Edge, Node } from '../../api/client'
import { formatDisplayName } from '../../lib/displayFormat'
import {
  buildQuickSuggestions,
  findNodeByName,
  getExactNodeMatchForQuickInput,
  parseQuickContext,
} from './quickInputLogic'
import { executeQuickCommand } from './quickCommandExecute'

const QUICK_LISTBOX_ID = 'quick-input-suggestions'

export type QuickCommandDeps = {
  nodes: Node[]
  setNodes: Dispatch<SetStateAction<Node[]>>
  setEdges: Dispatch<SetStateAction<Edge[]>>
  setError: (message: string | null) => void
  setSelectedNodeId: (id: string | null) => void
  setSelectedEdgeId: (id: string | null) => void
  flashNode: (nodeId: string) => void
  flashEdge: (edgeId: string) => void
  loading: boolean
}

export function useQuickCommand({
  nodes,
  setNodes,
  setEdges,
  setError,
  setSelectedNodeId,
  setSelectedEdgeId,
  flashNode,
  flashEdge,
  loading,
}: QuickCommandDeps) {
  const [quickInput, setQuickInput] = useState('')
  const [quickSaving, setQuickSaving] = useState(false)
  const [recentNodeIds, setRecentNodeIds] = useState<string[]>([])
  const [quickSuggestionsOpen, setQuickSuggestionsOpen] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const prevQuickTrimmedRef = useRef<string | null>(null)

  const markRecent = useCallback((nodeId: string) => {
    setRecentNodeIds((prev) => [nodeId, ...prev.filter((id) => id !== nodeId)].slice(0, 10))
  }, [])

  const navigateToNode = useCallback(
    (nodeId: string, inputValue?: string) => {
      setSelectedNodeId(nodeId)
      setSelectedEdgeId(null)
      markRecent(nodeId)
      if (typeof inputValue === 'string') {
        setQuickInput(inputValue)
        setQuickSuggestionsOpen(true)
      } else {
        setQuickSuggestionsOpen(false)
      }
    },
    [markRecent, setSelectedEdgeId, setSelectedNodeId],
  )

  const quickContext = useMemo(() => parseQuickContext(quickInput), [quickInput])

  const builtQuickSuggestions = useMemo(
    () => buildQuickSuggestions(nodes, quickContext, recentNodeIds),
    [nodes, quickContext, recentNodeIds],
  )

  const exactMatchNode = useMemo(
    () => getExactNodeMatchForQuickInput(nodes, quickContext),
    [nodes, quickContext],
  )

  const quickSuggestions = useMemo(() => {
    if (!exactMatchNode) return builtQuickSuggestions
    return builtQuickSuggestions.filter((n) => n.id !== exactMatchNode.id)
  }, [builtQuickSuggestions, exactMatchNode])

  useEffect(() => {
    const trimmed = quickContext.trimmed
    if (quickContext.mode !== 'node') {
      prevQuickTrimmedRef.current = trimmed
      return
    }
    const trimChanged = prevQuickTrimmedRef.current !== trimmed
    prevQuickTrimmedRef.current = trimmed
    if (!trimChanged || !exactMatchNode) return
    setSelectedNodeId(exactMatchNode.id)
    setSelectedEdgeId(null)
    markRecent(exactMatchNode.id)
  }, [
    exactMatchNode,
    quickContext.mode,
    quickContext.trimmed,
    markRecent,
    setSelectedEdgeId,
    setSelectedNodeId,
  ])

  useEffect(() => {
    if (!quickSuggestionsOpen || quickSuggestions.length === 0) {
      setActiveSuggestionIndex(-1)
      return
    }
    setActiveSuggestionIndex((current) => Math.min(current, quickSuggestions.length - 1))
  }, [quickSuggestionsOpen, quickSuggestions.length])

  const applyQuickSuggestion = useCallback(
    (nodeName: string) => {
      const n = findNodeByName(nodes, nodeName)
      if (!n) return
      setActiveSuggestionIndex(-1)
      if (quickContext.mode === 'edge') {
        const sep = quickContext.delimiter === 'to' ? ' to ' : ' -> '
        const nextInput = `${quickContext.left}${sep}${formatDisplayName(nodeName.trim())}`
        navigateToNode(n.id, nextInput)
        return
      }
      navigateToNode(n.id, formatDisplayName(n.name))
    },
    [nodes, navigateToNode, quickContext],
  )

  const handleQuickCreate = useCallback(async () => {
    const raw = quickInput.trim()
    if (!raw || quickSaving || loading) return
    const parsed = parseQuickContext(quickInput)
    if (parsed.mode === 'node' && parsed.trimmed && findNodeByName(nodes, parsed.trimmed)) {
      return
    }
    setError(null)
    setQuickSaving(true)
    try {
      const result = await executeQuickCommand(raw, nodes)
      if (result.type === 'error') {
        setError(result.message)
        return
      }
      if (result.type === 'abort') {
        return
      }
      if (result.type === 'edge') {
        const { edge } = result
        setEdges((prev) => [...prev, edge])
        markRecent(edge.from_id)
        markRecent(edge.to_id)
        flashEdge(edge.id)
        setSelectedNodeId(null)
        setSelectedEdgeId(edge.id)
      } else {
        const { node } = result
        setNodes((prev) => [...prev, node])
        markRecent(node.id)
        flashNode(node.id)
      }
      setQuickInput('')
      setQuickSuggestionsOpen(false)
      setActiveSuggestionIndex(-1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quick create failed. Try again.')
    } finally {
      setQuickSaving(false)
    }
  }, [
    flashEdge,
    flashNode,
    loading,
    markRecent,
    nodes,
    quickInput,
    quickSaving,
    setEdges,
    setError,
    setNodes,
    setSelectedEdgeId,
    setSelectedNodeId,
  ])

  return {
    quickInput,
    setQuickInput,
    quickSaving,
    quickSuggestionsOpen,
    setQuickSuggestionsOpen,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    quickContext,
    quickSuggestions,
    exactMatchNode,
    quickListboxId: QUICK_LISTBOX_ID,
    applyQuickSuggestion,
    handleQuickCreate,
    markRecentNode: markRecent,
  }
}
