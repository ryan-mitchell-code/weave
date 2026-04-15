import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createEdge,
  createNode,
  fetchGraph,
  type Edge,
  type Node,
} from '../api/client'
import { GraphView } from '../graph/GraphView'

const selfLinkMessage =
  'An edge cannot connect a node to itself. Choose a different “to” node.'

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [team, setTeam] = useState('')
  const [saving, setSaving] = useState(false)
  const [edgeFromId, setEdgeFromId] = useState('')
  const [edgeToId, setEdgeToId] = useState('')
  const [edgeType, setEdgeType] = useState('works_with')
  const [edgeSaving, setEdgeSaving] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

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

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : undefined

  const connectedEdges =
    selectedNodeId == null
      ? []
      : edges.filter(
          (e) => e.from_id === selectedNodeId || e.to_id === selectedNodeId,
        )

  const nameTrimmed = name.trim()
  const edgeSubmitDisabled =
    edgeSaving ||
    loading ||
    nodes.length === 0 ||
    !edgeFromId ||
    !edgeToId ||
    edgeFromId === edgeToId

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const newNode = await createNode({ name: nameTrimmed, team: team.trim() })
      setName('')
      setTeam('')
      setNodes((prev) => [...prev, newNode])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not create node. Try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  function nodeLabel(id: string): string {
    const n = nodes.find((x) => x.id === id)
    if (!n) return id
    const teamLabel = n.team?.trim()
    return teamLabel ? `${n.name} (${teamLabel})` : n.name
  }

  async function handleCreateEdge(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!edgeFromId || !edgeToId) return

    if (edgeFromId === edgeToId) {
      setError(selfLinkMessage)
      return
    }

    setEdgeSaving(true)
    try {
      const newEdge = await createEdge({
        from_id: edgeFromId,
        to_id: edgeToId,
        type: edgeType,
      })
      setEdges((prev) => [...prev, newEdge])
      setEdgeFromId('')
      setEdgeToId('')
      setEdgeType('works_with')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not create edge. Try again.',
      )
    } finally {
      setEdgeSaving(false)
    }
  }

  const toNodeOptions = nodes.filter((n) => n.id !== edgeFromId)

  return (
    <main style={{ maxWidth: 560, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.25rem' }}>OrgGraph</h1>

      {error && (
        <p role="alert" style={{ color: 'crimson', marginBottom: 16 }}>
          {error}
        </p>
      )}

      <section aria-labelledby="add-node-heading">
        <h2 id="add-node-heading" style={{ fontSize: '1rem' }}>
          Add node
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 8 }}>
            <label htmlFor="node-name" style={{ display: 'block' }}>
              Name
            </label>
            <input
              id="node-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label htmlFor="node-team" style={{ display: 'block' }}>
              Team
            </label>
            <input
              id="node-team"
              type="text"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              autoComplete="off"
              placeholder="e.g. Payments"
            />
          </div>
          <button type="submit" disabled={saving || nameTrimmed === ''}>
            {saving ? 'Saving…' : 'Create node'}
          </button>
        </form>
      </section>

      <section aria-labelledby="nodes-heading" style={{ marginTop: 24 }}>
        <h2 id="nodes-heading" style={{ fontSize: '1rem' }}>
          Nodes
        </h2>
        {loading && <p>Loading…</p>}
        {!loading && nodes.length === 0 && (
          <p>No nodes yet. Add one above.</p>
        )}
        {!loading && nodes.length > 0 && (
          <ul style={{ paddingLeft: '1.25rem' }}>
            {nodes.map((n) => (
              <li key={n.id}>
                <strong>{n.name}</strong>
                {n.team?.trim() && (
                  <span style={{ color: '#555' }}> — {n.team.trim()}</span>
                )}
                <span style={{ color: '#888', fontSize: '0.85em' }}>
                  {' '}
                  ({n.id})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="add-edge-heading" style={{ marginTop: 24 }}>
        <h2 id="add-edge-heading" style={{ fontSize: '1rem' }}>
          Add edge
        </h2>
        <form onSubmit={handleCreateEdge}>
          <div style={{ marginBottom: 8 }}>
            <label htmlFor="edge-from" style={{ display: 'block' }}>
              From node
            </label>
            <select
              id="edge-from"
              value={edgeFromId}
              onChange={(e) => {
                const v = e.target.value
                setEdgeFromId(v)
                if (edgeToId === v) setEdgeToId('')
              }}
              required
              disabled={loading || nodes.length === 0}
            >
              <option value="" disabled>
                Select node…
              </option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {nodeLabel(n.id)}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label htmlFor="edge-to" style={{ display: 'block' }}>
              To node
            </label>
            <select
              id="edge-to"
              value={edgeToId}
              onChange={(e) => setEdgeToId(e.target.value)}
              required
              disabled={
                loading || nodes.length === 0 || toNodeOptions.length === 0
              }
            >
              <option value="" disabled>
                {edgeFromId
                  ? 'Select node…'
                  : 'Choose a “from” node first…'}
              </option>
              {toNodeOptions.map((n) => (
                <option key={n.id} value={n.id}>
                  {nodeLabel(n.id)}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label htmlFor="edge-type" style={{ display: 'block' }}>
              Relationship type
            </label>
            <select
              id="edge-type"
              value={edgeType}
              onChange={(e) => setEdgeType(e.target.value)}
              disabled={loading || nodes.length === 0}
            >
              <option value="works_with">works_with</option>
              <option value="reports_to">reports_to</option>
              <option value="depends_on">depends_on</option>
            </select>
          </div>
          <button type="submit" disabled={edgeSubmitDisabled}>
            {edgeSaving ? 'Saving…' : 'Create edge'}
          </button>
        </form>
        {!loading && nodes.length === 0 && (
          <p style={{ color: '#555', fontSize: '0.9rem' }}>
            Add at least one node to create edges.
          </p>
        )}
        {!loading && nodes.length === 1 && (
          <p style={{ color: '#555', fontSize: '0.9rem' }}>
            Add another node to connect with an edge.
          </p>
        )}
      </section>

      <section aria-labelledby="edges-heading" style={{ marginTop: 24 }}>
        <h2 id="edges-heading" style={{ fontSize: '1rem' }}>
          Edges
        </h2>
        {!loading && edges.length === 0 && <p>No edges yet.</p>}
        {!loading && edges.length > 0 && (
          <ul style={{ paddingLeft: '1.25rem' }}>
            {edges.map((ed) => (
              <li key={ed.id}>
                {nodeLabel(ed.from_id)} → {nodeLabel(ed.to_id)} ({ed.type})
                <span style={{ color: '#888', fontSize: '0.85em' }}>
                  {' '}
                  ({ed.id})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="graph-heading" style={{ marginTop: 24 }}>
        <h2 id="graph-heading" style={{ fontSize: '1rem' }}>
          Graph
        </h2>
        {!loading && nodes.length === 0 && (
          <p style={{ color: '#555' }}>Add nodes to see the graph.</p>
        )}
        {!loading && nodes.length > 0 && (
          <>
            <GraphView
              nodes={nodes}
              edges={edges}
              selectedNodeId={selectedNodeId}
              onNodeClick={(nodeId) => setSelectedNodeId(nodeId)}
              onPaneClick={() => setSelectedNodeId(null)}
            />
            <section
              aria-labelledby="inspect-heading"
              style={{ marginTop: 16 }}
            >
              <h2 id="inspect-heading" style={{ fontSize: '1rem' }}>
                Node details
              </h2>
              {!selectedNodeId && (
                <p style={{ color: '#555' }}>Select a node to view details</p>
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
                  <h3 style={{ fontSize: '0.95rem', marginBottom: 8 }}>
                    Connections
                  </h3>
                  {connectedEdges.length === 0 && <p>No connections.</p>}
                  {connectedEdges.length > 0 && (
                    <ul style={{ paddingLeft: '1.25rem', marginTop: 0 }}>
                      {connectedEdges.map((ed) => {
                        const isSource = ed.from_id === selectedNode.id
                        const otherId = isSource ? ed.to_id : ed.from_id
                        return (
                          <li key={ed.id} style={{ marginBottom: 8 }}>
                            <div>
                              {nodeLabel(ed.from_id)} → {nodeLabel(ed.to_id)} (
                              {ed.type})
                            </div>
                            <div style={{ color: '#555', fontSize: '0.9rem' }}>
                              {isSource
                                ? `→ ${nodeLabel(otherId)}`
                                : `${nodeLabel(otherId)} ←`}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  )
}
