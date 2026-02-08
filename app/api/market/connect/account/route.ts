import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'

function getAppUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ''
  return env.trim().replace(/\/+$/, '')
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const account = await prisma.stripeConnectAccount.findUnique({
    where: { userId: session.user.id },
  })

  if (account) {
    try {
      const stripe = getStripe()
      const acct = await stripe.accounts.retrieve(account.stripeAccountId)
      const chargesEnabled = Boolean((acct as any).charges_enabled)
      const payoutsEnabled = Boolean((acct as any).payouts_enabled)
      const detailsSubmitted = Boolean((acct as any).details_submitted)

      const updated = await prisma.stripeConnectAccount.update({
        where: { id: account.id },
        data: { chargesEnabled, payoutsEnabled, detailsSubmitted },
      })

      return NextResponse.json({ account: updated })
    } catch {
      // Fall back to cached flags.
    }
  }

  return NextResponse.json({ account })
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const appUrl = getAppUrl()
  if (!appUrl) return NextResponse.json({ error: 'APP_URL ist nicht konfiguriert' }, { status: 500 })
  if (!session.user.email) return NextResponse.json({ error: 'E-Mail ist erforderlich' }, { status: 400 })

  const stripe = getStripe()

  const existing = await prisma.stripeConnectAccount.findUnique({
    where: { userId: session.user.id },
  })

  const stripeAccountId =
    existing?.stripeAccountId ||
    (await stripe.accounts.create({
      type: 'express',
      country: 'DE',
      email: session.user.email,
      capabilities: {
        transfers: { requested: true },
      },
    })).id

  if (!existing) {
    const acct = await stripe.accounts.retrieve(stripeAccountId)
    await prisma.stripeConnectAccount.create({
      data: {
        userId: session.user.id,
        stripeAccountId,
        chargesEnabled: Boolean((acct as any).charges_enabled),
        payoutsEnabled: Boolean((acct as any).payouts_enabled),
        detailsSubmitted: Boolean((acct as any).details_submitted),
      },
    })
  }

  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${appUrl}/settings/billing?stripe=refresh`,
    return_url: `${appUrl}/settings/billing?stripe=return`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: link.url, stripeAccountId }, { status: 201 })
}
