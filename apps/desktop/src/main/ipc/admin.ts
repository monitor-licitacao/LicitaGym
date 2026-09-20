import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Gate real de admin. O guard do vue-router só esconde a tela; aqui o papel
 * é revalidado contra o Supabase a cada chamada, com o access token enviado
 * pelo renderer. O service-role key nunca sai do main process.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const verifier: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

class ForbiddenError extends Error {
  constructor(message = 'Acesso restrito a administradores') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

async function assertAdmin(accessToken: unknown): Promise<string> {
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new ForbiddenError('Token ausente')
  }

  const { data, error } = await verifier.auth.getUser(accessToken)
  if (error || !data.user) throw new ForbiddenError('Sessão inválida')
  if (data.user.app_metadata?.role !== 'admin') throw new ForbiddenError()

  return data.user.id
}

/** Envolve um handler exigindo papel admin; erros viram rejeição no renderer. */
function adminHandler<T>(fn: (userId: string) => Promise<T>) {
  return async (_event: IpcMainInvokeEvent, accessToken: unknown): Promise<T> => {
    const userId = await assertAdmin(accessToken)
    return fn(userId)
  }
}

export function registerAdminIpc(): void {
  ipcMain.handle(
    'admin:get-stats',
    adminHandler(async () => {
      const [usuarios, pendentes] = await Promise.all([
        admin.from('profiles').select('*', { count: 'exact', head: true }),
        admin
          .from('sync_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ])

      if (usuarios.error) throw usuarios.error
      if (pendentes.error) throw pendentes.error

      return {
        usuarios: usuarios.count ?? 0,
        sincronizacoesPendentes: pendentes.count ?? 0,
      }
    }),
  )
}
