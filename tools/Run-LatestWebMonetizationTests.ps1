[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int] $Port = 8894
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$python = Get-Command py -ErrorAction Stop
$edgeCandidates = @(
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
)
$edge = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $edge) { throw 'Microsoft Edge was not found.' }
if (Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $Port is already in use."
}

$token = [guid]::NewGuid().ToString('N')
$profilePath = Join-Path $env:TEMP "squeeze-rush-latest-edge-$token"
$stdoutPath = Join-Path $env:TEMP "squeeze-rush-latest-http-$token.out.log"
$stderrPath = Join-Path $env:TEMP "squeeze-rush-latest-http-$token.err.log"
$server = $null
$serverPid = $null

function Remove-TestPath {
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
    $server = Start-Process -FilePath $python.Source `
        -ArgumentList @('-m', 'http.server', [string] $Port, '--bind', '127.0.0.1') `
        -WorkingDirectory $projectRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutPath `
        -RedirectStandardError $stderrPath `
        -PassThru

    for ($attempt = 0; $attempt -lt 50 -and -not $serverPid; $attempt += 1) {
        Start-Sleep -Milliseconds 100
        $listener = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($listener) { $serverPid = $listener.OwningProcess }
    }
    if (-not $serverPid) { throw 'Local test server did not start.' }

    $url = "http://127.0.0.1:$Port/tools/latest-web-monetization-tests.html"
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $dom = & $edge `
            --headless=new `
            --disable-gpu `
            --disable-sync `
            --no-first-run `
            --user-data-dir=$profilePath `
            --virtual-time-budget=15000 `
            --dump-dom `
            $url 2>&1 | Out-String
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    $summaryMatch = [regex]::Match($dom, 'LATEST WEB MONETIZATION TEST RESULT:[^<\r\n]+')
    if (-not $summaryMatch.Success) {
        throw "The browser did not return a test summary.`n$($dom.Substring(0, [Math]::Min($dom.Length, 5000)))"
    }
    Write-Host $summaryMatch.Value
    foreach ($result in [regex]::Matches($dom, '<li class="(pass|fail)">([^<]+)</li>')) {
        Write-Host $([System.Net.WebUtility]::HtmlDecode($result.Groups[2].Value))
    }
    $countMatch = [regex]::Match($summaryMatch.Value, '(?<passed>\d+)/(?<total>\d+) passed, (?<failed>\d+) failed')
    if (-not $countMatch.Success `
        -or $countMatch.Groups['passed'].Value -ne $countMatch.Groups['total'].Value `
        -or $countMatch.Groups['failed'].Value -ne '0') { exit 1 }
}
finally {
    if ($serverPid) { Stop-Process -Id $serverPid -Force -ErrorAction SilentlyContinue }
    elseif ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
    Remove-TestPath -Path $profilePath
    Remove-TestPath -Path $stdoutPath
    Remove-TestPath -Path $stderrPath
}
