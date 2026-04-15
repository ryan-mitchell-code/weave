import { UNASSIGNED_TEAM } from './team'

const PALETTE = [
  { avatarBg: '#2563eb', accent: '#3b82f6' },
  { avatarBg: '#7c3aed', accent: '#a78bfa' },
  { avatarBg: '#059669', accent: '#34d399' },
  { avatarBg: '#d97706', accent: '#fbbf24' },
  { avatarBg: '#dc2626', accent: '#f87171' },
  { avatarBg: '#0891b2', accent: '#22d3ee' },
  { avatarBg: '#db2777', accent: '#f472b6' },
  { avatarBg: '#4f46e5', accent: '#818cf8' },
] as const

const UNASSIGNED_COLORS = {
  avatarBg: '#475569',
  avatarText: '#cbd5e1',
  accent: '#64748b',
} as const

function teamHue(team: string): number {
  let h = 0
  const s = team.toLowerCase()
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export type TeamColorScheme = {
  avatarBg: string
  avatarText: string
  accent: string
  /** Slight bg variation between teams with same hash parity. */
  cardMuted: boolean
}

/** Stable colors per team string (display label). Unassigned uses neutral slate. */
export function colorForTeam(team: string): TeamColorScheme {
  if (team === UNASSIGNED_TEAM) {
    return {
      avatarBg: UNASSIGNED_COLORS.avatarBg,
      avatarText: UNASSIGNED_COLORS.avatarText,
      accent: UNASSIGNED_COLORS.accent,
      cardMuted: false,
    }
  }
  const h = teamHue(team)
  const p = PALETTE[h % PALETTE.length]
  return {
    avatarBg: p.avatarBg,
    avatarText: '#ffffff',
    accent: p.accent,
    cardMuted: h % 2 === 1,
  }
}
