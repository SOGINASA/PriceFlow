# Запуск локального portable-PostgreSQL (без админ-прав и без службы Windows).
# Сервер слушает localhost:5432, данные — в .localdb/pgdata. Логи — .localdb/pg.log.
# Останов: stop_db.ps1. Полное удаление: uninstall_postgres.ps1.
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '..\.localdb'
$bin  = Join-Path $root 'pgsql\bin'
$data = Join-Path $root 'pgdata'
$log  = Join-Path $root 'pg.log'

if (-not (Test-Path "$bin\pg_ctl.exe")) {
    Write-Error "Portable PostgreSQL не найден в $bin. Сначала установите его (см. README)."
    exit 1
}

& "$bin\pg_ctl.exe" -D $data -l $log -o "-p 5432" start
Write-Host "PostgreSQL запущен на localhost:5432 (данные: $data)"
