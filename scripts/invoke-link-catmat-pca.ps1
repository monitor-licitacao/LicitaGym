# Vincula pca_itens (classe 7830) a catalogo_itens via catalogo_ponte
param(
  [string]$ClasseCatmat = "7830",
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
  classe_catmat         = $ClasseCatmat
  limiar_similaridade   = $LimiarSimilaridade
  limite                = $Limite
  offset                = $Offset
}

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
