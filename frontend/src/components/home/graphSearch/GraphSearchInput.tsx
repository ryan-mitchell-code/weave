import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { Input } from '../../ui/input'
import { formatDisplayName } from '../../../lib/displayFormat'
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
      {dropdownOpen && results.length > 0 && (
        <div
          id="graph-search-results"
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-lg"
        >
          {results.map(({ node: n, matchHint }, idx) => (
            <button
              key={n.id}
              id={`graph-search-result-${n.id}`}
              type="button"
              role="option"
              aria-selected={idx === activeIndex}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => onPick(n.id)}
              className={`block w-full cursor-pointer border-none px-2.5 py-2 text-left hover:bg-slate-700 ${
                idx === activeIndex ? 'bg-slate-700' : 'bg-transparent'
              }`}
            >
              <div className="text-sm font-semibold text-slate-100">
                {formatDisplayName(n.name)}
              </div>
              {matchHint ? (
                <div className="text-xs text-slate-400">{matchHint}</div>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
