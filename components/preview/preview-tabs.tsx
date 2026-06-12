'use client'

import { useState } from 'react'
import type { PreviewStatus } from '@/types/builder'
import { useAtsReport } from '@/hooks/use-ats-report'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { DEBOUNCE_MS } from '@/lib/constants'
import { PdfPreview } from './pdf-preview'
import { AtsReportView } from '@/components/ats/ats-report'
import { AiAssistant } from '@/components/ai/ai-assistant'

type Tab = 'preview' | 'ats' | 'ai'

interface PreviewTabsProps {
  texContent: string
  debouncedTex: string
  previewUrl: string | null
  status: PreviewStatus
  error: string | null
  fileName?: string
  autoReload: boolean
  onAutoReloadChange: (enabled: boolean) => void
  onRefresh: () => void
}

export function PreviewTabs({
  texContent,
  debouncedTex,
  previewUrl,
  status,
  error,
  fileName,
  autoReload,
  onAutoReloadChange,
  onRefresh,
}: PreviewTabsProps): React.ReactElement {
  const [tab, setTab] = useState<Tab>('preview')
  const [jobDescription, setJobDescription] = useState('')
  const debouncedJd = useDebouncedValue(jobDescription, DEBOUNCE_MS)

  const ats = useAtsReport({
    tex: debouncedTex,
    enabled: tab === 'ats',
    jobDescription: debouncedJd,
  })

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-r-lg border-l border-border bg-card">
      {/* Tab strip */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-muted/40 px-2 py-1.5">
        <TabButton active={tab === 'preview'} onClick={() => setTab('preview')}>
          Preview
        </TabButton>
        <TabButton active={tab === 'ats'} onClick={() => setTab('ats')}>
          ATS Report
          {ats.report && (
            <span className={`ml-1.5 rounded-full px-1.5 text-[10px] ${badgeTone(ats.report.parseQuality)}`}>
              {ats.report.parseQuality}
            </span>
          )}
        </TabButton>
        <TabButton active={tab === 'ai'} onClick={() => setTab('ai')}>
          AI Assist ✨
        </TabButton>
      </div>

      {/* Tab panels — keep mounted where cheap, lazy where expensive */}
      <div className="min-h-0 flex-1">
        <div className={tab === 'preview' ? 'h-full' : 'hidden'}>
          <PdfPreview
            previewUrl={previewUrl}
            status={status}
            error={error}
            tex={texContent}
            fileName={fileName}
            autoReload={autoReload}
            onAutoReloadChange={onAutoReloadChange}
            onRefresh={onRefresh}
            embedded
          />
        </div>
        {tab === 'ats' && (
          <AtsReportView
            report={ats.report}
            status={ats.status}
            error={ats.error}
            compileError={ats.compileError}
            jobDescription={jobDescription}
            onJobDescriptionChange={setJobDescription}
          />
        )}
        {tab === 'ai' && (
          <AiAssistant tex={texContent} jobDescription={jobDescription} />
        )}
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function badgeTone(score: number): string {
  if (score >= 80) return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
  if (score >= 60) return 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
  return 'bg-destructive/20 text-destructive'
}
