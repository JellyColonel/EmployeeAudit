param(
    [string]$Source = (Join-Path $PSScriptRoot "dist")
)

$ErrorActionPreference = "Stop"

# Консоль Windows по умолчанию не в UTF-8: без этого русский текст
# превращается в вопросительные знаки на системах с латинской кодовой страницей.
try {
    [Console]::OutputEncoding = [Text.Encoding]::UTF8
    [Console]::InputEncoding = [Text.Encoding]::UTF8
} catch { }


$Files = @(
    "patcher.js", "patcher.js.map", "patcher.js.LEGAL.txt",
    "preload.js", "preload.js.map",
    "renderer.js", "renderer.js.map", "renderer.js.LEGAL.txt",
    "renderer.css", "renderer.css.map"
)

function Fail($message) {
    Write-Host ""
    Write-Host "ОШИБКА: $message" -ForegroundColor Red
    Write-Host ""
    Read-Host "Нажмите Enter, чтобы закрыть"
    exit 1
}

Write-Host "Установка плагина EmployeeAudit" -ForegroundColor Cyan
Write-Host ""

$target = Join-Path $env:APPDATA "Vencord\dist"

if (-not (Test-Path $target)) {
    Fail @"
Vencord не найден: нет папки
  $target

Сначала установите Vencord официальным установщиком с https://vencord.dev,
затем запустите этот файл снова.
"@
}

if (-not (Test-Path $Source)) {
    Fail "Не найдена папка со сборкой: $Source"
}

foreach ($file in $Files) {
    if (-not (Test-Path (Join-Path $Source $file))) {
        Fail "В сборке не хватает файла $file. Скачайте архив заново."
    }
}

$discord = Get-Process -Name Discord -ErrorAction SilentlyContinue
$restartDiscord = $false
if ($discord) {
    Write-Host "Discord запущен, его нужно полностью закрыть." -ForegroundColor Yellow
    $answer = Read-Host "Закрыть Discord сейчас и запустить обратно после установки? (д/н)"
    if ($answer -match "^[дdyaуДDY]") {
        $discord | Stop-Process -Force
        Start-Sleep -Seconds 3
        $restartDiscord = $true
        Write-Host "Discord закрыт."
    } else {
        Fail "Закройте Discord сами и запустите установку снова."
    }
}

$backup = "$target.bak-" + (Get-Date -Format "yyyyMMdd-HHmmss")
Copy-Item -Path $target -Destination $backup -Recurse
Write-Host "Резервная копия: $backup"

foreach ($file in $Files) {
    Copy-Item -Path (Join-Path $Source $file) -Destination (Join-Path $target $file) -Force
}
Write-Host "Файлы скопированы."

# Лаунчер Squirrel, а не app-*\Discord.exe: он сам находит текущую версию и
# переживает обновления Discord, которые эту папку переименовывают.
$launched = $false
if ($restartDiscord) {
    $launcher = Join-Path $env:LOCALAPPDATA "Discord\Update.exe"
    if (Test-Path $launcher) {
        Start-Process -FilePath $launcher -ArgumentList "--processStart", "Discord.exe"
        $launched = $true
        Write-Host "Discord запущен обратно."
    } else {
        Write-Host "Не нашёл, чем запустить Discord — запустите его сами." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Готово." -ForegroundColor Green
Write-Host ""
Write-Host "Что дальше:"
if ($launched) {
    Write-Host "  1. Настройки -> Vencord -> Plugins -> включите EmployeeAudit."
    Write-Host "  2. В настройках плагина заполните своё имя и Static ID."
    Write-Host "     Без них аудит не соберётся."
} else {
    Write-Host "  1. Запустите Discord."
    Write-Host "  2. Настройки -> Vencord -> Plugins -> включите EmployeeAudit."
    Write-Host "  3. В настройках плагина заполните своё имя и Static ID."
    Write-Host "     Без них аудит не соберётся."
}
Write-Host ""
Write-Host "Правый клик по отчёту на повышение -> Скопировать кадровый аудит."
Write-Host ""
Write-Host "Откатиться, если что-то пошло не так: скопируйте файлы из"
Write-Host "  $backup"
Write-Host "обратно в"
Write-Host "  $target"
Write-Host ""
Read-Host "Нажмите Enter, чтобы закрыть"
