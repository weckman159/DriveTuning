import type { ReactNode } from 'react'
import Image from 'next/image'

type CalloutProps = {
  x: number
  y: number
  toX: number
  toY: number
  label: string
  tone: 'legal' | 'illegal'
}

function Callout(props: CalloutProps) {
  const tone =
    props.tone === 'legal'
      ? { stroke: 'rgba(52, 211, 153, 0.9)', fill: 'rgba(16, 185, 129, 0.20)', text: 'rgb(167, 243, 208)' }
      : { stroke: 'rgba(248, 113, 113, 0.95)', fill: 'rgba(239, 68, 68, 0.20)', text: 'rgb(254, 202, 202)' }

  return (
    <g>
      <path
        d={`M ${props.x} ${props.y} L ${props.toX} ${props.toY}`}
        stroke={tone.stroke}
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        opacity="0.95"
      />
      <path
        d={`M ${props.toX - 8} ${props.toY - 4} L ${props.toX} ${props.toY} L ${props.toX - 8} ${props.toY + 4}`}
        stroke={tone.stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity="0.95"
      />
      <g transform={`translate(${props.toX + 10} ${props.toY - 14})`}>
        <rect
          x="0"
          y="0"
          width="118"
          height="28"
          rx="14"
          fill={tone.fill}
          stroke={tone.stroke}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <text
          x="59"
          y="18.5"
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          letterSpacing="0.10em"
          fill={tone.text}
        >
          {props.label}
        </text>
      </g>
    </g>
  )
}

function GlowBadge(props: { children: ReactNode; className?: string }) {
  return (
    <div
      className={
        'inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-200 ' +
        (props.className || '')
      }
    >
      {props.children}
    </div>
  )
}

export default function LandingNeonCar() {
  return (
    <div className="relative mx-auto w-full max-w-[980px]">
      <div className="dt-perspective">
        <div className="dt-rotator">
          <div className="relative rounded-[28px] border border-white/10 bg-zinc-950/30 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur">
            <div className="absolute inset-0 opacity-70 [background:radial-gradient(60%_70%_at_20%_10%,rgba(56,189,248,0.22),transparent_60%),radial-gradient(55%_50%_at_90%_20%,rgba(16,185,129,0.12),transparent_60%)]" />

            <div className="relative z-10 overflow-hidden rounded-[22px] border border-white/10 bg-black/20">
              <Image
                src="/landing/tuv-xray.png"
                alt="TUEV: zulaessig vs unzulaessig (X-ray view)"
                width={1536}
                height={864}
                priority
                className="h-auto w-full select-none"
              />
              <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(60%_70%_at_15%_20%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(60%_65%_at_85%_55%,rgba(239,68,68,0.16),transparent_60%)]" />
            </div>

            <div className="relative z-10 mt-4 flex flex-wrap items-center justify-center gap-2">
              <GlowBadge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-200">LEGAL</GlowBadge>
              <GlowBadge className="border-rose-500/25 bg-rose-500/10 text-rose-200">ILLEGAL</GlowBadge>
              <GlowBadge className="border-white/10 bg-white/5 text-zinc-200">X-RAY</GlowBadge>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -inset-x-10 -inset-y-6 -z-10 opacity-50 blur-2xl [background:radial-gradient(55%_60%_at_50%_40%,rgba(56,189,248,0.20),transparent_60%)]" />
    </div>
  )
}
