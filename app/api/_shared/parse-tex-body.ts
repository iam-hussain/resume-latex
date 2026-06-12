import { NextRequest } from 'next/server'

const MAX_TEX_LENGTH = 2 * 1024 * 1024 // 2MB
const MAX_JD_LENGTH = 50 * 1024 // 50KB

export interface ParsedTexBody {
  tex: string
  targetPages?: number
  jobDescription?: string
}

export async function parseTexBody(request: NextRequest): Promise<ParsedTexBody> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new Error('Invalid JSON body')
  }
  if (body === null || typeof body !== 'object' || !('tex' in body)) {
    throw new Error('Missing or invalid body: expected { tex: string }')
  }
  const obj = body as Record<string, unknown>

  const tex = obj.tex
  if (typeof tex !== 'string') {
    throw new Error('Field "tex" must be a string')
  }
  if (tex.length > MAX_TEX_LENGTH) {
    throw new Error(`TeX source exceeds maximum length (${MAX_TEX_LENGTH} characters)`)
  }

  const result: ParsedTexBody = { tex }

  if (obj.targetPages !== undefined) {
    const tp = Number(obj.targetPages)
    if (!Number.isFinite(tp) || tp < 1 || tp > 10) {
      throw new Error('Field "targetPages" must be a number between 1 and 10')
    }
    result.targetPages = Math.round(tp)
  }

  if (obj.jobDescription !== undefined) {
    if (typeof obj.jobDescription !== 'string') {
      throw new Error('Field "jobDescription" must be a string')
    }
    if (obj.jobDescription.length > MAX_JD_LENGTH) {
      throw new Error(`Job description exceeds maximum length (${MAX_JD_LENGTH} characters)`)
    }
    result.jobDescription = obj.jobDescription
  }

  return result
}
