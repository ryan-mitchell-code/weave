import { useEffect } from 'react'

export function useDeleteNodeShortcut(
  selectedNodeId: string | null,
  handleDeleteNode: (nodeId: string) => void | Promise<void>,
) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete' || !selectedNodeId) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      e.preventDefault()
      void handleDeleteNode(selectedNodeId)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedNodeId, handleDeleteNode])
}
