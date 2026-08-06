[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int] $Port = 8872
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
    throw 'Microsoft Edge was not found. Open tools\stage1-lifecycle-tests.html through a localhost server on another modern browser.'
}

$existingListener = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($existingListener) {
    throw "Port $Port is already in use. Pass a different -Port value."
}

$runToken = [guid]::NewGuid().ToString('N')
$profilePath = Join-Path $env:TEMP "squeeze-rush-stage1-edge-$runToken"
$stdoutPath = Join-Path $env:TEMP "squeeze-rush-stage1-http-$runToken.out.log"
$stderrPath = Join-Path $env:TEMP "squeeze-rush-stage1-http-$runToken.err.log"
$serverProcess = $null
$serverPid = $null

function Remove-Stage1TempPath {
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

    $url = "http://127.0.0.1:$Port/tools/stage1-lifecycle-tests.html"
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $dom = & $edge `
            --headless=new `
            --disable-gpu `
            --disable-sync `
            --no-first-run `
            --user-data-dir=$profilePath `
            --virtual-time-budget=20000 `
            --dump-dom `
            $url 2>&1 | Out-String
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    $summaryMatch = [regex]::Match($dom, 'STAGE 1 TEST RESULT:[^<\r\n]+')
    if (-not $summaryMatch.Success) {
        throw "The browser did not return a lifecycle test summary.`n$($dom.Substring(0, [Math]::Min($dom.Length, 4000)))"
    }

    Write-Host $summaryMatch.Value
    $resultMatches = [regex]::Matches($dom, '<li class="(pass|fail)">([^<]+)</li>')
    foreach ($result in $resultMatches) {
        $status = $result.Groups[1].Value.ToUpperInvariant()
        $message = [System.Net.WebUtility]::HtmlDecode($result.Groups[2].Value)
        Write-Host "$status`: $message"
    }

    if ($summaryMatch.Value -notmatch '10/10 passed, 0 failed') {
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
    Remove-Stage1TempPath -Path $profilePath
    Remove-Stage1TempPath -Path $stdoutPath
    Remove-Stage1TempPath -Path $stderrPath
}
