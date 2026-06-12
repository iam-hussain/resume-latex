import { NextRequest } from 'next/server'
import { streamChat, ProviderNotConfiguredError, type ChatMessage } from '@/lib/ai/client'
import { isProviderAvailable, isValidModel, type ProviderId } from '@/lib/ai/providers'
import { SYSTEM_PROMPT, buildUserPrompt, type AiAction } from '@/lib/ai/prompts'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_TEX = 2 * 1024 * 1024
const MAX_HISTORY = 20
const VALID_ACTIONS: AiAction[] = ['chat', 'optimize', 'tailor', 'bullets', 'summary']
const VALID_PROVIDERS: ProviderId[] = ['anthropic', 'openai', 'openrouter']

interface AiRequestBody {
  provider: ProviderId
  model: string
  action: AiAction
  tex: string
  message?: string
  jobDescription?: string
  history?: ChatMessage[]
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: AiRequestBody
  try {
    body = (await request.json()) as AiRequestBody
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  const { provider, model, action = 'chat', tex, message, jobDescription, history } = body

  if (!VALID_PROVIDERS.includes(provider)) return jsonError('Invalid provider', 400)
  if (!isValidModel(provider, model)) return jsonError('Invalid model for provider', 400)
  if (!VALID_ACTIONS.includes(action)) return jsonError('Invalid action', 400)
  if (typeof tex !== 'string' || tex.length > MAX_TEX) return jsonError('Invalid tex source', 400)
  if (!isProviderAvailable(provider)) {
    return jsonError(`${provider} is not configured on the server (missing API key)`, 503)
  }

  const userPrompt = buildUserPrompt({ action, tex, message, jobDescription })
  const priorTurns = Array.isArray(history) ? history.slice(-MAX_HISTORY) : []
  const messages: ChatMessage[] = [...priorTurns, { role: 'user', content: userPrompt }]

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamChat({
          provider,
          model,
          system: SYSTEM_PROMPT,
          messages,
        })) {
          controller.enqueue(encoder.encode(chunk))
        }
      } catch (err) {
        const msg =
          err instanceof ProviderNotConfiguredError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'AI request failed'
        // Surface the error inline in the stream so the client can show it.
        controller.enqueue(encoder.encode(`\n\n[error] ${msg}`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
