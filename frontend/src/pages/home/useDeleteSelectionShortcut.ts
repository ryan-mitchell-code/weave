import { useEffect } from 'react'

type DeleteSelectionShortcutArgs = {
  selectedNodeId: string | null
  selectedEdgeId: string | null
  onDeleteNode: (nodeId: string) => void | Promise<void>
  onDeleteEdge: (edgeId: string) => void | Promise<void>
}

/**
 * Binds the Delete key to the current selection: removes the selected node if
 * one is selected, otherwise the selected edge. Ignores keystrokes originating
 * from input/textarea/select so editing drafts is unaffected.
 */
export function useDeleteSelectionShortcut({
  selectedNodeId,
  selectedEdgeId,
  onDeleteNode,
  onDeleteEdge,
}: DeleteSelectionShortcutArgs) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete') return
      if (!selectedNodeId && !selectedEdgeId) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (target?.isContentEditable) return
      e.preventDefault()
      if (selectedNodeId) {
        void onDeleteNode(selectedNodeId)
        return
      }
      if (selectedEdgeId) {
        void onDeleteEdge(selectedEdgeId)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedNodeId, selectedEdgeId, onDeleteNode, onDeleteEdge])
}
