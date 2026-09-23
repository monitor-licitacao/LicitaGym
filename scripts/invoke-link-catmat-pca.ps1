# Vincula pca_itens. Sem -ClasseCatmat a Edge aplica a policy inteira.
# Uma classe especifica: -ClasseCatmat 7220
param(
  [string]$ClasseCatmat = "",
  [double]$LimiarSimilaridade = 0.55,
  [int]$Limite = 500,
  [int]$Offset = 0,
  [string]$BaseUrl = "https://ifaiagegyicjzlpskafh.supabase.co",
  [string]$Secret
)

. "$PSScriptRoot\_load-sync-env.ps1"

if (-not $Secret) {
  $Secret = Get-SyncCronSecret
}
if (-not $Secret) {
  throw "SYNC_CRON_SECRET ausente."
}

$body = @{
  limiar_similaridade   = $LimiarSimilaridade
  limite                = $Limite
  offset                = $Offset
}
if ($ClasseCatmat) { $body.classe_catmat = $ClasseCatmat }

$response = Invoke-WebRequest `
  -Method POST `
  -Uri "$BaseUrl/functions/v1/link-catmat-pca" `
  -Headers @{
    Authorization = "Bearer $Secret"
    "Content-Type"  = "application/json"
  } `
  -Body ($body | ConvertTo-Json) `
  -TimeoutSec 120 `
  -UseBasicParsing

($response.Content | ConvertFrom-Json) | ConvertTo-Json -Depth 6
