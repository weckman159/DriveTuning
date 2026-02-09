import { NextResponse } from 'next/server'
import { suggestPlaces, type PlaceDictType } from '@/lib/places-dictionary'

function parseType(input: string | null): PlaceDictType | null {
  if (!input) return null
  const v = input.trim().toLowerCase()
  if (v === 'state' || v === 'city' || v === 'district') return v as PlaceDictType
  return null
}

function parseLimit(input: string | null) {
  if (!input) return undefined
  const n = Number(input)
  return Number.isFinite(n) ? n : undefined
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const type = parseType(searchParams.get('type'))
  const q = searchParams.get('q') || ''
  const stateId = searchParams.get('stateId')
  const cityId = searchParams.get('cityId')
  const limit = parseLimit(searchParams.get('limit'))

  if (!type) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const suggestions = suggestPlaces({
    type,
    q,
    stateId,
    cityId,
    limit,
  })

  return NextResponse.json({ suggestions })
}

