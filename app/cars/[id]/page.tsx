import Link from 'next/link'
import { TuvBadge } from '@/components/TuvBadge'

// MOCK DATA - NO DATABASE
const mockCar = {
  id: '1',
  make: 'BMW',
  model: 'M4',
  generation: 'G82',
  year: 2022,
  projectGoal: 'TRACK' as const,
  currentMileage: 65230,
  heroImage: null,
  forSale: false,
  askingPrice: null as number | null,
}

const mockJournalEntries = [
  {
    id: '1',
    date: new Date('2024-03-15'),
    title: 'KW V3 coilovers',
    type: 'MODIFICATION' as const,
    tuvStatus: 'YELLOW_ABE' as const,
  },
  {
    id: '2',
    date: new Date('2024-02-01'),
    title: 'Oil service',
    type: 'MAINTENANCE' as const,
    tuvStatus: null,
  },
  {
    id: '3',
    date: new Date('2023-09-20'),
    title: 'Nürburgring 8:12',
    type: 'TRACK_DAY' as const,
    tuvStatus: null,
  },
]

const typeColors = {
  MODIFICATION: 'bg-blue-500',
  MAINTENANCE: 'bg-zinc-500',
  TRACK_DAY: 'bg-purple-500',
  DYNO: 'bg-orange-500',
} as const

export default function CarPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative h-80 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center">
        {mockCar.heroImage ? (
          <img src={mockCar.heroImage} alt={mockCar.make} className="w-full h-full object-cover" />
        ) : (
          <span className="text-zinc-500 text-lg">Hero Image Placeholder</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-white">
              {mockCar.make} {mockCar.model} {mockCar.generation}
            </h1>
            <span className="px-3 py-1 bg-orange-500 text-white text-sm font-medium rounded-full">
              {mockCar.projectGoal}
            </span>
          </div>
          <p className="text-zinc-300">{mockCar.currentMileage?.toLocaleString()} km</p>
        </div>
      </div>

      {/* Owner Section */}
      <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Owner Actions</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="forSale" className="w-5 h-5 rounded bg-zinc-700 border-zinc-600" />
                <label htmlFor="forSale" className="text-zinc-300">For Sale</label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">€</span>
                <input
                  type="number"
                  placeholder="Asking price"
                  className="w-32 px-3 py-1 bg-zinc-700 border border-zinc-600 rounded text-white"
                />
              </div>
            </div>
          </div>
          <a
            href={`/api/cars/${params.id}/export/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-lg transition-colors"
          >
            📄 Download PDF
          </a>
        </div>
      </div>

      {/* Journal Section */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Journal</h2>
        <button className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg transition-colors">
          + New Entry
        </button>
      </div>

      <div className="space-y-4">
        {mockJournalEntries.map((entry) => (
          <div
            key={entry.id}
            className="bg-zinc-800 rounded-xl p-4 border border-zinc-700 hover:border-orange-500/50 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-20 text-center">
                <p className="text-sm text-zinc-400">
                  {entry.date.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                </p>
                <p className="text-xs text-zinc-500">{entry.date.getFullYear()}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded text-white ${typeColors[entry.type]}`}>
                    {entry.type.replace('_', ' ')}
                  </span>
                  {entry.tuvStatus && <TuvBadge status={entry.tuvStatus} />}
                </div>
                <h3 className="text-lg font-medium text-white">{entry.title}</h3>
                {entry.type === 'MODIFICATION' && (
                  <Link
                    href={`/market/new?modificationId=${entry.id}`}
                    className="inline-block mt-2 text-sm text-orange-400 hover:text-orange-300"
                  >
                    Sell as part →
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Back Link */}
      <Link href="/garage" className="text-zinc-400 hover:text-white transition-colors">
        ← Back to Garage
      </Link>
    </div>
  )
}
