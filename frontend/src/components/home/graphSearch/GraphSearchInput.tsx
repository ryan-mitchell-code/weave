import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { Input } from '../../ui/input'
import { formatDisplayName } from '../../../lib/displayFormat'
import { getTeamDisplay } from '../../../graph/team'
import type { GraphSearchResultRow } from '../../../lib/graphSearchMatch'

export type GraphSearchInputProps = {
  loading: boolean
  query: string
  onQueryChange: (value: string) => void
  results: GraphSearchResultRow[]
  activeIndex: number
  setActiveIndex: Dispatch<SetStateAction<number>>
  dropdownOpen: boolean
  setDropdownOpen: Dispatch<SetStateAction<boolean>>
  blurTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  onPick: (nodeId: string) => void
}

export function GraphSearchInput({
  loading,
  query,
  onQueryChange,
  results,
  activeIndex,
  setActiveIndex,
  dropdownOpen,
  setDropdownOpen,
  blurTimerRef,
  onPick,
}: GraphSearchInputProps) {
  const qLower = query.trim().toLowerCase()

  function renderHighlighted(text: string) {
    if (!qLower) return text
    const i = text.toLowerCase().indexOf(qLower)
    if (i < 0) return text
    const before = text.slice(0, i)
    const match = text.slice(i, i + qLower.length)
    const after = text.slice(i + qLower.length)
    return (
      <>
        {before}
        <span className="font-semibold text-white">{match}</span>
        {after}
      </>
    )
  }

  function renderReason(row: GraphSearchResultRow) {
    if (row.matchType === 'team') {
      return <>Team: {renderHighlighted(getTeamDisplay(row.node))}</>
    }
    if (row.matchType === 'tag' && row.tagMatchValue) {
      return <>Tag: {renderHighlighted(row.tagMatchValue)}</>
    }
    if (row.matchType === 'notes' && row.notesSnippet) {
      return <>{renderHighlighted(row.notesSnippet)}</>
    }
    return null
  }

  return (
    <div className="relative w-44 shrink-0 md:w-52">
      <Input
        aria-label="Search people by name, team, tags, or notes"
        aria-expanded={dropdownOpen && results.length > 0}
        aria-controls="graph-search-results"
        aria-activedescendant={
          activeIndex >= 0 && results[activeIndex]
            ? `graph-search-result-${results[activeIndex].node.id}`
            : undefined
        }
        role="combobox"
        type="text"
        placeholder="Search people..."
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value)
          if (e.target.value.trim()) setDropdownOpen(true)
        }}
        onFocus={() => {
          if (blurTimerRef.current) {
            clearTimeout(blurTimerRef.current)
            blurTimerRef.current = null
          }
          if (results.length > 0) setDropdownOpen(true)
        }}
        onBlur={() => {
          blurTimerRef.current = setTimeout(() => {
            setDropdownOpen(false)
            blurTimerRef.current = null
          }, 120)
        }}
        onKeyDown={(e) => {
          if (results.length === 0) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex((i) => (i < 0 ? 0 : Math.min(i + 1, results.length - 1)))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex((i) => (i <= 0 ? 0 : i - 1))
          } else if (e.key === 'Enter') {
            if (activeIndex >= 0 && results[activeIndex]) {
              e.preventDefault()
              onPick(results[activeIndex].node.id)
            }
          } else if (e.key === 'Escape') {
            e.preventDefault()
            setActiveIndex(-1)
            setDropdownOpen(false)
          }
        }}
        className="h-9 w-full"
        disabled={loading}
      />
      {dropdownOpen && query.trim() && (
        <div
          id="graph-search-results"
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-lg"
        >
          {results.length === 0 && (
            <div className="px-2.5 py-2 text-xs text-slate-400">No matches found</div>
          )}
          {results.map((row, idx) => (
            <button
              key={row.node.id}
              id={`graph-search-result-${row.node.id}`}
              type="button"
              role="option"
              aria-selected={idx === activeIndex}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => onPick(row.node.id)}
              className={`block w-full cursor-pointer border-none px-2.5 py-2 text-left hover:bg-slate-700 ${
                idx === activeIndex ? 'bg-slate-700 ring-1 ring-slate-500' : 'bg-transparent'
              }`}
            >
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-slate-100">
                  {renderHighlighted(formatDisplayName(row.node.name))}
                </div>
                <div className="text-xs text-slate-400">
                  {renderHighlighted(getTeamDisplay(row.node))}
                </div>
                {renderReason(row) ? (
                  <div className="text-xs text-slate-400">{renderReason(row)}</div>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
