const baseUrl = import.meta.env.VITE_API_BASE ?? ''

export type NodeType = 'person' | 'team'

export interface Node {
  id: string
  name: string
  type: NodeType
  notes?: string
}

export interface Edge {
  id: string
  from_id: string
  to_id: string
  type?: string
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
  type: NodeType
}

export async function createNode(input: CreateNodeInput): Promise<Node> {
  const res = await fetch(`${baseUrl}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<Node>(res)
}
