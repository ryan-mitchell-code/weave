import type { InputHTMLAttributes } from 'react'
import { Input } from '../../ui/input'

type PillTextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size'
> & {
  id: string
}

export function PillTextInput({ className, ...props }: PillTextInputProps) {
  return (
    <div className="rounded-full bg-slate-700 px-3 py-1">
      <Input
        {...props}
        className={`h-auto w-full border-none bg-transparent p-0 text-xs text-slate-200 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${className ?? ''}`}
      />
    </div>
  )
}
