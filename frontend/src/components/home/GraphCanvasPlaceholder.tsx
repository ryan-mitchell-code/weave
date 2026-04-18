type GraphCanvasPlaceholderProps = {
  variant: 'loading' | 'empty'
}

/** Full-canvas placeholder shown in place of the graph (pre-load or empty state). */
export function GraphCanvasPlaceholder({ variant }: GraphCanvasPlaceholderProps) {
  const label =
    variant === 'loading' ? 'Loading graph…' : 'Add nodes to see the graph.'
  return (
    <div
      role="status"
      aria-busy={variant === 'loading'}
      className="flex h-full w-full items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-sm text-slate-400"
    >
      {variant === 'loading' ? (
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-3 w-3 animate-pulse rounded-full bg-slate-500"
            aria-hidden
          />
          {label}
        </div>
      ) : (
        label
      )}
    </div>
  )
}
