import type { ProviderDefinition, ProviderModelDefinition, ProviderSlug } from './provider-types'

export const PROVIDER_CATALOG: Record<ProviderSlug, ProviderDefinition> = {
  anthropic: {
    slug: 'anthropic',
    name: 'Anthropic',
    authModes: ['api_key', 'oauth_plan'],
    models: [
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', kind: 'cloud', traditional: true },
      { id: 'claude-opus-4-20250514', label: 'Claude Opus 4', kind: 'cloud', traditional: true },
      { id: 'claude-haiku-3-5-20241022', label: 'Claude Haiku 3.5', kind: 'cloud', traditional: true },
    ],
  },
  openai: {
    slug: 'openai',
    name: 'OpenAI',
    authModes: ['api_key', 'oauth_plan'],
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4.1', label: 'GPT-4.1', kind: 'cloud', traditional: true },
      { id: 'gpt-4o', label: 'GPT-4o', kind: 'cloud', traditional: true },
      { id: 'o3-mini', label: 'o3-mini', kind: 'cloud', traditional: true },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', kind: 'cloud', traditional: true },
    ],
  },
  gemini: {
    slug: 'gemini',
    name: 'Google Gemini',
    authModes: ['api_key', 'oauth_plan'],
    models: [
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', kind: 'cloud', traditional: true },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', kind: 'cloud', traditional: true },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', kind: 'cloud', traditional: true },
    ],
  },
  ollama: {
    slug: 'ollama',
    name: 'Ollama (local)',
    authModes: ['url_key'],
    defaultBaseUrl: 'http://127.0.0.1:11434',
    models: [
      { id: 'llama3.2', label: 'Llama 3.2', kind: 'local', traditional: true },
      { id: 'mistral', label: 'Mistral', kind: 'local', traditional: true },
      { id: 'qwen2.5', label: 'Qwen 2.5', kind: 'local', traditional: true },
      { id: 'codellama', label: 'Code Llama', kind: 'local', traditional: true },
      { id: 'deepseek-r1', label: 'DeepSeek R1', kind: 'local', traditional: true },
    ],
  },
  opencode: {
    slug: 'opencode',
    name: 'OpenCode / OpenAI-compat',
    authModes: ['url_key'],
    defaultBaseUrl: 'http://127.0.0.1:4096/v1',
    models: [
      { id: 'default', label: 'Modelo padrão do servidor', kind: 'cloud', traditional: true },
      { id: 'gpt-4o', label: 'GPT-4o (compat)', kind: 'cloud' },
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet (compat)', kind: 'cloud' },
    ],
  },
}

export function listProviderDefinitions(): ProviderDefinition[] {
  return Object.values(PROVIDER_CATALOG)
}

export function getProviderDefinition(slug: ProviderSlug): ProviderDefinition {
  const def = PROVIDER_CATALOG[slug]
  if (!def) throw new Error(`Provider desconhecido: ${slug}`)
  return def
}

export function assertModelAllowed(slug: ProviderSlug, modelId: string): ProviderModelDefinition {
  const def = getProviderDefinition(slug)
  const model = def.models.find((m) => m.id === modelId)
  if (!model) {
    throw new Error(`Modelo "${modelId}" não permitido para provider "${slug}"`)
  }
  return model
}

export function maskSecret(value: string | undefined): string | undefined {
  if (!value) return undefined
  if (value.length <= 8) return '••••••••'
  return `${value.slice(0, 3)}••••${value.slice(-4)}`
}
