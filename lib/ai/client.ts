// Streaming chat dispatch across Anthropic, OpenAI, and OpenRouter.
// Returns an async generator of text chunks so the API route can pipe them to a
// ReadableStream. Keys are read from server env via providers.ts.

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { providerKey, type ProviderId } from './providers'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface StreamChatArgs {
  provider: ProviderId
  model: string
  system: string
  messages: ChatMessage[]
  maxTokens?: number
}

const DEFAULT_MAX_TOKENS = 4096

export class ProviderNotConfiguredError extends Error {
  constructor(provider: ProviderId) {
    super(`Provider "${provider}" is not configured (missing API key)`)
    this.name = 'ProviderNotConfiguredError'
  }
}

async function* streamAnthropic(args: StreamChatArgs): AsyncGenerator<string> {
  const apiKey = providerKey('anthropic')
  if (!apiKey) throw new ProviderNotConfiguredError('anthropic')
  const client = new Anthropic({ apiKey })

  const stream = client.messages.stream({
    model: args.model,
    max_tokens: args.maxTokens ?? DEFAULT_MAX_TOKENS,
    system: args.system,
    messages: args.messages.map((m) => ({ role: m.role, content: m.content })),
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
    }
  }
}

async function* streamOpenAiCompatible(
  args: StreamChatArgs,
  opts: { baseURL?: string; provider: ProviderId; extraHeaders?: Record<string, string> }
): AsyncGenerator<string> {
  const apiKey = providerKey(opts.provider)
  if (!apiKey) throw new ProviderNotConfiguredError(opts.provider)
  const client = new OpenAI({
    apiKey,
    baseURL: opts.baseURL,
    defaultHeaders: opts.extraHeaders,
  })

  const stream = await client.chat.completions.create({
    model: args.model,
    max_tokens: args.maxTokens ?? DEFAULT_MAX_TOKENS,
    stream: true,
    messages: [
      { role: 'system', content: args.system },
      ...args.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) yield delta
  }
}

export function streamChat(args: StreamChatArgs): AsyncGenerator<string> {
  switch (args.provider) {
    case 'anthropic':
      return streamAnthropic(args)
    case 'openai':
      return streamOpenAiCompatible(args, { provider: 'openai' })
    case 'openrouter':
      return streamOpenAiCompatible(args, {
        provider: 'openrouter',
        baseURL: 'https://openrouter.ai/api/v1',
        extraHeaders: {
          'HTTP-Referer': 'https://github.com/iam-hussain/resume-latex',
          'X-Title': 'TeX Resume Builder',
        },
      })
    default:
      throw new Error(`Unknown provider: ${args.provider}`)
  }
}
