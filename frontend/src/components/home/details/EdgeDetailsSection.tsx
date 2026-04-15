import type { Edge } from '../../../api/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'

export type EdgeDetailsSectionProps = {
  selectedEdge: Edge
  edgeTypeSaving: boolean
  edgeTypeOptions: string[]
  nodeLabel: (id: string) => string
  formatEdgeTypeLabel: (type: string) => string
  onEdgeTypeChange: (nextType: string) => void
}

export function EdgeDetailsSection({
  selectedEdge,
  edgeTypeSaving,
  edgeTypeOptions,
  nodeLabel,
  formatEdgeTypeLabel,
  onEdgeTypeChange,
}: EdgeDetailsSectionProps) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-800 p-3">
      <div className="space-y-1">
        <p className="m-0 text-xs text-slate-400">From</p>
        <p className="m-0 text-sm text-slate-200">{nodeLabel(selectedEdge.from_id)}</p>
      </div>
      <div className="space-y-1">
        <p className="m-0 text-xs text-slate-400">To</p>
        <p className="m-0 text-sm text-slate-200">{nodeLabel(selectedEdge.to_id)}</p>
      </div>
      <div className="space-y-1">
        <label htmlFor="edge-type-edit" className="block text-xs text-slate-400">
          Type
        </label>
        <Select
          value={selectedEdge.type}
          onValueChange={(value) => {
            onEdgeTypeChange(value)
          }}
          disabled={edgeTypeSaving}
        >
          <SelectTrigger id="edge-type-edit" className="w-full focus-visible:ring-blue-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {edgeTypeOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {formatEdgeTypeLabel(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="m-0 text-xs text-slate-500">
        {edgeTypeSaving ? 'Updating...' : `Edge ID: ${selectedEdge.id}`}
      </p>
    </div>
  )
}
