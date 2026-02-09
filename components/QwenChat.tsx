'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Role = 'user' | 'assistant'
type Msg = { id: string; role: Role; content: string }

const PUTER_MODEL = 'qwen/qwq-32b'

const SITE_USAGE_GUIDE = [
  'Du kennst auch die Funktionen der DRIVETUNING Website und kannst Nutzern erklaeren, wo sie was finden.',
  'Navigation oben: Garage, Marktplatz, Events, AI, Einstellungen (und Nachrichten wenn eingeloggt).',
  'Garage: Garage erstellen -> Auto hinzufuegen. In der Auto-Detailseite: Journal (Eintraege), Dokumente (ABE/Service/Belege), Arbeitsplan, Share-Link erstellen, PDF exportieren.',
  'Teile verkaufen: ueber Garage/Auto oder Marktplatz ein Angebot erstellen (mit Bildern).',
  'Build teilen: erzeugt einen Link zum Build-Passport (lesend).',
].join(' ')

const AUTO_EXPERT_INSTRUCTION = [
  'Du bist ein professioneller Mechaniker und Auto-Experte.',
  'Du beantwortest ausschliesslich Auto-Themen sowie Fragen zur Nutzung der DRIVETUNING Website (z.B. wo man etwas findet oder wie ein Feature funktioniert).',
  'Antworte immer in der Sprache, in der die Frage gestellt wurde.',
  'Fragen zu TUEV (Eintragung, ABE/E-Nummer, Legalitaet/ILLEGAL) sind Auto-Themen und du laesst sie nicht unbeantwortet.',
  'Wenn die Frage weder Auto-Thema noch DRIVETUNING-Nutzung ist, lehne kurz ab und bitte um eine passende Frage.',
  'Antworte klar, praxisnah, mit Checklisten/Schritten und Sicherheits-Hinweisen, wenn passend.',
  SITE_USAGE_GUIDE,
].join(' ')

function uid() {
  try {
    return crypto.randomUUID()
  } catch {
    return String(Date.now()) + '-' + String(Math.random()).slice(2)
  }
}

type Props = {
  variant?: 'page' | 'widget'
}

export default function QwenChat({ variant = 'page' }: Props) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: uid(),
      role: 'assistant',
      content:
        'Privet! Ich bin AUTOEXPERT. Beschreibe dein Auto (Marke/Modell/Baujahr/Motor) und die Symptome oder frage nach DRIVETUNING-Funktionen. Nicht-Auto-Themen beantworte ich nicht.',
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [puterReady, setPuterReady] = useState(false)

  const stopRef = useRef(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const t = setInterval(() => {
      // Puter can register on window and as a global.
      const p = (globalThis as any).puter || (window as any).puter
      if (p?.ai?.chat) {
        setPuterReady(true)
        clearInterval(t)
      }
    }, 200)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, busy])

  const canSend = useMemo(() => {
    if (busy) return false
    if (!puterReady) return false
    if (!input.trim()) return false
    return true
  }, [busy, puterReady, input])

  async function send() {
    const prompt = input.trim()
    if (!prompt) return
    if (!puterReady) {
      setError('Puter.js ist noch nicht geladen. Bitte kurz warten und erneut versuchen.')
      return
    }

    setError(null)
    setBusy(true)
    stopRef.current = false

    const userMsg: Msg = { id: uid(), role: 'user', content: prompt }
    const aiId = uid()
    setMessages((m) => [...m, userMsg, { id: aiId, role: 'assistant', content: '' }])
    setInput('')

    try {
      const puterAny = (globalThis as any).puter || (window as any).puter
      const chat = puterAny?.ai?.chat
      if (typeof chat !== 'function') throw new Error('puter.ai.chat ist nicht verfuegbar')

      // Puter.js has a few overloads; we keep it minimal and prepend our instruction.
      const fullPrompt = `${AUTO_EXPERT_INSTRUCTION}\n\nFrage:\n${prompt}`
      const response = await chat(fullPrompt, { model: PUTER_MODEL, stream: true })

      let full = ''
      for await (const part of response) {
        if (stopRef.current) break
        const delta = String(part?.text || '')
        if (!delta) continue
        full += delta
        setMessages((m) => m.map((x) => (x.id === aiId ? { ...x, content: full } : x)))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim AI-Request')
      setMessages((m) =>
        m.map((x) => (x.id === aiId ? { ...x, content: 'Fehler: Antwort konnte nicht geladen werden.' } : x))
      )
    } finally {
      setBusy(false)
      stopRef.current = false
    }
  }

  return (
    <div className={variant === 'page' ? 'space-y-5' : 'h-full flex flex-col'}>
      <div
        className={
          variant === 'page'
            ? 'rounded-3xl border border-white/10 bg-zinc-950/40 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]'
            : 'h-full flex flex-col'
        }
      >
        {variant === 'page' ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">AUTOEXPERT</h1>
              <p className="mt-2 text-sm text-zinc-400">
                Dieser Chat ist nur fuer Auto-Themen gedacht.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-5 border-b border-white/10 bg-gradient-to-b from-black/30 to-transparent">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-zinc-200">Auto-Chat</div>
              <div className="text-xs text-zinc-500">{puterReady ? 'bereit' : 'laedt...'}</div>
            </div>
          </div>
        )}

        <div className={variant === 'page' ? 'mt-4' : 'flex-1 min-h-0'}>
          <div className={variant === 'page' ? 'rounded-3xl border border-white/10 bg-black/20 overflow-hidden' : 'h-full flex flex-col'}>
            <div className={variant === 'page' ? 'max-h-[55vh] overflow-auto p-5 space-y-3' : 'min-h-0 flex-1 overflow-auto p-5 space-y-3'}>
              {messages.map((msg) => (
                <div key={msg.id} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={[
                      'max-w-[90%] rounded-2xl border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                      msg.role === 'user'
                        ? 'border-sky-500/25 bg-sky-500/10 text-zinc-100'
                        : 'border-white/10 bg-white/5 text-zinc-100',
                    ].join(' ')}
                  >
                    <div className="text-[11px] font-semibold tracking-[0.18em] text-zinc-400">
                      {msg.role === 'user' ? 'YOU' : 'AI'}
                    </div>
                    <div className="mt-1">{msg.content || (busy && msg.role === 'assistant' ? '...' : '')}</div>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <div className={variant === 'page' ? 'border-t border-white/10 p-5 space-y-3' : 'border-t border-white/10 p-5 space-y-3 bg-black/10'}>
              <div className="flex flex-col gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void send()
                  }}
                  placeholder="Beschreibe dein Auto-Problem (Symptome, Modell, Baujahr, Motor, Fehlercodes)..."
                  rows={variant === 'page' ? 4 : 5}
                  className="w-full resize-none px-4 py-3 rounded-2xl bg-zinc-900/60 border border-white/10 text-white placeholder:text-zinc-600 leading-relaxed"
                />

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => void send()}
                    disabled={!canSend}
                    className="flex-1 px-5 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/40 text-white font-semibold transition-colors"
                    title="Senden (Ctrl+Enter)"
                  >
                    Senden
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopRef.current = true
                    }}
                    disabled={!busy}
                    className="px-5 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-60 text-white font-semibold transition-colors"
                  >
                    Stop
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMessages([{ id: uid(), role: 'assistant', content: 'Chat geleert. Neue Auto-Frage stellen.' }])
                      setError(null)
                    }}
                    className="px-5 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-colors"
                  >
                    Leeren
                  </button>
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
