import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'

export type OrgNodeData = {
  label: string
  team: string
}

const teamPalettes = [
  {
    bg: '#ecfdf5',
    border: '#6ee7b7',
    text: '#065f46',
    handle: '#34d399',
  },
  {
    bg: '#eff6ff',
    border: '#93c5fd',
    text: '#1e40af',
    handle: '#60a5fa',
  },
  {
    bg: '#fefce8',
    border: '#fde047',
    text: '#854d0e',
    handle: '#facc15',
  },
  {
    bg: '#fdf4ff',
    border: '#f0abfc',
    text: '#86198f',
    handle: '#e879f9',
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
  return (
    <div
      style={{
        width: 180,
        boxSizing: 'border-box',
        minHeight: 48,
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
          ? '0 0 0 3px rgba(59, 130, 246, 0.22), 0 6px 20px rgba(15, 23, 42, 0.1)'
          : '0 2px 10px rgba(15, 23, 42, 0.06)',
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
