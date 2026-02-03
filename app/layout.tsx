import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DRIVETUNING - Track your builds',
  description: 'Track builds. Prove TÜV. Sell with history.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-900 text-zinc-100 min-h-screen`}>
        <nav className="border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Link href="/" className="text-xl font-bold text-orange-500">
                DRIVETUNING
              </Link>
              <div className="flex items-center space-x-4">
                <Link href="/garage" className="text-zinc-300 hover:text-white">
                  Garage
                </Link>
                <Link href="/market" className="text-zinc-300 hover:text-white">
                  Market
                </Link>
                <Link href="/api/auth/signin" className="text-zinc-300 hover:text-white">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
