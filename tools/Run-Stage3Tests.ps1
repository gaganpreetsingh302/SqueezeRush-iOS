[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$swiftCompiler = (Get-Command swiftc -ErrorAction Stop).Source
$tempRoot = (Resolve-Path -LiteralPath $env:TEMP).Path
$runToken = [guid]::NewGuid().ToString('N')
$executable = Join-Path $tempRoot "squeeze-rush-stage3-$runToken.exe"
$sidecarLibrary = [System.IO.Path]::ChangeExtension($executable, '.lib')
$sidecarExport = [System.IO.Path]::ChangeExtension($executable, '.exp')
$passes = 0
$failures = 0

function Write-Stage3Result {
    param(
        [Parameter(Mandatory)] [string] $Letter,
        [Parameter(Mandatory)] [string] $Name,
        [Parameter(Mandatory)] [bool] $Passed
    )

    if ($Passed) {
        $script:passes += 1
        Write-Host "PASS: $Letter. $Name"
    }
    else {
        $script:failures += 1
        Write-Host "FAIL: $Letter. $Name" -ForegroundColor Red
    }
}

function Invoke-ReleaseGuard {
    param([Parameter(Mandatory)] [hashtable] $Environment)

    $bashCandidates = @(
        'C:\Program Files\Git\bin\bash.exe',
        'C:\Program Files\Git\usr\bin\bash.exe'
    )
    $bash = $bashCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
    if (-not $bash) {
        throw 'Git Bash is required to execute the deterministic Release guard on Windows.'
    }

    $scriptPath = (Join-Path $projectRoot 'SqueezeRushIOS\BuildScripts\ValidateAdMobReleaseConfiguration.sh').Replace('\', '/')
    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $bash
    $startInfo.Arguments = "`"$scriptPath`""
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true
    foreach ($key in $Environment.Keys) {
        $startInfo.EnvironmentVariables[$key] = [string] $Environment[$key]
    }
    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    [void] $process.Start()
    $standardOutput = $process.StandardOutput.ReadToEnd()
    $standardError = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    [pscustomobject]@{
        ExitCode = $process.ExitCode
        Output = $standardOutput
        Error = $standardError
    }
}

try {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $compileOutput = & $swiftCompiler -parse-as-library `
            (Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushAdFlowState.swift') `
            (Join-Path $projectRoot 'tools\stage3-state-tests.swift') `
            -o $executable 2>&1 | Out-String
        $compileExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($compileExitCode -ne 0) {
        throw "Stage 3 state-test compilation failed.`n$compileOutput"
    }

    $coreOutput = & $executable 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0 -or $coreOutput -notmatch 'STAGE 3 CORE TEST RESULT: 22/22 passed, 0 failed') {
        throw "Stage 3 state tests failed.`n$coreOutput"
    }
    $coreOutput -split "`r?`n" | Where-Object { $_ -match '^(PASS:|STAGE 3 CORE TEST RESULT:)' } | ForEach-Object {
        Write-Host $_
    }
    $passes += 22

    $webHashes = [ordered]@{
        'SqueezeRushIOS\Web\game.js' = '49951E3BA0D3321FC1349EEFF5A2D8D5975F45711510403C3AF9A1D3B0D15B58'
        'SqueezeRushIOS\Web\index.html' = 'F09B7CC871DEFD5C6CE823BC46AE63E4E95E01E6A179BD225FCC80307816C2F6'
        'SqueezeRushIOS\Web\native-bridge.js' = '33683B8049A2EB9E0E89B53A45012C3826318D5F2D1C11004E6832CB1F72BF95'
        'SqueezeRushIOS\Web\run-lifecycle.js' = '6D0AF635A9C638183035E312BAE26E7076B1561635C649EB7F3266BE124C6397'
        'SqueezeRushIOS\Web\styles.css' = '7C3B6BAFF43C1ED04F631BA302A6F2902AF29FD715ABF1FAE9979E07BAD5D6CB'
    }
    $webUnchanged = $true
    foreach ($entry in $webHashes.GetEnumerator()) {
        $actual = (Get-FileHash -LiteralPath (Join-Path $projectRoot $entry.Key) -Algorithm SHA256).Hash
        if ($actual -ne $entry.Value) { $webUnchanged = $false }
    }
    Write-Stage3Result 'W' 'Web production files match the audited Stage 4 baseline' $webUnchanged

    $project = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\project.pbxproj')
    $debugBlock = [regex]::Match(
        $project,
        'A1B2C3D4E5F6071829300023 /\* Debug \*/ = \{(?<body>.*?)\n\s*\};\n\s*name = Debug;',
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    ).Groups['body'].Value
    $releaseBlock = [regex]::Match(
        $project,
        'A1B2C3D4E5F6071829300024 /\* Release \*/ = \{(?<body>.*?)\n\s*\};\n\s*name = Release;',
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    ).Groups['body'].Value

    $debugUsesOnlyOfficialIDs = $debugBlock.Contains('ca-app-pub-3940256099942544~1458002511') -and
        $debugBlock.Contains('ca-app-pub-3940256099942544/1712485313') -and
        $debugBlock.Contains('ca-app-pub-3940256099942544/4411468910')
    Write-Stage3Result 'X' 'Debug configuration contains only official Google test IDs' $debugUsesOnlyOfficialIDs

    $releaseContainsNoTests = -not $releaseBlock.Contains('3940256099942544') -and
        ([regex]::Matches($releaseBlock, 'ADMOB_(?:APP_ID|REWARDED_AD_UNIT_ID|INTERSTITIAL_AD_UNIT_ID) = "";')).Count -eq 3
    Write-Stage3Result 'Y' 'Release configuration contains no test IDs' $releaseContainsNoTests

    $missingResult = Invoke-ReleaseGuard @{
        CONFIGURATION = 'Release'
        ADMOB_APP_ID = ''
        ADMOB_REWARDED_AD_UNIT_ID = ''
        ADMOB_INTERSTITIAL_AD_UNIT_ID = ''
        SQUEEZE_RUSH_ADS_RELEASE_APPROVED = 'NO'
    }
    $testIdResult = Invoke-ReleaseGuard @{
        CONFIGURATION = 'Release'
        ADMOB_APP_ID = 'ca-app-pub-3940256099942544~1458002511'
        ADMOB_REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/1712485313'
        ADMOB_INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-3940256099942544/4411468910'
        SQUEEZE_RUSH_ADS_RELEASE_APPROVED = 'YES'
    }
    $releaseGuardPassed = $missingResult.ExitCode -ne 0 -and
        $testIdResult.ExitCode -ne 0 -and
        $missingResult.Error.Contains('Release is intentionally blocked') -and
        $testIdResult.Error.Contains("sample publisher number")
    Write-Stage3Result 'Z' 'Release validation rejects incomplete or test configuration' $releaseGuardPassed

    Write-Host ''
    Write-Host "STAGE 3 TEST RESULT: $passes/26 passed, $failures failed"
    if ($failures -gt 0) { exit 1 }
}
finally {
    foreach ($path in @($executable, $sidecarLibrary, $sidecarExport)) {
        $fullPath = [System.IO.Path]::GetFullPath($path)
        if (-not $fullPath.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to remove a test artifact outside the temporary directory: $fullPath"
        }
        if (Test-Path -LiteralPath $fullPath) {
            Remove-Item -LiteralPath $fullPath -Force
        }
    }
}
