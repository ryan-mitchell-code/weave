import type { Node } from '../../api/client'
import type { QuickContext } from '../../pages/home/quickInputLogic'

export type QuickInputDerivedState = {
  trimmedQuickInput: string
  showArrowSuggestion: boolean
  hasNodeSuggestions: boolean
  hasAnyQuickOption: boolean
  showViewingHint: boolean
  showCreateRow: boolean
  createRowSecondary: boolean
  showQuickPanel: boolean
}

export function getQuickInputDerivedState(
  quickInput: string,
  quickContext: QuickContext,
  quickSuggestions: Node[],
  exactMatchNode: Node | undefined,
): QuickInputDerivedState {
  const trimmedQuickInput = quickInput.trim()
  const showArrowSuggestion =
    quickContext.mode === 'node' &&
    trimmedQuickInput !== '' &&
    !trimmedQuickInput.includes(' ') &&
    !trimmedQuickInput.includes('->')
  const hasNodeSuggestions = quickSuggestions.length > 0
  const hasAnyQuickOption = hasNodeSuggestions || showArrowSuggestion
  const showViewingHint =
    quickContext.mode === 'node' && exactMatchNode !== undefined
  const showCreateRow =
    quickContext.mode === 'node' && trimmedQuickInput !== '' && !exactMatchNode
  const createRowSecondary = hasNodeSuggestions
  const showQuickPanel =
    showViewingHint ||
    hasNodeSuggestions ||
    showArrowSuggestion ||
    showCreateRow

  return {
    trimmedQuickInput,
    showArrowSuggestion,
    hasNodeSuggestions,
    hasAnyQuickOption,
    showViewingHint,
    showCreateRow,
    createRowSecondary,
    showQuickPanel,
  }
}
