[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int] $Port = 8873
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$python = Get-Command py -ErrorAction Stop
$edgeCandidates = @(
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
)
$edge = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $edge) {
    throw 'Microsoft Edge was not found. Open tools\stage2-bridge-tests.html through a localhost server on another modern browser.'
}

$existingListener = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($existingListener) {
    throw "Port $Port is already in use. Pass a different -Port value."
}

$runToken = [guid]::NewGuid().ToString('N')
$profilePath = Join-Path $env:TEMP "squeeze-rush-stage2-edge-$runToken"
$stdoutPath = Join-Path $env:TEMP "squeeze-rush-stage2-http-$runToken.out.log"
$stderrPath = Join-Path $env:TEMP "squeeze-rush-stage2-http-$runToken.err.log"
$serverProcess = $null
$serverPid = $null

function Remove-Stage2TempPath {
    param([Parameter(Mandatory)] [string] $Path)
    if (-not (Test-Path -LiteralPath $Path)) { return }

    $resolvedPath = (Resolve-Path -LiteralPath $Path).Path
    $resolvedTemp = (Resolve-Path -LiteralPath $env:TEMP).Path
    if (-not $resolvedPath.StartsWith($resolvedTemp, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove a path outside the temporary directory: $resolvedPath"
    }
    Remove-Item -LiteralPath $resolvedPath -Recurse -Force
}

try {
    New-Item -ItemType Directory -Path $profilePath | Out-Null
    $serverProcess = Start-Process -FilePath $python.Source `
        -ArgumentList @('-m', 'http.server', [string] $Port, '--bind', '127.0.0.1') `
        -WorkingDirectory $projectRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutPath `
        -RedirectStandardError $stderrPath `
        -PassThru

    $listener = $null
    for ($attempt = 0; $attempt -lt 50 -and -not $listener; $attempt += 1) {
        Start-Sleep -Milliseconds 100
        $listener = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    }
    if (-not $listener) {
        $serverError = Get-Content -Raw -LiteralPath $stderrPath -ErrorAction SilentlyContinue
        throw "Local test server did not start. $serverError"
    }
    $serverPid = $listener.OwningProcess

    $url = "http://127.0.0.1:$Port/tools/stage2-bridge-tests.html"
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $dom = & $edge `
            --headless=new `
            --disable-gpu `
            --disable-sync `
            --no-first-run `
            --user-data-dir=$profilePath `
            --virtual-time-budget=35000 `
            --dump-dom `
            $url 2>&1 | Out-String
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    $summaryMatch = [regex]::Match($dom, 'STAGE 2 BRIDGE TEST RESULT:[^<\r\n]+')
    if (-not $summaryMatch.Success) {
        throw "The browser did not return a Stage 2 bridge test summary.`n$($dom.Substring(0, [Math]::Min($dom.Length, 5000)))"
    }

    Write-Host $summaryMatch.Value
    $resultMatches = [regex]::Matches($dom, '<li class="(pass|fail)">([^<]+)</li>')
    foreach ($result in $resultMatches) {
        $status = $result.Groups[1].Value.ToUpperInvariant()
        $message = [System.Net.WebUtility]::HtmlDecode($result.Groups[2].Value)
        Write-Host "$status`: $message"
    }

    $probePath = Join-Path $projectRoot 'tools\stage2-file-mock-probe.html'
    $probeUrl = ([System.Uri] $probePath).AbsoluteUri + '?nativeBridgeMock=1'
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $probeDom = & $edge `
            --headless=new `
            --disable-gpu `
            --disable-sync `
            --no-first-run `
            --user-data-dir=$profilePath `
            --virtual-time-budget=3000 `
            --dump-dom `
            $probeUrl 2>&1 | Out-String
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($probeDom -notmatch 'FILE MOCK GATE: PASS') {
        throw 'The native bridge mock activated on a file URL or the file probe failed to load.'
    }
    Write-Host 'FILE MOCK GATE: PASS'

    if ($summaryMatch.Value -notmatch '21/21 passed, 0 failed') {
        exit 1
    }
}
finally {
    if ($serverPid) {
        Stop-Process -Id $serverPid -Force -ErrorAction SilentlyContinue
    }
    elseif ($serverProcess -and -not $serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    }
    Remove-Stage2TempPath -Path $profilePath
    Remove-Stage2TempPath -Path $stdoutPath
    Remove-Stage2TempPath -Path $stderrPath
}
