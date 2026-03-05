'use client'

import { useEffect, useState } from 'react'
import { postPreview } from '@/lib/api'
import type { PreviewStatus } from '@/types/builder'

interface UsePreviewResult {
  previewUrl: string | null
  status: PreviewStatus
  error: string | null
}

export function usePreview(tex: string): UsePreviewResult {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<PreviewStatus>(() => (tex.trim() ? 'loading' : 'idle'))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tex.trim()) {
      setStatus('idle')
      setError(null)
      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current)
        }
        return null
      })
      return
    }

    let cancelled = false
    setStatus('loading')
    setError(null)

    postPreview(tex)
      .then((blob) => {
        if (cancelled) return
        const nextUrl = URL.createObjectURL(blob)
        setPreviewUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current)
          }
          return nextUrl
        })
        setStatus('success')
      })
      .catch((err) => {
        if (cancelled) return
        setStatus('error')
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
      })

    return () => {
      cancelled = true
    }
  }, [tex])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  return { previewUrl, status, error }
}
