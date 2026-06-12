'use client'

import { useEffect, useRef, useState } from 'react'
import { getAiModels, streamAi, type AiModelsResponse } from '@/lib/api'
import type { AiAction } from '@/lib/ai/prompts'
import type { ChatMessage } from '@/lib/ai/client'
import { Button } from '@/components/ui/button'

interface AiAssistantProps {
  tex: string
  jobDescription: string
  onApply?: (text: string) => void
}

interface DisplayMessage {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_ACTIONS: { action: AiAction; label: string; needsJd?: boolean }[] = [
  { action: 'optimize', label: 'Optimize for ATS' },
  { action: 'tailor', label: 'Tailor to JD', needsJd: true },
  { action: 'bullets', label: 'Improve bullets' },
  { action: 'summary', label: 'Write summary' },
]

const STORAGE_KEY = 'resume-ai-model'

export function AiAssistant({ tex, jobDescription }: AiAssistantProps): React.ReactElement {
  const [models, setModels] = useState<AiModelsResponse | null>(null)
  const [provider, setProvider] = useState<string>('')
  const [model, setModel] = useState<string>('')
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getAiModels()
      .then((data) => {
        setModels(data)
        const firstAvailable = data.providers.find((p) => p.available)
        if (firstAvailable) {
          const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
          const [savedProvider, savedModel] = saved?.split('::') ?? []
          const match = data.providers.find(
            (p) => p.id === savedProvider && p.available && p.models.some((m) => m.id === savedModel)
          )
          if (match && savedModel) {
            setProvider(match.id)
            setModel(savedModel)
          } else {
            setProvider(firstAvailable.id)
            setModel(firstAvailable.models[0]?.id ?? '')
          }
        }
      })
      .catch(() => setError('Could not load AI models'))
  }, [])

  useEffect(() => {
    if (provider && model && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, `${provider}::${model}`)
    }
  }, [provider, model])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  function buildHistory(): ChatMessage[] {
    return messages.map((m) => ({ role: m.role, content: m.content }))
  }

  async function run(action: AiAction, message?: string): Promise<void> {
    if (!provider || !model || busy) return
    setError(null)
    setBusy(true)

    const userLabel =
      message ?? QUICK_ACTIONS.find((q) => q.action === action)?.label ?? 'Help me improve my resume'
    setMessages((prev) => [...prev, { role: 'user', content: userLabel }, { role: 'assistant', content: '' }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamAi(
        { provider, model, action, tex, message, jobDescription, history: buildHistory() },
        (chunk) => {
          setMessages((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last) {
              next[next.length - 1] = { role: 'assistant', content: last.content + chunk }
            }
            return next
          })
        },
        controller.signal
      )
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'AI request failed')
      }
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  function handleSend(): void {
    const text = input.trim()
    if (!text) return
    setInput('')
    void run('chat', text)
  }

  function handleStop(): void {
    abortRef.current?.abort()
  }

  const currentProvider = models?.providers.find((p) => p.id === provider)
  const anyAvailable = models?.anyAvailable ?? false

  if (models && !anyAvailable) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center bg-background">
        <div className="rounded-full bg-muted p-4 text-2xl">✨</div>
        <h3 className="text-sm font-semibold text-foreground">AI assistant not configured</h3>
        <p className="max-w-sm text-xs text-muted-foreground">
          Set one of <code className="rounded bg-muted px-1">ANTHROPIC_API_KEY</code>,{' '}
          <code className="rounded bg-muted px-1">OPENAI_API_KEY</code>, or{' '}
          <code className="rounded bg-muted px-1">OPENROUTER_API_KEY</code> in your environment, then
          restart the server to enable model-powered optimization.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Model selector + quick actions */}
      <div className="shrink-0 space-y-2 border-b border-border bg-muted/30 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Model</span>
          <select
            value={provider}
            onChange={(e) => {
              const p = models?.providers.find((pp) => pp.id === e.target.value)
              setProvider(e.target.value)
              setModel(p?.models[0]?.id ?? '')
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
          >
            {models?.providers.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.available}>
                {p.label}
                {p.available ? '' : ' (no key)'}
              </option>
            ))}
          </select>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="h-8 min-w-[160px] rounded-md border border-input bg-background px-2 text-xs text-foreground"
          >
            {currentProvider?.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map((q) => (
            <button
              key={q.action}
              type="button"
              disabled={busy || (q.needsJd && !jobDescription.trim())}
              onClick={() => void run(q.action)}
              title={q.needsJd && !jobDescription.trim() ? 'Add a job description in the ATS tab first' : undefined}
              className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-auto p-3">
        {messages.length === 0 && (
          <div className="mt-8 text-center text-xs text-muted-foreground">
            <p>Ask the AI to optimize your resume, or use a quick action above.</p>
            <p className="mt-1">It sees your current LaTeX source and ATS context.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg p-3 text-sm ${
              m.role === 'user'
                ? 'ml-6 bg-primary/10 text-foreground'
                : 'mr-6 border border-border bg-card text-foreground'
            }`}
          >
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {m.role === 'user' ? 'You' : 'AI'}
            </p>
            <div className="whitespace-pre-wrap break-words leading-relaxed">
              {m.content || (busy && i === messages.length - 1 ? '…' : '')}
            </div>
          </div>
        ))}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ask anything about your resume…"
            rows={2}
            disabled={busy}
            className="flex-1 resize-none rounded-md border border-input bg-background p-2 text-sm text-foreground disabled:opacity-60"
          />
          {busy ? (
            <Button variant="outline" size="sm" onClick={handleStop}>
              Stop
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={handleSend} disabled={!input.trim()}>
              Send
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
