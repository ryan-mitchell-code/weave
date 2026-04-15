import type { Edge, Node } from '../../../api/client'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'

export type NodeDetailsSectionProps = {
  selectedNode: Node
  nodeNameDraft: string
  nodeTeamDraft: string
  nodeSaving: boolean
  connectedEdges: Edge[]
  nodeLabel: (id: string) => string
  formatEdgeTypeLabel: (type: string) => string
  onNodeNameChange: (value: string) => void
  onNodeTeamChange: (value: string) => void
  onPersistNode: (name: string, team: string) => void
  onDeleteNode: (nodeId: string) => void
}

export function NodeDetailsSection({
  selectedNode,
  nodeNameDraft,
  nodeTeamDraft,
  nodeSaving,
  connectedEdges,
  nodeLabel,
  formatEdgeTypeLabel,
  onNodeNameChange,
  onNodeTeamChange,
  onPersistNode,
  onDeleteNode,
}: NodeDetailsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-800 p-3">
        <div className="space-y-1">
          <label htmlFor="node-name-edit" className="block text-xs text-slate-400">
            Name
          </label>
          <Input
            id="node-name-edit"
            value={nodeNameDraft}
            onChange={(e) => onNodeNameChange(e.target.value)}
            onBlur={() => {
              onPersistNode(nodeNameDraft, nodeTeamDraft)
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
          <p className="m-0 text-xs text-slate-400">Type</p>
          <p className="m-0 text-sm text-slate-200">{selectedNode.type}</p>
        </div>
        <div className="space-y-1">
          <label htmlFor="node-team-edit" className="block text-xs text-slate-400">
            Team
          </label>
          <Input
            id="node-team-edit"
            value={nodeTeamDraft}
            onChange={(e) => onNodeTeamChange(e.target.value)}
            onBlur={() => {
              onPersistNode(nodeNameDraft, nodeTeamDraft)
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
          <p className="m-0 text-xs text-slate-500">ID</p>
          <p className="m-0 text-xs text-slate-500">{selectedNode.id}</p>
        </div>
      </div>

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

      <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-800 p-3">
        <h3 className="text-sm font-semibold text-slate-100">Connections</h3>
        {connectedEdges.length === 0 && <p className="m-0 text-sm text-slate-200">No connections.</p>}
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
      </div>
    </div>
  )
}
