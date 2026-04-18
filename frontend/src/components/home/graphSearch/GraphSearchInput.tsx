import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Input } from '../../ui/input'
import { formatDisplayName } from '../../../lib/displayFormat'
import { getTeamDisplay } from '../../../graph/team'
import type { GraphSearchResultRow } from '../../../lib/graphSearchMatch'

const BLUR_CLOSE_DELAY_MS = 120
const LISTBOX_ID = 'graph-search-results'

export type GraphSearchInputProps = {
  loading: boolean
  query: string
  onQueryChange: (value: string) => void
  results: GraphSearchResultRow[]
  activeIndex: number
  onActiveIndexChange: (next: number | ((prev: number) => number)) => void
  onResetActive: () => void
  onPick: (nodeId: string) => void
  /** Notifies parent when the dropdown opens/closes, so search preview can be gated. */
  onDropdownOpenChange?: (open: boolean) => void
}

export function GraphSearchInput({
  loading,
  query,
  onQueryChange,
  results,
  activeIndex,
  onActiveIndexChange,
  onResetActive,
  onPick,
  onDropdownOpenChange,
}: GraphSearchInputProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openDropdown = useCallback(() => {
    setDropdownOpen((prev) => {
      if (!prev) onDropdownOpenChange?.(true)
      return true
    })
  }, [onDropdownOpenChange])

  const closeDropdown = useCallback(() => {
    setDropdownOpen((prev) => {
      if (prev) onDropdownOpenChange?.(false)
      return false
    })
  }, [onDropdownOpenChange])

  useEffect(() => {
    const timerRef = blurTimerRef
    return () => {
      const t = timerRef.current
      if (t) clearTimeout(t)
    }
  }, [])

  const qLower = query.trim().toLowerCase()

  function renderHighlighted(text: string): ReactNode {
    if (!qLower) return text
    const i = text.toLowerCase().indexOf(qLower)
    if (i < 0) return text
    return (
      <>
        {text.slice(0, i)}
        <span className="font-semibold text-white">
          {text.slice(i, i + qLower.length)}
        </span>
        {text.slice(i + qLower.length)}
      </>
    )
  }

  function renderReason(row: GraphSearchResultRow): ReactNode {
    if (row.matchType === 'team') {
      return <>Team: {renderHighlighted(getTeamDisplay(row.node))}</>
    }
    if (row.matchType === 'tag' && row.tagMatchValue) {
      return <>Tag: {renderHighlighted(row.tagMatchValue)}</>
    }
    if (row.matchType === 'notes' && row.notesSnippet) {
      return renderHighlighted(row.notesSnippet)
    }
    return null
  }

  return (
    <div className="relative w-44 shrink-0 md:w-52">
      <Input
        aria-label="Search people by name, team, tags, or notes"
        aria-expanded={dropdownOpen && results.length > 0}
        aria-controls={LISTBOX_ID}
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
          if (e.target.value.trim()) openDropdown()
        }}
        onFocus={() => {
          if (blurTimerRef.current) {
            clearTimeout(blurTimerRef.current)
            blurTimerRef.current = null
          }
          if (results.length > 0) openDropdown()
        }}
        onBlur={() => {
          blurTimerRef.current = setTimeout(() => {
            closeDropdown()
            blurTimerRef.current = null
          }, BLUR_CLOSE_DELAY_MS)
        }}
        onKeyDown={(e) => {
          if (results.length === 0) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            onActiveIndexChange((i) => (i < 0 ? 0 : Math.min(i + 1, results.length - 1)))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            onActiveIndexChange((i) => (i <= 0 ? 0 : i - 1))
          } else if (e.key === 'Enter') {
            if (activeIndex >= 0 && results[activeIndex]) {
              e.preventDefault()
              onPick(results[activeIndex].node.id)
              closeDropdown()
            }
          } else if (e.key === 'Escape') {
            e.preventDefault()
            onResetActive()
            closeDropdown()
          }
        }}
        className="h-9 w-full"
        disabled={loading}
      />
      {dropdownOpen && query.trim() && (
        <div
          id={LISTBOX_ID}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-lg"
        >
          {results.length === 0 && (
            <div className="px-2.5 py-2 text-xs text-slate-400">No matches found</div>
          )}
          {results.map((row, idx) => {
            const reason = renderReason(row)
            return (
              <button
                key={row.node.id}
                id={`graph-search-result-${row.node.id}`}
                type="button"
                role="option"
                aria-selected={idx === activeIndex}
                onMouseEnter={() => onActiveIndexChange(idx)}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => {
                  onPick(row.node.id)
                  closeDropdown()
                }}
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
                  {reason && <div className="text-xs text-slate-400">{reason}</div>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
