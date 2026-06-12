import { NextResponse } from 'next/server'
import { getAvailability } from '@/lib/ai/providers'

export const runtime = 'nodejs'

// Key-free view of which providers/models are usable, for the UI selector.
export async function GET(): Promise<NextResponse> {
  const providers = getAvailability()
  const anyAvailable = providers.some((p) => p.available)
  return NextResponse.json({ providers, anyAvailable })
}
