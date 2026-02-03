import Link from 'next/link'

// MOCK DATA - NO DATABASE
const garages = [
  {
    id: '1',
    name: 'M-Power Lab',
    region: 'Schleswig-Holstein',
    cars: [
      {
        id: '1',
        make: 'BMW',
        model: 'M4',
        generation: 'G82',
        year: 2022,
        projectGoal: 'TRACK' as const,
        currentMileage: 65230,
        heroImage: null,
      },
      {
        id: '2',
        make: 'Audi',
        model: 'RS6',
        generation: 'C8',
        year: 2021,
        projectGoal: 'DAILY' as const,
        currentMileage: 89000,
        heroImage: null,
      },
    ],
  },
  {
    id: '2',
    name: 'Track Toys',
    region: 'NRW',
    cars: [
      {
        id: '3',
        make: 'Porsche',
        model: '911 GT3',
        generation: '992',
        year: 2023,
        projectGoal: 'TRACK' as const,
        currentMileage: 15000,
        heroImage: null,
      },
    ],
  },
]

export default function GaragePage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">My Garage</h1>
        <button className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg transition-colors">
          + Add Garage
        </button>
      </div>

      <div className="space-y-12">
        {garages.map((garage) => (
          <div key={garage.id} className="space-y-4">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-semibold text-zinc-200">{garage.name}</h2>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400">{garage.region}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {garage.cars.map((car) => (
                <Link
                  key={car.id}
                  href={`/cars/${car.id}`}
                  className="group block bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700 hover:border-orange-500 hover:scale-105 transition-all duration-300"
                >
                  <div className="aspect-[4/3] bg-zinc-700 flex items-center justify-center">
                    <span className="text-zinc-500">400×300</span>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">
                        {car.make} {car.model} {car.generation}
                      </h3>
                      <span className="px-2 py-1 text-xs font-medium bg-orange-500/20 text-orange-400 rounded">
                        {car.projectGoal}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400">
                      {car.currentMileage?.toLocaleString()} km
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
