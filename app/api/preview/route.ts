import { NextRequest, NextResponse } from 'next/server'
import { parseTexBody } from '../_shared/parse-tex-body'
import { buildPdfFromString } from '@/lib/latex'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { tex } = await parseTexBody(request)
    const buffer = await buildPdfFromString(tex)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate preview PDF'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
