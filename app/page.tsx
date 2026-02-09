import HomeFeed from '@/components/HomeFeed'
import type { HomeFeedFilter } from '@/lib/home-feed'

export const dynamic = 'force-dynamic'

function parseFilter(input: unknown): HomeFeedFilter {
  const raw = typeof input === 'string' ? input.trim().toLowerCase() : ''
  if (raw === 'builds' || raw === 'legal' || raw === 'market' || raw === 'events') return raw
  return 'all'
}

export default async function Home(props: { searchParams?: Promise<{ filter?: string }> }) {
  const sp = props.searchParams ? await props.searchParams : undefined
  const filter = parseFilter(sp?.filter)
  return <HomeFeed filter={filter} />
}
