export type ProviderSlug = 'anthropic' | 'openai' | 'gemini' | 'ollama' | 'opencode'

export type ProviderAuthMode = 'api_key' | 'oauth_plan' | 'url_key'

export type ProviderModelKind = 'cloud' | 'local'

export interface ProviderModelDefinition {
  id: string
  label: string
  kind: ProviderModelKind
  traditional?: boolean
}

export interface ProviderDefinition {
  slug: ProviderSlug
  name: string
  authModes: ProviderAuthMode[]
  defaultBaseUrl?: string
  models: ProviderModelDefinition[]
}

/** Registro persistido no main (providers.json) — apiKey nunca sobe ao renderer. */
export interface ProviderConnector {
  id: string
  slug: ProviderSlug
  label: string
  authMode: ProviderAuthMode
  baseUrl?: string
  apiKey?: string
  modelId: string
  enabled: boolean
  updatedAt: string
}

export interface ProviderConnectorPublic {
  id: string
  slug: ProviderSlug
  label: string
  authMode: ProviderAuthMode
  baseUrl?: string
  apiKeyMasked?: string
  hasApiKey: boolean
  modelId: string
  enabled: boolean
  updatedAt: string
}

export interface ProviderUpsertInput {
  id?: string
  slug: ProviderSlug
  label: string
  authMode: ProviderAuthMode
  baseUrl?: string
  apiKey?: string
  modelId: string
  enabled: boolean
}

export interface ProviderResolveResult {
  id: string
  slug: ProviderSlug
  modelId: string
  baseUrl?: string
  hasApiKey: boolean
}
