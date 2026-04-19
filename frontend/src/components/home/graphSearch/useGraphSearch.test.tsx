import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { searchNodes } from '../../../api/client'
import type { Node } from '../../../api/client'
import { useGraphSearch } from './useGraphSearch'

vi.mock('../../../api/client', () => ({
  searchNodes: vi.fn(),
}))

const nodes: Node[] = [
  { id: '1', name: 'Alice', type: 'person', team: 'A' },
  { id: '2', name: 'Bob', type: 'person', team: 'Alpha' },
]

describe('useGraphSearch', () => {
  beforeEach(() => {
    vi.mocked(searchNodes).mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('starts with no results and null matching set when inactive', () => {
    const { result } = renderHook(() =>
      useGraphSearch(nodes, { onResultPick: vi.fn() }),
    )
    expect(result.current.results).toEqual([])
    expect(result.current.matchingNodeIds).toBeNull()
    expect(result.current.searchActive).toBe(false)
  })

  it('returns client-ranked matches immediately while backend is pending', () => {
    vi.mocked(searchNodes).mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(() =>
      useGraphSearch(nodes, { onResultPick: vi.fn() }),
    )

    act(() => {
      result.current.setQuery('ali')
    })

    expect(result.current.searchActive).toBe(true)
    expect(result.current.results.length).toBeGreaterThan(0)
    expect(result.current.results[0]?.node.id).toBe('1')
    expect(result.current.matchingNodeIds?.has('1')).toBe(true)
  })

  it('calls searchNodes after debounce with trimmed query', async () => {
    vi.mocked(searchNodes).mockResolvedValue([])

    const { result } = renderHook(() =>
      useGraphSearch(nodes, { onResultPick: vi.fn() }),
    )

    act(() => {
      result.current.setQuery('  bob  ')
    })

    expect(vi.mocked(searchNodes)).not.toHaveBeenCalled()

    await waitFor(
      () => {
        expect(vi.mocked(searchNodes)).toHaveBeenCalledWith(
          'bob',
          undefined,
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        )
      },
      { timeout: 800 },
    )
  })

  it('passes recencyMap to searchNodes when set', async () => {
    vi.mocked(searchNodes).mockResolvedValue([])
    const recencyMap = { '1': 1_700_000_000_000 }

    const { result } = renderHook(() =>
      useGraphSearch(nodes, {
        onResultPick: vi.fn(),
        recencyMap,
      }),
    )

    act(() => {
      result.current.setQuery('x')
    })

    await waitFor(
      () => {
        expect(vi.mocked(searchNodes)).toHaveBeenCalledWith(
          'x',
          undefined,
          expect.objectContaining({
            signal: expect.any(AbortSignal),
            recencyMap,
          }),
        )
      },
      { timeout: 800 },
    )
  })

  it('passes selectedNodeId to searchNodes when set', async () => {
    vi.mocked(searchNodes).mockResolvedValue([])

    const { result } = renderHook(() =>
      useGraphSearch(nodes, {
        onResultPick: vi.fn(),
        selectedNodeId: '1',
      }),
    )

    act(() => {
      result.current.setQuery('a')
    })

    await waitFor(
      () => {
        expect(vi.mocked(searchNodes)).toHaveBeenCalledWith(
          'a',
          '1',
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        )
      },
      { timeout: 800 },
    )
  })

  it('uses backend order when hits pass frontend match rules', async () => {
    vi.mocked(searchNodes).mockResolvedValue([
      { node: nodes[1], score: 100 },
      { node: nodes[0], score: 50 },
    ])

    const { result } = renderHook(() =>
      useGraphSearch(nodes, { onResultPick: vi.fn() }),
    )

    act(() => {
      result.current.setQuery('a')
    })

    await waitFor(
      () => {
        expect(result.current.results[0]?.node.id).toBe('2')
        expect(result.current.results[1]?.node.id).toBe('1')
      },
      { timeout: 800 },
    )
  })

  it('drops backend hits that fail frontend matching', async () => {
    vi.mocked(searchNodes).mockResolvedValue([
      { node: { id: '9', name: 'Stranger', type: 'person' }, score: 999 },
      { node: nodes[0], score: 1 },
    ])

    const { result } = renderHook(() =>
      useGraphSearch(nodes, { onResultPick: vi.fn() }),
    )

    act(() => {
      result.current.setQuery('ali')
    })

    await waitFor(
      () => {
        expect(result.current.results.every((r) => r.node.id !== '9')).toBe(
          true,
        )
        expect(result.current.results.some((r) => r.node.id === '1')).toBe(true)
      },
      { timeout: 800 },
    )
  })
})
