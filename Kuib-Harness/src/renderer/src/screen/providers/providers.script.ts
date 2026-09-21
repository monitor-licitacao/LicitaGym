import { computed, onMounted, reactive, ref } from 'vue'
import type { AlertAutomationConfig } from '../../../../shared/alert-types'
import type {
  ProviderAuthMode,
  ProviderConnectorPublic,
  ProviderDefinition,
  ProviderSlug,
} from '../../../../shared/provider-types'

interface ProviderForm {
  id?: string
  slug: ProviderSlug
  label: string
  authMode: ProviderAuthMode
  baseUrl: string
  apiKey: string
  modelId: string
  enabled: boolean
}

const catalog = ref<ProviderDefinition[]>([])
const connectors = ref<ProviderConnectorPublic[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

const form = reactive<ProviderForm>({
  slug: 'anthropic',
  label: 'Anthropic principal',
  authMode: 'api_key',
  baseUrl: '',
  apiKey: '',
  modelId: 'claude-sonnet-4-20250514',
  enabled: true,
})

const alertConfig = ref<AlertAutomationConfig | null>(null)
const resendApiKey = ref('')
const evolutionApiKey = ref('')
const wppconnectToken = ref('')

const selectedDef = computed(() => catalog.value.find((p) => p.slug === form.slug))
const modelsForSlug = computed(() => selectedDef.value?.models ?? [])

function resetFormForSlug(slug: ProviderSlug): void {
  const def = catalog.value.find((p) => p.slug === slug)
  if (!def) return
  form.slug = slug
  form.label = `${def.name} principal`
  form.authMode = def.authModes[0]
  form.baseUrl = def.defaultBaseUrl ?? ''
  form.apiKey = ''
  form.modelId = def.models.find((m) => m.traditional)?.id ?? def.models[0]?.id ?? ''
  form.enabled = true
  form.id = undefined
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const [cat, list, cfg] = await Promise.all([
      window.providers.catalog(),
      window.providers.list(),
      window.alerts.getConfig(),
    ])
    catalog.value = cat
    connectors.value = list
    alertConfig.value = cfg
    if (!form.modelId && cat[0]) resetFormForSlug(cat[0].slug)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Falha ao carregar providers'
  } finally {
    loading.value = false
  }
}

async function saveConnector(): Promise<void> {
  saving.value = true
  error.value = null
  notice.value = null
  try {
    const saved = await window.providers.upsert({
      ...form,
      apiKey: form.apiKey?.trim() || undefined,
      baseUrl: form.baseUrl?.trim() || undefined,
    })
    connectors.value = await window.providers.list()
    notice.value = `Conector "${saved.label}" salvo (${saved.slug}/${saved.modelId})`
    form.apiKey = ''
    form.id = saved.id
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Falha ao salvar'
  } finally {
    saving.value = false
  }
}

function editConnector(c: ProviderConnectorPublic): void {
  form.id = c.id
  form.slug = c.slug
  form.label = c.label
  form.authMode = c.authMode
  form.baseUrl = c.baseUrl ?? ''
  form.apiKey = ''
  form.modelId = c.modelId
  form.enabled = c.enabled
}

async function removeConnector(id: string): Promise<void> {
  await window.providers.delete(id)
  connectors.value = await window.providers.list()
}

async function saveAlerts(): Promise<void> {
  if (!alertConfig.value) return
  saving.value = true
  try {
    alertConfig.value = await window.alerts.setConfig({
      resend: alertConfig.value.resend,
      whatsapp: alertConfig.value.whatsapp,
      realtime: alertConfig.value.realtime,
      resendApiKey: resendApiKey.value || undefined,
      evolutionApiKey: evolutionApiKey.value || undefined,
      wppconnectToken: wppconnectToken.value || undefined,
    })
    resendApiKey.value = ''
    evolutionApiKey.value = ''
    wppconnectToken.value = ''
    notice.value = 'Automações de alerta salvas'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Falha ao salvar alertas'
  } finally {
    saving.value = false
  }
}

function authLabel(mode: ProviderAuthMode): string {
  if (mode === 'api_key') return 'API Key'
  if (mode === 'oauth_plan') return 'Auth (plano ativo)'
  return 'URL + API Key (OpenCode)'
}

export function useProvidersScript() {
  onMounted(() => {
    void load()
  })

  return {
    catalog,
    connectors,
    loading,
    saving,
    error,
    notice,
    form,
    alertConfig,
    resendApiKey,
    evolutionApiKey,
    wppconnectToken,
    selectedDef,
    modelsForSlug,
    resetFormForSlug,
    saveConnector,
    editConnector,
    removeConnector,
    saveAlerts,
    authLabel,
    load,
  }
}
