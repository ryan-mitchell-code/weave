import type { ReactNode } from 'react'

type InspectorSectionProps = {
  children: ReactNode
  className?: string
}

export function InspectorSection({ children, className = '' }: InspectorSectionProps) {
  return (
    <div className={`space-y-2 rounded-lg border border-slate-700 bg-slate-800 p-3 ${className}`.trim()}>
      {children}
    </div>
  )
}

type InspectorLabelProps = {
  htmlFor?: string
  children: ReactNode
}

export function InspectorLabel({ htmlFor, children }: InspectorLabelProps) {
  return (
    <label htmlFor={htmlFor} className="block text-xs text-slate-400">
      {children}
    </label>
  )
}

type InspectorValueProps = {
  children: ReactNode
}

export function InspectorValue({ children }: InspectorValueProps) {
  return <p className="m-0 text-sm text-slate-200">{children}</p>
}

type InspectorMetaProps = {
  children: ReactNode
}

export function InspectorMeta({ children }: InspectorMetaProps) {
  return <p className="m-0 text-xs text-slate-500">{children}</p>
}
