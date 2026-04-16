import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
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
import { QuickInputBar } from '../components/home/QuickInputBar'
import { DetailsPanel } from '../components/home/details/DetailsPanel'
import { formatDisplayName } from '../lib/displayFormat'
import { getTeamDisplay } from '../graph/team'
import { normalizeTagList } from '../lib/normalizeTags'
import { EDGE_TYPE_OPTIONS, SEARCH_RESULTS_LIMIT } from './home/constants'
import { formatEdgeTypeLabel, formatNodeLabel } from './home/labels'
import { useDeleteNodeShortcut } from './home/useDeleteNodeShortcut'
import { useHighlightFlash } from './home/useHighlightFlash'
import { useQuickCommand } from './home/useQuickCommand'

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [edgeTypeSaving, setEdgeTypeSaving] = useState(false)
  const [nodeSaving, setNodeSaving] = useState(false)
  const [nodeNameDraft, setNodeNameDraft] = useState('')
  const [nodeTeamDraft, setNodeTeamDraft] = useState('')
  const [nodeNotesDraft, setNodeNotesDraft] = useState('')
  const [nodeTagsDraft, setNodeTagsDraft] = useState<string[]>([])
  const [focusMode, setFocusMode] = useState(false)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchActiveIndex, setSearchActiveIndex] = useState(-1)
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false)
  const searchBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchActive = searchQuery.trim().length > 0

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return nodes.filter((n) => n.name.toLowerCase().includes(q)).slice(0, SEARCH_RESULTS_LIMIT)
  }, [nodes, searchQuery])

  const previewNodeId = useMemo(() => {
    if (searchResults.length === 0) return null
    if (searchActiveIndex >= 0) return searchResults[searchActiveIndex]?.id ?? null
    return searchResults[0]?.id ?? null
  }, [searchResults, searchActiveIndex])

  useEffect(() => {
    setSearchActiveIndex((i) => {
      if (searchResults.length === 0) return -1
      if (i >= searchResults.length) return searchResults.length - 1
      return i
    })
  }, [searchResults.length])

  useEffect(() => {
    return () => {
      if (searchBlurTimerRef.current) clearTimeout(searchBlurTimerRef.current)
    }
  }, [])

  const searchMatchingNodeIds = useMemo(() => {
    if (!searchActive) return null
    const q = searchQuery.trim().toLowerCase()
    return new Set(
      nodes.filter((n) => n.name.toLowerCase().includes(q)).map((n) => n.id),
    )
  }, [nodes, searchQuery, searchActive])

  const {
    highlightedNodeId,
    highlightedEdgeId,
    flashNode: flashNodeHighlight,
    flashEdge,
    clearNodeHighlightIf,
  } = useHighlightFlash()

  const flashNode = useCallback(
    (nodeId: string) => {
      flashNodeHighlight(nodeId, setSelectedNodeId)
    },
    [flashNodeHighlight, setSelectedNodeId],
  )

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
    setNodeNameDraft(formatDisplayName(selectedNode.name))
    setNodeTeamDraft(
      selectedNode.team?.trim() ? formatDisplayName(selectedNode.team.trim()) : '',
    )
    setNodeNotesDraft(selectedNode.notes ?? '')
    setNodeTagsDraft(selectedNode.tags ?? [])
  }, [selectedNode])

  const {
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
    quickListboxId,
    applyQuickSuggestion,
    handleQuickCreate,
    markRecentNode,
  } = useQuickCommand({
    nodes,
    setNodes,
    setEdges,
    setError,
    setSelectedNodeId,
    setSelectedEdgeId,
    flashNode,
    flashEdge,
    loading,
  })

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

  async function persistSelectedNode(
    name: string,
    team: string,
    notes: string,
    tags: string[],
  ) {
    if (!selectedNode || nodeSaving) return
    const nextName = name.trim()
    const nextTeam = team.trim()
    const nextNotes = notes.trim()
    const nextTags = normalizeTagList(tags)
    const prevTags = selectedNode.tags ?? []
    if (!nextName) {
      setNodeNameDraft(selectedNode.name)
      setError('Name is required.')
      return
    }
    if (
      nextName === selectedNode.name &&
      nextTeam === (selectedNode.team ?? '') &&
      nextNotes === (selectedNode.notes ?? '') &&
      nextTags.length === prevTags.length &&
      nextTags.every((tag, i) => tag === prevTags[i])
    ) {
      return
    }
    setNodeSaving(true)
    setError(null)
    try {
      const updated = await updateNode({
        id: selectedNode.id,
        name: nextName,
        team: nextTeam || undefined,
        notes: nextNotes || undefined,
        tags: nextTags,
      })
      setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
      setNodeNameDraft(updated.name)
      setNodeTeamDraft(updated.team ?? '')
      setNodeNotesDraft(updated.notes ?? '')
      setNodeTagsDraft(updated.tags ?? [])
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
      clearNodeHighlightIf(nodeId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete node.')
    }
  }, [clearNodeHighlightIf])

  useDeleteNodeShortcut(selectedNodeId, handleDeleteNode)

  const endNodeHover = useCallback(() => setHoveredNodeId(null), [])

  const nodeLabel = useCallback((id: string) => formatNodeLabel(nodes, id), [nodes])

  const selectSearchResult = useCallback(
    (nodeId: string) => {
      setHoveredNodeId(null)
      setSelectedNodeId(nodeId)
      setSelectedEdgeId(null)
      markRecentNode(nodeId)
      setSearchDropdownOpen(false)
      setSearchActiveIndex(-1)
    },
    [markRecentNode],
  )

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
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <QuickInputBar
                quickInput={quickInput}
                setQuickInput={setQuickInput}
                quickSaving={quickSaving}
                loading={loading}
                quickSuggestionsOpen={quickSuggestionsOpen}
                setQuickSuggestionsOpen={setQuickSuggestionsOpen}
                activeSuggestionIndex={activeSuggestionIndex}
                setActiveSuggestionIndex={setActiveSuggestionIndex}
                quickContext={quickContext}
                quickSuggestions={quickSuggestions}
                exactMatchNode={exactMatchNode}
                quickListboxId={quickListboxId}
                applyQuickSuggestion={applyQuickSuggestion}
                handleQuickCreate={handleQuickCreate}
              />
              <div className="relative w-44 shrink-0 md:w-52">
                <Input
                  aria-label="Search people by name"
                  aria-expanded={searchDropdownOpen && searchResults.length > 0}
                  aria-controls="graph-search-results"
                  aria-activedescendant={
                    searchActiveIndex >= 0 && searchResults[searchActiveIndex]
                      ? `graph-search-result-${searchResults[searchActiveIndex].id}`
                      : undefined
                  }
                  role="combobox"
                  type="text"
                  placeholder="Search people..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    if (e.target.value.trim()) setSearchDropdownOpen(true)
                  }}
                  onFocus={() => {
                    if (searchBlurTimerRef.current) {
                      clearTimeout(searchBlurTimerRef.current)
                      searchBlurTimerRef.current = null
                    }
                    if (searchResults.length > 0) setSearchDropdownOpen(true)
                  }}
                  onBlur={() => {
                    searchBlurTimerRef.current = setTimeout(() => {
                      setSearchDropdownOpen(false)
                      searchBlurTimerRef.current = null
                    }, 120)
                  }}
                  onKeyDown={(e) => {
                    if (searchResults.length === 0) return
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setSearchActiveIndex((i) =>
                        i < 0 ? 0 : Math.min(i + 1, searchResults.length - 1),
                      )
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setSearchActiveIndex((i) => (i <= 0 ? 0 : i - 1))
                    } else if (e.key === 'Enter') {
                      if (searchActiveIndex >= 0 && searchResults[searchActiveIndex]) {
                        e.preventDefault()
                        selectSearchResult(searchResults[searchActiveIndex].id)
                      }
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      setSearchActiveIndex(-1)
                      setSearchDropdownOpen(false)
                    }
                  }}
                  className="h-9 w-full"
                  disabled={loading}
                />
                {searchDropdownOpen && searchResults.length > 0 && (
                  <div
                    id="graph-search-results"
                    role="listbox"
                    className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-lg"
                  >
                    {searchResults.map((n, idx) => (
                      <button
                        key={n.id}
                        id={`graph-search-result-${n.id}`}
                        type="button"
                        role="option"
                        aria-selected={idx === searchActiveIndex}
                        onMouseEnter={() => setSearchActiveIndex(idx)}
                        onMouseDown={(ev) => ev.preventDefault()}
                        onClick={() => selectSearchResult(n.id)}
                        className={`block w-full cursor-pointer border-none px-2.5 py-2 text-left hover:bg-slate-700 ${
                          idx === searchActiveIndex ? 'bg-slate-700' : 'bg-transparent'
                        }`}
                      >
                        <div className="text-sm font-semibold text-slate-100">
                          {formatDisplayName(n.name)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {getTeamDisplay(n)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                hoveredNodeId={hoveredNodeId}
                focusMode={focusMode}
                onNodeClick={(nodeId) => {
                  setHoveredNodeId(null)
                  setSelectedNodeId(nodeId)
                  setSelectedEdgeId(null)
                  markRecentNode(nodeId)
                }}
                onEdgeClick={(edgeId) => {
                  setSelectedEdgeId(edgeId)
                  setSelectedNodeId(null)
                  setHoveredNodeId(null)
                }}
                onPaneClick={() => {
                  setSelectedNodeId(null)
                  setSelectedEdgeId(null)
                  setHoveredNodeId(null)
                }}
                onNodeHover={setHoveredNodeId}
                onNodeHoverEnd={endNodeHover}
                height="100%"
                searchActive={searchActive}
                searchMatchingNodeIds={searchMatchingNodeIds}
                searchPreviewNodeId={previewNodeId}
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
            nodeNotesDraft={nodeNotesDraft}
            nodeTagsDraft={nodeTagsDraft}
            nodeSaving={nodeSaving}
            edgeTypeSaving={edgeTypeSaving}
            connectedEdges={connectedEdges}
            edgeTypeOptions={edgeTypeOptions}
            nodeLabel={nodeLabel}
            formatEdgeTypeLabel={formatEdgeTypeLabel}
            onNodeNameChange={setNodeNameDraft}
            onNodeTeamChange={setNodeTeamDraft}
            onNodeNotesChange={setNodeNotesDraft}
            onNodeTagsChange={setNodeTagsDraft}
            onPersistNode={(name, team, notes, tags) => {
              void persistSelectedNode(name, team, notes, tags)
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
