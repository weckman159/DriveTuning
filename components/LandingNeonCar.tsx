import type { ReactNode } from 'react'

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
          letterSpacing="0.14em"
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

            <svg
              viewBox="0 0 980 520"
              className="relative z-10 h-auto w-full"
              role="img"
              aria-label="Neon X-Ray car animation"
            >
              <defs>
                <linearGradient id="dt-neon" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="rgb(56, 189, 248)" stopOpacity="0.95" />
                  <stop offset="0.45" stopColor="rgb(99, 102, 241)" stopOpacity="0.65" />
                  <stop offset="1" stopColor="rgb(16, 185, 129)" stopOpacity="0.85" />
                </linearGradient>

                <filter id="dt-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="4.5" result="blur" />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="
                      1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 14 -6
                    "
                    result="glow"
                  />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <pattern id="dt-stripePattern" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
                  <path d="M 0 0 L 0 18" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="6" />
                </pattern>

                <mask id="dt-carMask">
                  <rect x="0" y="0" width="980" height="520" fill="black" />
                  <path
                    d="M 135 320
                       C 175 250, 250 210, 340 205
                       L 560 205
                       C 640 205, 700 235, 745 280
                       L 815 290
                       C 845 295, 865 312, 875 330
                       C 885 350, 875 372, 853 382
                       L 805 404
                       C 790 412, 780 420, 760 420
                       L 250 420
                       C 220 420, 198 406, 185 385
                       L 135 320 Z"
                    fill="white"
                  />
                </mask>

                <filter id="dt-redGlow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="
                      1 0 0 0 0
                      0 0.35 0 0 0
                      0 0 0.35 0 0
                      0 0 0 15 -6
                    "
                    result="glow"
                  />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* X-ray stripes inside silhouette */}
              <g mask="url(#dt-carMask)" opacity="0.85">
                <rect x="0" y="0" width="980" height="520" fill="url(#dt-stripePattern)" className="dt-stripes" />
              </g>

              {/* Outer silhouette */}
              <g filter="url(#dt-glow)">
                <path
                  d="M 135 320
                     C 175 250, 250 210, 340 205
                     L 560 205
                     C 640 205, 700 235, 745 280
                     L 815 290
                     C 845 295, 865 312, 875 330
                     C 885 350, 875 372, 853 382
                     L 805 404
                     C 790 412, 780 420, 760 420
                     L 250 420
                     C 220 420, 198 406, 185 385
                     L 135 320 Z"
                  fill="rgba(0,0,0,0)"
                  stroke="url(#dt-neon)"
                  strokeWidth="2.6"
                  vectorEffect="non-scaling-stroke"
                />

                <path
                  d="M 290 240
                     C 330 215, 380 205, 430 205
                     L 530 205
                     C 585 205, 635 220, 680 255
                     L 650 285
                     L 320 285 Z"
                  fill="rgba(255,255,255,0.02)"
                  stroke="rgba(255,255,255,0.14)"
                  strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Wheels */}
                <circle cx="295" cy="420" r="52" fill="rgba(0,0,0,0)" stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
                <circle cx="295" cy="420" r="28" fill="rgba(255,255,255,0.02)" stroke="rgba(56,189,248,0.35)" strokeWidth="1.6" />

                <circle cx="720" cy="420" r="52" fill="rgba(0,0,0,0)" stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
                <circle cx="720" cy="420" r="28" fill="rgba(255,255,255,0.02)" stroke="rgba(56,189,248,0.35)" strokeWidth="1.6" />
              </g>

              {/* Tunable aggregates (highlight red) */}
              <g filter="url(#dt-redGlow)">
                {/* Engine */}
                <rect x="410" y="298" width="130" height="70" rx="14" fill="rgba(239,68,68,0.16)" stroke="rgba(248,113,113,0.75)" strokeWidth="1.8" />
                <circle cx="440" cy="333" r="10" fill="rgba(248,113,113,0.35)" />
                <circle cx="510" cy="333" r="10" fill="rgba(248,113,113,0.35)" />

                {/* Intake */}
                <path
                  d="M 540 320 C 575 305, 605 305, 635 315"
                  fill="none"
                  stroke="rgba(248,113,113,0.85)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />

                {/* Downpipe / Exhaust */}
                <path
                  d="M 425 368 C 445 385, 475 392, 520 398 C 585 408, 650 410, 705 404"
                  fill="none"
                  stroke="rgba(248,113,113,0.75)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />

                {/* Brakes */}
                <circle cx="295" cy="420" r="18" fill="rgba(239,68,68,0.18)" stroke="rgba(248,113,113,0.75)" strokeWidth="2" />
                <circle cx="720" cy="420" r="18" fill="rgba(239,68,68,0.18)" stroke="rgba(248,113,113,0.75)" strokeWidth="2" />
              </g>

              {/* Callouts */}
              <Callout x={485} y={304} toX={690} toY={240} label="ЛЕГАЛЬНО" tone="legal" />
              <Callout x={590} y={402} toX={790} toY={370} label="НЕЛЕГАЛЬНО" tone="illegal" />
              <Callout x={720} y={420} toX={835} toY={450} label="ЛЕГАЛЬНО" tone="legal" />
              <Callout x={295} y={420} toX={120} toY={450} label="НЕЛЕГАЛЬНО" tone="illegal" />

              {/* Subtle scan line */}
              <rect x="120" y="206" width="760" height="220" fill="rgba(255,255,255,0.03)" className="dt-scan" />
            </svg>

            <div className="relative z-10 mt-4 flex flex-wrap items-center justify-center gap-2">
              <GlowBadge className="border-sky-500/25 bg-sky-500/10 text-sky-200">X-RAY VIEW</GlowBadge>
              <GlowBadge className="border-rose-500/25 bg-rose-500/10 text-rose-200">TUNING PARTS</GlowBadge>
              <GlowBadge className="border-white/10 bg-white/5 text-zinc-200">LEGAL CHECK</GlowBadge>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -inset-x-10 -inset-y-6 -z-10 opacity-50 blur-2xl [background:radial-gradient(55%_60%_at_50%_40%,rgba(56,189,248,0.20),transparent_60%)]" />
    </div>
  )
}

