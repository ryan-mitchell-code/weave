import { useEffect, useRef, useState } from 'react'

type NotesInlineEditorProps = {
  savedNotes: string
  draftNotes: string
  saving: boolean
  onDraftChange: (value: string) => void
  onSave: () => void
}

const EMPTY_NOTES_PLACEHOLDER = 'Add notes... (skills, context, relationships)'

export function NotesInlineEditor({
  savedNotes,
  draftNotes,
  saving,
  onDraftChange,
  onSave,
}: NotesInlineEditorProps) {
  const [editing, setEditing] = useState(false)
  const skipNextBlurSave = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing])

  function cancelEdit() {
    skipNextBlurSave.current = true
    onDraftChange(savedNotes)
    setEditing(false)
    textareaRef.current?.blur()
  }

  if (!editing) {
    return draftNotes.trim() ? (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setEditing(true)
          }
        }}
        className="cursor-text rounded-lg p-3 leading-relaxed whitespace-pre-wrap text-slate-200"
      >
        {draftNotes}
      </div>
    ) : (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full cursor-text rounded-lg p-3 text-left leading-relaxed text-slate-400"
      >
        {EMPTY_NOTES_PLACEHOLDER}
      </button>
    )
  }

  return (
    <textarea
      ref={textareaRef}
      value={draftNotes}
      onChange={(e) => onDraftChange(e.target.value)}
      onBlur={() => {
        if (skipNextBlurSave.current) {
          skipNextBlurSave.current = false
          return
        }
        setEditing(false)
        onSave()
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault()
          ;(e.currentTarget as HTMLTextAreaElement).blur()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          cancelEdit()
        }
      }}
      disabled={saving}
      placeholder={EMPTY_NOTES_PLACEHOLDER}
      className="w-full resize-y rounded-lg bg-slate-800 p-3 text-slate-200 leading-relaxed ring-1 ring-slate-600 outline-none"
      rows={5}
    />
  )
}
