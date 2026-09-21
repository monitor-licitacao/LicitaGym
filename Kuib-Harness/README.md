# Kuib Harness

Desktop admin do LicitaGym (Electron + Vue 3.5 + Pinia + Tailwind).

## Pré-requisitos

- Node.js 20+
- `.env.local` na raiz do projeto (copie de `.env.example` e preencha)

Variáveis principais:

| Variável | Onde roda | Descrição |
|----------|-----------|-----------|
| `ADMIN_LOGIN` / `ADMIN_SENHA` | main | Login local do harness |
| `SUPABASE_*` | main (+ anon no renderer via `VITE_`) | Admin Supabase |
| `SYNC_CRON_SECRET` | main | Bearer nos sync jobs |

O main também lê `../supabase/.env.local` (sem sobrescrever chaves já definidas).

## Desenvolvimento

```bash
cd Kuib-Harness
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

Saída em `out/` (main, preload, renderer).

## Rotas

- `/` — Harness (chat + syncs ini-04)
- `/providers` — conectores LLM + alertas
- `/login` — admin local
- `/admin` — métricas Supabase (requer sessão Supabase admin)
