# Smoke test / carga anual do sync PCA (classe 7830 por padrao)
param(
  [int]$Ano = (Get-Date).Year,
  [int]$MaxPaginas = 100,
  [int]$PaginaInicial = 1,
  [int]$TamanhoPagina = 500,
  [string[]]$CodigosClassificacao = @("7830"),
  [switch]$SomenteVerificacao,
  [switch]$Forcar,
  [string]$BaseUrl = "http://127.0.0.1:54321",
  [string]$Secret
)

. "$PSScriptRoot\_load-sync-env.ps1"

if (-not $Secret) {
  $Secret = Get-SyncCronSecret
}

if (-not $Secret) {
  throw "SYNC_CRON_SECRET ausente. Veja supabase/.env.functions.local"
}

$body = @{
  ano                   = $Ano
  codigos_classificacao = $CodigosClassificacao
  max_paginas           = $MaxPaginas
  pagina_inicial        = $PaginaInicial
  tamanho_pagina        = $TamanhoPagina
}
if ($SomenteVerificacao) { $body.somente_verificacao = $true }
if ($Forcar) { $body.forcar = $true }

try {
  $response = Invoke-WebRequest `
    -Method POST `
    -Uri "$BaseUrl/functions/v1/sync-pncp-pca" `
    -Headers @{
      Authorization = "Bearer $Secret"
      "Content-Type"  = "application/json"
    } `
    -Body ($body | ConvertTo-Json) `
    -TimeoutSec 180 `
    -UseBasicParsing

  $json = $response.Content | ConvertFrom-Json
  $json | ConvertTo-Json -Depth 10
}
catch {
  $status = $null
  $bodyText = $null
  if ($_.Exception.Response) {
    $status = [int]$_.Exception.Response.StatusCode
    try {
      $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
      $bodyText = $reader.ReadToEnd()
      $reader.Close()
    } catch {}
  }

  if ($status -eq 504 -or ($bodyText -match "504|timeout|timing out")) {
    Write-Host "FALHA: timeout/504 na API Consulta /v1/pca/ do PNCP (instabilidade externa)." -ForegroundColor Yellow
    Write-Host "Nao e erro de SYNC_CRON_SECRET." -ForegroundColor Yellow
    Write-Host "Probe barato: .\scripts\probe-pca-periodo.ps1 -Ano $Ano" -ForegroundColor Yellow
    Write-Host "Carga anual (quando PNCP voltar): .\scripts\invoke-sync-pca.ps1 -Ano $Ano -Forcar -MaxPaginas 100" -ForegroundColor Yellow
  }

  if ($bodyText) {
    Write-Host $bodyText
  } else {
    Write-Host $_.Exception.Message
  }
  exit 1
}
