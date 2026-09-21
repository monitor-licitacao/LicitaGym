import { ipcMain } from 'electron'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import type { AuthStatus, LocalAdminSession } from '../../shared/auth-types'

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const sessions = new Map<string, LocalAdminSession>()

function expectedLogin(): string {
  return (process.env.ADMIN_LOGIN ?? '').trim()
}

function expectedSenha(): string {
  return (process.env.ADMIN_SENHA ?? '').trim()
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

function purgeExpired(): void {
  const now = Date.now()
  for (const [token, s] of sessions) {
    if (s.expiresAt <= now) sessions.delete(token)
  }
}

export function registerAuthIpc(): void {
  const loginConfigured = Boolean(expectedLogin() && expectedSenha())
  if (!loginConfigured) {
    console.warn('[auth-ipc] ADMIN_LOGIN/ADMIN_SENHA ausentes — login local desabilitado')
  } else {
    console.info('[auth-ipc] login local admin habilitado')
  }

  ipcMain.handle('auth:status', (): AuthStatus => ({
    localAdminConfigured: loginConfigured,
    configuredLogin: loginConfigured ? expectedLogin() : null,
    configuredLoginLen: loginConfigured ? expectedLogin().length : 0,
    configuredSenhaLen: loginConfigured ? expectedSenha().length : 0,
  }))

  ipcMain.handle('auth:login', (_event, login: unknown, senha: unknown) => {
    if (!loginConfigured) {
      throw new Error('Admin local não configurado (.env.local)')
    }
    if (typeof login !== 'string' || typeof senha !== 'string') {
      throw new Error('Credenciais inválidas')
    }

    const gotLogin = login.trim()
    const gotSenha = senha.trim()
    const wantLogin = expectedLogin()
    const wantSenha = expectedSenha()
    const okLogin =
      safeEqual(gotLogin, wantLogin) || safeEqual(gotLogin.toLowerCase(), wantLogin.toLowerCase())
    const okSenha = safeEqual(gotSenha, wantSenha)

    if (!okLogin || !okSenha) {
      console.warn(
        `[auth-ipc] login falhou okLogin=${okLogin} okSenha=${okSenha} gotLoginLen=${gotLogin.length} wantLoginLen=${wantLogin.length} gotSenhaLen=${gotSenha.length} wantSenhaLen=${wantSenha.length}`,
      )
      throw new Error(
        `Login ou senha incorretos (login ${gotLogin.length}/${wantLogin.length} chars, senha ${gotSenha.length}/${wantSenha.length} chars). Use ADMIN_LOGIN/ADMIN_SENHA de Kuib-Harness/.env.local`,
      )
    }

    purgeExpired()
    const token = randomUUID()
    const session: LocalAdminSession = {
      token,
      login: login.trim(),
      role: 'admin',
      expiresAt: Date.now() + SESSION_TTL_MS,
    }
    sessions.set(token, session)
    return {
      token: session.token,
      login: session.login,
      role: session.role,
      expiresAt: session.expiresAt,
    }
  })

  ipcMain.handle('auth:validate', (_event, token: unknown) => {
    if (typeof token !== 'string' || !token) return null
    purgeExpired()
    const session = sessions.get(token)
    if (!session) return null
    return {
      token: session.token,
      login: session.login,
      role: session.role,
      expiresAt: session.expiresAt,
    }
  })

  ipcMain.handle('auth:logout', (_event, token: unknown) => {
    if (typeof token === 'string') sessions.delete(token)
    return true
  })
}
