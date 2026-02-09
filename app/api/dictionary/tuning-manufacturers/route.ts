import { NextResponse } from 'next/server'
import { suggestTuningManufacturers } from '@/lib/tuning-manufacturers'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const categoryId = searchParams.get('categoryId') || undefined
  const country = searchParams.get('country') || undefined
  const limitRaw = searchParams.get('limit')
  const limit = limitRaw ? Number(limitRaw) : undefined

  const suggestions = suggestTuningManufacturers({
    q,
    categoryId,
    country,
    limit: Number.isFinite(limit as any) ? (limit as number) : undefined,
  })

  return NextResponse.json({ suggestions })
}

