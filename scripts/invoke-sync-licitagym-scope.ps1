# Pipeline escopo LicitaGym: CATMAT 78/7830 -> PCA 7830 -> link catalogo_ponte
param(
  [int]$Ano = (Get-Date).Year,
  [int]$PcaPaginasPorRodada = 2,
  [int]$PcaTamanhoPagina = 250,
  [int]$PcaTimeoutSec = 1200,
  [switch]$SkipCatmat,
  [switch]$SkipPca,
  [switch]$SkipLink,
  [switch]$ForcarPca,
  [switch]$SkipCaracteristicas,
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

function Invoke-EdgeJson {
  param(
    [string]$FunctionName,
    [hashtable]$Body,
    [int]$TimeoutSec = 300
  )
  $response = Invoke-WebRequest `
    -Method POST `
    -Uri "$BaseUrl/functions/v1/$FunctionName" `
    -Headers $headers `
    -Body ($Body | ConvertTo-Json) `
    -TimeoutSec $TimeoutSec `
    -UseBasicParsing
  return $response.Content | ConvertFrom-Json
}

Write-Host "=== LicitaGym scope 78/7830 ===" -ForegroundColor Cyan
Write-Host "Base: $BaseUrl"

if (-not $SkipCatmat) {
  Write-Host "`n[1/3] sync-compras-catmat (78/7830)..." -ForegroundColor Cyan
  $catArgs = @{
    codigo_grupo  = 78
    codigo_classe = 7830
    max_paginas   = 500
  }
  if ($SkipCaracteristicas) {
    & "$PSScriptRoot\invoke-sync-compras-catmat.ps1" -BaseUrl $BaseUrl -Secret $Secret -SkipCaracteristicas
  } else {
    & "$PSScriptRoot\invoke-sync-compras-catmat.ps1" -BaseUrl $BaseUrl -Secret $Secret
  }
  if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (-not $SkipPca) {
  Write-Host "`n[2/3] sync-pncp-pca (7830) em lotes de $PcaPaginasPorRodada pagina(s)..." -ForegroundColor Cyan
  $pagina = 1
  $rodada = 0
  do {
    $rodada++
    $body = @{
      ano                   = $Ano
      codigos_classificacao = @("7830")
      pagina_inicial        = $pagina
      max_paginas           = $PcaPaginasPorRodada
      tamanho_pagina        = $PcaTamanhoPagina
    }
    if ($ForcarPca -and $rodada -eq 1) { $body.forcar = $true }

    Write-Host "  Rodada $rodada pagina_inicial=$pagina..." -ForegroundColor DarkCyan
    try {
      $json = Invoke-EdgeJson -FunctionName "sync-pncp-pca" -Body $body -TimeoutSec $PcaTimeoutSec
    }
    catch {
      Write-Host "  Falha PCA: $($_.Exception.Message)" -ForegroundColor Red
      exit 1
    }

    if ($json.status -eq "blocked") {
      Write-Host "  Gate: $($json.reason)" -ForegroundColor Yellow
      exit 1
    }
    if ($json.status -eq "ignorado") {
      Write-Host "  PCA ignorado: $($json.motivo)" -ForegroundColor Yellow
      break
    }

    $info = $json.por_codigo."7830"
    if (-not $info) { $info = $json.por_codigo | Select-Object -First 1 }
    $restantes = [int]($info.paginas_restantes)
    $ultima = [int]($info.ultima_pagina)
    Write-Host ("  recebidos={0} novos={1} alterados={2} erros={3} ultima_pag={4} restantes={5}" -f `
        $json.recebidos, $json.novos, $json.alterados, $json.erros, $ultima, $restantes) -ForegroundColor Green

    if ($restantes -le 0) { break }
    $pagina = $ultima + 1
    Start-Sleep -Seconds 3
  } while ($true)
}

if (-not $SkipLink) {
  Write-Host "`n[3/3] link-catmat-pca (7830) paginado..." -ForegroundColor Cyan
  $linkOffset = 0
  $linkRodada = 0
  $totNovos = 0
  do {
    $linkRodada++
    $json = Invoke-EdgeJson -FunctionName "link-catmat-pca" -Body @{
      classe_catmat         = "7830"
      limiar_similaridade = 0.55
      limite                = 500
      offset                = $linkOffset
    } -TimeoutSec 300
    $analisados = if ($null -ne $json.analisados) { [int]$json.analisados } else { 0 }
    $vinculos = if ($null -ne $json.vinculos_novos) { [int]$json.vinculos_novos } else { 0 }
    $pdmV = if ($null -ne $json.pdm_vinculos) { [int]$json.pdm_vinculos } else { 0 }
    $totNovos += $vinculos
    Write-Host ("  rodada={0} offset={1} analisados={2} novos={3} pdm={4} tem_mais={5}" -f `
        $linkRodada, $linkOffset, $analisados, $vinculos, $pdmV, $json.tem_mais) -ForegroundColor Green
    if (-not $json.tem_mais -or $analisados -le 0) { break }
    $linkOffset = [int]$json.proximo_offset
    Start-Sleep -Seconds 2
  } while ($true)
  Write-Host "  Total vinculos_novos nesta execucao: $totNovos" -ForegroundColor Cyan
}

Write-Host "`nPipeline escopo concluido." -ForegroundColor Cyan
