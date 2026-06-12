'use client'

import { useEffect, useState } from 'react'
import { postAts } from '@/lib/api'
import type { AtsReport, AtsStatus } from '@/types/ats'

interface UseAtsReportArgs {
  tex: string
  enabled: boolean
  targetPages?: number
  jobDescription?: string
}

interface UseAtsReportResult {
  report: AtsReport | null
  status: AtsStatus
  error: string | null
  compileError: { message: string; line?: number } | null
}

// Debounced ATS analysis. Mirrors use-preview: skips empty TeX, cancels stale
// responses, and only runs while `enabled` (i.e. the ATS tab is active).
export function useAtsReport({
  tex,
  enabled,
  targetPages,
  jobDescription,
}: UseAtsReportArgs): UseAtsReportResult {
  const [report, setReport] = useState<AtsReport | null>(null)
  const [status, setStatus] = useState<AtsStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [compileError, setCompileError] = useState<{ message: string; line?: number } | null>(null)

  useEffect(() => {
    if (!enabled || !tex.trim()) {
      setStatus('idle')
      return
    }

    let cancelled = false
    setStatus('loading')
    setError(null)

    postAts(tex, { targetPages, jobDescription })
      .then((res) => {
        if (cancelled) return
        setReport(res.report)
        setCompileError(res.compileError ?? null)
        setStatus('success')
      })
      .catch((err) => {
        if (cancelled) return
        setStatus('error')
        setError(err instanceof Error ? err.message : String(err))
      })

    return () => {
      cancelled = true
    }
  }, [tex, enabled, targetPages, jobDescription])

  return { report, status, error, compileError }
}
