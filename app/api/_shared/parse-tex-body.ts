import { NextRequest } from 'next/server'

const MAX_TEX_LENGTH = 2 * 1024 * 1024 // 2MB

export async function parseTexBody(request: NextRequest): Promise<{ tex: string }> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new Error('Invalid JSON body')
  }
  if (body === null || typeof body !== 'object' || !('tex' in body)) {
    throw new Error('Missing or invalid body: expected { tex: string }')
  }
  const tex = (body as { tex: unknown }).tex
  if (typeof tex !== 'string') {
    throw new Error('Field "tex" must be a string')
  }
  if (tex.length > MAX_TEX_LENGTH) {
    throw new Error(`TeX source exceeds maximum length (${MAX_TEX_LENGTH} characters)`)
  }
  return { tex }
}
