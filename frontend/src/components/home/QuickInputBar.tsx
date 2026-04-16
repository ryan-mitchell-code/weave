import { useRef } from 'react'
import type { Node } from '../../api/client'
import { getTeamDisplay } from '../../graph/team'
import { formatDisplayName } from '../../lib/displayFormat'
import { Input } from '../ui/input'
import type { QuickContext } from '../../pages/home/quickInputLogic'

type QuickInputBarProps = {
  quickInput: string
  setQuickInput: (value: string) => void
  quickSaving: boolean
  loading: boolean
  quickSuggestionsOpen: boolean
  setQuickSuggestionsOpen: (open: boolean) => void
  activeSuggestionIndex: number
  setActiveSuggestionIndex: (index: number | ((prev: number) => number)) => void
  quickContext: QuickContext
  quickSuggestions: Node[]
  quickListboxId: string
  applyQuickSuggestion: (nodeName: string) => void
  handleQuickCreate: () => void | Promise<void>
}

export function QuickInputBar({
  quickInput,
  setQuickInput,
  quickSaving,
  loading,
  quickSuggestionsOpen,
  setQuickSuggestionsOpen,
  activeSuggestionIndex,
  setActiveSuggestionIndex,
  quickContext,
  quickSuggestions,
  quickListboxId,
  applyQuickSuggestion,
  handleQuickCreate,
}: QuickInputBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  /** After Tab completes a node name, next Tab inserts ` -> ` when the arrow helper is available. */
  const nameCompletedForArrowRef = useRef(false)

  function refocusInputSoon() {
    window.setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  const trimmedQuickInput = quickInput.trim()
  const showArrowSuggestion =
    quickContext.mode === 'node' &&
    trimmedQuickInput !== '' &&
    !trimmedQuickInput.includes(' ') &&
    !trimmedQuickInput.includes('->')
  const hasNodeSuggestions = quickSuggestions.length > 0
  const hasAnyQuickOption = hasNodeSuggestions || showArrowSuggestion

  function applyArrowSuggestion() {
    setQuickInput(`${trimmedQuickInput} -> `)
    setQuickSuggestionsOpen(true)
    setActiveSuggestionIndex(-1)
  }

  return (
    <div className="relative min-w-0 flex-1">
      <Input
        ref={inputRef}
        aria-label="Quick add node or edge"
        type="text"
        value={quickInput}
        role="combobox"
        aria-expanded={
          quickSuggestionsOpen &&
          trimmedQuickInput !== '' &&
          (quickSuggestions.length > 0 || showArrowSuggestion)
        }
        aria-controls={quickListboxId}
        aria-activedescendant={
          activeSuggestionIndex >= 0 && quickSuggestions[activeSuggestionIndex]
            ? `${quickListboxId}-${quickSuggestions[activeSuggestionIndex].id}`
            : undefined
        }
        onChange={(e) => {
          const v = e.target.value
          setQuickInput(v)
          setActiveSuggestionIndex(-1)
          nameCompletedForArrowRef.current = false
          if (v.trim() !== '') setQuickSuggestionsOpen(true)
        }}
        onFocus={() => {
          setQuickSuggestionsOpen(true)
          nameCompletedForArrowRef.current = false
        }}
        onBlur={() => {
          window.setTimeout(() => setQuickSuggestionsOpen(false), 120)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && hasAnyQuickOption) {
            e.preventDefault()
            setQuickSuggestionsOpen(true)
            if (hasNodeSuggestions) {
              setActiveSuggestionIndex((idx) => (idx + 1) % quickSuggestions.length)
            }
          } else if (e.key === 'ArrowUp' && hasAnyQuickOption) {
            e.preventDefault()
            setQuickSuggestionsOpen(true)
            if (hasNodeSuggestions) {
              setActiveSuggestionIndex((idx) =>
                idx <= 0 ? quickSuggestions.length - 1 : idx - 1,
              )
            }
          } else if (
            e.key === 'Enter' &&
            quickSuggestionsOpen &&
            activeSuggestionIndex >= 0 &&
            quickSuggestions[activeSuggestionIndex]
          ) {
            e.preventDefault()
            applyQuickSuggestion(quickSuggestions[activeSuggestionIndex].name)
          } else if (
            e.key === 'Tab' &&
            !e.shiftKey &&
            quickSuggestionsOpen &&
            quickInput.trim() !== '' &&
            hasAnyQuickOption
          ) {
            if (hasNodeSuggestions && (!showArrowSuggestion || !nameCompletedForArrowRef.current)) {
              const idx = activeSuggestionIndex >= 0 ? activeSuggestionIndex : 0
              const pick = quickSuggestions[idx]
              if (!pick) return
              e.preventDefault()
              applyQuickSuggestion(pick.name)
              if (showArrowSuggestion) {
                nameCompletedForArrowRef.current = true
              }
            } else {
              e.preventDefault()
              applyArrowSuggestion()
              nameCompletedForArrowRef.current = false
            }
          } else if (e.key === 'Enter') {
            e.preventDefault()
            Promise.resolve(handleQuickCreate()).finally(() => {
              refocusInputSoon()
            })
          } else if (e.key === 'Escape') {
            setQuickSuggestionsOpen(false)
            setActiveSuggestionIndex(-1)
          }
        }}
        placeholder='Quick add: "alice payments" or "alice -> bob"'
        disabled={quickSaving || loading}
        className="w-full"
      />
      {quickSuggestionsOpen &&
        quickInput.trim() !== '' &&
        (quickSuggestions.length > 0 || showArrowSuggestion) && (
          <div
            id={quickListboxId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-lg"
          >
            {showArrowSuggestion && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={applyArrowSuggestion}
                className="block w-full cursor-pointer border-none bg-transparent px-2.5 py-2 text-left text-xs text-slate-300 hover:bg-slate-700"
              >
                Add relationship: <span className="font-semibold text-slate-100">-&gt;</span>
              </button>
            )}
            {quickContext.mode === 'edge' && (
              <div className="border-b border-slate-700 px-2.5 py-1.5 text-xs text-slate-400">
                Suggested nodes
              </div>
            )}
            {quickSuggestions.map((n, idx) => (
              <button
                key={n.id}
                id={`${quickListboxId}-${n.id}`}
                role="option"
                aria-selected={idx === activeSuggestionIndex}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveSuggestionIndex(idx)}
                onClick={() => applyQuickSuggestion(n.name)}
                className={`block w-full cursor-pointer border-none bg-transparent px-2.5 py-2 text-left hover:bg-slate-700 ${
                  idx === activeSuggestionIndex ? 'bg-slate-700' : ''
                }`}
              >
                <div className="text-sm">{formatDisplayName(n.name)}</div>
                {n.team?.trim() && (
                  <div className="text-xs text-slate-400">
                    {getTeamDisplay({ team: n.team })}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
    </div>
  )
}
