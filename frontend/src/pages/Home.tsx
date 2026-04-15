import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { QuickInputBar } from '../components/home/QuickInputBar'
import { DetailsPanel } from '../components/home/details/DetailsPanel'
import { formatDisplayName } from '../lib/displayFormat'
import { EDGE_TYPE_OPTIONS } from './home/constants'
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
  const [focusMode, setFocusMode] = useState(false)

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
      clearNodeHighlightIf(nodeId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete node.')
    }
  }, [clearNodeHighlightIf])

  useDeleteNodeShortcut(selectedNodeId, handleDeleteNode)

  const nodeLabel = useCallback((id: string) => formatNodeLabel(nodes, id), [nodes])

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
              quickListboxId={quickListboxId}
              applyQuickSuggestion={applyQuickSuggestion}
              handleQuickCreate={handleQuickCreate}
            />
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
