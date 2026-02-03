import Link from 'next/link'

// MOCK DATA - NO DATABASE
const mockEvents = [
  {
    id: '1',
    title: 'BMW Track Day Nürburgring',
    dateStart: new Date('2024-04-15'),
    locationRegion: 'Nürburgring',
    locationName: 'Nürburgring GP',
    brandFilter: 'BMW',
    status: 'UPCOMING' as const,
    attendeeCount: 20,
  },
  {
    id: '2',
    title: 'Schleswig Car Meet',
    dateStart: new Date('2024-05-01'),
    locationRegion: 'Schleswig-Holstein',
    locationName: 'Schleswig Park',
    brandFilter: null,
    status: 'UPCOMING' as const,
    attendeeCount: 8,
  },
  {
    id: '3',
    title: 'Audi Sport Treffen',
    dateStart: new Date('2024-05-20'),
    locationRegion: 'NRW',
    locationName: 'Hockenheimring',
    brandFilter: 'Audi',
    status: 'UPCOMING' as const,
    attendeeCount: 35,
  },
  {
    id: '4',
    title: 'Porsche Club Germany',
    dateStart: new Date('2024-06-10'),
    locationRegion: 'Baden-Württemberg',
    locationName: 'Stuttgart',
    brandFilter: 'Porsche',
    status: 'UPCOMING' as const,
    attendeeCount: 50,
  },
]

const regions = ['Nürburgring', 'Schleswig-Holstein', 'NRW', 'Baden-Württemberg']
const brands = ['BMW', 'Audi', 'Porsche', 'Mercedes', null]

export default function EventsPage() {
  return (
    <div className="flex gap-8">
      {/* Sidebar Filters */}
      <aside className="w-64 flex-shrink-0 space-y-6">
        <h1 className="text-2xl font-bold text-white">Events</h1>

        {/* Brand Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Brand</label>
          <select className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white">
            <option value="">All Brands</option>
            {brands.filter(b => b).map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        </div>

        {/* Region Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Region</label>
          <select className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white">
            <option value="">All Regions</option>
            {regions.map((region) => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Date</label>
          <input
            type="date"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
          />
        </div>
      </aside>

      {/* Events List */}
      <div className="flex-1">
        <p className="text-zinc-400 mb-4">{mockEvents.length} events found</p>

        <div className="space-y-4">
          {mockEvents.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="block bg-zinc-800 rounded-xl p-6 border border-zinc-700 hover:border-orange-500 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {event.brandFilter && (
                      <span className="px-2 py-0.5 bg-zinc-700 text-zinc-300 text-xs rounded">
                        {event.brandFilter}
                      </span>
                    )}
                    <span className="text-xs text-zinc-500">
                      {event.dateStart.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-1">{event.title}</h3>
                  <p className="text-zinc-400">
                    {event.locationName} • {event.locationRegion}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-orange-500">{event.attendeeCount}</p>
                  <p className="text-sm text-zinc-400">going</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
