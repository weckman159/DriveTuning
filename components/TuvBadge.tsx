'use client'

interface Props {
  status: 'GREEN_REGISTERED' | 'YELLOW_ABE' | 'RED_RACING'
  className?: string
}

const labels = {
  GREEN_REGISTERED: 'TÜV OK',
  YELLOW_ABE: 'ABE',
  RED_RACING: 'Racing',
} as const

const titles = {
  GREEN_REGISTERED: 'eingetragen im Fahrzeugschein',
  YELLOW_ABE: 'ABE/E-Nummer vorhanden',
  RED_RACING: 'Nur Rennstrecke/Export',
} as const

const colors = {
  GREEN_REGISTERED: 'bg-green-500',
  YELLOW_ABE: 'bg-yellow-500',
  RED_RACING: 'bg-red-500',
} as const

export function TuvBadge({ status, className = '' }: Props) {
  return (
    <span
      className={`${colors[status]} px-3 py-1 rounded-full text-xs font-medium ${className}`}
      title={titles[status]}
    >
      {labels[status]}
    </span>
  )
}

