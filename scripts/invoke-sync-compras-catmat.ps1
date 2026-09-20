# Sync CATMAT Compras.gov.br (classe 7830 fitness por padrao; 72/7220 piso via -CodigoGrupo/-CodigoClasse) + loop de caracteristicas
param(
  [int]$CodigoGrupo = 78,
  [int]$CodigoClasse = 7830,
  [switch]$SomenteCaracteristicas,
  [switch]$SkipCaracteristicas,
  [int]$LimiteCaracteristicas = 80,
  [int]$ReferenciaRetries = 4,
  [int]$MaxPaginas = 500,
  [string]$BaseUrl = "https://ifaiagegyicjzlpskafh.supabase.co",
  [string]$Secret
)

. "$PSScriptRoot\_load-sync-env.ps1"

if (-not $Secret) {
  $Secret = Get-SyncCronSecret
}
if (-not $Secret) {
  throw "SYNC_CRON_SECRET ausente. Veja supabase/.env.local"
}

function Invoke-SyncComprasCatmat {
  param(
    [hashtable]$Body
  )

  try {
    return Invoke-WebRequest `
      -Method POST `
      -Uri "$BaseUrl/functions/v1/sync-compras-catmat" `
      -Headers @{
        Authorization = "Bearer $Secret"
        "Content-Type"  = "application/json"
      } `
      -Body ($Body | ConvertTo-Json) `
      -TimeoutSec 300 `
      -UseBasicParsing
  }
  catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $reader = [System.IO.StreamReader]::new($resp.GetResponseStream())
      $detail = $reader.ReadToEnd()
      if ($detail) { throw $detail }
    }
    throw
  }
}

$body = @{
  codigo_grupo          = $CodigoGrupo
  codigo_classe         = $CodigoClasse
  max_paginas           = $MaxPaginas
  limite_caracteristicas = $LimiteCaracteristicas
}
if ($SomenteCaracteristicas) {
  $body.somente_caracteristicas = $true
}

if (-not $SomenteCaracteristicas) {
  Write-Host "Sync referencia (grupo/classe/pdm/itens/unidades)..." -ForegroundColor Cyan
  $tentativa = 0
  $referenciaOk = $false
  while (-not $referenciaOk -and $tentativa -lt $ReferenciaRetries) {
    $tentativa++
    try {
      $response = Invoke-SyncComprasCatmat -Body $body
      $json = $response.Content | ConvertFrom-Json
      $json | ConvertTo-Json -Depth 8
      if ($json.error) {
        throw $json.error
      }
      $referenciaOk = $true
    }
    catch {
      $msg = if ($_.Exception.Message) { $_.Exception.Message } else { $_ }
      Write-Host "  Tentativa $tentativa falhou: $msg" -ForegroundColor Yellow
      if ($tentativa -ge $ReferenciaRetries) {
        Write-Host "Sync referencia abortado apos $ReferenciaRetries tentativas." -ForegroundColor Red
        exit 1
      }
      $espera = [Math]::Min(120, 15 * $tentativa)
      Write-Host "  Aguardando ${espera}s (rate limit Compras.gov)..." -ForegroundColor DarkYellow
      Start-Sleep -Seconds $espera
    }
  }
}

if ($SkipCaracteristicas) {
  Write-Host "Sync CATMAT concluido (sem caracteristicas)." -ForegroundColor Cyan
  exit 0
}

$offset = 0
$rodada = 0
do {
  $rodada++
  Write-Host "Caracteristicas offset=$offset (rodada $rodada)..." -ForegroundColor Cyan
  $bodyCar = @{
    codigo_grupo             = $CodigoGrupo
    codigo_classe            = $CodigoClasse
    somente_caracteristicas  = $true
    offset_caracteristicas   = $offset
    limite_caracteristicas   = $LimiteCaracteristicas
  }
  try {
    $response = Invoke-SyncComprasCatmat -Body $bodyCar
    $json = $response.Content | ConvertFrom-Json
    Write-Host ("  processados={0} novos={1} alterados={2} erros={3}" -f `
        $json.caracteristicas_processadas, $json.novos, $json.alterados, $json.erros) -ForegroundColor Green
    $offset = $json.proximo_offset_caracteristicas
    if ($offset) { Start-Sleep -Seconds 2 }
  }
  catch {
    Write-Host "  Falha: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
  }
} while ($null -ne $offset)

Write-Host "Sync CATMAT concluido." -ForegroundColor Cyan
