'use client'

type LegalityStatus =
  | 'UNKNOWN'
  | 'FULLY_LEGAL'
  | 'REGISTRATION_REQUIRED'
  | 'INSPECTION_REQUIRED'
  | 'ILLEGAL'
  | 'LEGAL_WITH_RESTRICTIONS'

const CONFIG: Record<
  LegalityStatus,
  { label: string; title: string; className: string }
> = {
  UNKNOWN: {
    label: 'Ungeprueft',
    title: 'Legality nicht geprueft (Hinweis, keine Rechtsberatung).',
    className: 'bg-zinc-700 text-white',
  },
  FULLY_LEGAL: {
    label: 'OK',
    title: 'Hinweis: ABE/ECE/ABG/EBE oder starke Nachweise vorhanden.',
    className: 'bg-emerald-500 text-zinc-950',
  },
  LEGAL_WITH_RESTRICTIONS: {
    label: 'OK*',
    title: 'Legal mit Auflagen/Einschraenkungen (Hinweis, keine Rechtsberatung).',
    className: 'bg-emerald-500 text-zinc-950',
  },
  REGISTRATION_REQUIRED: {
    label: 'Eintragung',
    title: 'Hinweis: Abnahme/Eintragung kann erforderlich sein.',
    className: 'bg-amber-500 text-zinc-950',
  },
  INSPECTION_REQUIRED: {
    label: '21',
    title: 'Hinweis: Einzelabnahme/Pruefung kann erforderlich sein.',
    className: 'bg-orange-500 text-zinc-950',
  },
  ILLEGAL: {
    label: 'Illegal',
    title: 'Hinweis: Verstoesse gegen Regeln moeglich. Vor Umbau klaeren.',
    className: 'bg-red-500 text-white',
  },
}

export function LegalityBadge(props: {
  status?: string | null
  approvalType?: string | null
  approvalNumber?: string | null
  className?: string
}) {
  const statusRaw = String(props.status || 'UNKNOWN').trim().toUpperCase()
  const status = (Object.prototype.hasOwnProperty.call(CONFIG, statusRaw)
    ? statusRaw
    : 'UNKNOWN') as LegalityStatus
  const cfg = CONFIG[status]

  const extra =
    props.approvalType || props.approvalNumber
      ? ` (${[props.approvalType, props.approvalNumber].filter(Boolean).join(' ')})`
      : ''

  return (
    <span
      className={`${cfg.className} px-3 py-1 rounded-full text-xs font-semibold ${props.className || ''}`}
      title={`${cfg.title}${extra}`}
    >
      {cfg.label}
    </span>
  )
}

