import { useEffect, useRef, useState } from 'react'
import { Button, type ButtonProps } from '../ui/button'

const CONFIRM_RESET_MS = 3000

type ConfirmDeleteButtonProps = {
  onConfirm: () => void
  label?: string
  confirmLabel?: string
  disabled?: boolean
  className?: string
  /** Button variant used in the armed (awaiting confirm) state. Default: destructive. */
  confirmVariant?: ButtonProps['variant']
  /** Button variant used in the idle (not armed) state. Default: outline. */
  idleVariant?: ButtonProps['variant']
}

/**
 * Two-step confirm button. First click arms the action and switches to the
 * destructive label/variant; a second click within ~3s invokes `onConfirm`.
 * If no second click arrives the button reverts to its idle state.
 */
export function ConfirmDeleteButton({
  onConfirm,
  label = 'Delete',
  confirmLabel = 'Click again to confirm',
  disabled,
  className,
  confirmVariant = 'destructive',
  idleVariant = 'outline',
}: ConfirmDeleteButtonProps) {
  const [armed, setArmed] = useState(false)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const timerRef = resetTimerRef
    return () => {
      const t = timerRef.current
      if (t) clearTimeout(t)
    }
  }, [])

  function cancelResetTimer() {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
  }

  function onClick() {
    if (!armed) {
      setArmed(true)
      cancelResetTimer()
      resetTimerRef.current = setTimeout(() => {
        setArmed(false)
        resetTimerRef.current = null
      }, CONFIRM_RESET_MS)
      return
    }
    cancelResetTimer()
    onConfirm()
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      variant={armed ? confirmVariant : idleVariant}
      aria-live="polite"
      className={className}
    >
      {armed ? confirmLabel : label}
    </Button>
  )
}
