import Link from 'next/link'
import { TuvBadge } from '@/components/TuvBadge'

// MOCK DATA - NO DATABASE
const mockListings = [
  {
    id: '1',
    title: 'KW V3 coilovers',
    price: 1200,
    condition: 'LIKE_NEW' as const,
    mileageOnCar: 65230,
    car: { make: 'BMW', model: 'M4', generation: 'G82' },
    tuvStatus: 'YELLOW_ABE' as const,
  },
  {
    id: '2',
    title: 'Akrapovic exhaust system',
    price: 2200,
    condition: 'USED' as const,
    mileageOnCar: 89000,
    car: { make: 'Audi', model: 'RS6', generation: 'C8' },
    tuvStatus: 'RED_RACING' as const,
  },
  {
    id: '3',
    title: 'Porsche 911 GT3 seats',
    price: 3500,
    condition: 'LIKE_NEW' as const,
    mileageOnCar: 15000,
    car: { make: 'Porsche', model: '911 GT3', generation: '992' },
    tuvStatus: 'GREEN_REGISTERED' as const,
  },
  {
    id: '4',
    title: 'Brembo GT6 brakes',
    price: 1800,
    condition: 'USED' as const,
    mileageOnCar: 45000,
    car: { make: 'BMW', model: 'M3', generation: 'G80' },
    tuvStatus: 'YELLOW_ABE' as const,
  },
  {
    id: '5',
    title: 'Forge intercooler',
    price: 650,
    condition: 'NEW' as const,
    mileageOnCar: null,
    car: { make: 'Audi', model: 'TT RS', generation: '8S' },
    tuvStatus: 'YELLOW_ABE' as const,
  },
  {
    id: '6',
    title: 'BBS rims 19"',
    price: 2400,
    condition: 'USED' as const,
    mileageOnCar: 32000,
    car: { make: 'Mercedes', model: 'AMG GT', generation: 'C190' },
    tuvStatus: 'GREEN_REGISTERED' as const,
  },
]

const makes = ['BMW', 'Audi', 'Porsche', 'Mercedes']
const categories = ['SUSPENSION', 'ENGINE', 'EXHAUST', 'BRAKES', 'WHEELS', 'AERO']

const conditionColors = {
  USED: 'bg-zinc-500',
  LIKE_NEW: 'bg-blue-500',
  NEW: 'bg-green-500',
} as const

export default function MarketPage() {
  return (
    <div className="flex gap-8">
      {/* Sidebar Filters */}
      <aside className="w-64 flex-shrink-0 space-y-6">
        <h1 className="text-2xl font-bold text-white">Marketplace</h1>

        {/* Make Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Make</label>
          <select className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white">
            <option value="">All Makes</option>
            {makes.map((make) => (
              <option key={make} value={make}>{make}</option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Category</label>
          <select className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white">
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Price Range</label>
          <input
            type="range"
            min="0"
            max="5000"
            step="100"
            className="w-full accent-orange-500"
          />
          <div className="flex justify-between text-sm text-zinc-400">
            <span>€0</span>
            <span>€5000</span>
          </div>
        </div>
      </aside>

      {/* Listings Grid */}
      <div className="flex-1">
        <p className="text-zinc-400 mb-4">{mockListings.length} listings found</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockListings.map((listing) => (
            <Link
              key={listing.id}
              href={`/market/${listing.id}`}
              className="group bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700 hover:border-orange-500 transition-colors"
            >
              <div className="aspect-[4/3] bg-zinc-700 flex items-center justify-center">
                <span className="text-zinc-500">Image</span>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors">
                    {listing.title}
                  </h3>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded text-white ${conditionColors[listing.condition]}`}>
                    {listing.condition.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-2xl font-bold text-orange-500">€{listing.price.toLocaleString()}</p>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <span>From {listing.car.make} {listing.car.model}</span>
                  {listing.mileageOnCar && (
                    <span>• {listing.mileageOnCar.toLocaleString()} km</span>
                  )}
                </div>
                {listing.tuvStatus && (
                  <div className="pt-2">
                    <TuvBadge status={listing.tuvStatus} />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
