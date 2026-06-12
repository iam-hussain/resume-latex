'use client'

import { useState } from 'react'
import type { AtsReport, AtsStatus, AtsWarning } from '@/types/ats'

interface AtsReportViewProps {
  report: AtsReport | null
  status: AtsStatus
  error: string | null
  compileError: { message: string; line?: number } | null
  jobDescription: string
  onJobDescriptionChange: (value: string) => void
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-destructive'
}

function ScoreRing({ score, label }: { score: number; label: string }): React.ReactElement {
  const radius = 26
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)
  const stroke =
    score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" className="text-muted" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <span className={`text-sm font-semibold ${scoreColor(score)}`}>{score}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  )
}

function WarningRow({ warning }: { warning: AtsWarning }): React.ReactElement {
  const dot =
    warning.level === 'error'
      ? 'bg-destructive'
      : warning.level === 'warn'
        ? 'bg-amber-500'
        : 'bg-sky-500'
  return (
    <li className="flex gap-2 py-1.5">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0">
        <p className="text-sm text-foreground">{warning.message}</p>
        {warning.detail && <p className="text-xs text-muted-foreground">{warning.detail}</p>}
      </div>
    </li>
  )
}

export function AtsReportView({
  report,
  status,
  error,
  compileError,
  jobDescription,
  onJobDescriptionChange,
}: AtsReportViewProps): React.ReactElement {
  const [showText, setShowText] = useState(false)
  const [jdOpen, setJdOpen] = useState(false)

  return (
    <div className="h-full overflow-auto p-4 space-y-4 bg-background">
      {status === 'loading' && !report && (
        <p className="text-sm text-muted-foreground">Analyzing resume…</p>
      )}
      {status === 'error' && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <p className="font-medium text-destructive">Analysis failed</p>
          <p className="mt-1 text-muted-foreground">{error}</p>
        </div>
      )}

      {report && (
        <>
          {/* Top: scores */}
          <div className="flex items-center gap-6 rounded-lg border border-border bg-card p-4">
            <ScoreRing score={report.parseQuality} label="Parse" />
            {report.jdMatch && <ScoreRing score={report.jdMatch.score} label="JD Match" />}
            <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
              <Stat label="Words" value={String(report.wordCount)} />
              <Stat
                label="Pages"
                value={
                  report.pageCount === null
                    ? '—'
                    : `${report.pageCount}${report.source === 'tex' ? ' (est)' : ''}`
                }
                tone={report.overBudget ? 'bad' : 'default'}
              />
              <Stat label="Sections" value={`${report.sections.detected.length}/4`} />
              <Stat
                label="Source"
                value={report.source === 'pdf' ? 'PDF' : 'TeX'}
                title={
                  report.source === 'pdf'
                    ? 'Extracted from the compiled PDF — exactly what an ATS sees.'
                    : 'No LaTeX toolchain available — analyzed from .tex source (page count estimated).'
                }
              />
            </div>
          </div>

          {compileError && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium text-amber-600 dark:text-amber-400">
                LaTeX compile error{compileError.line ? ` (line ${compileError.line})` : ''}
              </p>
              <p className="mt-1 text-muted-foreground">{compileError.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Analyzed from source instead. Fix the error for an exact ATS reading.
              </p>
            </div>
          )}

          {/* Sections */}
          <Section title="Sections">
            <div className="flex flex-wrap gap-2">
              {report.sections.detected.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-600 dark:text-emerald-400"
                >
                  ✓ {s}
                </span>
              ))}
              {report.sections.missing.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs text-destructive"
                >
                  ✗ {s}
                </span>
              ))}
            </div>
          </Section>

          {/* Contact */}
          <Section title="Contact">
            <dl className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
              <ContactItem label="Email" value={report.contact.email} />
              <ContactItem label="Phone" value={report.contact.phone} />
              <ContactItem
                label="Links"
                value={report.contact.links.length > 0 ? `${report.contact.links.length} found` : null}
              />
              <ContactItem label="Location" value={report.contact.locationFound ? 'Detected' : null} />
            </dl>
          </Section>

          {/* Warnings */}
          {report.warnings.length > 0 && (
            <Section title={`Warnings (${report.warnings.length})`}>
              <ul className="divide-y divide-border">
                {report.warnings.map((w, i) => (
                  <WarningRow key={`${w.code}-${i}`} warning={w} />
                ))}
              </ul>
            </Section>
          )}

          {/* JD matching */}
          <Section title="Job Description Match">
            <button
              type="button"
              onClick={() => setJdOpen((o) => !o)}
              className="mb-2 text-xs font-medium text-primary hover:underline"
            >
              {jdOpen ? 'Hide' : 'Paste a job description'} ▾
            </button>
            {jdOpen && (
              <textarea
                value={jobDescription}
                onChange={(e) => onJobDescriptionChange(e.target.value)}
                placeholder="Paste the job description here to see which keywords you're missing…"
                className="mb-3 h-32 w-full resize-y rounded-md border border-input bg-background p-2 text-sm text-foreground"
              />
            )}
            {report.jdMatch && (jobDescription.trim().length > 0) && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Matched ({report.jdMatch.matched.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {report.jdMatch.matched.slice(0, 30).map((m) => (
                      <span key={m.term} className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                        {m.term}
                      </span>
                    ))}
                    {report.jdMatch.matched.length === 0 && (
                      <span className="text-xs text-muted-foreground">None yet</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-destructive">
                    Missing — add these ({report.jdMatch.missing.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {report.jdMatch.missing.slice(0, 30).map((m) => (
                      <button
                        key={m.term}
                        type="button"
                        title="Click to copy"
                        onClick={() => void navigator.clipboard?.writeText(m.term)}
                        className="rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive hover:bg-destructive/20"
                      >
                        {m.term}
                      </button>
                    ))}
                    {report.jdMatch.missing.length === 0 && (
                      <span className="text-xs text-muted-foreground">Great coverage!</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Keyword density */}
          {report.keywords.length > 0 && (
            <Section title="Keyword Density">
              <div className="flex flex-wrap gap-1.5">
                {report.keywords.slice(0, 40).map((k) => (
                  <span key={k.term} className="rounded bg-muted px-2 py-0.5 text-xs text-foreground">
                    {k.term} <span className="text-muted-foreground">×{k.count}</span>
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Raw ATS text */}
          <Section title="What the ATS sees">
            <button
              type="button"
              onClick={() => setShowText((s) => !s)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {showText ? 'Hide' : 'Show'} extracted text ▾
            </button>
            {showText && (
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs text-foreground">
                {report.extractedText}
              </pre>
            )}
          </Section>
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}

function Stat({
  label,
  value,
  tone = 'default',
  title,
}: {
  label: string
  value: string
  tone?: 'default' | 'bad'
  title?: string
}): React.ReactElement {
  return (
    <div title={title}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className={`font-medium ${tone === 'bad' ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
    </div>
  )
}

function ContactItem({ label, value }: { label: string; value: string | null }): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-1.5 w-1.5 rounded-full ${value ? 'bg-emerald-500' : 'bg-destructive'}`} />
      <span className="text-muted-foreground">{label}:</span>
      <span className="truncate text-foreground">{value ?? 'Not found'}</span>
    </div>
  )
}
