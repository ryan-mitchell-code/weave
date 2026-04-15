import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createEdge,
  createNode,
  fetchGraph,
  updateEdgeType,
  type Edge,
  type Node,
} from '../api/client'
import { GraphView } from '../graph/GraphView'

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
  const [recentNodeIds, setRecentNodeIds] = useState<string[]>([])
  const [quickSuggestionsOpen, setQuickSuggestionsOpen] = useState(false)
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

  function applyQuickSuggestion(nodeName: string) {
    const n = findNodeByName(nodeName)
    if (!n) return
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

  function nodeLabel(id: string): string {
    const n = nodes.find((x) => x.id === id)
    if (!n) return id
    const teamLabel = n.team?.trim()
    return teamLabel ? `${n.name} (${teamLabel})` : n.name
  }

  return (
    <main
      style={{
        height: '100dvh',
        fontFamily: 'system-ui, sans-serif',
        color: '#0f172a',
        background: '#f8fafc',
      }}
    >
      {error && (
        <p
          role="alert"
          style={{
            color: 'crimson',
            margin: 0,
            padding: '8px 12px',
            borderBottom: '1px solid #fecaca',
            background: '#fff1f2',
          }}
        >
          {error}
        </p>
      )}
      <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
        <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 14px',
              borderBottom: '1px solid #e2e8f0',
              background: '#fff',
            }}
          >
            <h1 style={{ fontSize: '1.05rem', margin: 0, whiteSpace: 'nowrap' }}>
              OrgGraph
            </h1>
            <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
              <input
                aria-label="Quick add node or edge"
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                onFocus={() => setQuickSuggestionsOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setQuickSuggestionsOpen(false), 120)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleQuickCreate()
                  } else if (e.key === 'Escape') {
                    setQuickSuggestionsOpen(false)
                  }
                }}
                placeholder='Quick add: "alice payments" or "alice -> bob"'
                disabled={quickSaving || loading}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                }}
              />
              {quickSuggestionsOpen &&
                quickInput.trim() !== '' &&
                quickSuggestions.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      zIndex: 20,
                      marginTop: 4,
                      width: '100%',
                      background: '#fff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
                      maxHeight: 220,
                      overflowY: 'auto',
                    }}
                  >
                    {quickContext.mode === 'edge' && (
                      <div
                        style={{
                          padding: '6px 10px',
                          fontSize: '0.78rem',
                          color: '#64748b',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        Suggested nodes
                      </div>
                    )}
                    {quickSuggestions.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyQuickSuggestion(n.name)}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          border: 'none',
                          background: 'transparent',
                          padding: '8px 10px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: '0.9rem' }}>{n.name}</div>
                        {n.team?.trim() && (
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            {n.team.trim()}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
            </div>
            <div style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap' }}>
              <button
                type="button"
                onClick={() => setFocusMode((v) => !v)}
                style={{
                  background: focusMode ? '#dbeafe' : undefined,
                  borderColor: focusMode ? '#93c5fd' : undefined,
                }}
              >
                Focus Mode
              </button>
            </div>
          </header>
          <div style={{ flex: 1, minHeight: 0, padding: 12 }}>
            {!loading && nodes.length === 0 && (
              <p style={{ color: '#555', marginTop: 0 }}>Add nodes to see the graph.</p>
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

        <aside
          style={{
            width: 320,
            minWidth: 320,
            borderLeft: '1px solid #e2e8f0',
            padding: 12,
            overflow: 'auto',
            background: '#fff',
          }}
        >
          <section aria-labelledby="inspect-heading">
            <h2 id="inspect-heading" style={{ fontSize: '1rem', margin: '0 0 8px 0' }}>
              Details
            </h2>
            {!selectedNodeId && !selectedEdgeId && (
              <p style={{ color: '#555', marginTop: 0 }}>
                Select a node or search to explore
              </p>
            )}
            {selectedEdge && (
              <>
                <p style={{ marginBottom: 4 }}>
                  <strong>From:</strong> {nodeLabel(selectedEdge.from_id)}
                </p>
                <p style={{ marginBottom: 10 }}>
                  <strong>To:</strong> {nodeLabel(selectedEdge.to_id)}
                </p>
                <label htmlFor="edge-type-edit" style={{ display: 'block', marginBottom: 4 }}>
                  <strong>Type</strong>
                </label>
                <select
                  id="edge-type-edit"
                  value={selectedEdge.type}
                  onChange={(e) => {
                    void handleEdgeTypeChange(e.target.value)
                  }}
                  disabled={edgeTypeSaving}
                  style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12 }}
                >
                  {edgeTypeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {formatEdgeTypeLabel(opt)}
                    </option>
                  ))}
                </select>
                <p style={{ marginBottom: 0, color: '#64748b', fontSize: '0.9rem' }}>
                  {edgeTypeSaving ? 'Updating…' : `Edge ID: ${selectedEdge.id}`}
                </p>
              </>
            )}
            {selectedNode && (
              <>
                <p style={{ marginBottom: 4 }}>
                  <strong>Name:</strong> {selectedNode.name}
                </p>
                <p style={{ marginBottom: 4 }}>
                  <strong>Type:</strong> {selectedNode.type}
                </p>
                <p style={{ marginBottom: 4 }}>
                  <strong>Team:</strong> {selectedNode.team?.trim() || '—'}
                </p>
                <p style={{ marginBottom: 12 }}>
                  <strong>ID:</strong>{' '}
                  <span style={{ fontSize: '0.85em', color: '#555' }}>
                    {selectedNode.id}
                  </span>
                </p>
                <h3 style={{ fontSize: '0.95rem', marginBottom: 8 }}>Connections</h3>
                {connectedEdges.length === 0 && <p>No connections.</p>}
                {connectedEdges.length > 0 && (
                  <ul style={{ paddingLeft: '1.1rem', marginTop: 0 }}>
                    {connectedEdges.map((ed) => {
                      const isSource = ed.from_id === selectedNode.id
                      const otherId = isSource ? ed.to_id : ed.from_id
                      return (
                        <li key={ed.id} style={{ marginBottom: 8 }}>
                          <div>
                            {nodeLabel(ed.from_id)} → {nodeLabel(ed.to_id)} (
                            {formatEdgeTypeLabel(ed.type)})
                          </div>
                          <div style={{ color: '#555', fontSize: '0.9rem' }}>
                            {isSource ? `→ ${nodeLabel(otherId)}` : `${nodeLabel(otherId)} ←`}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </>
            )}
          </section>
        </aside>
      </div>
    </main>
  )
}
