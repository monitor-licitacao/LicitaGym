import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {}
  const out: Record<string, string> = {}
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '')
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

function projectRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  return resolve(here, '../..')
}

function apply(vars: Record<string, string>, { override = false } = {}): void {
  for (const [key, value] of Object.entries(vars)) {
    if (!override && process.env[key] !== undefined && process.env[key] !== '') continue
    process.env[key] = value
  }
}

export function loadMainEnv(): void {
  const root = projectRoot()
  apply(parseEnvFile(join(root, '.env')), { override: false })
  apply(parseEnvFile(join(root, '..', 'supabase', '.env.local')), { override: false })
  apply(parseEnvFile(join(root, '.env.local')), { override: true })

  if (!process.env.ADMIN_LOGIN?.trim() && process.env.login?.trim()) {
    process.env.ADMIN_LOGIN = process.env.login.trim()
  }
  if (!process.env.ADMIN_SENHA?.trim() && process.env.senha?.trim()) {
    process.env.ADMIN_SENHA = process.env.senha.trim()
  }

  const keys = [
    'ADMIN_LOGIN',
    'ADMIN_SENHA',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SYNC_CRON_SECRET',
  ]
  const present = keys.filter((k) => Boolean(process.env[k]?.trim()))
  console.info(`[env] root=${root} loaded=[${present.join(', ') || 'none'}]`)
  if (process.env.ADMIN_LOGIN?.trim()) {
    console.info(
      `[env] ADMIN_LOGIN len=${process.env.ADMIN_LOGIN.trim().length} ADMIN_SENHA len=${(process.env.ADMIN_SENHA ?? '').trim().length}`,
    )
  }
}

loadMainEnv()
