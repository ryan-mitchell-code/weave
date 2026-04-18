import type { Edge } from '../../../api/client'
import { formatEdgeTypeLabel } from '../../../pages/home/labels'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import { InspectorLabel, InspectorMeta, InspectorSection, InspectorValue } from './primitives'

export type EdgeDetailsSectionProps = {
  selectedEdge: Edge
  edgeTypeSaving: boolean
  edgeTypeOptions: string[]
  nodeLabel: (id: string) => string
  onEdgeTypeChange: (nextType: string) => void
}

export function EdgeDetailsSection({
  selectedEdge,
  edgeTypeSaving,
  edgeTypeOptions,
  nodeLabel,
  onEdgeTypeChange,
}: EdgeDetailsSectionProps) {
  return (
    <InspectorSection className="space-y-3">
      <div className="space-y-1">
        <InspectorLabel>From</InspectorLabel>
        <InspectorValue>{nodeLabel(selectedEdge.from_id)}</InspectorValue>
      </div>
      <div className="space-y-1">
        <InspectorLabel>To</InspectorLabel>
        <InspectorValue>{nodeLabel(selectedEdge.to_id)}</InspectorValue>
      </div>
      <div className="space-y-1">
        <InspectorLabel htmlFor="edge-type-edit">Type</InspectorLabel>
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
      <InspectorMeta>
        {edgeTypeSaving ? 'Updating...' : `Edge ID: ${selectedEdge.id}`}
      </InspectorMeta>
    </InspectorSection>
  )
}
