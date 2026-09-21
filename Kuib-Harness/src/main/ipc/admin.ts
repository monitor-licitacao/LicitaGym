import { ipcMain } from 'electron'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AdminStats, AdminUsuario } from '../../shared/admin-types'

class ForbiddenError extends Error {
  constructor(message = 'Acesso restrito a administradores') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY)

const verifier: SupabaseClient | null = configured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

const admin: SupabaseClient | null = configured
  ? createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

async function assertAdmin(accessToken: string): Promise<string> {
  if (!verifier || !admin) {
    throw new ForbiddenError('Supabase não configurado no main (.env)')
  }
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new ForbiddenError('Token ausente')
  }
  const { data, error } = await verifier.auth.getUser(accessToken)
  if (error || !data.user) throw new ForbiddenError('Sessão inválida')
  if (data.user.app_metadata?.role !== 'admin') throw new ForbiddenError()
  return data.user.id
}

function adminHandler<T>(fn: (userId: string) => Promise<T>) {
  return async (_event: Electron.IpcMainInvokeEvent, accessToken: string) => {
    const userId = await assertAdmin(accessToken)
    return fn(userId)
  }
}

export function registerAdminIpc(): void {
  if (!configured) {
    console.warn('[admin-ipc] SUPABASE_* ausente — handlers admin não registrados')
    return
  }

  ipcMain.handle(
    'admin:get-stats',
    adminHandler(async (): Promise<AdminStats> => {
      const [usuarios, pendentes] = await Promise.all([
        admin!.from('profiles').select('*', { count: 'exact', head: true }),
        admin!.from('sync_jobs').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      if (usuarios.error) throw usuarios.error
      if (pendentes.error) throw pendentes.error
      return {
        usuarios: usuarios.count ?? 0,
        sincronizacoesPendentes: pendentes.count ?? 0,
      }
    }),
  )

  ipcMain.handle(
    'admin:list-usuarios',
    adminHandler(async (): Promise<AdminUsuario[]> => {
      const { data, error } = await admin!
        .from('profiles')
        .select('id, email, created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data ?? []
    }),
  )
}
