# Importa curadoria CATMAT (export JSON) via Edge Function import-catmat-curadoria
param(
  [Parameter(Mandatory = $true)]
  [string]$JsonPath,

  [string]$BaseUrl = "http://127.0.0.1:54321",

  [string]$Secret
)

. "$PSScriptRoot\_load-sync-env.ps1"

if (-not $Secret) {
  $Secret = Get-SyncCronSecret
}

if (-not $Secret) {
  throw @"
SYNC_CRON_SECRET não encontrado.
1. Confira supabase/.env.functions.local (já vem com dev-local-sync-secret-change-me)
2. Ou: `$env:SYNC_CRON_SECRET = 'seu-segredo'
3. Inicie functions: npx supabase functions serve --no-verify-jwt --env-file supabase/.env.functions.local
"@
}

if (-not (Test-Path $JsonPath)) {
  throw "Arquivo não encontrado: $JsonPath"
}

$payload = Get-Content -Raw -Path $JsonPath | ConvertFrom-Json
$body = if ($payload.itens) { $payload } else { @{ itens = @($payload) } }

Invoke-RestMethod `
  -Method POST `
  -Uri "$BaseUrl/functions/v1/import-catmat-curadoria" `
  -Headers @{
    Authorization = "Bearer $Secret"
    "Content-Type"  = "application/json"
  } `
  -Body ($body | ConvertTo-Json -Depth 20)
