import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-5xl font-bold mb-6">
        Builds dokumentieren. <span className="text-sky-500">TÜV nachweisen.</span> Mit Historie verkaufen.
      </h1>
      <p className="text-xl text-zinc-400 mb-8 max-w-2xl">
        Die Plattform fuer Tuning-Projekte: Build Passport, Nachweise, Historie und Marktplatz.
      </p>
      <Link
        href="/garage"
        className="px-8 py-3 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg transition-colors"
      >
        Loslegen
      </Link>
    </div>
  )
}
