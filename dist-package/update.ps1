$ErrorActionPreference = "Stop"

# Консоль Windows по умолчанию не в UTF-8: без этого русский текст
# превращается в вопросительные знаки на системах с латинской кодовой страницей.
try {
    [Console]::OutputEncoding = [Text.Encoding]::UTF8
    [Console]::InputEncoding = [Text.Encoding]::UTF8
} catch { }

$Repo = "JellyColonel/EmployeeAudit"

function Fail($message) {
    Write-Host ""
    Write-Host "ОШИБКА: $message" -ForegroundColor Red
    Write-Host ""
    Read-Host "Нажмите Enter, чтобы закрыть"
    exit 1
}

Write-Host "Обновление плагина EmployeeAudit" -ForegroundColor Cyan
Write-Host ""

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" `
        -Headers @{ "User-Agent" = "EmployeeAudit-Updater" }
} catch {
    Fail "Не удалось получить сведения о последней версии. Проверьте интернет."
}

$asset = $release.assets | Where-Object { $_.name -like "*.zip" } | Select-Object -First 1
if (-not $asset) {
    Fail "В последнем релизе нет архива."
}

Write-Host "Последняя версия: $($release.tag_name)"

$temp = Join-Path $env:TEMP ("EmployeeAudit-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $temp | Out-Null
$zip = Join-Path $temp $asset.name

Write-Host "Скачивание..."
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip `
    -Headers @{ "User-Agent" = "EmployeeAudit-Updater" }

Write-Host "Распаковка..."
Expand-Archive -Path $zip -DestinationPath $temp -Force

$dist = Get-ChildItem -Path $temp -Directory -Recurse |
    Where-Object { $_.Name -eq "dist" } | Select-Object -First 1
if (-not $dist) {
    Fail "В архиве нет папки dist."
}

Write-Host ""
& (Join-Path $PSScriptRoot "install.ps1") -Source $dist.FullName

Remove-Item -Path $temp -Recurse -Force -ErrorAction SilentlyContinue
