/**
 * Trim, remove empties, dedupe case-insensitively (first occurrence wins).
 * Keeps client-side “no-op” checks aligned with server normalization.
 */
export function normalizeTagList(tags: string[]): string[] {
  return tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter(
      (tag, idx, arr) =>
        arr.findIndex((x) => x.toLowerCase() === tag.toLowerCase()) === idx,
    )
}
