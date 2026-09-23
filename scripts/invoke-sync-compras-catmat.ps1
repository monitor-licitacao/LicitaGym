# Sync CATMAT. Sem -CodigoGrupo/-CodigoClasse a Edge aplica a policy inteira.
# Um par especifico continua valido: -CodigoGrupo 72 -CodigoClasse 7220
param(
  [int]$CodigoGrupo = -1,
  [int]$CodigoClasse = -1,
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

$temGrupo = $CodigoGrupo -ge 0
$temClasse = $CodigoClasse -ge 0
if ($temGrupo -xor $temClasse) {
  throw "codigo_grupo e codigo_classe devem vir juntos, ou nenhum dos dois."
}

function New-CatmatBody {
  param([hashtable]$Extra)
  $body = @{}
  foreach ($key in $Extra.Keys) { $body[$key] = $Extra[$key] }
  if ($temGrupo) {
    $body.codigo_grupo = $CodigoGrupo
    $body.codigo_classe = $CodigoClasse
  }
  return $body
}

function Write-CatmatRuns {
  param($Json)
  if ($Json.runs) {
    foreach ($run in @($Json.runs)) {
      if ($run.error -or ($run.http_status -ge 400) -or ($run.status -eq "blocked")) {
        throw "classe $($run.codigo_classe) falhou: $($run.error) $($run.reason) status=$($run.status)"
      }
      Write-Host ("  classe={0} grupo={1} sync_id={2} status={3}" -f `
          $run.codigo_classe, $run.codigo_grupo, $run.sync_id, $run.status) -ForegroundColor Green
    }
    return
  }
  if (-not $temGrupo) {
    Write-Host "  AVISO: resposta sem runs. Confira se a funcao implantada resolve a policy completa." -ForegroundColor Yellow
  }
  if ($null -ne $Json.codigo_classe) {
    Write-Host ("  classe={0} grupo={1} sync_id={2} status={3}" -f `
        $Json.codigo_classe, $Json.codigo_grupo, $Json.sync_id, $Json.status) -ForegroundColor Green
  }
}

function Get-CatmatPares {
  param($Json)
  $pares = @()
  if ($temGrupo) {
    $pares += [pscustomobject]@{ grupo = $CodigoGrupo; classe = $CodigoClasse }
    return $pares
  }
  if ($Json.runs) {
    foreach ($run in @($Json.runs)) {
      $pares += [pscustomobject]@{ grupo = [int]$run.codigo_grupo; classe = [int]$run.codigo_classe }
    }
    return $pares
  }
  if ($null -ne $Json.codigo_classe) {
    $pares += [pscustomobject]@{ grupo = [int]$Json.codigo_grupo; classe = [int]$Json.codigo_classe }
  }
  return $pares
}

function Invoke-CaracteristicasDaClasse {
  param([int]$Grupo, [int]$Classe, $OffsetInicial)
  $offset = $OffsetInicial
  $rodada = 0
  while ($null -ne $offset) {
    $rodada++
    Write-Host "Caracteristicas classe=$Classe offset=$offset (rodada $rodada)..." -ForegroundColor Cyan
    $bodyCar = @{
      codigo_grupo            = $Grupo
      codigo_classe           = $Classe
      somente_caracteristicas = $true
      offset_caracteristicas  = $offset
      limite_caracteristicas  = $LimiteCaracteristicas
    }
    try {
      $response = Invoke-SyncComprasCatmat -Body $bodyCar
      $carJson = $response.Content | ConvertFrom-Json
      if ($carJson.error -or ($carJson.status -eq "blocked")) {
        throw $carJson.error
      }
      Write-Host ("  classe={0} processados={1} novos={2} alterados={3} erros={4}" -f `
          $Classe, $carJson.caracteristicas_processadas, $carJson.novos, $carJson.alterados, $carJson.erros) -ForegroundColor Green
      $offset = $carJson.proximo_offset_caracteristicas
      if ($null -ne $offset) { Start-Sleep -Seconds 2 }
    }
    catch {
      Write-Host "  Falha classe ${Classe}: $($_.Exception.Message)" -ForegroundColor Red
      exit 1
    }
  }
}

$json = $null
if (-not $SomenteCaracteristicas) {
  $body = New-CatmatBody -Extra @{
    max_paginas            = $MaxPaginas
    limite_caracteristicas = $LimiteCaracteristicas
  }
  Write-Host "Sync referencia (sem par fixo; a Edge resolve a policy)..." -ForegroundColor Cyan
  $tentativa = 0
  $referenciaOk = $false
  while (-not $referenciaOk -and $tentativa -lt $ReferenciaRetries) {
    $tentativa++
    try {
      $response = Invoke-SyncComprasCatmat -Body $body
      $json = $response.Content | ConvertFrom-Json
      $json | ConvertTo-Json -Depth 8
      if ($json.error -or ($json.status -eq "blocked")) {
        throw $(if ($json.error) { $json.error } else { $json.reason })
      }
      Write-CatmatRuns -Json $json
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

if ($SomenteCaracteristicas -and -not $temGrupo) {
  $body = New-CatmatBody -Extra @{
    somente_caracteristicas = $true
    limite_caracteristicas  = $LimiteCaracteristicas
  }
  $response = Invoke-SyncComprasCatmat -Body $body
  $json = $response.Content | ConvertFrom-Json
  if ($json.error -or ($json.status -eq "blocked")) {
    throw $(if ($json.error) { $json.error } else { $json.reason })
  }
  Write-CatmatRuns -Json $json
  foreach ($run in @(if ($json.runs) { $json.runs } else { $json })) {
    if ($null -ne $run.proximo_offset_caracteristicas) {
      Invoke-CaracteristicasDaClasse -Grupo ([int]$run.codigo_grupo) -Classe ([int]$run.codigo_classe) -OffsetInicial $run.proximo_offset_caracteristicas
    }
  }
  Write-Host "Sync CATMAT concluido." -ForegroundColor Cyan
  exit 0
}

foreach ($par in @(Get-CatmatPares -Json $json)) {
  Invoke-CaracteristicasDaClasse -Grupo $par.grupo -Classe $par.classe -OffsetInicial 0
}

Write-Host "Sync CATMAT concluido." -ForegroundColor Cyan
