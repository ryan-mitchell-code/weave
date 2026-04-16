import type { KeyboardEvent, MutableRefObject } from 'react'
import type { Node } from '../../api/client'
import type { QuickContext } from '../../pages/home/quickInputLogic'

export type QuickInputBarKeyContext = {
  quickInput: string
  quickContext: QuickContext
  quickSuggestions: Node[]
  exactMatchNode: Node | undefined
  quickSuggestionsOpen: boolean
  activeSuggestionIndex: number
  hasAnyQuickOption: boolean
  hasNodeSuggestions: boolean
  showArrowSuggestion: boolean
  setQuickSuggestionsOpen: (open: boolean) => void
  setActiveSuggestionIndex: (index: number | ((prev: number) => number)) => void
  applyQuickSuggestion: (nodeName: string) => void
  applyArrowSuggestion: () => void
  handleQuickCreate: () => void | Promise<void>
  nameCompletedForArrowRef: MutableRefObject<boolean>
  refocusInputSoon: () => void
}

export function handleQuickInputBarKeyDown(
  e: KeyboardEvent<HTMLInputElement>,
  ctx: QuickInputBarKeyContext,
): void {
  const {
    quickInput,
    quickContext,
    quickSuggestions,
    exactMatchNode,
    quickSuggestionsOpen,
    activeSuggestionIndex,
    hasAnyQuickOption,
    hasNodeSuggestions,
    showArrowSuggestion,
    setQuickSuggestionsOpen,
    setActiveSuggestionIndex,
    applyQuickSuggestion,
    applyArrowSuggestion,
    handleQuickCreate,
    nameCompletedForArrowRef,
    refocusInputSoon,
  } = ctx

  if (e.key === 'ArrowDown' && hasAnyQuickOption) {
    e.preventDefault()
    setQuickSuggestionsOpen(true)
    if (hasNodeSuggestions) {
      setActiveSuggestionIndex((idx) => (idx + 1) % quickSuggestions.length)
    }
    return
  }
  if (e.key === 'ArrowUp' && hasAnyQuickOption) {
    e.preventDefault()
    setQuickSuggestionsOpen(true)
    if (hasNodeSuggestions) {
      setActiveSuggestionIndex((idx) =>
        idx <= 0 ? quickSuggestions.length - 1 : idx - 1,
      )
    }
    return
  }
  if (
    e.key === 'Enter' &&
    quickSuggestionsOpen &&
    activeSuggestionIndex >= 0 &&
    quickSuggestions[activeSuggestionIndex]
  ) {
    e.preventDefault()
    applyQuickSuggestion(quickSuggestions[activeSuggestionIndex].name)
    return
  }
  if (
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
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    if (quickContext.mode === 'node' && exactMatchNode) {
      refocusInputSoon()
      return
    }
    Promise.resolve(handleQuickCreate()).finally(() => {
      refocusInputSoon()
    })
    return
  }
  if (e.key === 'Escape') {
    setQuickSuggestionsOpen(false)
    setActiveSuggestionIndex(-1)
  }
}
