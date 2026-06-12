import { NextRequest, NextResponse } from 'next/server'
import { parseTexBody } from '../_shared/parse-tex-body'
import { analyzeResume } from '@/lib/ats/extract'

export const runtime = 'nodejs'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { tex, targetPages, jobDescription } = await parseTexBody(request)
    if (!tex.trim()) {
      return NextResponse.json({ error: 'Empty TeX source' }, { status: 400 })
    }
    const { report, compileError } = await analyzeResume(tex, { targetPages, jobDescription })
    return NextResponse.json({ report, compileError })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to analyze resume'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
