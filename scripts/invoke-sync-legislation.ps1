# Sync legislacao PNCP (index gov.br + PDFs)
param(
  [string]$BaseUrl = "https://ifaiagegyicjzlpskafh.supabase.co",
  [string]$Secret,
  [int]$TimeoutSec = 300
)

. "$PSScriptRoot\_load-sync-env.ps1"

if (-not $Secret) {
  $Secret = Get-SyncCronSecret
}
if (-not $Secret) {
  throw "SYNC_CRON_SECRET ausente."
}

$response = Invoke-WebRequest `
  -Method POST `
  -Uri "$BaseUrl/functions/v1/sync-pncp-legislation" `
  -Headers @{
    Authorization = "Bearer $Secret"
    "Content-Type"  = "application/json"
  } `
  -Body "{}" `
  -TimeoutSec $TimeoutSec `
  -UseBasicParsing

($response.Content | ConvertFrom-Json) | ConvertTo-Json -Depth 8
