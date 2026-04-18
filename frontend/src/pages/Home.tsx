import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deleteEdge,
  deleteNode,
  fetchGraph,
  updateEdgeType,
  type Edge,
  type Node,
} from '../api/client'
import { GraphView } from '../graph/GraphView'
import { Button } from '../components/ui/button'
import { ErrorBanner } from '../components/common/ErrorBanner'
import { GraphCanvasPlaceholder } from '../components/home/GraphCanvasPlaceholder'
import { QuickInputBar } from '../components/home/QuickInputBar'
import { GraphSearchInput, useGraphSearch } from '../components/home/graphSearch'
import { DetailsPanel } from '../components/home/details/DetailsPanel'
import { EDGE_TYPE_OPTIONS } from './home/constants'
import { formatNodeLabel } from './home/labels'
import { useDeleteSelectionShortcut } from './home/useDeleteSelectionShortcut'
import { useHighlightFlash } from './home/useHighlightFlash'
import { useNodeDraft } from './home/useNodeDraft'
import { useQuickCommand } from './home/useQuickCommand'

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [edgeTypeSaving, setEdgeTypeSaving] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [searchBlendOverlayWithSelection, setSearchBlendOverlayWithSelection] = useState(false)
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false)

  const exitSearchBlendOverlay = useCallback(() => {
    setSearchBlendOverlayWithSelection(false)
  }, [])

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
    [flashNodeHighlight],
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

  const connectedEdges = useMemo(
    () =>
      selectedNodeId == null
        ? []
        : edges.filter(
            (e) => e.from_id === selectedNodeId || e.to_id === selectedNodeId,
          ),
    [edges, selectedNodeId],
  )

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

  const onNodeSaved = useCallback(
    (updatedId: string) => {
      markRecentNode(updatedId)
      flashNode(updatedId)
    },
    [markRecentNode, flashNode],
  )

  const {
    nodeNameDraft,
    nodeTeamDraft,
    nodeNotesDraft,
    nodeTagsDraft,
    nodeSaving,
    setNodeNameDraft,
    setNodeTeamDraft,
    setNodeNotesDraft,
    setNodeTagsDraft,
    persistSelectedNode,
  } = useNodeDraft({ selectedNode, setNodes, setError, onNodeSaved })

  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    searchActive,
    matchingNodeIds: searchMatchingNodeIds,
    previewNodeId,
    results: searchResults,
    activeIndex: searchActiveIndex,
    setActiveIndex: setSearchActiveIndex,
    resetActive: resetSearchActive,
    pickResult: pickSearchResult,
  } = useGraphSearch(nodes, {
    onResultPick: useCallback(
      (nodeId: string) => {
        setHoveredNodeId(null)
        setSelectedNodeId(nodeId)
        setSelectedEdgeId(null)
        markRecentNode(nodeId)
        setSearchBlendOverlayWithSelection(true)
      },
      [markRecentNode],
    ),
  })

  // List preview must not override selection once the dropdown is closed (e.g. Enter / row click).
  const searchPreviewNodeIdForGraph =
    searchDropdownOpen && searchResults.length > 0 ? previewNodeId : null

  const handleEdgeTypeChange = useCallback(
    async (nextType: string) => {
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
    },
    [selectedEdge, edgeTypeSaving, flashEdge],
  )

  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      setError(null)
      try {
        await deleteNode({ id: nodeId })
        setNodes((prev) => prev.filter((n) => n.id !== nodeId))
        setEdges((prev) =>
          prev.filter((e) => e.from_id !== nodeId && e.to_id !== nodeId),
        )
        exitSearchBlendOverlay()
        setSelectedNodeId(null)
        setSelectedEdgeId(null)
        clearNodeHighlightIf(nodeId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete node.')
      }
    },
    [clearNodeHighlightIf, exitSearchBlendOverlay],
  )

  const handleDeleteEdge = useCallback(
    async (edgeId: string) => {
      setError(null)
      try {
        await deleteEdge({ id: edgeId })
        setEdges((prev) => prev.filter((e) => e.id !== edgeId))
        setSelectedEdgeId(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete edge.')
      }
    },
    [],
  )

  useDeleteSelectionShortcut({
    selectedNodeId,
    selectedEdgeId,
    onDeleteNode: handleDeleteNode,
    onDeleteEdge: handleDeleteEdge,
  })

  const endNodeHover = useCallback(() => setHoveredNodeId(null), [])
  const nodeLabel = useCallback((id: string) => formatNodeLabel(nodes, id), [nodes])

  return (
    <div className="flex h-screen flex-col font-sans">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      <div className="flex min-h-0 flex-1 gap-4 p-4">
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
              <GraphSearchInput
                loading={loading}
                query={searchQuery}
                onQueryChange={(value) => {
                  exitSearchBlendOverlay()
                  setSearchQuery(value)
                }}
                results={searchResults}
                activeIndex={searchActiveIndex}
                onActiveIndexChange={setSearchActiveIndex}
                onResetActive={resetSearchActive}
                onPick={pickSearchResult}
                onDropdownOpenChange={setSearchDropdownOpen}
              />
            </div>
            <div className="flex gap-2 whitespace-nowrap">
              <Button
                type="button"
                onClick={() => setFocusMode((v) => !v)}
                variant={focusMode ? 'secondary' : 'outline'}
                aria-pressed={focusMode}
              >
                Focus Mode
              </Button>
            </div>
          </header>
          <div className="min-h-0 flex-1 p-6">
            {loading && <GraphCanvasPlaceholder variant="loading" />}
            {!loading && nodes.length === 0 && (
              <GraphCanvasPlaceholder variant="empty" />
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
                  exitSearchBlendOverlay()
                  setHoveredNodeId(null)
                  setSelectedNodeId(nodeId)
                  setSelectedEdgeId(null)
                  markRecentNode(nodeId)
                }}
                onEdgeClick={(edgeId) => {
                  exitSearchBlendOverlay()
                  setSelectedEdgeId(edgeId)
                  setSelectedNodeId(null)
                  setHoveredNodeId(null)
                }}
                onPaneClick={() => {
                  exitSearchBlendOverlay()
                  setSelectedNodeId(null)
                  setSelectedEdgeId(null)
                  setHoveredNodeId(null)
                }}
                onNodeHover={setHoveredNodeId}
                onNodeHoverEnd={endNodeHover}
                height="100%"
                searchActive={searchActive && searchResults.length > 0}
                searchMatchingNodeIds={searchMatchingNodeIds}
                searchPreviewNodeId={searchPreviewNodeIdForGraph}
                searchBlendNonMatchesWithFocusSubgraph={searchBlendOverlayWithSelection}
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
            onDeleteEdge={(edgeId) => {
              void handleDeleteEdge(edgeId)
            }}
          />
        )}
      </div>
    </div>
  )
}
