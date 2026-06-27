# Остановка локального portable-PostgreSQL, запущенного через start_db.ps1.
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '..\.localdb'
$bin  = Join-Path $root 'pgsql\bin'
$data = Join-Path $root 'pgdata'

if (-not (Test-Path "$bin\pg_ctl.exe")) {
    Write-Host "Portable PostgreSQL не установлен — нечего останавливать."
    exit 0
}

& "$bin\pg_ctl.exe" -D $data stop -m fast
Write-Host "PostgreSQL остановлен."
