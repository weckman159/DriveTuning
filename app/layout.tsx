import type { Metadata } from 'next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Providers from '@/components/Providers'
import NavBar from '@/components/NavBar'
import Footer from '@/components/Footer'
import './globals.css'

export const metadata: Metadata = {
  title: 'DRIVETUNING - Build Passport',
  description: 'Builds dokumentieren. TÜV nachweisen. Mit Historie verkaufen.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className="dark">
      <body className="text-zinc-100 min-h-screen font-sans antialiased">
        <Providers>
          <NavBar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Footer />
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  )
}

