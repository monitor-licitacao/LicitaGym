# Verifica lastro de periodo PCA via Search API (sem sync pesado)
param(
  [int]$Ano = (Get-Date).Year,
  [string]$BaseUrl = "http://127.0.0.1:54321",
  [string]$Secret
)

& "$PSScriptRoot\invoke-sync-pca.ps1" -Ano $Ano -SomenteVerificacao -BaseUrl $BaseUrl -Secret $Secret
