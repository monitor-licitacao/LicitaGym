import { supabase } from './supabase'
import type { AdminStats, AdminUsuario } from '../../../../shared/admin-types'

async function requireAccessToken(): Promise<string> {
  if (!supabase) throw new Error('Supabase não configurado (.env)')
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sessão ausente')
  return token
}

export async function getAdminStats(): Promise<AdminStats> {
  return window.admin.getStats(await requireAccessToken())
}

export async function listAdminUsuarios(): Promise<AdminUsuario[]> {
  return window.admin.listUsuarios(await requireAccessToken())
}
