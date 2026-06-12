// Provider + model registry for the AI assistant. Three providers behind one
// interface; keys come from server env vars. A provider is "available" only when
// its key is configured — the UI greys out the rest.

export type ProviderId = 'anthropic' | 'openai' | 'openrouter'

export interface ModelOption {
  id: string // model id sent to the provider API
  label: string // shown in the UI
}

export interface ProviderInfo {
  id: ProviderId
  label: string
  envVar: string
  models: ModelOption[]
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    envVar: 'ANTHROPIC_API_KEY',
    models: [
      { id: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI (GPT)',
    envVar: 'OPENAI_API_KEY',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    envVar: 'OPENROUTER_API_KEY',
    models: [
      { id: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6 (OR)' },
      { id: 'openai/gpt-4o', label: 'GPT-4o (OR)' },
      { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash (OR)' },
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B (OR)' },
      { id: 'mistralai/mistral-large', label: 'Mistral Large (OR)' },
    ],
  },
]

export function providerKey(id: ProviderId): string | undefined {
  const info = PROVIDERS.find((p) => p.id === id)
  if (!info) return undefined
  const v = process.env[info.envVar]
  return v && v.trim() ? v : undefined
}

export function isProviderAvailable(id: ProviderId): boolean {
  return providerKey(id) !== undefined
}

export interface ProviderAvailability {
  id: ProviderId
  label: string
  available: boolean
  models: ModelOption[]
}

// Public, key-free view for the client to populate the model selector.
export function getAvailability(): ProviderAvailability[] {
  return PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    available: isProviderAvailable(p.id),
    models: p.models,
  }))
}

export function isValidModel(provider: ProviderId, model: string): boolean {
  const info = PROVIDERS.find((p) => p.id === provider)
  return Boolean(info && info.models.some((m) => m.id === model))
}
