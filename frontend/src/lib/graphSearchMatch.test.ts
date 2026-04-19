// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Node } from '../api/client'
import {
  GRAPH_SEARCH_RESULTS_LIMIT,
  buildGraphSearchMatchingSet,
  graphSearchResultRowForMatch,
  nodeMatchesSearchQuery,
  rankGraphSearchResults,
} from './graphSearchMatch'

const person = (partial: Partial<Node> & Pick<Node, 'id' | 'name'>): Node => ({
  type: 'person',
  team: '',
  notes: '',
  tags: [],
  ...partial,
})

describe('nodeMatchesSearchQuery', () => {
  const n = person({
    id: '1',
    name: 'Alice Smith',
    team: 'Platform',
    tags: ['golang'],
    notes: 'Owns billing',
  })

  it('returns false for empty query', () => {
    expect(nodeMatchesSearchQuery(n, '')).toBe(false)
  })

  it('matches name case-insensitively', () => {
    expect(nodeMatchesSearchQuery(n, 'alice')).toBe(true)
    expect(nodeMatchesSearchQuery(n, 'smith')).toBe(true)
  })

  it('matches team', () => {
    expect(nodeMatchesSearchQuery(n, 'plat')).toBe(true)
  })

  it('matches any tag', () => {
    expect(nodeMatchesSearchQuery(n, 'golan')).toBe(true)
  })

  it('matches notes', () => {
    expect(nodeMatchesSearchQuery(n, 'billing')).toBe(true)
  })

  it('returns false when no field matches', () => {
    expect(nodeMatchesSearchQuery(n, 'zzz')).toBe(false)
  })
})

describe('buildGraphSearchMatchingSet', () => {
  const nodes: Node[] = [
    person({ id: 'a', name: 'Ann' }),
    person({ id: 'b', name: 'Bob' }),
  ]

  it('returns ids of all matching nodes', () => {
    const set = buildGraphSearchMatchingSet(nodes, 'an')
    expect(set.has('a')).toBe(true)
    expect(set.has('b')).toBe(false)
  })
})

describe('graphSearchResultRowForMatch', () => {
  it('prefers name as matchType when name matches', () => {
    const n = person({ id: '1', name: 'Zed', team: 'ZedTeam' })
    const row = graphSearchResultRowForMatch(n, 'zed')
    expect(row?.matchType).toBe('name')
  })

  it('uses team when name does not match', () => {
    const n = person({ id: '1', name: 'X', team: 'Platform' })
    const row = graphSearchResultRowForMatch(n, 'plat')
    expect(row?.matchType).toBe('team')
  })

  it('uses tag when only tag matches', () => {
    const n = person({ id: '1', name: 'X', tags: ['rust'] })
    const row = graphSearchResultRowForMatch(n, 'rust')
    expect(row?.matchType).toBe('tag')
  })

  it('returns null when nothing matches', () => {
    const n = person({ id: '1', name: 'X' })
    expect(graphSearchResultRowForMatch(n, 'nomatch')).toBeNull()
  })
})

describe('rankGraphSearchResults', () => {
  const nodes: Node[] = [
    person({ id: '1', name: 'Zebra', team: 'A' }),
    person({ id: '2', name: 'Amy', team: 'A' }),
    person({ id: '3', name: 'Bob', team: 'B' }),
  ]

  it('respects limit', () => {
    const ranked = rankGraphSearchResults(nodes, 'a', GRAPH_SEARCH_RESULTS_LIMIT)
    expect(ranked.length).toBeLessThanOrEqual(GRAPH_SEARCH_RESULTS_LIMIT)
  })

  it('breaks ties by name', () => {
    const sameScoreNodes: Node[] = [
      person({ id: '1', name: 'Zed', team: 'SameTeam' }),
      person({ id: '2', name: 'Amy', team: 'SameTeam' }),
    ]
    const ranked = rankGraphSearchResults(sameScoreNodes, 'same', 8)
    expect(ranked.map((r) => r.node.name)).toEqual(['Amy', 'Zed'])
  })

  it('returns empty array for blank query', () => {
    expect(rankGraphSearchResults(nodes, '   ', 8)).toEqual([])
  })
})
