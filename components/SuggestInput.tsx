'use client'

import { useEffect, useId, useMemo, useRef, useState, type HTMLInputTypeAttribute } from 'react'

type DictionaryType = 'car_make' | 'car_model' | 'brand'

type Suggestion = { label: string; value: string }

export default function SuggestInput(props: {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  inputClassName?: string
  type?: HTMLInputTypeAttribute
  dictType: DictionaryType
  dictMake?: string
  limit?: number
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<Suggestion[]>([])
  const lastReq = useRef(0)

  const q = props.value
  const limit = props.limit ?? 8

  const canQuery = useMemo(() => {
    const trimmed = q.trim()
    if (props.dictType === 'car_model') {
      // Allow opening the model dropdown immediately after make selection.
      if (!trimmed) return Boolean(props.dictMake && props.dictMake.trim())
      return true
    }
    return Boolean(trimmed)
  }, [q, props.dictType, props.dictMake])

  useEffect(() => {
    if (!canQuery) {
      setItems([])
      setLoading(false)
      return
    }

    const reqId = ++lastReq.current
    const handle = setTimeout(async () => {
      setLoading(true)
      try {
        const sp = new URLSearchParams()
        sp.set('type', props.dictType)
        sp.set('q', q)
        sp.set('limit', String(limit))
        if (props.dictType === 'car_model' && props.dictMake && props.dictMake.trim()) {
          sp.set('make', props.dictMake.trim())
        }

        const res = await fetch(`/api/dictionary?${sp.toString()}`)
        const data = await res.json().catch(() => ({}))
        if (reqId !== lastReq.current) return
        if (!res.ok) {
          setItems([])
          return
        }
        setItems(Array.isArray(data.suggestions) ? data.suggestions : [])
      } finally {
        if (reqId === lastReq.current) setLoading(false)
      }
    }, 150)

    return () => clearTimeout(handle)
  }, [canQuery, limit, props.dictMake, props.dictType, q])

  const showDropdown = open && (items.length > 0 || loading)
  const wrapperClass = props.className ?? ''
  const inputClass =
    props.inputClassName ??
    'input-base'

  return (
    <div className={`relative ${wrapperClass}`}>
      {props.label ? (
        <label htmlFor={id} className="block text-sm font-medium text-zinc-300 mb-1">
          {props.label}
        </label>
      ) : null}

      <input
        id={id}
        type={props.type ?? 'text'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        required={props.required}
        disabled={props.disabled}
        className={inputClass}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-autocomplete="list"
      />

      {showDropdown ? (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/95 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur">
          {loading ? (
            <div className="px-3 py-2 text-xs text-zinc-400">Suche...</div>
          ) : null}
          {items.length > 0 ? (
            <div className="max-h-64 overflow-auto py-1">
              {items.map((it, idx) => (
                <button
                  key={`${it.value}-${idx}`}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
                  // Use mousedown so selection happens before input blur.
                  onMouseDown={(e) => {
                    e.preventDefault()
                    props.onChange(it.value)
                    setOpen(false)
                  }}
                >
                  {it.label}
                </button>
              ))}
            </div>
          ) : !loading ? (
            <div className="px-3 py-2 text-xs text-zinc-500">Keine Vorschlaege</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
