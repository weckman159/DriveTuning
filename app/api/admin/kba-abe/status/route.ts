import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { isAdminSession } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import fs from 'node:fs'
import path from 'node:path'

function readKbaRawFile() {
  const repoRoot = process.cwd()
  const filePath = path.join(repoRoot, 'data', 'reference', 'kba-abe-raw.json')
  if (!fs.existsSync(filePath)) {
    return { exists: false as const, path: filePath }
  }
  try {
    const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as any
    return {
      exists: true as const,
      path: filePath,
      sourceUrl: typeof payload?.sourceUrl === 'string' ? payload.sourceUrl : null,
      fetchedAt: typeof payload?.fetchedAt === 'string' ? payload.fetchedAt : null,
      headersCount: Array.isArray(payload?.headers) ? payload.headers.length : null,
      rowsCount: typeof payload?.count === 'number' ? payload.count : Array.isArray(payload?.rows) ? payload.rows.length : null,
      rowsTruncatedTo: Array.isArray(payload?.rows) ? payload.rows.length : null,
    }
  } catch (e) {
    return {
      exists: true as const,
      path: filePath,
      error: e instanceof Error ? e.message : 'Failed to parse JSON',
    }
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
  }

  const raw = readKbaRawFile()

  let db: any = null
  try {
    const kbaCount = await prisma.legalityReference.count({ where: { sourceId: 'kba' } })
    const maxUpdated = await prisma.legalityReference.aggregate({
      where: { sourceId: 'kba' },
      _max: { updatedAt: true },
    })
    const sources = await prisma.legalityReference.groupBy({
      by: ['sourceId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 25,
    })
    db = {
      kbaCount,
      kbaMaxUpdatedAt: maxUpdated._max.updatedAt,
      countsBySource: sources.map((s) => ({ sourceId: s.sourceId, count: s._count.id })),
    }
  } catch (e) {
    db = { error: e instanceof Error ? e.message : 'DB error' }
  }

  return NextResponse.json({
    kba: {
      envConfigured: Boolean(process.env.KBA_ABE_CSV_URL),
      rawFile: raw.exists
        ? {
            exists: true,
            path: raw.path,
            sourceUrl: (raw as any).sourceUrl ?? null,
            fetchedAt: (raw as any).fetchedAt ?? null,
            headersCount: (raw as any).headersCount ?? null,
            rowsCount: (raw as any).rowsCount ?? null,
            rowsTruncatedTo: (raw as any).rowsTruncatedTo ?? null,
            error: (raw as any).error ?? null,
          }
        : { exists: false, path: raw.path },
      db,
    },
  })
}
