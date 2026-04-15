import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { GRAPH_THEME } from './graphTheme'

export type PersonNodeData = {
  name: string
  team?: string | null
  highlighted?: boolean
}

function PersonNode({ data, selected }: NodeProps<PersonNodeData>) {
  function getInitials(name: string): string {
    const trimmed = name.trim()
    if (!trimmed) return '?'
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const a = parts[0]?.[0] ?? ''
      const b = parts[parts.length - 1]?.[0] ?? ''
      return (a + b).toUpperCase()
    }
    const word = parts[0] ?? ''
    if (word.length <= 1) return word.toUpperCase()
    return word.slice(0, 2).toUpperCase()
  }

  const team = data.team?.trim() ?? ''
  const highlighted = Boolean(data.highlighted)

  const borderClass = selected
    ? 'border-blue-500 ring-2 ring-blue-500'
    : highlighted
      ? 'border-amber-400/70 ring-2 ring-amber-400/70'
      : 'border-slate-700 hover:border-slate-600'

  return (
    <div
      className={`relative box-border rounded-xl border bg-slate-800 text-slate-100 shadow-sm transition-transform duration-150 ease-out hover:scale-[1.02] ${borderClass}`}
      style={{
        width: GRAPH_THEME.node.width,
        height: GRAPH_THEME.node.height,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !bg-slate-500"
      />
      <div className="flex h-full items-center gap-2 px-3 py-2">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
          aria-hidden
        >
          {getInitials(data.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold leading-tight">{data.name}</div>
          {team ? (
            <div className="truncate text-xs leading-tight text-slate-400">{team}</div>
          ) : null}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-0 !bg-slate-500"
      />
    </div>
  )
}

export default memo(PersonNode)
