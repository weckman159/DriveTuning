import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) notFound()

  const order = await prisma.marketOrder.findUnique({
    where: { id: orderId },
    include: {
      partListing: { select: { id: true, title: true } },
    },
  })

  if (!order) notFound()
  if (order.buyerId !== session.user.id && order.sellerId !== session.user.id) notFound()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-semibold text-white">Bestellung</h1>
      <div className="panel p-5 space-y-2">
        <p className="text-zinc-300">
          Angebot:{' '}
          <Link className="text-sky-400 hover:text-sky-300" href={`/market/${order.partListing.id}`}>
            {order.partListing.title}
          </Link>
        </p>
        <p className="text-zinc-300">
          Betrag: €{(order.amountCents / 100).toLocaleString()} {order.currency}
        </p>
        <p className="text-zinc-300">Status: {order.status}</p>
      </div>
      <Link href="/market" className="text-zinc-400 hover:text-white transition-colors">
        ← Zurueck zum Marktplatz
      </Link>
    </div>
  )
}
