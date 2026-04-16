const baseUrl = import.meta.env.VITE_API_BASE ?? ''

export type NodeType = 'person'

export interface Node {
  id: string
  name: string
  type: NodeType
  team?: string
  notes?: string
}

export interface Edge {
  id: string
  from_id: string
  to_id: string
  type: string
}

export interface Graph {
  nodes: Node[]
  edges: Edge[]
}

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text()
  try {
    const body = JSON.parse(text) as { error?: string }
    return body.error ?? (text || res.statusText)
  } catch {
    return text || res.statusText
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  return res.json() as Promise<T>
}

export async function fetchGraph(): Promise<Graph> {
  const res = await fetch(`${baseUrl}/graph`)
  return parseJson<Graph>(res)
}

export interface CreateNodeInput {
  name: string
  team?: string
}

export async function createNode(input: CreateNodeInput): Promise<Node> {
  const res = await fetch(`${baseUrl}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: input.name, type: 'person', team: input.team }),
  })
  return parseJson<Node>(res)
}

export interface UpdateNodeInput {
  id: string
  name: string
  team?: string
  notes?: string
}

export async function updateNode(input: UpdateNodeInput): Promise<Node> {
  const res = await fetch(`${baseUrl}/nodes`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: input.id,
      name: input.name,
      team: input.team,
      notes: input.notes,
    }),
  })
  return parseJson<Node>(res)
}

export interface DeleteNodeInput {
  id: string
}

export async function deleteNode(input: DeleteNodeInput): Promise<Node> {
  const res = await fetch(`${baseUrl}/nodes`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: input.id }),
  })
  return parseJson<Node>(res)
}

export interface CreateEdgeInput {
  from_id: string
  to_id: string
  type?: string
}

export async function createEdge(input: CreateEdgeInput): Promise<Edge> {
  const res = await fetch(`${baseUrl}/edges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from_id: input.from_id,
      to_id: input.to_id,
      type: input.type ?? 'works_with',
    }),
  })
  return parseJson<Edge>(res)
}

export interface UpdateEdgeTypeInput {
  id: string
  type: string
}

export async function updateEdgeType(input: UpdateEdgeTypeInput): Promise<Edge> {
  const res = await fetch(`${baseUrl}/edges`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: input.id, type: input.type }),
  })
  return parseJson<Edge>(res)
}
