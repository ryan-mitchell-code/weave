import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { GRAPH_THEME, TEAM_PALETTES } from './graphTheme'

export type OrgNodeData = {
  label: string
  team: string
  highlighted?: boolean
}

function paletteForTeam(team: string) {
  const key = team.trim().toLowerCase()
  if (!key) return TEAM_PALETTES[0]
  let hash = 0
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return TEAM_PALETTES[Math.abs(hash) % TEAM_PALETTES.length]
}

function OrgNode({ data, selected }: NodeProps<OrgNodeData>) {
  const p = paletteForTeam(data.team)
  const highlighted = Boolean(data.highlighted)
  return (
    <div
      style={{
        width: GRAPH_THEME.node.width,
        boxSizing: 'border-box',
        height: GRAPH_THEME.node.height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '10px 12px',
        borderRadius: 10,
        background: p.bg,
        border: `1px solid ${p.border}`,
        color: p.text,
        fontSize: GRAPH_THEME.node.fontSize,
        fontWeight: GRAPH_THEME.node.fontWeight,
        fontFamily: GRAPH_THEME.node.fontFamily,
        lineHeight: GRAPH_THEME.node.lineHeight,
        boxShadow: selected
          ? GRAPH_THEME.node.selectedShadow
          : highlighted
            ? GRAPH_THEME.node.highlightedShadow
          : GRAPH_THEME.node.defaultShadow,
        transition: 'box-shadow 0.15s ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ width: 8, height: 8, background: p.handle, border: 'none' }}
      />
      {data.label}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ width: 8, height: 8, background: p.handle, border: 'none' }}
      />
    </div>
  )
}

export default memo(OrgNode)
