import type { Edge, Node } from '../../../api/client'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { InspectorLabel, InspectorMeta, InspectorSection, InspectorValue } from './primitives'
import { NotesInlineEditor } from './NotesInlineEditor'

export type NodeDetailsSectionProps = {
  selectedNode: Node
  nodeNameDraft: string
  nodeTeamDraft: string
  nodeNotesDraft: string
  nodeSaving: boolean
  connectedEdges: Edge[]
  nodeLabel: (id: string) => string
  formatEdgeTypeLabel: (type: string) => string
  onNodeNameChange: (value: string) => void
  onNodeTeamChange: (value: string) => void
  onNodeNotesChange: (value: string) => void
  onPersistNode: (name: string, team: string, notes: string) => void
  onDeleteNode: (nodeId: string) => void
}

export function NodeDetailsSection({
  selectedNode,
  nodeNameDraft,
  nodeTeamDraft,
  nodeNotesDraft,
  nodeSaving,
  connectedEdges,
  nodeLabel,
  formatEdgeTypeLabel,
  onNodeNameChange,
  onNodeTeamChange,
  onNodeNotesChange,
  onPersistNode,
  onDeleteNode,
}: NodeDetailsSectionProps) {
  function saveNodeDrafts() {
    onPersistNode(nodeNameDraft, nodeTeamDraft, nodeNotesDraft)
  }

  return (
    <div className="space-y-4">
      <InspectorSection className="space-y-3">
        <div className="space-y-1">
          <InspectorLabel htmlFor="node-name-edit">Name</InspectorLabel>
          <Input
            id="node-name-edit"
            value={nodeNameDraft}
            onChange={(e) => onNodeNameChange(e.target.value)}
            onBlur={() => {
              saveNodeDrafts()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ;(e.currentTarget as HTMLInputElement).blur()
              }
            }}
            disabled={nodeSaving}
            className="w-full focus-visible:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <InspectorLabel>Type</InspectorLabel>
          <InspectorValue>{selectedNode.type}</InspectorValue>
        </div>
        <div className="space-y-1">
          <InspectorLabel htmlFor="node-team-edit">Team</InspectorLabel>
          <Input
            id="node-team-edit"
            value={nodeTeamDraft}
            onChange={(e) => onNodeTeamChange(e.target.value)}
            onBlur={() => {
              saveNodeDrafts()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ;(e.currentTarget as HTMLInputElement).blur()
              }
            }}
            disabled={nodeSaving}
            className="w-full focus-visible:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <InspectorMeta>ID</InspectorMeta>
          <InspectorMeta>{selectedNode.id}</InspectorMeta>
        </div>
        <div className="space-y-1">
          <InspectorLabel>Notes</InspectorLabel>
          <NotesInlineEditor
            savedNotes={selectedNode.notes ?? ''}
            draftNotes={nodeNotesDraft}
            saving={nodeSaving}
            onDraftChange={onNodeNotesChange}
            onSave={saveNodeDrafts}
          />
        </div>
      </InspectorSection>

      <div className="border-t border-slate-800 pt-4">
        <Button
          type="button"
          onClick={() => {
            onDeleteNode(selectedNode.id)
          }}
          variant="destructive"
          className="w-full"
        >
          Delete node
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
