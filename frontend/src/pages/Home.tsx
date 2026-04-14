import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createNode,
  fetchGraph,
  type Node,
  type NodeType,
} from '../api/client'

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<NodeType>('person')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const graph = await fetchGraph()
      setNodes(graph.nodes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load graph')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createNode({ name: name.trim(), type })
      setName('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create node')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={{ maxWidth: 560, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.25rem' }}>OrgGraph</h1>

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
              required
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
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Create node'}
          </button>
        </form>
      </section>

      <section aria-labelledby="nodes-heading" style={{ marginTop: 24 }}>
        <h2 id="nodes-heading" style={{ fontSize: '1rem' }}>
          Nodes
        </h2>
        {loading && <p>Loading…</p>}
        {!loading && error && (
          <p role="alert" style={{ color: 'crimson' }}>
            {error}
          </p>
        )}
        {!loading && !error && nodes.length === 0 && (
          <p>No nodes yet. Add one above.</p>
        )}
        {!loading && !error && nodes.length > 0 && (
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
    </main>
  )
}
