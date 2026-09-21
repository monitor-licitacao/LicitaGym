/** Sessão admin local emitida pelo main após login ADMIN_LOGIN/ADMIN_SENHA. */
export interface LocalAdminSession {
  token: string
  login: string
  role: 'admin'
  expiresAt: number
}

export interface AuthStatus {
  localAdminConfigured: boolean
  configuredLogin: string | null
  configuredLoginLen: number
  configuredSenhaLen: number
}
