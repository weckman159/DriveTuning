import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-5xl font-bold mb-6">
        Track builds. <span className="text-orange-500">Prove TÜV.</span> Sell with history.
      </h1>
      <p className="text-xl text-zinc-400 mb-8 max-w-2xl">
        The complete platform for German car tuners to document projects,
        manage garages, and showcase provenance.
      </p>
      <Link
        href="/garage"
        className="px-8 py-3 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg transition-colors"
      >
        Get Started
      </Link>
    </div>
  )
}
