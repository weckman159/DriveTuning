import { NextResponse } from 'next/server'
import { suggestTuningLegality } from '@/lib/tuning-legality-de'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const categoryId = searchParams.get('categoryId') || undefined
  const subcategoryId = searchParams.get('subcategoryId') || undefined
  const approvalNumber = searchParams.get('approvalNumber') || undefined
  const limitRaw = searchParams.get('limit')
  const limit = limitRaw ? Number(limitRaw) : undefined

  const suggestions = suggestTuningLegality({
    q,
    categoryId,
    subcategoryId,
    approvalNumber,
    limit: Number.isFinite(limit as any) ? (limit as number) : undefined,
  })

  return NextResponse.json({ suggestions })
}

