/** Title-style words: each word is first letter upper, rest lower (trimmed, collapsed spaces). */
export function capitalizeDisplayWords(s: string): string {
  const t = s.trim()
  if (!t) return ''
  return t
    .split(/\s+/)
    .map((part) => {
      if (!part) return ''
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    })
    .join(' ')
}

export function formatDisplayName(name: string): string {
  return capitalizeDisplayWords(name)
}
