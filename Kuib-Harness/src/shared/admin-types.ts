export interface AdminStats {
  usuarios: number
  sincronizacoesPendentes: number
}

export interface AdminUsuario {
  id: string
  email: string | null
  created_at: string | null
}
