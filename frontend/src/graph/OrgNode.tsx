import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'

export type OrgNodeData = {
  label: string
  team: string
  highlighted?: boolean
}

const teamPalettes = [
  {
    bg: '#1e293b',
    border: '#16a34a',
    text: '#dcfce7',
    handle: '#22c55e',
  },
  {
    bg: '#1e293b',
    border: '#0284c7',
    text: '#e0f2fe',
    handle: '#38bdf8',
  },
  {
    bg: '#1e293b',
    border: '#ca8a04',
    text: '#fef3c7',
    handle: '#f59e0b',
  },
  {
    bg: '#1e293b',
    border: '#9333ea',
    text: '#f3e8ff',
    handle: '#a855f7',
  },
] as const

function paletteForTeam(team: string) {
  const key = team.trim().toLowerCase()
  if (!key) return teamPalettes[0]
  let hash = 0
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return teamPalettes[Math.abs(hash) % teamPalettes.length]
}

function OrgNode({ data, selected }: NodeProps<OrgNodeData>) {
  const p = paletteForTeam(data.team)
  const highlighted = Boolean(data.highlighted)
  return (
    <div
      style={{
        width: 180,
        boxSizing: 'border-box',
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '10px 12px',
        borderRadius: 10,
        background: p.bg,
        border: `1px solid ${p.border}`,
        color: p.text,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: 1.35,
        boxShadow: selected
          ? '0 0 0 3px rgba(59, 130, 246, 0.35), 0 6px 20px rgba(2, 6, 23, 0.45)'
          : highlighted
            ? '0 0 0 3px rgba(250, 204, 21, 0.4), 0 8px 24px rgba(2, 6, 23, 0.5)'
          : '0 2px 10px rgba(2, 6, 23, 0.4)',
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
