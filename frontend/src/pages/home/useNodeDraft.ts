import { useCallback, useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { updateNode, type Node } from '../../api/client'
import { formatDisplayName } from '../../lib/displayFormat'
import { normalizeTagList } from '../../lib/normalizeTags'

export type UseNodeDraftDeps = {
  selectedNode: Node | undefined
  setNodes: Dispatch<SetStateAction<Node[]>>
  setError: (message: string | null) => void
  onNodeSaved?: (updatedId: string) => void
}

export type UseNodeDraftReturn = {
  nodeNameDraft: string
  nodeTeamDraft: string
  nodeNotesDraft: string
  nodeTagsDraft: string[]
  nodeSaving: boolean
  setNodeNameDraft: (value: string) => void
  setNodeTeamDraft: (value: string) => void
  setNodeNotesDraft: (value: string) => void
  setNodeTagsDraft: (value: string[]) => void
  persistSelectedNode: (
    name: string,
    team: string,
    notes: string,
    tags: string[],
  ) => Promise<void>
}

/**
 * Owns the editable drafts for the currently-selected node and persists them.
 *
 * Drafts reset whenever `selectedNode` changes (including after a successful save,
 * because the returned node replaces the list entry).
 */
export function useNodeDraft({
  selectedNode,
  setNodes,
  setError,
  onNodeSaved,
}: UseNodeDraftDeps): UseNodeDraftReturn {
  const [nodeNameDraft, setNodeNameDraft] = useState('')
  const [nodeTeamDraft, setNodeTeamDraft] = useState('')
  const [nodeNotesDraft, setNodeNotesDraft] = useState('')
  const [nodeTagsDraft, setNodeTagsDraft] = useState<string[]>([])
  const [nodeSaving, setNodeSaving] = useState(false)

  useEffect(() => {
    if (!selectedNode) return
    setNodeNameDraft(formatDisplayName(selectedNode.name))
    setNodeTeamDraft(
      selectedNode.team?.trim() ? formatDisplayName(selectedNode.team.trim()) : '',
    )
    setNodeNotesDraft(selectedNode.notes ?? '')
    setNodeTagsDraft(selectedNode.tags ?? [])
  }, [selectedNode])

  const persistSelectedNode = useCallback(
    async (name: string, team: string, notes: string, tags: string[]) => {
      if (!selectedNode || nodeSaving) return
      const nextName = name.trim()
      const nextTeam = team.trim()
      const nextNotes = notes.trim()
      const nextTags = normalizeTagList(tags)
      const prevTags = selectedNode.tags ?? []

      if (!nextName) {
        setNodeNameDraft(selectedNode.name)
        setError('Name is required.')
        return
      }

      const unchanged =
        nextName === selectedNode.name &&
        nextTeam === (selectedNode.team ?? '') &&
        nextNotes === (selectedNode.notes ?? '') &&
        nextTags.length === prevTags.length &&
        nextTags.every((tag, i) => tag === prevTags[i])
      if (unchanged) return

      setNodeSaving(true)
      setError(null)
      try {
        const updated = await updateNode({
          id: selectedNode.id,
          name: nextName,
          team: nextTeam || undefined,
          notes: nextNotes || undefined,
          tags: nextTags,
        })
        setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
        setNodeNameDraft(updated.name)
        setNodeTeamDraft(updated.team ?? '')
        setNodeNotesDraft(updated.notes ?? '')
        setNodeTagsDraft(updated.tags ?? [])
        onNodeSaved?.(updated.id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not update node.')
      } finally {
        setNodeSaving(false)
      }
    },
    [selectedNode, nodeSaving, setNodes, setError, onNodeSaved],
  )

  return {
    nodeNameDraft,
    nodeTeamDraft,
    nodeNotesDraft,
    nodeTagsDraft,
    nodeSaving,
    setNodeNameDraft,
    setNodeTeamDraft,
    setNodeNotesDraft,
    setNodeTagsDraft,
    persistSelectedNode,
  }
}
