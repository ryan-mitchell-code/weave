import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createEdge,
  createNode,
  deleteNode,
  fetchGraph,
  updateNode,
  updateEdgeType,
  type Edge,
  type Node,
} from '../api/client'
import { GraphView } from '../graph/GraphView'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { DetailsPanel } from '../components/home/details/DetailsPanel'

const EDGE_TYPE_OPTIONS = ['works_with', 'reports_to', 'depends_on'] as const

function formatEdgeTypeLabel(type: string): string {
  const withSpaces = type.replace(/_/g, ' ')
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [quickInput, setQuickInput] = useState('')
  const [quickSaving, setQuickSaving] = useState(false)
  const [edgeTypeSaving, setEdgeTypeSaving] = useState(false)
  const [nodeSaving, setNodeSaving] = useState(false)
  const [nodeNameDraft, setNodeNameDraft] = useState('')
  const [nodeTeamDraft, setNodeTeamDraft] = useState('')
  const [recentNodeIds, setRecentNodeIds] = useState<string[]>([])
  const [quickSuggestionsOpen, setQuickSuggestionsOpen] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const [focusMode, setFocusMode] = useState(false)
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null)
  const [highlightedEdgeId, setHighlightedEdgeId] = useState<string | null>(null)
  const nodeHighlightTimerRef = useRef<number | null>(null)
  const edgeHighlightTimerRef = useRef<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const graph = await fetchGraph()
      setNodes(graph.nodes)
      setEdges(graph.edges)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load graph')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (selectedNodeId && !nodes.some((n) => n.id === selectedNodeId)) {
      setSelectedNodeId(null)
    }
  }, [nodes, selectedNodeId])

  useEffect(() => {
    if (selectedEdgeId && !edges.some((e) => e.id === selectedEdgeId)) {
      setSelectedEdgeId(null)
    }
  }, [edges, selectedEdgeId])

  useEffect(() => {
    return () => {
      if (nodeHighlightTimerRef.current) window.clearTimeout(nodeHighlightTimerRef.current)
      if (edgeHighlightTimerRef.current) window.clearTimeout(edgeHighlightTimerRef.current)
    }
  }, [])

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : undefined
  const selectedEdge = selectedEdgeId
    ? edges.find((e) => e.id === selectedEdgeId)
    : undefined
  const edgeTypeOptions = useMemo(() => {
    const set = new Set<string>(EDGE_TYPE_OPTIONS)
    for (const e of edges) set.add(e.type)
    return [...set]
  }, [edges])

  const connectedEdges =
    selectedNodeId == null
      ? []
      : edges.filter(
          (e) => e.from_id === selectedNodeId || e.to_id === selectedNodeId,
        )

  useEffect(() => {
    if (!selectedNode) return
    setNodeNameDraft(selectedNode.name)
    setNodeTeamDraft(selectedNode.team ?? '')
  }, [selectedNode])

  function markRecentNode(nodeId: string) {
    setRecentNodeIds((prev) => [nodeId, ...prev.filter((id) => id !== nodeId)].slice(0, 10))
  }

  function flashNode(nodeId: string) {
    if (nodeHighlightTimerRef.current) window.clearTimeout(nodeHighlightTimerRef.current)
    setHighlightedNodeId(nodeId)
    setSelectedNodeId(nodeId)
    nodeHighlightTimerRef.current = window.setTimeout(() => {
      setHighlightedNodeId((current) => (current === nodeId ? null : current))
    }, 1200)
  }

  function flashEdge(edgeId: string) {
    if (edgeHighlightTimerRef.current) window.clearTimeout(edgeHighlightTimerRef.current)
    setHighlightedEdgeId(edgeId)
    edgeHighlightTimerRef.current = window.setTimeout(() => {
      setHighlightedEdgeId((current) => (current === edgeId ? null : current))
    }, 1200)
  }

  function navigateToNode(nodeId: string, inputValue?: string) {
    setSelectedNodeId(nodeId)
    setSelectedEdgeId(null)
    markRecentNode(nodeId)
    setQuickSuggestionsOpen(false)
    if (typeof inputValue === 'string') setQuickInput(inputValue)
  }

  const rankSuggestedNodes = useCallback((list: Node[], query: string): Node[] => {
    const q = query.trim().toLowerCase()
    const recentRank = new Map(recentNodeIds.map((id, i) => [id, i]))
    return [...list].sort((a, b) => {
      const aRecent = recentRank.get(a.id) ?? Number.POSITIVE_INFINITY
      const bRecent = recentRank.get(b.id) ?? Number.POSITIVE_INFINITY
      if (aRecent !== bRecent) return aRecent - bRecent
      const aName = a.name.trim().toLowerCase()
      const bName = b.name.trim().toLowerCase()
      const aStarts = q ? (aName.startsWith(q) ? 0 : 1) : 0
      const bStarts = q ? (bName.startsWith(q) ? 0 : 1) : 0
      if (aStarts !== bStarts) return aStarts - bStarts
      return aName.localeCompare(bName)
    })
  }, [recentNodeIds])

  const quickContext = useMemo(() => {
    const raw = quickInput
    const trimmed = raw.trim()
    const arrowIdx = raw.indexOf('->')
    if (arrowIdx >= 0) {
      return {
        mode: 'edge' as const,
        delimiter: 'arrow' as const,
        left: raw.slice(0, arrowIdx).trim(),
        right: raw.slice(arrowIdx + 2).trim(),
        trimmed,
      }
    }
    const toMatch = raw.match(/^(.+?)\s+to\s*(.*)$/i)
    if (toMatch) {
      return {
        mode: 'edge' as const,
        delimiter: 'to' as const,
        left: toMatch[1].trim(),
        right: toMatch[2].trim(),
        trimmed,
      }
    }
    return {
      mode: 'node' as const,
      delimiter: null,
      left: '',
      right: '',
      trimmed,
    }
  }, [quickInput])

  const findNodeByName = useCallback((rawName: string): Node | undefined => {
    const q = rawName.trim().toLowerCase()
    if (!q) return undefined
    return nodes.find((n) => n.name.trim().toLowerCase() === q)
  }, [nodes])

  const quickSuggestions = useMemo(() => {
    if (!quickContext.trimmed) return []
    if (quickContext.mode === 'edge') {
      const fromNode = findNodeByName(quickContext.left)
      const q = quickContext.right.toLowerCase()
      const pool = fromNode
        ? nodes.filter((n) => n.id !== fromNode.id)
        : nodes
      const filtered = q
        ? pool.filter((n) => n.name.toLowerCase().includes(q))
        : pool
      return rankSuggestedNodes(filtered, q).slice(0, 8)
    }
    const q = quickContext.trimmed.toLowerCase()
    const filtered = nodes.filter((n) => n.name.toLowerCase().includes(q))
    return rankSuggestedNodes(filtered, q).slice(0, 8)
  }, [nodes, quickContext, findNodeByName, rankSuggestedNodes])

  const quickListboxId = 'quick-input-suggestions'

  useEffect(() => {
    if (!quickSuggestionsOpen || quickSuggestions.length === 0) {
      setActiveSuggestionIndex(-1)
      return
    }
    setActiveSuggestionIndex((current) => Math.min(current, quickSuggestions.length - 1))
  }, [quickSuggestionsOpen, quickSuggestions.length])

  function applyQuickSuggestion(nodeName: string) {
    const n = findNodeByName(nodeName)
    if (!n) return
    setActiveSuggestionIndex(-1)
    navigateToNode(n.id, n.name)
  }

  async function handleQuickCreate() {
    const raw = quickInput.trim()
    if (!raw || quickSaving) return
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
          if (parts.length >= 2 && EDGE_TYPE_OPTIONS.includes(maybeType as (typeof EDGE_TYPE_OPTIONS)[number])) {
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
          const maybeFrom = findNodeByName(tokens[0])
          const maybeTo = findNodeByName(tokens[1])
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
        const fromNode = findNodeByName(left)
        const toNode = findNodeByName(right)
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
        markRecentNode(fromNode.id)
        markRecentNode(toNode.id)
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
        markRecentNode(newNode.id)
        flashNode(newNode.id)
      }
      setQuickInput('')
      setQuickSuggestionsOpen(false)
      setActiveSuggestionIndex(-1)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Quick create failed. Try again.',
      )
    } finally {
      setQuickSaving(false)
    }
  }

  async function handleEdgeTypeChange(nextType: string) {
    if (!selectedEdge || edgeTypeSaving) return
    setEdgeTypeSaving(true)
    setError(null)
    try {
      const updated = await updateEdgeType({ id: selectedEdge.id, type: nextType })
      setEdges((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      flashEdge(updated.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update edge type.')
    } finally {
      setEdgeTypeSaving(false)
    }
  }

  async function persistSelectedNode(name: string, team: string) {
    if (!selectedNode || nodeSaving) return
    const nextName = name.trim()
    const nextTeam = team.trim()
    if (!nextName) {
      setNodeNameDraft(selectedNode.name)
      setError('Name is required.')
      return
    }
    if (nextName === selectedNode.name && nextTeam === (selectedNode.team ?? '')) return
    setNodeSaving(true)
    setError(null)
    try {
      const updated = await updateNode({
        id: selectedNode.id,
        name: nextName,
        team: nextTeam || undefined,
      })
      setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
      setNodeNameDraft(updated.name)
      setNodeTeamDraft(updated.team ?? '')
      markRecentNode(updated.id)
      flashNode(updated.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update node.')
    } finally {
      setNodeSaving(false)
    }
  }

  const handleDeleteNode = useCallback(async (nodeId: string) => {
    setError(null)
    try {
      await deleteNode({ id: nodeId })
      setNodes((prev) => prev.filter((n) => n.id !== nodeId))
      setEdges((prev) => prev.filter((e) => e.from_id !== nodeId && e.to_id !== nodeId))
      setSelectedNodeId(null)
      setSelectedEdgeId(null)
      setHighlightedNodeId((curr) => (curr === nodeId ? null : curr))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete node.')
    }
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete' || !selectedNodeId) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      e.preventDefault()
      void handleDeleteNode(selectedNodeId)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedNodeId, handleDeleteNode])

  function nodeLabel(id: string): string {
    const n = nodes.find((x) => x.id === id)
    if (!n) return id
    const teamLabel = n.team?.trim()
    return teamLabel ? `${n.name} (${teamLabel})` : n.name
  }

  return (
    <div className="flex h-screen font-sans">
      {error && (
        <p
          role="alert"
          className="m-0 border-b border-rose-200 bg-rose-50 px-3 py-2 text-rose-700"
        >
          {error}
        </p>
      )}
      <div className="flex w-full gap-4 p-4">
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
          <header className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-5 py-4">
            <h1 className="whitespace-nowrap text-base font-semibold">Weave</h1>
            <div className="relative min-w-0 flex-1">
              <Input
                aria-label="Quick add node or edge"
                type="text"
                value={quickInput}
                role="combobox"
                aria-expanded={quickSuggestionsOpen && quickSuggestions.length > 0}
                aria-controls={quickListboxId}
                aria-activedescendant={
                  activeSuggestionIndex >= 0 && quickSuggestions[activeSuggestionIndex]
                    ? `${quickListboxId}-${quickSuggestions[activeSuggestionIndex].id}`
                    : undefined
                }
                onChange={(e) => {
                  setQuickInput(e.target.value)
                  setActiveSuggestionIndex(-1)
                }}
                onFocus={() => {
                  setQuickSuggestionsOpen(true)
                }}
                onBlur={() => {
                  window.setTimeout(() => setQuickSuggestionsOpen(false), 120)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' && quickSuggestions.length > 0) {
                    e.preventDefault()
                    setQuickSuggestionsOpen(true)
                    setActiveSuggestionIndex((idx) => (idx + 1) % quickSuggestions.length)
                  } else if (e.key === 'ArrowUp' && quickSuggestions.length > 0) {
                    e.preventDefault()
                    setQuickSuggestionsOpen(true)
                    setActiveSuggestionIndex((idx) =>
                      idx <= 0 ? quickSuggestions.length - 1 : idx - 1,
                    )
                  } else if (
                    e.key === 'Enter' &&
                    quickSuggestionsOpen &&
                    activeSuggestionIndex >= 0 &&
                    quickSuggestions[activeSuggestionIndex]
                  ) {
                    e.preventDefault()
                    applyQuickSuggestion(quickSuggestions[activeSuggestionIndex].name)
                  } else if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleQuickCreate()
                  } else if (e.key === 'Escape') {
                    setQuickSuggestionsOpen(false)
                    setActiveSuggestionIndex(-1)
                  }
                }}
                placeholder='Quick add: "alice payments" or "alice -> bob"'
                disabled={quickSaving || loading}
                className="w-full"
              />
              {quickSuggestionsOpen &&
                quickInput.trim() !== '' &&
                quickSuggestions.length > 0 && (
                  <div
                    id={quickListboxId}
                    role="listbox"
                    className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-lg"
                  >
                    {quickContext.mode === 'edge' && (
                      <div className="border-b border-slate-700 px-2.5 py-1.5 text-xs text-slate-400">
                        Suggested nodes
                      </div>
                    )}
                    {quickSuggestions.map((n, idx) => (
                      <button
                        key={n.id}
                        id={`${quickListboxId}-${n.id}`}
                        role="option"
                        aria-selected={idx === activeSuggestionIndex}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActiveSuggestionIndex(idx)}
                        onClick={() => applyQuickSuggestion(n.name)}
                        className={`block w-full cursor-pointer border-none bg-transparent px-2.5 py-2 text-left hover:bg-slate-700 ${
                          idx === activeSuggestionIndex ? 'bg-slate-700' : ''
                        }`}
                      >
                        <div className="text-sm">{n.name}</div>
                        {n.team?.trim() && (
                          <div className="text-xs text-slate-400">
                            {n.team.trim()}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
            </div>
            <div className="flex gap-2 whitespace-nowrap">
              <Button
                type="button"
                onClick={() => setFocusMode((v) => !v)}
                variant={focusMode ? 'secondary' : 'outline'}
              >
                Focus Mode
              </Button>
            </div>
          </header>
          <div className="flex-1 min-h-0 p-6">
            {!loading && nodes.length === 0 && (
              <p className="mt-0 text-slate-400">Add nodes to see the graph.</p>
            )}
            {!loading && nodes.length > 0 && (
              <GraphView
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNodeId}
                selectedEdgeId={selectedEdgeId}
                highlightedNodeId={highlightedNodeId}
                highlightedEdgeId={highlightedEdgeId}
                focusMode={focusMode}
                onNodeClick={(nodeId) => {
                  setSelectedNodeId(nodeId)
                  setSelectedEdgeId(null)
                  markRecentNode(nodeId)
                }}
                onEdgeClick={(edgeId) => {
                  setSelectedEdgeId(edgeId)
                  setSelectedNodeId(null)
                }}
                onPaneClick={() => {
                  setSelectedNodeId(null)
                  setSelectedEdgeId(null)
                }}
                height="100%"
              />
            )}
          </div>
        </section>

        {(selectedNodeId != null || selectedEdgeId != null) && (
          <DetailsPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            nodeNameDraft={nodeNameDraft}
            nodeTeamDraft={nodeTeamDraft}
            nodeSaving={nodeSaving}
            edgeTypeSaving={edgeTypeSaving}
            connectedEdges={connectedEdges}
            edgeTypeOptions={edgeTypeOptions}
            nodeLabel={nodeLabel}
            formatEdgeTypeLabel={formatEdgeTypeLabel}
            onNodeNameChange={setNodeNameDraft}
            onNodeTeamChange={setNodeTeamDraft}
            onPersistNode={(name, team) => {
              void persistSelectedNode(name, team)
            }}
            onDeleteNode={(nodeId) => {
              void handleDeleteNode(nodeId)
            }}
            onEdgeTypeChange={(nextType) => {
              void handleEdgeTypeChange(nextType)
            }}
          />
        )}
      </div>
    </div>
  )
}
