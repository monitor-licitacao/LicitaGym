<#
.SYNOPSIS
  Roda os testes decisivos que faltaram no levantamento da API Dados Abertos Compras.

.DESCRIPTION
  O levantamento anterior tirou três conclusões que os próprios dados não sustentam.
  Este script roda o teste que decide cada uma. Não escreve nada — só consulta e imprime.

  A  PGC Detalhe: o JSON foi testado com órgãos diferentes dos do CSV que funcionou.
     Aqui o JSON é chamado com EXATAMENTE os params do CSV que devolveu 1.298 bytes.
     Se vier dado, "endpoint sem dados" era amostragem ruim.

  B  Natureza de despesa: 22 registros marcados "COMPLETO" para 20.433 PDMs.
     Aqui roda sem filtro e com filtro, para ver se o total muda.

  C  Pesquisa de preço: três versões conflitantes dos parâmetros. Aqui as três são
     chamadas lado a lado, no mesmo item, para ver qual contrato a API aceita.

.EXAMPLE
  .\scripts\probe-compras-api.ps1
  .\scripts\probe-compras-api.ps1 -Verbose
#>
[CmdletBinding()]
param(
  [string]$BaseUrl = 'https://dadosabertos.compras.gov.br',
  # Órgão/ano que FUNCIONARAM no CSV do PGC Detalhe
  [string]$PgcOrgao = 'Câmara Municipal de Barueri',
  [int]$PgcAno = 2025,
  # Item CATMAT usado nos testes de preço
  [int]$CodigoItem = 233523,
  [int]$CodigoPdm = 1005,
  [int]$TimeoutSec = 60
)

$ErrorActionPreference = 'Stop'
$script:Resultados = @()

function Invoke-Probe {
  param(
    [string]$Rotulo,
    [string]$Path,
    [hashtable]$Query,
    [string]$Esperado
  )

  $pares = $Query.GetEnumerator() | ForEach-Object {
    "{0}={1}" -f $_.Key, [uri]::EscapeDataString([string]$_.Value)
  }
  $url = "$BaseUrl$Path`?" + ($pares -join '&')

  Write-Host ""
  Write-Host "→ $Rotulo" -ForegroundColor Cyan
  Write-Verbose $url

  $registros = $null; $codigo = $null; $erro = $null; $bytes = $null
  try {
    $resp = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec $TimeoutSec `
              -Headers @{ Accept = 'application/json' } -ErrorAction Stop
    $codigo = [int]$resp.StatusCode
    $bytes  = $resp.RawContentLength
    if ($resp.Content -and $resp.Content.Trim()) {
      try {
        $body = $resp.Content | ConvertFrom-Json
        $registros = $body.totalRegistros
        if ($null -eq $registros -and $body.resultado) { $registros = @($body.resultado).Count }
      } catch {
        # CSV ou corpo não-JSON: o tamanho é o sinal
        $registros = "n/a (não-JSON, $bytes bytes)"
      }
    }
  } catch {
    $codigo = try { [int]$_.Exception.Response.StatusCode } catch { $null }
    $erro = $_.Exception.Message
  }

  $cor = if ($erro) { 'Red' } elseif ($registros -is [int] -and $registros -gt 0) { 'Green' } else { 'Yellow' }
  Write-Host ("   HTTP {0} | totalRegistros: {1}" -f $codigo, $registros) -ForegroundColor $cor
  if ($erro) { Write-Host "   erro: $erro" -ForegroundColor Red }
  Write-Host "   esperado: $Esperado" -ForegroundColor DarkGray

  $script:Resultados += [pscustomobject]@{
    Teste = $Rotulo; HTTP = $codigo; Registros = $registros; Erro = $erro; Url = $url
  }
  Start-Sleep -Milliseconds 700   # cortesia com a API
}

Write-Host "=== A. PGC Detalhe: JSON com os params do CSV que funcionou ===" -ForegroundColor White
Invoke-Probe -Rotulo 'A1 PGC Detalhe JSON (params do CSV que deu 1298 bytes)' `
  -Path '/modulo-pgc/1_consultarPgcDetalhe' `
  -Query @{ pagina = 1; tamanhoPagina = 10; orgao = $PgcOrgao; anoPcaProjetoCompra = $PgcAno } `
  -Esperado 'Se vier > 0, a conclusao "endpoint sem dados" era amostragem ruim'

Invoke-Probe -Rotulo 'A2 PGC Detalhe CSV (controle — deve repetir os 1298 bytes)' `
  -Path '/modulo-pgc/1.1_consultarPgcDetalhe_CSV' `
  -Query @{ pagina = 1; tamanhoPagina = 10; orgao = $PgcOrgao; anoPcaProjetoCompra = $PgcAno } `
  -Esperado 'Controle: confirma que o par orgao/ano ainda tem dado'

Invoke-Probe -Rotulo 'A3 PGC Detalhe JSON com os params CATALOGADOS (anoPgc/codigoOrgao)' `
  -Path '/modulo-pgc/1_consultarPgcDetalhe' `
  -Query @{ pagina = 1; anoPgc = $PgcAno } `
  -Esperado 'Se falhar/vazio, confirma que o catalogo de params esta errado'

Write-Host ""
Write-Host "=== B. Natureza de despesa: os 22 registros sao o total mesmo? ===" -ForegroundColor White
Invoke-Probe -Rotulo 'B1 Natureza de despesa SEM filtro' `
  -Path '/modulo-material/5_consultarMaterialNaturezaDespesa' `
  -Query @{ pagina = 1 } `
  -Esperado '22 = o levantamento estava certo; muito maior = a carga anterior estava filtrada'

Invoke-Probe -Rotulo "B2 Natureza de despesa filtrada por codigoPdm=$CodigoPdm" `
  -Path '/modulo-material/5_consultarMaterialNaturezaDespesa' `
  -Query @{ pagina = 1; codigoPdm = $CodigoPdm } `
  -Esperado 'Compara com B1 para saber se o filtro muda o total'

Write-Host ""
Write-Host "=== C. Pesquisa de preco: qual contrato de parametro a API aceita? ===" -ForegroundColor White
Invoke-Probe -Rotulo "C1 Preco via par tipo+codigo (tipo=codigoItemCatalogo)" `
  -Path '/modulo-pesquisa-preco/1_consultarMaterial' `
  -Query @{ pagina = 1; tipo = 'codigoItemCatalogo'; codigo = $CodigoItem } `
  -Esperado 'Forma que funcionou no teste registrado'

Invoke-Probe -Rotulo "C2 Preco via param separado (codigoMaterial) — forma catalogada" `
  -Path '/modulo-pesquisa-preco/1_consultarMaterial' `
  -Query @{ pagina = 1; codigoMaterial = $CodigoItem } `
  -Esperado 'Se funcionar, o catalogo tambem esta certo e ha dois contratos'

Invoke-Probe -Rotulo "C3 Detalhe via codigoItemCatalogo direto" `
  -Path '/modulo-pesquisa-preco/2_consultarMaterialDetalhe' `
  -Query @{ pagina = 1; codigoItemCatalogo = $CodigoItem } `
  -Esperado 'Forma que funcionou no endpoint 2; confirma a assimetria com o endpoint 1'

Invoke-Probe -Rotulo 'C4 CSV de preco (deve falhar: 500 com filtro)' `
  -Path '/modulo-pesquisa-preco/1.1_consultarMaterial_CSV' `
  -Query @{ pagina = 1; tipo = 'codigoItemCatalogo'; codigo = $CodigoItem } `
  -Esperado 'Confirma que o CSV segue quebrado; se passar, reavaliar a lacuna 1'

Write-Host ""
Write-Host "=== RESUMO ===" -ForegroundColor White

# Renderizacao manual: Format-Table nao emite nada quando a saida esta
# redirecionada ou nao ha console (CI, pipe, arquivo).
$larguraTeste = ($script:Resultados.Teste | Measure-Object -Property Length -Maximum).Maximum
if (-not $larguraTeste) { $larguraTeste = 5 }
$fmt = "{0,-$larguraTeste}  {1,-5}  {2}"
Write-Host ($fmt -f 'TESTE', 'HTTP', 'REGISTROS')
Write-Host ($fmt -f ('-' * $larguraTeste), '-----', '---------')
foreach ($r in $script:Resultados) {
  $reg = if ($r.Erro) { "ERRO: $($r.Erro)" } else { "$($r.Registros)" }
  $cor = if ($r.Erro) { 'Red' } elseif ($r.Registros -is [int] -and $r.Registros -gt 0) { 'Green' } else { 'Yellow' }
  Write-Host ($fmt -f $r.Teste, $r.HTTP, $reg) -ForegroundColor $cor
}

Write-Host ""
Write-Host "Atualize docs/pncp/contract-matrix.md conforme o resultado." -ForegroundColor DarkGray

# Objetos na pipeline, para quem quiser | ConvertTo-Json ou | Export-Csv
$script:Resultados
