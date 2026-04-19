/**
 * Graph header search: substring matching and ranked dropdown results.
 *
 * Matching drives graph highlight (all fields). It stays frontend-owned so the overlay
 * stays consistent; the API may rank a subset of matches with different stricter rules.
 *
 * Ranking affects dropdown order only. To extend (e.g. fuzzy search), centralize new
 * match logic in `nodeMatchesSearchQuery` / `scoreNode` and keep `rankGraphSearchResults` in sync.
 */
import type { Node } from '../api/client'
import { capitalizeDisplayWords } from './displayFormat'

/** Max rows in the search dropdown (graph may still highlight more matches). */
export const GRAPH_SEARCH_RESULTS_LIMIT = 8

const SCORE_NAME = 5
const SCORE_TEAM = 3
const SCORE_TAG = 2
const SCORE_NOTES = 1

const NOTES_SNIPPET_LEN = 40

function includesInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle)
}

export function nodeMatchesSearchQuery(node: Node, qLower: string): boolean {
  if (!qLower) return false
  if (includesInsensitive(node.name, qLower)) return true
  const team = node.team?.trim() ?? ''
  if (team && includesInsensitive(team, qLower)) return true
  for (const tag of node.tags ?? []) {
    if (includesInsensitive(tag, qLower)) return true
  }
  const notes = node.notes ?? ''
  if (notes && includesInsensitive(notes, qLower)) return true
  return false
}

/** IDs of all nodes matching the query (for graph overlay). */
export function buildGraphSearchMatchingSet(nodes: Node[], qLower: string): Set<string> {
  return new Set(nodes.filter((n) => nodeMatchesSearchQuery(n, qLower)).map((n) => n.id))
}

function scoreNode(node: Node, qLower: string): number {
  let s = 0
  if (includesInsensitive(node.name, qLower)) s += SCORE_NAME
  const team = node.team?.trim() ?? ''
  if (team && includesInsensitive(team, qLower)) s += SCORE_TEAM
  if ((node.tags ?? []).some((tag) => includesInsensitive(tag, qLower))) s += SCORE_TAG
  const notes = node.notes ?? ''
  if (notes && includesInsensitive(notes, qLower)) s += SCORE_NOTES
  return s
}

function firstMatchingTag(node: Node, qLower: string): string | undefined {
  for (const tag of node.tags ?? []) {
    if (includesInsensitive(tag, qLower)) return tag
  }
  return undefined
}

function notesMatchSnippet(notes: string, qLower: string): string {
  const lower = notes.toLowerCase()
  const i = lower.indexOf(qLower)
  const start = i < 0 ? 0 : Math.max(0, i - 10)
  const chunk = notes.slice(start, start + NOTES_SNIPPET_LEN)
  const prefix = start > 0 ? '…' : ''
  const suffix = start + NOTES_SNIPPET_LEN < notes.length ? '…' : ''
  return `${prefix}${chunk}${suffix}`
}

export type GraphSearchResultRow = {
  node: Node
  matchType: 'name' | 'team' | 'tag' | 'notes'
  tagMatchValue: string | null
  notesSnippet: string | null
}

/** One dropdown row for a node that matches the query (same rules as full graph matching). */
export function graphSearchResultRowForMatch(
  node: Node,
  queryTrimmed: string,
): GraphSearchResultRow | null {
  const qLower = queryTrimmed.trim().toLowerCase()
  if (!qLower) return null
  const score = scoreNode(node, qLower)
  if (score <= 0) return null
  const teamRaw = node.team?.trim() ?? ''
  const matchedTag = firstMatchingTag(node, qLower)
  const notes = node.notes ?? ''
  const nameMatch = includesInsensitive(node.name, qLower)
  const teamMatch = !!(teamRaw && includesInsensitive(teamRaw, qLower))
  const notesMatch = !!(notes && includesInsensitive(notes, qLower))

  let matchType: GraphSearchResultRow['matchType'] = 'name'
  if (!nameMatch && teamMatch) matchType = 'team'
  else if (!nameMatch && !teamMatch && matchedTag) matchType = 'tag'
  else if (!nameMatch && !teamMatch && !matchedTag && notesMatch) matchType = 'notes'

  return {
    node,
    matchType,
    tagMatchValue: matchedTag ? capitalizeDisplayWords(matchedTag) : null,
    notesSnippet: notesMatch ? notesMatchSnippet(notes, qLower) : null,
  }
}

export function rankGraphSearchResults(
  nodes: Node[],
  queryTrimmed: string,
  limit: number,
): GraphSearchResultRow[] {
  const qLower = queryTrimmed.trim().toLowerCase()
  if (!qLower) return []

  const scored = nodes
    .map((node) => {
      const row = graphSearchResultRowForMatch(node, queryTrimmed)
      if (!row) return null
      return { row, score: scoreNode(node, qLower) }
    })
    .filter((row): row is NonNullable<typeof row> => row != null)

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.row.node.name.localeCompare(b.row.node.name)
  })

  return scored.slice(0, limit).map(({ row }) => row)
}
