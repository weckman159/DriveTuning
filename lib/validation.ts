import 'server-only'

import { z } from 'zod'

export async function readJson(req: Request): Promise<unknown> {
  return req.json().catch(() => ({} as unknown))
}

export function firstZodIssue(err: z.ZodError): { path: string; message: string } | null {
  const issue = err.issues[0]
  if (!issue) return null
  return { path: issue.path.join('.'), message: issue.message }
}

