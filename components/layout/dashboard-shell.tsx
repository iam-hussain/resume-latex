'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { usePreview } from '@/hooks/use-preview'
import { DEBOUNCE_MS } from '@/lib/constants'
import { createResumeFile, listResumeFiles, loadResumeFile, saveResumeFile } from '@/lib/api'
import { ResizablePanels } from './resizable-panels'
import { TexEditor } from '@/components/editor/tex-editor'
import { PdfPreview } from '@/components/preview/pdf-preview'
import { Button } from '@/components/ui/button'

interface DashboardShellProps {
  initialTex: string
}

export function DashboardShell({ initialTex }: DashboardShellProps): React.ReactElement {
  const [texContent, setTexContent] = useState(initialTex)
  const [savedContent, setSavedContent] = useState(initialTex)
  const [files, setFiles] = useState<string[]>([])
  const [activeFile, setActiveFile] = useState<string>('')
  const [newFileName, setNewFileName] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'default' | 'success' | 'error'>('default')

  const [autoReload, setAutoReload] = useState(true)
  const [frozenTex, setFrozenTex] = useState(initialTex)

  const debouncedTex = useDebouncedValue(texContent, DEBOUNCE_MS)
  const previewTex = autoReload ? debouncedTex : frozenTex
  const { previewUrl, status, error } = usePreview(previewTex)
  const isDirty = texContent !== savedContent

  function handleAutoReloadChange(enabled: boolean): void {
    setAutoReload(enabled)
    if (!enabled) {
      setFrozenTex(texContent)
    }
  }

  function handlePreviewRefresh(): void {
    setFrozenTex(texContent)
  }

  function setStatus(messageText: string, tone: 'default' | 'success' | 'error' = 'default'): void {
    setMessage(messageText)
    setMessageTone(tone)
  }

  useEffect(() => {
    async function init(): Promise<void> {
      try {
        setIsBusy(true)
        const available = await listResumeFiles()
        setFiles(available)
        const first = available.at(0)
        if (first) {
          setActiveFile(first)
          const content = await loadResumeFile(first)
          setTexContent(content)
          setSavedContent(content)
          setStatus(`Loaded ${first}`, 'success')
        } else {
          setStatus('No .tex files found in src/resumes')
        }
      } catch (err) {
        setStatus(err instanceof Error ? err.message : 'Failed to load resumes', 'error')
      } finally {
        setIsBusy(false)
      }
    }

    void init()
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') {
        return
      }
      event.preventDefault()
      if (!isBusy && activeFile) {
        void handleSaveFile()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isBusy, activeFile, texContent])

  const canSave = useMemo(
    () => Boolean(activeFile) && !isBusy && isDirty,
    [activeFile, isBusy, isDirty]
  )

  async function handleSelectFile(fileName: string): Promise<void> {
    try {
      setIsBusy(true)
      const content = await loadResumeFile(fileName)
      setActiveFile(fileName)
      setTexContent(content)
      setSavedContent(content)
      setStatus(`Loaded ${fileName}`, 'success')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to open file', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleSaveFile(): Promise<void> {
    if (!activeFile) {
      setStatus('Select a file before saving', 'error')
      return
    }
    try {
      setIsBusy(true)
      await saveResumeFile(activeFile, texContent)
      setSavedContent(texContent)
      setStatus(`Saved ${activeFile}`, 'success')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to save file', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleCreateFile(): Promise<void> {
    const rawName = newFileName.trim()
    if (!rawName) {
      setStatus('Enter a file name to create', 'error')
      return
    }
    try {
      setIsBusy(true)
      const created = await createResumeFile(rawName, texContent)
      const available = await listResumeFiles()
      setFiles(available)
      setActiveFile(created)
      setSavedContent(texContent)
      setNewFileName('')
      setStatus(`Created ${created}`, 'success')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to create file', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 px-4 py-3 border-b border-border bg-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px]">
            <h1 className="text-lg font-semibold">TeX Resume Builder</h1>
            <p className="text-xs text-muted-foreground">
              Real-time PDF rendering with professional TeX workflow
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background/60 px-2 py-2">
            <span className="text-xs text-muted-foreground">File</span>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground min-w-[220px]"
              value={activeFile}
              onChange={(event) => {
                void handleSelectFile(event.target.value)
              }}
              disabled={isBusy || files.length === 0}
            >
              {files.length === 0 ? (
                <option value="">No files</option>
              ) : (
                files.map((fileName) => (
                  <option key={fileName} value={fileName}>
                    {fileName}
                  </option>
                ))
              )}
            </select>
            <Button variant="secondary" onClick={() => void handleSaveFile()} disabled={!canSave}>
              {isBusy ? 'Saving...' : isDirty ? 'Save' : 'Saved'}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background/60 px-2 py-2">
            <span className="text-xs text-muted-foreground">New</span>
            <input
              type="text"
              placeholder="new-file-name.tex"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground min-w-[220px]"
              value={newFileName}
              onChange={(event) => setNewFileName(event.target.value)}
              disabled={isBusy}
            />
            <Button variant="outline" onClick={() => void handleCreateFile()} disabled={isBusy}>
              Create
            </Button>
          </div>

          <div className="ml-auto flex items-center gap-2 rounded-md border border-border px-3 py-2">
            <span
              className={`h-2 w-2 rounded-full ${
                messageTone === 'success'
                  ? 'bg-primary'
                  : messageTone === 'error'
                    ? 'bg-destructive'
                    : 'bg-muted-foreground'
              }`}
            />
            <p className="text-xs text-muted-foreground">
              {message ?? (isDirty ? 'Unsaved changes' : 'Ready')}
            </p>
            <span className="text-[10px] text-muted-foreground border-l border-border pl-2">
              Cmd/Ctrl+S
            </span>
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-hidden">
        <ResizablePanels
          left={
            <div className="h-full flex flex-col bg-card rounded-l-lg overflow-hidden border-r border-border">
              <div className="px-3 py-2 border-b border-border shrink-0 bg-muted/40">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Editor {activeFile ? `- ${activeFile}` : ''}
                  {isDirty ? ' *' : ''}
                </span>
              </div>
              <div className="flex-1 min-h-0">
                <TexEditor value={texContent} onChange={setTexContent} />
              </div>
            </div>
          }
          right={
            <PdfPreview
              previewUrl={previewUrl}
              status={status}
              error={error}
              tex={texContent}
              autoReload={autoReload}
              onAutoReloadChange={handleAutoReloadChange}
              onRefresh={handlePreviewRefresh}
            />
          }
        />
      </main>
    </div>
  )
}
