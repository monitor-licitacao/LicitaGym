<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useProvidersScript } from './providers.script'
import type { ProviderSlug } from '../../../../shared/provider-types'

const {
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
} = useProvidersScript()

function onSlugClick(slug: ProviderSlug): void {
  resetFormForSlug(slug)
}
</script>

<template>
  <section class="providers">
    <header class="providers__header">
      <div>
        <h1>Conectores de provider</h1>
        <p>Anthropic, Gemini, OpenAI, Ollama e OpenCode — gate de modelo por slug.</p>
      </div>
      <RouterLink to="/">
        <Button variant="outline">Voltar ao harness</Button>
      </RouterLink>
    </header>

    <p v-if="loading">Carregando…</p>
    <p v-else-if="error" class="providers__alert" role="alert">{{ error }}</p>
    <p v-if="notice" class="providers__notice">{{ notice }}</p>

    <div v-if="!loading" class="providers__grid">
      <div class="providers__panel">
        <h2>Novo / editar conector</h2>
        <div class="providers__slugs">
          <Button
            v-for="p in catalog"
            :key="p.slug"
            size="sm"
            :variant="form.slug === p.slug ? 'default' : 'outline'"
            @click="onSlugClick(p.slug)"
          >
            {{ p.name }}
          </Button>
        </div>

        <div class="providers__fields">
          <label>
            Label
            <Input v-model="form.label" />
          </label>
          <label>
            Modo de autenticação
            <select
              v-model="form.authMode"
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option v-for="mode in selectedDef?.authModes ?? []" :key="mode" :value="mode">
                {{ authLabel(mode) }}
              </option>
            </select>
          </label>
          <label
            v-if="form.authMode === 'url_key' || form.slug === 'ollama' || form.slug === 'opencode'"
          >
            Base URL
            <Input v-model="form.baseUrl" placeholder="http://127.0.0.1:11434" />
          </label>
          <label v-if="form.authMode !== 'oauth_plan'">
            API Key {{ form.id ? '(deixe vazio para manter)' : '' }}
            <Input v-model="form.apiKey" type="password" autocomplete="off" />
          </label>
          <label v-else>
            Auth por plano
            <span class="text-xs text-muted-foreground">
              Fluxo OAuth / plano ativo — stub montado; API key não é exigida aqui.
            </span>
          </label>
          <label>
            Modelo (gate por slug {{ form.slug }})
            <select
              v-model="form.modelId"
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option v-for="m in modelsForSlug" :key="m.id" :value="m.id">
                {{ m.label }} · {{ m.kind }}{{ m.traditional ? ' · tradicional' : '' }}
              </option>
            </select>
          </label>
          <label class="flex-row items-center gap-2 !flex-row">
            <input v-model="form.enabled" type="checkbox" />
            Ativo
          </label>
        </div>

        <Button :disabled="saving" @click="saveConnector">
          {{ saving ? 'Salvando…' : 'Salvar conector' }}
        </Button>
      </div>

      <div class="providers__panel">
        <h2>Conectores salvos</h2>
        <p v-if="connectors.length === 0" class="text-sm text-muted-foreground">
          Nenhum conector ainda.
        </p>
        <div class="providers__list">
          <div v-for="c in connectors" :key="c.id" class="providers__item">
            <div>
              <strong>{{ c.label }}</strong>
              <span>
                {{ c.slug }} · {{ c.modelId }}
                <Badge variant="secondary" class="ml-1">{{ c.authMode }}</Badge>
                <template v-if="c.apiKeyMasked"> · {{ c.apiKeyMasked }}</template>
              </span>
            </div>
            <div class="providers__item-actions">
              <Button size="sm" variant="outline" @click="editConnector(c)">Editar</Button>
              <Button size="sm" variant="ghost" @click="removeConnector(c.id)">Remover</Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Separator />

    <div v-if="alertConfig" class="providers__panel">
      <h2>Automações de alerta (fim de Spec / card done)</h2>
      <div class="providers__fields">
        <label class="!flex-row items-center gap-2">
          <input v-model="alertConfig.resend.enabled" type="checkbox" />
          E-mail via Resend
        </label>
        <label>
          From
          <Input v-model="alertConfig.resend.from" />
        </label>
        <label>
          To (admin)
          <Input v-model="alertConfig.resend.toAdmin" type="email" />
        </label>
        <label>
          Resend API Key {{ alertConfig.resend.apiKeyConfigured ? '(configurada)' : '' }}
          <Input v-model="resendApiKey" type="password" autocomplete="off" />
        </label>

        <Separator />

        <label class="!flex-row items-center gap-2">
          <input v-model="alertConfig.whatsapp.enabled" type="checkbox" />
          WhatsApp (Evolution / WPPConnect)
        </label>
        <label>
          Provider WhatsApp
          <select
            v-model="alertConfig.whatsapp.provider"
            class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option :value="null">—</option>
            <option value="evolution">Evolution API</option>
            <option value="wppconnect">WPPConnect</option>
          </select>
        </label>
        <label>
          Evolution base URL
          <Input v-model="alertConfig.whatsapp.evolutionBaseUrl" />
        </label>
        <label>
          Evolution instance
          <Input v-model="alertConfig.whatsapp.evolutionInstance" />
        </label>
        <label>
          Evolution API Key
          <Input v-model="evolutionApiKey" type="password" autocomplete="off" />
        </label>
        <label>
          WPPConnect base URL
          <Input v-model="alertConfig.whatsapp.wppconnectBaseUrl" />
        </label>
        <label>
          WPPConnect token
          <Input v-model="wppconnectToken" type="password" autocomplete="off" />
        </label>

        <Separator />

        <label class="!flex-row items-center gap-2">
          <input v-model="alertConfig.realtime.enabled" type="checkbox" />
          Realtime após movimentação de cards
        </label>
      </div>
      <Button :disabled="saving" @click="saveAlerts">Salvar automações</Button>
    </div>
  </section>
</template>

<style scoped src="./providers.css"></style>
