const KEY = 'weave:recency:v1'
const MAX = 100

export function loadRecency(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, number>
  } catch {
    return {}
  }
}

export function saveRecency(map: Record<string, number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* quota or private mode */
  }
}

export function touchRecency(
  map: Record<string, number>,
  id: string,
  now = Date.now(),
): Record<string, number> {
  const next = { ...map, [id]: now }

  const entries = Object.entries(next)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX)

  return Object.fromEntries(entries)
}
