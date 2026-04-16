import { useCallback, useMemo, useRef, type KeyboardEvent } from 'react'
import type { Node } from '../../api/client'
import { getTeamDisplay } from '../../graph/team'
import { formatDisplayName } from '../../lib/displayFormat'
import { Input } from '../ui/input'
import type { QuickContext } from '../../pages/home/quickInputLogic'
import { getQuickInputDerivedState } from './quickInputDerived'
import { handleQuickInputBarKeyDown } from './quickInputBarKeyboard'

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
  exactMatchNode: Node | undefined
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
  exactMatchNode,
  quickListboxId,
  applyQuickSuggestion,
  handleQuickCreate,
}: QuickInputBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  /** After Tab completes a node name, next Tab inserts ` -> ` when the arrow helper is available. */
  const nameCompletedForArrowRef = useRef(false)

  const refocusInputSoon = useCallback(() => {
    window.setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }, [])

  const d = useMemo(
    () => getQuickInputDerivedState(quickInput, quickContext, quickSuggestions, exactMatchNode),
    [quickInput, quickContext, quickSuggestions, exactMatchNode],
  )

  const applyArrowSuggestion = useCallback(() => {
    setQuickInput(`${d.trimmedQuickInput} -> `)
    setQuickSuggestionsOpen(true)
    setActiveSuggestionIndex(-1)
  }, [d.trimmedQuickInput, setQuickInput, setQuickSuggestionsOpen, setActiveSuggestionIndex])

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      handleQuickInputBarKeyDown(e, {
        quickInput,
        quickContext,
        quickSuggestions,
        exactMatchNode,
        quickSuggestionsOpen,
        activeSuggestionIndex,
        hasAnyQuickOption: d.hasAnyQuickOption,
        hasNodeSuggestions: d.hasNodeSuggestions,
        showArrowSuggestion: d.showArrowSuggestion,
        setQuickSuggestionsOpen,
        setActiveSuggestionIndex,
        applyQuickSuggestion,
        applyArrowSuggestion,
        handleQuickCreate,
        nameCompletedForArrowRef,
        refocusInputSoon,
      })
    },
    [
      quickInput,
      quickContext,
      quickSuggestions,
      exactMatchNode,
      quickSuggestionsOpen,
      activeSuggestionIndex,
      d.hasAnyQuickOption,
      d.hasNodeSuggestions,
      d.showArrowSuggestion,
      setQuickSuggestionsOpen,
      setActiveSuggestionIndex,
      applyQuickSuggestion,
      applyArrowSuggestion,
      handleQuickCreate,
      refocusInputSoon,
    ],
  )

  return (
    <div className="relative min-w-0 flex-1">
      <Input
        ref={inputRef}
        aria-label="Quick add node or edge"
        type="text"
        value={quickInput}
        role="combobox"
        aria-expanded={
          quickSuggestionsOpen && d.trimmedQuickInput !== '' && d.showQuickPanel
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
        onKeyDown={onKeyDown}
        placeholder='Quick add: "alice payments" or "alice -> bob"'
        disabled={quickSaving || loading}
        className="w-full"
      />
      {quickSuggestionsOpen && quickInput.trim() !== '' && d.showQuickPanel && (
        <div
          id={quickListboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-lg"
        >
          {d.showViewingHint && exactMatchNode && (
            <div className="border-b border-slate-700/80 px-2.5 py-2 text-xs text-slate-400">
              Viewing {formatDisplayName(exactMatchNode.name)}
            </div>
          )}
          {d.showArrowSuggestion && (
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
          {d.showCreateRow && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                Promise.resolve(handleQuickCreate()).finally(() => refocusInputSoon())
              }}
              className={`block w-full cursor-pointer border-none bg-transparent px-2.5 py-2 text-left hover:bg-slate-700 ${
                d.createRowSecondary ? 'border-t border-slate-700 text-xs text-slate-400' : 'text-sm text-slate-100'
              }`}
            >
              Create &quot;{d.trimmedQuickInput}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  )
}
