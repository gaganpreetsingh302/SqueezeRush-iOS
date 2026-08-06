[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$flowPath = Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushAdFlowState.swift'
$consentPath = Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushConsentManager.swift'
$testPath = Join-Path $projectRoot 'tools\stage3b-state-tests.swift'
$projectPath = Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\project.pbxproj'
$swiftCompiler = Get-Command swiftc -ErrorAction SilentlyContinue
if (-not $swiftCompiler) { throw 'swiftc is required for Stage 3B deterministic state tests.' }

$tempRoot = [System.IO.Path]::GetFullPath($env:TEMP)
$executable = Join-Path $tempRoot ("squeeze-rush-stage3b-tests-" + [guid]::NewGuid().ToString('N') + '.exe')
$passes = 10
$failures = 0

function Write-Stage3BResult {
    param([string] $Letter, [string] $Name, [bool] $Passed)
    if ($Passed) {
        $script:passes += 1
        Write-Host "PASS: $Letter. $Name"
    }
    else {
        $script:failures += 1
        Write-Host "FAIL: $Letter. $Name" -ForegroundColor Red
    }
}

try {
    & $swiftCompiler.Source $flowPath $testPath -o $executable
    if ($LASTEXITCODE -ne 0) { throw "swiftc failed with exit code $LASTEXITCODE" }
    & $executable
    if ($LASTEXITCODE -ne 0) { throw "Stage 3B core tests failed with exit code $LASTEXITCODE" }

    $consent = Get-Content -Raw -LiteralPath $consentPath
    $project = Get-Content -Raw -LiteralPath $projectPath
    $requestIndex = $consent.IndexOf('ConsentInformation.shared.requestConsentInfoUpdate', [StringComparison]::Ordinal)
    $postRequestMarkIndex = $consent.IndexOf('flowState.markPostRequestSnapshotPublished()', [StringComparison]::Ordinal)
    $postRequestPublishIndex = $consent.IndexOf('self.publishSnapshot()', $postRequestMarkIndex, [StringComparison]::Ordinal)
    $completionProcessorIndex = $consent.IndexOf('private func processConsentUpdateCompletion', [StringComparison]::Ordinal)

    Write-Stage3BResult 'B' 'requestConsentInfoUpdate is invoked before the immediate snapshot' (
        $requestIndex -ge 0 -and $postRequestMarkIndex -gt $requestIndex
    )
    Write-Stage3BResult 'C' 'Immediate snapshot precedes completion processing' (
        $postRequestPublishIndex -gt $postRequestMarkIndex -and
        $completionProcessorIndex -gt $postRequestPublishIndex -and
        $consent.Contains('DispatchQueue.main.async { [weak self] in')
    )
    $requestClosure = [regex]::Match(
        $consent,
        'requestConsentInfoUpdate\(with: parameters\) \{ \[weak self\] error in\s*self\?\.enqueueConsentUpdateCompletion\(error\)\s*\}\s*self\.flowState\.markPostRequestSnapshotPublished\(\)\s*self\.publishSnapshot\(\)',
        [Text.RegularExpressions.RegexOptions]::Singleline
    )
    Write-Stage3BResult 'D' 'Immediate publication does not wait for update completion' $requestClosure.Success
    Write-Stage3BResult 'E' 'Immediate publication reads UMP canRequestAds instead of a local cache' (
        $consent.Contains('let information = ConsentInformation.shared') -and
        $consent.Contains('canRequestAds: information.canRequestAds') -and
        -not $consent.Contains('private var canRequestAds')
    )

    $gmaBlock = [regex]::Match(
        $project,
        'XCRemoteSwiftPackageReference "swift-package-manager-google-mobile-ads" \*/ = \{(?<body>.*?)\n\s*\};',
        [Text.RegularExpressions.RegexOptions]::Singleline
    ).Groups['body'].Value
    $umpBlock = [regex]::Match(
        $project,
        'XCRemoteSwiftPackageReference "swift-package-manager-google-user-messaging-platform" \*/ = \{(?<body>.*?)\n\s*\};',
        [Text.RegularExpressions.RegexOptions]::Singleline
    ).Groups['body'].Value
    Write-Stage3BResult 'O' 'Google Mobile Ads remains exact 13.7.0' (
        $gmaBlock.Contains('kind = exactVersion;') -and $gmaBlock.Contains('version = 13.7.0;')
    )
    Write-Stage3BResult 'P' 'Google UMP remains exact 3.1.0' (
        $umpBlock.Contains('kind = exactVersion;') -and $umpBlock.Contains('version = 3.1.0;')
    )

    $webHashes = [ordered]@{
        'game.js' = '49951E3BA0D3321FC1349EEFF5A2D8D5975F45711510403C3AF9A1D3B0D15B58'
        'index.html' = 'F09B7CC871DEFD5C6CE823BC46AE63E4E95E01E6A179BD225FCC80307816C2F6'
        'native-bridge.js' = '33683B8049A2EB9E0E89B53A45012C3826318D5F2D1C11004E6832CB1F72BF95'
        'run-lifecycle.js' = '6D0AF635A9C638183035E312BAE26E7076B1561635C649EB7F3266BE124C6397'
        'styles.css' = '7C3B6BAFF43C1ED04F631BA302A6F2902AF29FD715ABF1FAE9979E07BAD5D6CB'
    }
    $webUnchanged = $true
    foreach ($entry in $webHashes.GetEnumerator()) {
        $path = Join-Path $projectRoot (Join-Path 'SqueezeRushIOS\Web' $entry.Key)
        if ((Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash -ne $entry.Value) {
            $webUnchanged = $false
        }
    }
    Write-Stage3BResult 'Q' 'All five production Web files match the audited Stage 4 baseline' $webUnchanged

    $allSwift = (Get-ChildItem -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS') -Filter '*.swift' -File |
        ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName }) -join "`n"
    Write-Stage3BResult 'R' 'Native ad code grants no gameplay reward or career mutation' (
        -not $allSwift.Contains('rewardedReviveUsed = true') -and
        -not $allSwift.Contains('rewardDoubleClaimed = true') -and
        -not $allSwift.Contains('career.xp') -and
        -not $allSwift.Contains('career.cores')
    )

    Write-Host ''
    Write-Host "STAGE 3B TEST RESULT: $passes/18 passed, $failures failed"
    if ($failures -gt 0) { exit 1 }
}
finally {
    $sidecarLibrary = [System.IO.Path]::ChangeExtension($executable, '.lib')
    $sidecarExport = [System.IO.Path]::ChangeExtension($executable, '.exp')
    foreach ($path in @($executable, $sidecarLibrary, $sidecarExport)) {
        $fullPath = [System.IO.Path]::GetFullPath($path)
        if (-not $fullPath.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to remove a test artifact outside the temporary directory: $fullPath"
        }
        if (Test-Path -LiteralPath $fullPath) { Remove-Item -LiteralPath $fullPath -Force }
    }
}
