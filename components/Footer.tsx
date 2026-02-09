import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-sm text-zinc-500 flex flex-wrap gap-4 justify-between">
        <p>(c) {new Date().getFullYear()} DRIVETUNING</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/impressum" className="hover:text-zinc-200">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-zinc-200">Datenschutz</Link>
          <Link href="/agb" className="hover:text-zinc-200">AGB</Link>
          <Link href="/widerruf" className="hover:text-zinc-200">Widerruf</Link>
        </div>
      </div>
    </footer>
  )
}


