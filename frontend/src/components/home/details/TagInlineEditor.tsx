import { useEffect, useRef, useState } from 'react'

type TagInlineEditorProps = {
  draftTags: string[]
  saving: boolean
  onDraftChange: (nextTags: string[]) => void
  onSave: (nextTags: string[]) => void
}

function normalizeTag(raw: string): string {
  return raw.trim()
}

export function TagInlineEditor({
  draftTags,
  saving,
  onDraftChange,
  onSave,
}: TagInlineEditorProps) {
  const [adding, setAdding] = useState(false)
  const [draftInput, setDraftInput] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  function commitTag(raw: string) {
    const next = normalizeTag(raw)
    if (!next) return
    const exists = draftTags.some((t) => t.toLowerCase() === next.toLowerCase())
    if (exists) return
    const updated = [...draftTags, next]
    onDraftChange(updated)
    onSave(updated)
  }

  function removeTag(tag: string) {
    const updated = draftTags.filter((t) => t !== tag)
    onDraftChange(updated)
    onSave(updated)
  }

  function cancelAdd() {
    setDraftInput('')
    setAdding(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {draftTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-200"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              disabled={saving}
              className="text-slate-300 hover:text-white"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={saving}
          className="mt-1 rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-200"
        >
          + Add tag
        </button>
      ) : (
        <div className="mt-1 rounded-full bg-slate-700 px-3 py-1">
          <input
            ref={inputRef}
            value={draftInput}
            onChange={(e) => setDraftInput(e.target.value)}
            onBlur={() => {
              setDraftInput('')
              setAdding(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitTag(draftInput)
                setDraftInput('')
              } else if (e.key === 'Backspace' && draftInput === '' && draftTags.length > 0) {
                e.preventDefault()
                removeTag(draftTags[draftTags.length - 1])
              } else if (e.key === 'Escape') {
                e.preventDefault()
                cancelAdd()
              }
            }}
            disabled={saving}
            placeholder="Add tag"
            className="bg-transparent px-0.5 text-xs text-slate-200 outline-none"
          />
        </div>
      )}
    </div>
  )
}
