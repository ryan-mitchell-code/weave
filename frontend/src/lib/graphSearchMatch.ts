/**
 * Graph header search: substring matching and ranked dropdown results.
 *
 * Matching drives graph highlight (all fields); ranking only affects the dropdown order.
 * To extend (e.g. fuzzy search), centralize new match logic in `nodeMatchesSearchQuery` /
 * `scoreNode` and keep `rankGraphSearchResults` in sync.
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

function strongestMatchHint(node: Node, qLower: string): string | null {
  const nameMatch = includesInsensitive(node.name, qLower)
  const teamRaw = node.team?.trim() ?? ''
  const teamMatch = !!(teamRaw && includesInsensitive(teamRaw, qLower))
  const matchedTag = firstMatchingTag(node, qLower)
  const notes = node.notes ?? ''
  const notesMatch = !!(notes && includesInsensitive(notes, qLower))

  type Cand = { weight: number; hint: string | null }
  const cands: Cand[] = []
  if (nameMatch) cands.push({ weight: SCORE_NAME, hint: null })
  if (teamMatch)
    cands.push({
      weight: SCORE_TEAM,
      hint: `Team: ${capitalizeDisplayWords(teamRaw)}`,
    })
  if (matchedTag)
    cands.push({
      weight: SCORE_TAG,
      hint: `Tag: ${capitalizeDisplayWords(matchedTag)}`,
    })
  if (notesMatch)
    cands.push({ weight: SCORE_NOTES, hint: notesMatchSnippet(notes, qLower) })

  if (cands.length === 0) return null
  cands.sort((a, b) => b.weight - a.weight)
  if (cands[0].weight === SCORE_NAME) return null
  return cands[0].hint
}

export type GraphSearchResultRow = {
  node: Node
  matchHint: string | null
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
      const score = scoreNode(node, qLower)
      if (score <= 0) return null
      return {
        node,
        score,
        matchHint: strongestMatchHint(node, qLower),
      }
    })
    .filter((row): row is NonNullable<typeof row> => row != null)

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.node.name.localeCompare(b.node.name)
  })

  return scored.slice(0, limit).map(({ node, matchHint }) => ({ node, matchHint }))
}
