# Sync de orgaos PNCP a partir dos CNPJs do gate PCA (classe 7830 por padrao)
param(
  [ValidateSet("bootstrap_pca", "bootstrap_unidades", "integracao")]
  [string]$Modo = "bootstrap_pca",
  [string]$ClasseGate = "7830",
  [int]$Limite = 500,
  [int]$Offset = 0,
  [int]$TimeoutSec = 300,
  [switch]$All,
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

if ($Modo -eq "integracao" -and $Limite -gt 40) {
  $Limite = 10
}

function Invoke-OrgaosBatch([int]$BatchOffset) {
  $body = @{
    modo        = $Modo
    classe_gate = $ClasseGate
    offset      = $BatchOffset
    limite      = $Limite
  }

  $response = Invoke-WebRequest `
    -Method POST `
    -Uri "$BaseUrl/functions/v1/sync-pncp-orgaos" `
    -Headers @{
      Authorization = "Bearer $Secret"
      "Content-Type"  = "application/json"
    } `
    -Body ($body | ConvertTo-Json) `
    -TimeoutSec $TimeoutSec `
    -UseBasicParsing

  if (-not $response.Content) {
    throw "Resposta vazia do sync-pncp-orgaos (offset=$BatchOffset)"
  }
  return ($response.Content | ConvertFrom-Json)
}

if (-not $All) {
  $json = Invoke-OrgaosBatch $Offset
  $json | ConvertTo-Json -Depth 8
  exit 0
}

$current = $Offset
$totalErros = 0
$batches = 0

while ($true) {
  Write-Host "=== Batch modo=$Modo offset=$current limite=$Limite ===" -ForegroundColor Cyan
  $json = Invoke-OrgaosBatch $current
  $batches++
  $json | ConvertTo-Json -Depth 6

  if ($json.status -eq "already_running") {
    Write-Host "Lock ativo; aguarde e rode de novo." -ForegroundColor Yellow
    exit 2
  }

  if ($json.status -ne "ok") {
    Write-Host "Falha no batch: $($json.erro)" -ForegroundColor Red
    exit 1
  }

  $totalErros += [int]$json.stats.erros

  if ($json.done -eq $true -or $null -eq $json.next_offset) {
    Write-Host "`nConcluido. batches=$batches cnpjs_total=$($json.cnpjs_total) erros=$totalErros" -ForegroundColor Green
    break
  }

  $current = [int]$json.next_offset
  Start-Sleep -Seconds 1
}
