# Pagina link-catmat-pca. Sem -ClasseCatmat a Edge aplica a policy inteira.
# Uma classe especifica: -ClasseCatmat 7830
param(
  [string]$ClasseCatmat = "",
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
    limiar_similaridade = $LimiarSimilaridade
    limite              = $Limite
    offset              = $offset
  }
  if ($ClasseCatmat) { $body.classe_catmat = $ClasseCatmat }

  $response = Invoke-WebRequest `
    -Method POST `
    -Uri "$BaseUrl/functions/v1/link-catmat-pca" `
    -Headers $headers `
    -Body ($body | ConvertTo-Json) `
    -TimeoutSec 300 `
    -UseBasicParsing

  $json = $response.Content | ConvertFrom-Json
  if ($json.error -or ($json.status -eq "blocked")) {
    Write-Host "link BLOCKED: $($json.error) $($json.reason)" -ForegroundColor Red
    exit 1
  }
  $batches = @()
  if ($json.resultados) { $batches = @($json.resultados) } else { $batches = @($json) }
  $anyMore = $false
  $nextOffset = $offset
  foreach ($batch in $batches) {
    $analisados = if ($null -ne $batch.analisados) { [int]$batch.analisados } else { 0 }
    $novos = if ($null -ne $batch.vinculos_novos) { [int]$batch.vinculos_novos } else { 0 }
    $atualizados = if ($null -ne $batch.vinculos_atualizados) { [int]$batch.vinculos_atualizados } else { 0 }
    $totNovos += $novos
    $totAtualizados += $atualizados
    Write-Host ("classe={0} rodada={1} offset={2} analisados={3} novos={4} atualizados={5} tem_mais={6}" -f `
        $batch.classe_catmat, $rodada, $offset, $analisados, $novos, $atualizados, $batch.tem_mais) -ForegroundColor Green
    if ($batch.tem_mais) {
      $anyMore = $true
      $cand = [int]$batch.proximo_offset
      if ($cand -gt $nextOffset) { $nextOffset = $cand }
    }
  }
  if ($rodada -eq 1 -and -not $ClasseCatmat -and -not $json.resultados) {
    Write-Host "AVISO: resposta plana de uma classe. Confira se a funcao implantada resolve a policy completa." -ForegroundColor Yellow
  }
  if (-not $anyMore) { break }
  $offset = $nextOffset
  Start-Sleep -Seconds 2
} while ($true)

$alvo = if ($ClasseCatmat) { $ClasseCatmat } else { "policy da Edge" }
Write-Host "Total vinculos_novos=$totNovos atualizados=$totAtualizados ($alvo)" -ForegroundColor Cyan
