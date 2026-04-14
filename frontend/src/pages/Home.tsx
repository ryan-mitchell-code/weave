import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createEdge,
  createNode,
  fetchGraph,
  type Edge,
  type Node,
  type NodeType,
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
  const [type, setType] = useState<NodeType>('person')
  const [saving, setSaving] = useState(false)
  const [edgeFromId, setEdgeFromId] = useState('')
  const [edgeToId, setEdgeToId] = useState('')
  const [edgeSaving, setEdgeSaving] = useState(false)

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
      const newNode = await createNode({ name: nameTrimmed, type })
      setName('')
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
    return n ? `${n.name} (${n.type})` : id
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
      })
      setEdges((prev) => [...prev, newEdge])
      setEdgeFromId('')
      setEdgeToId('')
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
            <label htmlFor="node-type" style={{ display: 'block' }}>
              Type
            </label>
            <select
              id="node-type"
              value={type}
              onChange={(e) => setType(e.target.value as NodeType)}
            >
              <option value="person">Person</option>
              <option value="team">Team</option>
            </select>
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
                <span style={{ color: '#555' }}> — {n.type}</span>
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
                  {n.name} ({n.type})
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
                  {n.name} ({n.type})
                </option>
              ))}
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
                {nodeLabel(ed.from_id)} → {nodeLabel(ed.to_id)}
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
          <GraphView nodes={nodes} edges={edges} />
        )}
      </section>
    </main>
  )
}
