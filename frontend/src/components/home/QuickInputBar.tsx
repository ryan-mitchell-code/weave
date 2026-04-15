import type { Node } from '../../api/client'
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
  handleQuickCreate: () => void
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
  return (
    <div className="relative min-w-0 flex-1">
      <Input
        aria-label="Quick add node or edge"
        type="text"
        value={quickInput}
        role="combobox"
        aria-expanded={quickSuggestionsOpen && quickSuggestions.length > 0}
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
          if (v.trim() !== '') setQuickSuggestionsOpen(true)
        }}
        onFocus={() => {
          setQuickSuggestionsOpen(true)
        }}
        onBlur={() => {
          window.setTimeout(() => setQuickSuggestionsOpen(false), 120)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && quickSuggestions.length > 0) {
            e.preventDefault()
            setQuickSuggestionsOpen(true)
            setActiveSuggestionIndex((idx) => (idx + 1) % quickSuggestions.length)
          } else if (e.key === 'ArrowUp' && quickSuggestions.length > 0) {
            e.preventDefault()
            setQuickSuggestionsOpen(true)
            setActiveSuggestionIndex((idx) =>
              idx <= 0 ? quickSuggestions.length - 1 : idx - 1,
            )
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
            quickSuggestions.length > 0
          ) {
            const idx = activeSuggestionIndex >= 0 ? activeSuggestionIndex : 0
            const pick = quickSuggestions[idx]
            if (pick) {
              e.preventDefault()
              applyQuickSuggestion(pick.name)
            }
          } else if (e.key === 'Enter') {
            e.preventDefault()
            void handleQuickCreate()
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
        quickSuggestions.length > 0 && (
          <div
            id={quickListboxId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-lg"
          >
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
                <div className="text-sm">{n.name}</div>
                {n.team?.trim() && (
                  <div className="text-xs text-slate-400">{n.team.trim()}</div>
                )}
              </button>
            ))}
          </div>
        )}
    </div>
  )
}
