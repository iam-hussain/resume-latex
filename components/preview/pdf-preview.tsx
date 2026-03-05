'use client'

import { useState } from 'react'
import type { PreviewStatus } from '@/types/builder'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { postPdf } from '@/lib/api'

interface PdfPreviewProps {
  previewUrl: string | null
  status: PreviewStatus
  error: string | null
  tex: string
  autoReload?: boolean
  onAutoReloadChange?: (enabled: boolean) => void
  onRefresh?: () => void
  onDownload?: () => void
}

export function PdfPreview({
  previewUrl,
  status,
  error,
  tex,
  autoReload = true,
  onAutoReloadChange,
  onRefresh,
  onDownload,
}: PdfPreviewProps): React.ReactElement {
  const [zoom, setZoom] = useState(1)

  async function handleDownload(): Promise<void> {
    try {
      const blob = await postPdf(tex)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'resume.pdf'
      a.click()
      URL.revokeObjectURL(url)
      onDownload?.()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="h-full w-full flex flex-col min-h-0 bg-card rounded-r-lg overflow-hidden border-l border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border shrink-0 bg-muted/40">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              status === 'loading'
                ? 'bg-muted-foreground'
                : status === 'error'
                  ? 'bg-destructive'
                  : 'bg-primary'
            }`}
          />
          <span className="text-sm text-muted-foreground">
            {status === 'loading' ? 'Rendering PDF...' : 'PDF Preview'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onAutoReloadChange && (
            <button
              type="button"
              onClick={() => onAutoReloadChange(!autoReload)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                autoReload
                  ? 'bg-primary/20 text-primary hover:bg-primary/30'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              title={autoReload ? 'Auto reload on' : 'Auto reload off'}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              Auto {autoReload ? 'On' : 'Off'}
            </button>
          )}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={status === 'loading' || !tex.trim()}
              title="Refresh preview"
            >
              Refresh
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setZoom(0.8)}>
            80%
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(1)}>
            100%
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(1.2)}>
            120%
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (previewUrl) {
                window.open(previewUrl, '_blank', 'noopener,noreferrer')
              }
            }}
            disabled={!previewUrl}
          >
            Open
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleDownload()}
            disabled={status === 'loading' || !tex.trim()}
          >
            Download
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-4 h-full bg-background">
        {status === 'loading' && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-8 w-full mt-6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        )}
        {status === 'error' && error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 p-4 text-sm text-foreground">
            <p className="font-medium text-destructive">Preview error</p>
            <p className="mt-1 text-muted-foreground">{error}</p>
          </div>
        )}
        {status === 'success' && previewUrl ? (
          <div className="flex min-h-full justify-center">
            <iframe
              key={previewUrl}
              title="Resume preview"
              src={previewUrl}
              className="border border-border bg-background rounded-md shadow-sm"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                width: `${100 / zoom}%`,
                minHeight: `${100 / zoom}vh`,
              }}
            />
          </div>
        ) : status === 'success' ? (
          <p className="text-muted-foreground text-sm">Preview generated but empty.</p>
        ) : status === 'idle' ? (
          <p className="text-muted-foreground text-sm">Edit LaTeX on the left to see a live preview.</p>
        ) : null}
      </div>
    </div>
  )
}
