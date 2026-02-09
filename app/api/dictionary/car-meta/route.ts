import { NextResponse } from 'next/server'
import { getCarMetaFromReferenceDictionary } from '@/lib/reference-dictionary'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const make = (searchParams.get('make') || '').trim()
  const model = (searchParams.get('model') || '').trim()

  if (!make || !model) {
    return NextResponse.json({ error: 'make and model are required' }, { status: 400 })
  }

  const meta = getCarMetaFromReferenceDictionary({ make, model })
  return NextResponse.json({ meta })
}
