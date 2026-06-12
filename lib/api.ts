import type { AtsReport, AtsRequestOptions } from '@/types/ats'
import type { ProviderAvailability } from '@/lib/ai/providers'
import type { AiAction } from '@/lib/ai/prompts'
import type { ChatMessage } from '@/lib/ai/client'

export interface AtsResponse {
  report: AtsReport
  compileError?: { message: string; line?: number }
}

export async function postAts(tex: string, opts: AtsRequestOptions = {}): Promise<AtsResponse> {
  const res = await fetch('/api/ats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tex, ...opts }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? res.statusText)
  }
  return (await res.json()) as AtsResponse
}

export interface AiModelsResponse {
  providers: ProviderAvailability[]
  anyAvailable: boolean
}

export async function getAiModels(): Promise<AiModelsResponse> {
  const res = await fetch('/api/ai/models')
  if (!res.ok) throw new Error('Failed to load AI models')
  return (await res.json()) as AiModelsResponse
}

export interface AiStreamRequest {
  provider: string
  model: string
  action: AiAction
  tex: string
  message?: string
  jobDescription?: string
  history?: ChatMessage[]
}

// Streams the AI response, invoking onChunk for each text delta. Returns the
// full text. Pass an AbortSignal to cancel.
export async function streamAi(
  req: AiStreamRequest,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? res.statusText)
  }
  if (!res.body) throw new Error('No response stream')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = decoder.decode(value, { stream: true })
    full += text
    onChunk(text)
  }
  return full
}

export async function postPreview(tex: string): Promise<Blob> {
  const res = await fetch('/api/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tex }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? res.statusText)
  }
  return res.blob()
}

export async function postPdf(tex: string): Promise<Blob> {
  const res = await fetch('/api/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tex }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? res.statusText)
  }
  return res.blob()
}

export async function listResumeFiles(): Promise<string[]> {
  const res = await fetch('/api/resumes')
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? res.statusText)
  }
  const data = (await res.json()) as { files?: string[] }
  return data.files ?? []
}

export async function loadResumeFile(fileName: string): Promise<string> {
  const params = new URLSearchParams({ file: fileName })
  const res = await fetch(`/api/resumes?${params.toString()}`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? res.statusText)
  }
  const data = (await res.json()) as { content?: string }
  return data.content ?? ''
}

export async function saveResumeFile(fileName: string, content: string): Promise<void> {
  const res = await fetch('/api/resumes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, content }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? res.statusText)
  }
}

export async function createResumeFile(fileName: string, content: string): Promise<string> {
  const res = await fetch('/api/resumes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, content }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? res.statusText)
  }
  const data = (await res.json()) as { fileName?: string }
  return data.fileName ?? fileName
}
