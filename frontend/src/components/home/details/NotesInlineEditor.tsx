import { useEffect, useMemo, useRef, useState } from 'react'

type NotesInlineEditorProps = {
  draftNotes: string
  saving: boolean
  onDraftChange: (value: string) => void
  onSave: () => void
}

const EMPTY_NOTES_PLACEHOLDER = 'No notes yet.'
const INLINE_INPUT_CLASS =
  'w-full rounded-md bg-slate-800 px-2 py-1 text-sm text-slate-200 outline-none ring-1 ring-slate-600'

export function NotesInlineEditor({
  draftNotes,
  saving,
  onDraftChange,
  onSave,
}: NotesInlineEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [newNoteValue, setNewNoteValue] = useState('')
  const skipNextBlurCommit = useRef(false)
  const editingInputRef = useRef<HTMLInputElement | null>(null)
  const addInputRef = useRef<HTMLInputElement | null>(null)

  const noteLines = useMemo(
    () => draftNotes.split('\n').filter(Boolean),
    [draftNotes],
  )

  useEffect(() => {
    if (editingIndex != null) editingInputRef.current?.focus()
  }, [editingIndex])

  useEffect(() => {
    if (adding) addInputRef.current?.focus()
  }, [adding])

  function saveLines(nextLines: string[]) {
    onDraftChange(nextLines.join('\n'))
    onSave()
  }

  function beginEditingLine(idx: number, line: string) {
    setAdding(false)
    setEditingIndex(idx)
    setEditingValue(line)
  }

  function stopEditingLine() {
    setEditingIndex(null)
    setEditingValue('')
  }

  function startAdd() {
    stopEditingLine()
    setAdding(true)
  }

  function stopAdd() {
    setAdding(false)
    setNewNoteValue('')
  }

  function commitEdit() {
    if (editingIndex == null) return
    const trimmed = editingValue.trim()
    const next = [...noteLines]
    if (trimmed) {
      next[editingIndex] = trimmed
    } else {
      next.splice(editingIndex, 1)
    }
    saveLines(next)
    stopEditingLine()
  }

  function commitAdd() {
    const trimmed = newNoteValue.trim()
    if (!trimmed) {
      stopAdd()
      return
    }
    saveLines([...noteLines, trimmed])
    stopAdd()
  }

  return (
    <div className="space-y-1">
      {noteLines.length === 0 && !adding && (
        <div className="rounded-md px-2 py-1 text-sm text-slate-500">{EMPTY_NOTES_PLACEHOLDER}</div>
      )}

      {noteLines.map((line, idx) => {
        const isEditing = editingIndex === idx
        if (isEditing) {
          return (
            <input
              key={`edit-${idx}`}
              ref={editingInputRef}
              type="text"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={() => {
                if (skipNextBlurCommit.current) {
                  skipNextBlurCommit.current = false
                  return
                }
                commitEdit()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  skipNextBlurCommit.current = true
                  commitEdit()
                  e.currentTarget.blur()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  stopEditingLine()
                  e.currentTarget.blur()
                }
              }}
              disabled={saving}
              className={INLINE_INPUT_CLASS}
            />
          )
        }

        return (
          <button
            key={`line-${idx}`}
            type="button"
            onClick={() => beginEditingLine(idx, line)}
            className="flex w-full items-start gap-2 rounded-md px-2 py-1 text-left text-sm text-slate-300 hover:bg-slate-800"
          >
            <span className="leading-5 text-slate-500">•</span>
            <span className="whitespace-pre-wrap break-words leading-5">{line}</span>
          </button>
        )
      })}

      {adding ? (
        <input
          ref={addInputRef}
          type="text"
          value={newNoteValue}
          onChange={(e) => setNewNoteValue(e.target.value)}
          onBlur={() => {
            if (skipNextBlurCommit.current) {
              skipNextBlurCommit.current = false
              return
            }
            commitAdd()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              skipNextBlurCommit.current = true
              commitAdd()
              e.currentTarget.blur()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              stopAdd()
              e.currentTarget.blur()
            }
          }}
          disabled={saving}
          placeholder="Write a note..."
          className={INLINE_INPUT_CLASS}
        />
      ) : (
        <button
          type="button"
          onClick={startAdd}
          disabled={saving}
          className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-300"
        >
          + Add note
        </button>
      )}
    </div>
  )
}
