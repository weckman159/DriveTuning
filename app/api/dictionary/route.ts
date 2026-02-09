import { NextResponse } from 'next/server'
import { suggestFromReferenceDictionary, type DictionaryType } from '@/lib/reference-dictionary'

function parseType(input: string | null): DictionaryType | null {
  if (!input) return null
  const v = input.trim().toLowerCase()
  if (v === 'car_make' || v === 'car_model' || v === 'brand') return v
  return null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const type = parseType(searchParams.get('type'))
  const q = searchParams.get('q') || ''
  const make = searchParams.get('make') || undefined
  const limitRaw = searchParams.get('limit')
  const limit = limitRaw ? Number(limitRaw) : undefined

  if (!type) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const suggestions = suggestFromReferenceDictionary({
    type,
    q,
    make,
    limit: Number.isFinite(limit as any) ? (limit as number) : undefined,
  })

  return NextResponse.json({ suggestions })
}

