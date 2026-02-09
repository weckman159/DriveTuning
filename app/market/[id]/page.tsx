import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { calculateEvidenceScoreV2 } from '@/lib/evidence-score'
import { TuvBadge } from '@/components/TuvBadge'
import { LegalityBadge } from '@/components/LegalityBadge'

const APPROVAL_TYPES = new Set(['ABE', 'ABG', 'EBE', 'TEILEGUTACHTEN', 'EINZELABNAHME', 'EINTRAGUNG'])
const TRUSTED_APPROVAL_TYPES = new Set(['EINTRAGUNG', 'EINZELABNAHME'])

function buildEvidence(listing: {
  media: { url: string }[]
  modification: {
    installedAt: Date | null
    removedAt: Date | null
    installedMileage: number | null
    removedMileage: number | null
    tuvStatus: string
    documents: { type: string }[]
    approvalDocuments: { approvalType: string }[]
  } | null
}) {
  if (!listing.modification) {
    return { score: 0, tier: 'NONE' as const, breakdown: { photo: 0, mileage: 0, approval: 0, timestamp: 0 } }
  }

  const docTypes = new Set(
    (listing.modification.documents || []).map((d) => String(d.type || '').trim().toUpperCase()).filter(Boolean)
  )
  const approvalTypes = new Set(
    (listing.modification.approvalDocuments || [])
      .map((d) => String(d.approvalType || '').trim().toUpperCase())
      .filter(Boolean)
  )

  const hasTrustedApprovalDoc =
    Array.from(approvalTypes).some((t) => TRUSTED_APPROVAL_TYPES.has(t)) ||
    Array.from(docTypes).some((t) => TRUSTED_APPROVAL_TYPES.has(t))

  const hasAnyApprovalSignal =
    Array.from(approvalTypes).some((t) => APPROVAL_TYPES.has(t)) ||
    Array.from(docTypes).some((t) => APPROVAL_TYPES.has(t)) ||
    String(listing.modification.tuvStatus || '').trim().toUpperCase() === 'GREEN_REGISTERED'

  return calculateEvidenceScoreV2({
    hasPhotos: listing.media.length > 0,
    hasMileageProof: listing.modification.installedMileage !== null || listing.modification.removedMileage !== null,
    hasTrustedApprovalDoc,
    hasAnyApprovalSignal,
    hasTimestamp: listing.modification.installedAt !== null || listing.modification.removedAt !== null,
  })
}

export default async function MarketListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const listing = await prisma.partListing.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, name: true } },
      car: { select: { id: true, make: true, model: true, generation: true, heroImage: true } },
      modification: {
        select: {
          id: true,
          partName: true,
          brand: true,
          category: true,
          tuvStatus: true,
          installedAt: true,
          installedMileage: true,
          removedAt: true,
          removedMileage: true,
          documents: { select: { type: true } },
          approvalDocuments: { select: { approvalType: true } },
        },
      },
      media: { select: { url: true }, orderBy: { id: 'asc' } },
    },
  })

  if (!listing) return notFound()

  const evidence = buildEvidence(listing as any)
  const images = listing.media.map((m) => m.url)
  const thumb = images[0] || listing.car?.heroImage || null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/market" className="text-sm text-zinc-300 hover:text-white">
          &larr; Zurueck
        </Link>
        <div className="flex items-center gap-2">
          <LegalityBadge
            status={(listing as any).legalityStatus}
            approvalType={(listing as any).legalityApprovalType}
            approvalNumber={(listing as any).legalityApprovalNumber}
          />
          {listing.modification?.tuvStatus ? <TuvBadge status={listing.modification.tuvStatus as any} /> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel overflow-hidden">
          <div className="aspect-[4/3] bg-zinc-900/50 flex items-center justify-center relative">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumb}
                alt={listing.title}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-zinc-500">No image</span>
            )}
          </div>
          {images.length > 1 ? (
            <div className="p-3 grid grid-cols-4 gap-2">
              {images.slice(0, 8).map((url) => (
                <div key={url} className="aspect-[4/3] bg-zinc-900/60 rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={listing.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="panel p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-semibold text-white leading-tight">{listing.title}</h1>
              <div className="text-2xl font-bold text-sky-500 whitespace-nowrap">
                €{Number(listing.price).toLocaleString()}
              </div>
            </div>

            {listing.description ? <p className="text-zinc-300 whitespace-pre-wrap">{listing.description}</p> : null}

            <div className="text-sm text-zinc-400 space-y-1">
              <div>
                Verkaeufer: <span className="text-zinc-200">@{listing.seller?.name || 'Verkaeufer'}</span>
              </div>
              <div>
                Fahrzeug: <span className="text-zinc-200">{listing.car ? `${listing.car.make} ${listing.car.model}` : 'keins'}</span>
              </div>
              {listing.mileageOnCar !== null ? (
                <div>
                  Km am Auto: <span className="text-zinc-200">{Number(listing.mileageOnCar).toLocaleString()} km</span>
                </div>
              ) : null}
            </div>

            {evidence.score > 0 ? (
              <div className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
                Nachweis {Math.round(evidence.score)}%
              </div>
            ) : (
              <div className="text-xs text-zinc-500">Keine Nachweise verknuepft.</div>
            )}
          </div>

          <div className="panel p-5 space-y-2">
            <div className="text-sm font-semibold text-white">Legalitaet (Hinweis)</div>
            <div className="text-sm text-zinc-300">
              Dieser Status ist eine technische Hilfe. Im Zweifel immer Originaldokumente verwenden und mit einer Prueforganisation
              (TUEV/DEKRA/GTUE) abstimmen.
            </div>
            {(listing as any).legalityNotes ? (
              <div className="text-sm text-zinc-300 bg-zinc-900/40 border border-white/10 rounded-xl p-3">
                {(listing as any).legalityNotes}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
