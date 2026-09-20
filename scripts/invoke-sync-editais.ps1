# Sync contratacoes editais (escopo orgaos_conhecidos por padrao)
# -All: loop modalidades + janelas de dias
param(
  [ValidateSet("catalogo", "orgaos_conhecidos", "nacional")]
  [string]$Escopo = "catalogo",
  [string]$DataInicial = "",
  [string]$DataFinal = "",
  [int]$Modalidade = 0,
  [int[]]$Modalidades = @(),
  [int]$DiasJanela = 7,
  [int]$DiasAtras = 30,
  [int]$MaxPaginas = 15,
  [switch]$UsarAtualizacao,
  [switch]$All,
  [string]$BaseUrl = "https://ifaiagegyicjzlpskafh.supabase.co",
  [string]$Secret,
  [int]$TimeoutSec = 600,
  [int]$PauseSec = 3
)

. "$PSScriptRoot\_load-sync-env.ps1"

if (-not $Secret) {
  $Secret = Get-SyncCronSecret
}
if (-not $Secret) {
  throw "SYNC_CRON_SECRET ausente."
}

function Invoke-EditaisBatch {
  param(
    [string]$Ini,
    [string]$Fim,
    [int]$Mod
  )

  $body = @{
    escopo       = $Escopo
    data_inicial = $Ini
    data_final   = $Fim
    modalidade   = $Mod
    max_paginas  = $MaxPaginas
  }
  if ($UsarAtualizacao) { $body.usar_atualizacao = $true }

  Write-Host ("=== {0}..{1} modalidade={2} ===" -f $Ini, $Fim, $Mod) -ForegroundColor Cyan

  try {
    $response = Invoke-WebRequest `
      -Method POST `
      -Uri "$BaseUrl/functions/v1/sync-pncp-contratacoes-editais" `
      -Headers @{
        Authorization = "Bearer $Secret"
        "Content-Type"  = "application/json"
      } `
      -Body ($body | ConvertTo-Json) `
      -TimeoutSec $TimeoutSec `
      -UseBasicParsing

    $json = $response.Content | ConvertFrom-Json
    $json | ConvertTo-Json -Depth 6
    return $json
  }
  catch {
    $msg = $_.Exception.Message
    Write-Host ("WARN invoke: {0}" -f $msg) -ForegroundColor Yellow
    return [pscustomobject]@{
      status       = "client_timeout_or_error"
      error        = $msg
      data_inicial = $Ini
      data_final   = $Fim
      modalidade   = $Mod
    }
  }
}

if (-not $All) {
  if (-not $DataFinal) { $DataFinal = (Get-Date).ToString("yyyyMMdd") }
  if (-not $DataInicial) { $DataInicial = (Get-Date).AddDays(-3).ToString("yyyyMMdd") }
  $mod = if ($Modalidade -gt 0) { $Modalidade } else { 6 }
  $json = Invoke-EditaisBatch -Ini $DataInicial -Fim $DataFinal -Mod $mod
  if ($json.status -eq "client_timeout_or_error") { exit 2 }
  exit 0
}

$mods = if ($Modalidades.Count -gt 0) {
  $Modalidades
} elseif ($Modalidade -gt 0) {
  @($Modalidade)
} else {
  1..12
}

$end = Get-Date
$start = $end.AddDays(-[Math]::Abs($DiasAtras))
$cursor = $start
$totalNovos = 0
$totalErros = 0
$batches = 0
$timeouts = 0

Write-Host ("Lote All: dias={0} janela={1} mods={2} max_paginas={3}" -f $DiasAtras, $DiasJanela, ($mods -join ","), $MaxPaginas) -ForegroundColor Green

while ($cursor -lt $end) {
  $winEnd = $cursor.AddDays($DiasJanela - 1)
  if ($winEnd -gt $end) { $winEnd = $end }
  $iniStr = $cursor.ToString("yyyyMMdd")
  $fimStr = $winEnd.ToString("yyyyMMdd")

  foreach ($mod in $mods) {
    $json = Invoke-EditaisBatch -Ini $iniStr -Fim $fimStr -Mod $mod
    $batches++

    if ($json.status -eq "already_running") {
      Write-Host "Lock ativo - pausa 30s" -ForegroundColor Yellow
      Start-Sleep -Seconds 30
      $json = Invoke-EditaisBatch -Ini $iniStr -Fim $fimStr -Mod $mod
    }

    if ($json.status -eq "client_timeout_or_error") {
      $timeouts++
      Start-Sleep -Seconds $PauseSec
      continue
    }

    if ($json.status -eq "blocked" -or $json.error) {
      Write-Host ("Falha batch: {0}{1}" -f $json.error, $json.reason) -ForegroundColor Red
      exit 1
    }

    if ($null -ne $json.novos) { $totalNovos += [int]$json.novos }
    if ($null -ne $json.erros) { $totalErros += [int]$json.erros }
    Start-Sleep -Seconds $PauseSec
  }

  $cursor = $winEnd.AddDays(1)
}

Write-Host ("Concluido batches={0} novos={1} erros={2} timeouts_cliente={3}" -f $batches, $totalNovos, $totalErros, $timeouts) -ForegroundColor Green
