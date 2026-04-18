import { useEffect, useRef, useState } from 'react'
import type { Edge, Node } from '../../../api/client'
import { formatEdgeTypeLabel } from '../../../pages/home/labels'
import { Button } from '../../ui/button'
import { InspectorLabel, InspectorSection, InspectorValue } from './primitives'
import { NotesInlineEditor } from './NotesInlineEditor'
import { PillTextInput } from './PillTextInput'
import { TagInlineEditor } from './TagInlineEditor'

const CONFIRM_DELETE_RESET_MS = 3000

export type NodeDetailsSectionProps = {
  selectedNode: Node
  nodeNameDraft: string
  nodeTeamDraft: string
  nodeNotesDraft: string
  nodeTagsDraft: string[]
  nodeSaving: boolean
  connectedEdges: Edge[]
  nodeLabel: (id: string) => string
  onNodeNameChange: (value: string) => void
  onNodeTeamChange: (value: string) => void
  onNodeNotesChange: (value: string) => void
  onNodeTagsChange: (value: string[]) => void
  onPersistNode: (name: string, team: string, notes: string, tags: string[]) => void
  onDeleteNode: (nodeId: string) => void
}

export function NodeDetailsSection({
  selectedNode,
  nodeNameDraft,
  nodeTeamDraft,
  nodeNotesDraft,
  nodeTagsDraft,
  nodeSaving,
  connectedEdges,
  nodeLabel,
  onNodeNameChange,
  onNodeTeamChange,
  onNodeNotesChange,
  onNodeTagsChange,
  onPersistNode,
  onDeleteNode,
}: NodeDetailsSectionProps) {
  function saveNodeDrafts(nextTags: string[] = nodeTagsDraft) {
    onPersistNode(nodeNameDraft, nodeTeamDraft, nodeNotesDraft, nextTags)
  }

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const confirmResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // DetailsPanel remounts this component per selected node (`key={selectedNode.id}`),
  // so `confirmingDelete` resets automatically on selection change.
  useEffect(() => {
    const timerRef = confirmResetTimerRef
    return () => {
      const t = timerRef.current
      if (t) clearTimeout(t)
    }
  }, [])

  function onDeleteClick() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      if (confirmResetTimerRef.current) clearTimeout(confirmResetTimerRef.current)
      confirmResetTimerRef.current = setTimeout(() => {
        setConfirmingDelete(false)
        confirmResetTimerRef.current = null
      }, CONFIRM_DELETE_RESET_MS)
      return
    }
    if (confirmResetTimerRef.current) {
      clearTimeout(confirmResetTimerRef.current)
      confirmResetTimerRef.current = null
    }
    onDeleteNode(selectedNode.id)
  }

  return (
    <div className="space-y-4">
      <InspectorSection className="space-y-3">
        <div className="space-y-1">
          <InspectorLabel htmlFor="node-name-edit">Name</InspectorLabel>
          <PillTextInput
            id="node-name-edit"
            value={nodeNameDraft}
            onChange={(e) => onNodeNameChange(e.target.value)}
            onBlur={() => {
              saveNodeDrafts()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                saveNodeDrafts()
              }
            }}
            disabled={nodeSaving}
          />
        </div>
        <div className="space-y-1">
          <InspectorLabel htmlFor="node-team-edit">Team</InspectorLabel>
          <PillTextInput
            id="node-team-edit"
            value={nodeTeamDraft}
            onChange={(e) => onNodeTeamChange(e.target.value)}
            onBlur={() => {
              saveNodeDrafts()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                saveNodeDrafts()
              }
            }}
            disabled={nodeSaving}
          />
        </div>
        <div className="space-y-1">
          <InspectorLabel>Notes</InspectorLabel>
          <NotesInlineEditor
            draftNotes={nodeNotesDraft}
            saving={nodeSaving}
            onDraftChange={onNodeNotesChange}
            onSave={saveNodeDrafts}
          />
        </div>
        <div className="space-y-1">
          <InspectorLabel>Tags</InspectorLabel>
          <TagInlineEditor
            draftTags={nodeTagsDraft}
            saving={nodeSaving}
            onDraftChange={onNodeTagsChange}
            onSave={saveNodeDrafts}
          />
        </div>
      </InspectorSection>

      <div className="border-t border-slate-800 pt-4">
        <Button
          type="button"
          onClick={onDeleteClick}
          variant={confirmingDelete ? 'destructive' : 'outline'}
          className="w-full"
          aria-live="polite"
        >
          {confirmingDelete ? 'Click again to confirm' : 'Delete node'}
        </Button>
      </div>

      <InspectorSection>
        <h3 className="text-sm font-semibold text-slate-100">Connections</h3>
        {connectedEdges.length === 0 && <InspectorValue>No connections.</InspectorValue>}
        {connectedEdges.length > 0 && (
          <ul className="m-0 list-disc space-y-2 pl-[1.1rem]">
            {connectedEdges.map((ed) => {
              const isSource = ed.from_id === selectedNode.id
              const otherId = isSource ? ed.to_id : ed.from_id
              return (
                <li key={ed.id} className="text-sm text-slate-200">
                  <div>
                    {nodeLabel(ed.from_id)} → {nodeLabel(ed.to_id)} ({formatEdgeTypeLabel(ed.type)})
                  </div>
                  <div className="text-xs text-slate-500">
                    {isSource ? `→ ${nodeLabel(otherId)}` : `${nodeLabel(otherId)} ←`}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </InspectorSection>
    </div>
  )
}
