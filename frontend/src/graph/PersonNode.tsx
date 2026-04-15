import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { GRAPH_THEME } from './graphTheme'
import { colorForTeam } from './teamColors'
import { UNASSIGNED_TEAM } from './team'

export type PersonNodeData = {
  name: string
  team: string
  highlighted?: boolean
  /** Focus subgraph (GraphView); inactive nodes are faded at the node wrapper level. */
  isActive?: boolean
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

  const team = data.team
  const isUnassigned = team === UNASSIGNED_TEAM
  const highlighted = Boolean(data.highlighted)
  const colors = colorForTeam(team)

  const borderClass = selected
    ? 'border-slate-500 ring-[3px] ring-blue-400 shadow-lg shadow-blue-500/25'
    : highlighted
      ? 'border-slate-600 ring-2 ring-amber-400/70'
      : 'border-slate-700 hover:border-slate-600'

  const cardBg = colors.cardMuted ? 'bg-slate-800/80' : 'bg-slate-800'

  return (
    <div
      className={`relative box-border overflow-hidden rounded-xl border text-slate-100 shadow-sm transition-[transform,box-shadow] duration-150 ease-out hover:scale-[1.02] ${cardBg} ${borderClass}`}
      style={{
        width: GRAPH_THEME.node.width,
        height: GRAPH_THEME.node.height,
      }}
    >
      <div
        className="pointer-events-none absolute bottom-2 left-0 top-2 w-0.5 rounded-sm"
        style={{ backgroundColor: colors.accent }}
        aria-hidden
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !bg-slate-500"
      />
      <div className="relative flex h-full items-center gap-2 px-3 py-2 pl-3.5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
          style={{
            backgroundColor: colors.avatarBg,
            color: colors.avatarText,
          }}
          aria-hidden
        >
          {getInitials(data.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold leading-tight">{data.name}</div>
          <div
            className={`truncate text-xs leading-tight ${isUnassigned ? 'italic text-slate-400' : 'text-slate-300'}`}
          >
            {team}
          </div>
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
