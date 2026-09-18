# Aplica migrations PNCP quando `supabase db reset` falha no Windows (timeout/conexão).
# Uso: .\scripts\apply-migrations-local.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$migrations = Join-Path $root "supabase\migrations"

docker exec supabase_db_licitagym psql -U postgres -c "SELECT 1" | Out-Null

Get-ChildItem "$migrations\*.sql" | Sort-Object Name | ForEach-Object {
  Write-Host "Applying $($_.Name)..."
  Get-Content $_.FullName -Raw | docker exec -i supabase_db_licitagym psql -U postgres -v ON_ERROR_STOP=1
}

Write-Host "Done."
