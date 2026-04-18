import { X } from 'lucide-react'

type ErrorBannerProps = {
  message: string
  onDismiss?: () => void
}

/** Full-width dismissible error banner for transient API / validation failures. */
export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-3 border-b border-rose-900/50 bg-rose-950/60 px-4 py-2 text-sm text-rose-100"
    >
      <p className="m-0 flex-1 break-words">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="rounded-md p-1 text-rose-200/80 transition-colors hover:bg-rose-900/40 hover:text-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  )
}
