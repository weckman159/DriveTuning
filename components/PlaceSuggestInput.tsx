'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'

type PlaceDictType = 'state' | 'city' | 'district'

type Suggestion = {
  id: string
  label: string
  value: string
  stateId?: string
  cityId?: string
}

export default function PlaceSuggestInput(props: {
  label?: string
  value: string
  onChange: (value: string) => void
  onSelect?: (suggestion: Suggestion) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  inputClassName?: string
  type: PlaceDictType
  stateId?: string | null
  cityId?: string | null
  limit?: number
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<Suggestion[]>([])
  const lastReq = useRef(0)

  const q = props.value
  const limit = props.limit ?? 10

  const canQuery = useMemo(() => {
    const trimmed = q.trim()
    if (props.type === 'city') {
      // Allow opening the city dropdown after state selection.
      if (!trimmed) return Boolean(props.stateId && String(props.stateId).trim())
      return true
    }
    if (props.type === 'district') {
      // Allow opening the district dropdown after city selection.
      if (!trimmed) return Boolean(props.cityId && String(props.cityId).trim())
      return Boolean(props.cityId && String(props.cityId).trim())
    }
    // state
    return Boolean(trimmed) || open
  }, [open, props.cityId, props.stateId, props.type, q])

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
        sp.set('type', props.type)
        sp.set('q', q)
        sp.set('limit', String(limit))
        if (props.stateId) sp.set('stateId', String(props.stateId))
        if (props.cityId) sp.set('cityId', String(props.cityId))

        const res = await fetch(`/api/dictionary/places?${sp.toString()}`)
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
  }, [canQuery, limit, props.cityId, props.stateId, props.type, q])

  const showDropdown = open && (items.length > 0 || loading)
  const wrapperClass = props.className ?? ''
  const inputClass = props.inputClassName ?? 'input-base'

  return (
    <div className={`relative ${wrapperClass}`}>
      {props.label ? (
        <label htmlFor={id} className="block text-sm font-medium text-zinc-300 mb-1">
          {props.label}
        </label>
      ) : null}

      <input
        id={id}
        type="text"
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
          {loading ? <div className="px-3 py-2 text-xs text-zinc-400">Suche...</div> : null}
          {items.length > 0 ? (
            <div className="max-h-64 overflow-auto py-1">
              {items.map((it, idx) => (
                <button
                  key={`${it.id}-${idx}`}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    props.onChange(it.value)
                    props.onSelect?.(it)
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

