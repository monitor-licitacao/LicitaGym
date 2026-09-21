export type AlertChannel = 'bell' | 'email' | 'whatsapp'

export interface AlertItem {
  id: string
  title: string
  body: string
  channel: AlertChannel
  cardId?: string
  specName?: string
  createdAt: string
  read: boolean
}

export interface AlertResendConfig {
  enabled: boolean
  apiKeyConfigured: boolean
  from: string
  toAdmin: string
}

export interface AlertWhatsappConfig {
  enabled: boolean
  provider: 'evolution' | 'wppconnect' | null
  evolutionBaseUrl: string
  evolutionInstance: string
  wppconnectBaseUrl: string
}

export interface AlertRealtimeConfig {
  enabled: boolean
}

export interface AlertAutomationConfig {
  resend: AlertResendConfig
  whatsapp: AlertWhatsappConfig
  realtime: AlertRealtimeConfig
}

export interface CardMovedPayload {
  cardId: string
  title: string
  from: string
  to: string
  specName?: string
  agentName?: string
}

export interface NotifyCompletePayload {
  title: string
  body: string
  cardId?: string
  specName?: string
}
