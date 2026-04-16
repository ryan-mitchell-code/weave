import type { Edge, Node } from '../../../api/client'
import { EdgeDetailsSection } from './EdgeDetailsSection'
import { NodeDetailsSection } from './NodeDetailsSection'

type DetailsPanelProps = {
  selectedNode: Node | undefined
  selectedEdge: Edge | undefined
  nodeNameDraft: string
  nodeTeamDraft: string
  nodeNotesDraft: string
  nodeSaving: boolean
  edgeTypeSaving: boolean
  connectedEdges: Edge[]
  edgeTypeOptions: string[]
  nodeLabel: (id: string) => string
  formatEdgeTypeLabel: (type: string) => string
  onNodeNameChange: (value: string) => void
  onNodeTeamChange: (value: string) => void
  onNodeNotesChange: (value: string) => void
  onPersistNode: (name: string, team: string, notes: string) => void
  onDeleteNode: (nodeId: string) => void
  onEdgeTypeChange: (nextType: string) => void
}

export function DetailsPanel({
  selectedNode,
  selectedEdge,
  nodeNameDraft,
  nodeTeamDraft,
  nodeNotesDraft,
  nodeSaving,
  edgeTypeSaving,
  connectedEdges,
  edgeTypeOptions,
  nodeLabel,
  formatEdgeTypeLabel,
  onNodeNameChange,
  onNodeTeamChange,
  onNodeNotesChange,
  onPersistNode,
  onDeleteNode,
  onEdgeTypeChange,
}: DetailsPanelProps) {
  return (
    <div className="w-[300px] overflow-auto rounded-xl border-l border-slate-800 bg-slate-900 p-6 shadow-sm">
      <div className="space-y-4">
        <h2 id="inspect-heading" className="text-sm font-semibold text-slate-100">
          Details
        </h2>
        {selectedEdge && (
          <EdgeDetailsSection
            selectedEdge={selectedEdge}
            edgeTypeSaving={edgeTypeSaving}
            edgeTypeOptions={edgeTypeOptions}
            nodeLabel={nodeLabel}
            formatEdgeTypeLabel={formatEdgeTypeLabel}
            onEdgeTypeChange={onEdgeTypeChange}
          />
        )}
        {selectedNode && (
          <NodeDetailsSection
            key={selectedNode.id}
            selectedNode={selectedNode}
            nodeNameDraft={nodeNameDraft}
            nodeTeamDraft={nodeTeamDraft}
            nodeNotesDraft={nodeNotesDraft}
            nodeSaving={nodeSaving}
            connectedEdges={connectedEdges}
            nodeLabel={nodeLabel}
            formatEdgeTypeLabel={formatEdgeTypeLabel}
            onNodeNameChange={onNodeNameChange}
            onNodeTeamChange={onNodeTeamChange}
            onNodeNotesChange={onNodeNotesChange}
            onPersistNode={onPersistNode}
            onDeleteNode={onDeleteNode}
          />
        )}
      </div>
    </div>
  )
}
