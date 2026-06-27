# Полное удаление локального portable-PostgreSQL и возврат приложения на SQLite.
# Удаляет бинарники и ДАННЫЕ БД (.localdb) и комментирует DATABASE_URL в .env,
# после чего PriceFlow при старте автоматически переключается на SQLite-файл.
$ErrorActionPreference = 'Continue'
$root = Join-Path $PSScriptRoot '..\.localdb'
$data = Join-Path $root 'pgdata'
$bin  = Join-Path $root 'pgsql\bin'

# 1) остановить сервер, если запущен
if (Test-Path "$bin\pg_ctl.exe") {
    try { & "$bin\pg_ctl.exe" -D $data stop -m fast } catch {}
}

# 2) удалить бинарники + данные (необратимо: тут лежит сама БД medarchive)
if (Test-Path $root) {
    Remove-Item -Recurse -Force $root
    Write-Host "Удалено: $root"
}

# 3) вернуть .env на SQLite — закомментировать строку DATABASE_URL=postgresql://...
$envFile = Join-Path $PSScriptRoot '.env'
if (Test-Path $envFile) {
    (Get-Content $envFile) -replace '^(DATABASE_URL=postgresql.*)$', '# $1' |
        Set-Content $envFile -Encoding utf8
    Write-Host "DATABASE_URL в .env закомментирован — приложение вернётся на SQLite."
}

Write-Host "Готово. Portable PostgreSQL полностью удалён."
