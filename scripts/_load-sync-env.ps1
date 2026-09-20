function Get-SyncCronSecret {
  if ($env:SYNC_CRON_SECRET) {
    return $env:SYNC_CRON_SECRET.Trim()
  }

  $root = Split-Path $PSScriptRoot -Parent
  foreach ($relative in @(
      "supabase\.env.local",
      "supabase\.env.functions.local"
    )) {
    $path = Join-Path $root $relative
    if (-not (Test-Path $path)) { continue }
    foreach ($line in Get-Content $path) {
      if ($line -match '^\s*SYNC_CRON_SECRET\s*=\s*(.+?)\s*$') {
        return $matches[1].Trim().Trim('"').Trim("'")
      }
    }
  }

  return $null
}

function Set-SyncCronSecretInSession {
  $secret = Get-SyncCronSecret
  if ($secret) {
    $env:SYNC_CRON_SECRET = $secret
  }
  return $secret
}
