import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

function ensureSqliteFile() {
  const databaseUrl = process.env.DATABASE_URL || ''
  if (!databaseUrl.startsWith('file:/tmp/')) return

  const sqlitePath = databaseUrl.replace(/^file:/, '')
  if (fs.existsSync(sqlitePath)) {
    // In serverless cold starts, copied files can end up read-only.
    // Force write permissions so auth/register and other mutations can work.
    fs.chmodSync(sqlitePath, 0o666)
    return
  }

  const bundledCandidates = [
    '/var/task/prisma/dev.db',
    path.join(process.cwd(), 'prisma', 'dev.db'),
  ]

  const bundledDb = bundledCandidates.find((candidate) => fs.existsSync(candidate))
  if (!bundledDb) return

  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true })
  fs.copyFileSync(bundledDb, sqlitePath)
  fs.chmodSync(sqlitePath, 0o666)
}

ensureSqliteFile()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

