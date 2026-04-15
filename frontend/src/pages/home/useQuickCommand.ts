import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { createEdge, createNode, type Edge, type Node } from '../../api/client'
import { EDGE_TYPE_OPTIONS } from './constants'
import {
  buildQuickSuggestions,
  findNodeByName,
  parseQuickContext,
} from './quickInputLogic'

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

  const quickSuggestions = useMemo(
    () => buildQuickSuggestions(nodes, quickContext, recentNodeIds),
    [nodes, quickContext, recentNodeIds],
  )

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
        const nextInput = `${quickContext.left}${sep}${nodeName.trim()}`
        navigateToNode(n.id, nextInput)
        return
      }
      navigateToNode(n.id, n.name)
    },
    [nodes, navigateToNode, quickContext],
  )

  const handleQuickCreate = useCallback(async () => {
    const raw = quickInput.trim()
    if (!raw || quickSaving || loading) return
    setError(null)
    setQuickSaving(true)
    try {
      const arrowIdx = raw.indexOf('->')
      const toMatch = raw.match(/^(.+?)\s+to\s+(.+)$/i)
      let left = ''
      let right = ''
      let edgeType = 'works_with'

      if (arrowIdx >= 0) {
        left = raw.slice(0, arrowIdx).trim()
        const rightRaw = raw.slice(arrowIdx + 2).trim()
        const colonMatch = rightRaw.match(/^(.+?)\s*:\s*([a-z_]+)$/i)
        if (colonMatch) {
          right = colonMatch[1].trim()
          edgeType = colonMatch[2].trim().toLowerCase()
        } else {
          const parts = rightRaw.split(/\s+/).filter(Boolean)
          const maybeType = (parts[parts.length - 1] ?? '').toLowerCase()
          if (
            parts.length >= 2 &&
            EDGE_TYPE_OPTIONS.includes(maybeType as (typeof EDGE_TYPE_OPTIONS)[number])
          ) {
            right = parts.slice(0, -1).join(' ')
            edgeType = maybeType
          } else {
            right = rightRaw
          }
        }
      } else if (toMatch) {
        left = toMatch[1].trim()
        right = toMatch[2].trim()
      } else {
        const tokens = raw.split(/\s+/).filter(Boolean)
        if (tokens.length >= 2) {
          const maybeFrom = findNodeByName(nodes, tokens[0])
          const maybeTo = findNodeByName(nodes, tokens[1])
          if (maybeFrom && maybeTo) {
            left = tokens[0]
            right = tokens[1]
          }
        }
      }

      if (left || right) {
        if (!left || !right) {
          setError('Use "alice -> bob" (or "alice to bob") format for edges.')
          return
        }
        const fromNode = findNodeByName(nodes, left)
        const toNode = findNodeByName(nodes, right)
        if (!fromNode || !toNode) {
          setError('Both nodes must already exist to create an edge.')
          return
        }
        const newEdge = await createEdge({
          from_id: fromNode.id,
          to_id: toNode.id,
          type: edgeType,
        })
        setEdges((prev) => [...prev, newEdge])
        markRecent(fromNode.id)
        markRecent(toNode.id)
        flashEdge(newEdge.id)
        setSelectedNodeId(null)
        setSelectedEdgeId(newEdge.id)
      } else {
        const parts = raw.split(/\s+/).filter(Boolean)
        const namePart = parts[0] ?? ''
        const teamPart = parts.slice(1).join(' ')
        if (!namePart) return
        const newNode = await createNode({ name: namePart, team: teamPart || undefined })
        setNodes((prev) => [...prev, newNode])
        markRecent(newNode.id)
        flashNode(newNode.id)
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
    quickListboxId: QUICK_LISTBOX_ID,
    applyQuickSuggestion,
    handleQuickCreate,
    markRecentNode: markRecent,
  }
}
