# Pagina link-catmat-pca ate esgotar pca_itens da classe (offset estavel por id)
param(
  [string]$ClasseCatmat = "7830",
  [double]$LimiarSimilaridade = 0.55,
  [int]$Limite = 500,
  [int]$OffsetInicial = 0,
  [int]$MaxRodadas = 200,
  [string]$BaseUrl = "https://ifaiagegyicjzlpskafh.supabase.co",
  [string]$Secret
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\_load-sync-env.ps1"

if (-not $Secret) { $Secret = Get-SyncCronSecret }
if (-not $Secret) { throw "SYNC_CRON_SECRET ausente." }

$headers = @{
  Authorization  = "Bearer $Secret"
  "Content-Type" = "application/json"
}

$offset = $OffsetInicial
$rodada = 0
$totNovos = 0
$totAtualizados = 0

do {
  $rodada++
  if ($rodada -gt $MaxRodadas) {
    Write-Host "MaxRodadas=$MaxRodadas atingido (offset=$offset)." -ForegroundColor Yellow
    exit 1
  }

  $body = @{
    classe_catmat       = $ClasseCatmat
    limiar_similaridade = $LimiarSimilaridade
    limite              = $Limite
    offset              = $offset
  }

  $response = Invoke-WebRequest `
    -Method POST `
    -Uri "$BaseUrl/functions/v1/link-catmat-pca" `
    -Headers $headers `
    -Body ($body | ConvertTo-Json) `
    -TimeoutSec 300 `
    -UseBasicParsing

  $json = $response.Content | ConvertFrom-Json
  $analisados = [int]$json.analisados
  $novos = [int]$json.vinculos_novos
  $atualizados = if ($null -ne $json.vinculos_atualizados) { [int]$json.vinculos_atualizados } else { 0 }
  $totNovos += $novos
  $totAtualizados += $atualizados

  Write-Host ("Rodada {0} offset={1} analisados={2} novos={3} atualizados={4} tem_mais={5}" -f `
      $rodada, $offset, $analisados, $novos, $atualizados, $json.tem_mais) -ForegroundColor Green

  if (-not $json.tem_mais -or $analisados -le 0) { break }
  $offset = [int]$json.proximo_offset
  Start-Sleep -Seconds 2
} while ($true)

Write-Host "Total vinculos_novos=$totNovos atualizados=$totAtualizados (classe $ClasseCatmat)" -ForegroundColor Cyan
