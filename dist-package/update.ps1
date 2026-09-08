$ErrorActionPreference = "Stop"

# Консоль Windows по умолчанию не в UTF-8: без этого русский текст
# превращается в вопросительные знаки на системах с латинской кодовой страницей.
try {
    [Console]::OutputEncoding = [Text.Encoding]::UTF8
    [Console]::InputEncoding = [Text.Encoding]::UTF8
} catch { }

$Repo = "JellyColonel/EmployeeAudit"
$ReleasesPage = "https://github.com/$Repo/releases/latest"

# Имя архива в релизе постоянное, поэтому ссылка ведёт на свежий и без API.
# Это запасной путь: api.github.com у российских провайдеров блокируют чаще,
# чем сам github.com, и тогда браузер релизы открывает, а скрипт их не видит.
$LatestAsset = "$ReleasesPage/download/EmployeeAudit.zip"

$ManualHint = @"
Что делать:
  1. Откройте в браузере
       $ReleasesPage
     и скачайте оттуда EmployeeAudit.zip.
  2. Распакуйте архив и запустите из него install.bat — он сделает то же
     самое, что и это обновление.

Если и в браузере не открывается, включите VPN на весь компьютер.
Расширения-VPN в браузере тут не хватит: этот скрипт ходит в сеть сам.
"@

function Fail($message) {
    Write-Host ""
    Write-Host "ОШИБКА: $message" -ForegroundColor Red
    Write-Host ""
    Read-Host "Нажмите Enter, чтобы закрыть"
    exit 1
}

# Настоящая причина сбоя вместо «проверьте интернет»: с ней сразу видно,
# заблокирован ли хост, требует ли пароль прокси или GitHub считает запросы.
function Get-WebErrorText($err) {
    $ex = $err.Exception
    $web = $null
    if ($ex -is [Net.WebException]) { $web = $ex }
    elseif ($ex.InnerException -is [Net.WebException]) { $web = $ex.InnerException }

    if ($web -and $web.Response) {
        $code = [int]$web.Response.StatusCode
        switch ($code) {
            403 { return "GitHub ответил 403 — слишком много запросов с вашего адреса, подождите час" }
            404 { return "GitHub ответил 404 — архива по ссылке нет" }
            407 { return "прокси требует пароль (407)" }
            default { return "GitHub ответил $code" }
        }
    }
    return $ex.Message
}

Write-Host "Обновление плагина EmployeeAudit" -ForegroundColor Cyan
Write-Host ""

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Прокси PowerShell берёт из настроек Windows, но без учётных данных —
# в рабочей сети запрос иначе упирается в 407.
try {
    $proxy = [Net.WebRequest]::DefaultWebProxy
    if ($proxy) { $proxy.Credentials = [Net.CredentialCache]::DefaultCredentials }
} catch { }

$headers = @{ "User-Agent" = "EmployeeAudit-Updater" }

$downloadUrl = $null
$apiError = $null
try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" `
        -Headers $headers -TimeoutSec 30 -UseBasicParsing
    $asset = $release.assets | Where-Object { $_.name -like "*.zip" } | Select-Object -First 1
    if ($asset) {
        $downloadUrl = $asset.browser_download_url
        Write-Host "Последняя версия: $($release.tag_name)"
    } else {
        $apiError = "в последнем релизе нет архива"
    }
} catch {
    $apiError = Get-WebErrorText $_
}

if (-not $downloadUrl) {
    Write-Host "api.github.com недоступен: $apiError" -ForegroundColor Yellow
    Write-Host "Пробую скачать прямо с github.com..." -ForegroundColor Yellow
    $downloadUrl = $LatestAsset
}

$temp = Join-Path $env:TEMP ("EmployeeAudit-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $temp | Out-Null
$zip = Join-Path $temp "EmployeeAudit.zip"

Write-Host "Скачивание..."
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zip -Headers $headers -UseBasicParsing
} catch {
    $reason = Get-WebErrorText $_
    Remove-Item -Path $temp -Recurse -Force -ErrorAction SilentlyContinue
    Fail @"
Не удалось скачать архив: $reason

$ManualHint
"@
}

Write-Host "Распаковка..."
try {
    Expand-Archive -Path $zip -DestinationPath $temp -Force
} catch {
    Remove-Item -Path $temp -Recurse -Force -ErrorAction SilentlyContinue
    # Провайдер мог отдать вместо архива страницу-заглушку — она скачается
    # без ошибки, но распакуется уже никак.
    Fail @"
Скачанный файл не разворачивается — похоже, вместо архива пришло что-то другое.

$ManualHint
"@
}

$dist = Get-ChildItem -Path $temp -Directory -Recurse |
    Where-Object { $_.Name -eq "dist" } | Select-Object -First 1
if (-not $dist) {
    Fail "В архиве нет папки dist."
}

Write-Host ""
& (Join-Path $PSScriptRoot "install.ps1") -Source $dist.FullName

Remove-Item -Path $temp -Recurse -Force -ErrorAction SilentlyContinue
