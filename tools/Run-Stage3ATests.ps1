[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$flowPath = Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushAdFlowState.swift'
$testPath = Join-Path $projectRoot 'tools\stage3a-state-tests.swift'
$projectPath = Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\project.pbxproj'
$swiftCompiler = Get-Command swiftc -ErrorAction SilentlyContinue
if (-not $swiftCompiler) { throw 'swiftc is required for Stage 3A deterministic state tests.' }

$tempRoot = [System.IO.Path]::GetFullPath($env:TEMP)
$executable = Join-Path $tempRoot ("squeeze-rush-stage3a-tests-" + [guid]::NewGuid().ToString('N') + '.exe')
$passes = 13
$failures = 0

function Write-Stage3AResult {
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
    if ($LASTEXITCODE -ne 0) { throw "Stage 3A core tests failed with exit code $LASTEXITCODE" }

    $project = Get-Content -Raw -LiteralPath $projectPath
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

    Write-Stage3AResult 'N' 'Google Mobile Ads remains exact 13.7.0' (
        $gmaBlock.Contains('kind = exactVersion;') -and $gmaBlock.Contains('version = 13.7.0;')
    )
    Write-Stage3AResult 'O' 'Google UMP is a direct exact 3.1.0 dependency' (
        $umpBlock.Contains('kind = exactVersion;') -and $umpBlock.Contains('version = 3.1.0;')
    )
    Write-Stage3AResult 'P' 'Target links both package products once' (
        ([regex]::Matches($project, 'productName = GoogleMobileAds;')).Count -eq 1 -and
        ([regex]::Matches($project, 'productName = GoogleUserMessagingPlatform;')).Count -eq 1 -and
        ([regex]::Matches($project, '/\* GoogleMobileAds in Frameworks \*/ = \{isa = PBXBuildFile;')).Count -eq 1 -and
        ([regex]::Matches($project, '/\* GoogleUserMessagingPlatform in Frameworks \*/ = \{isa = PBXBuildFile;')).Count -eq 1
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
        if ((Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash -ne $entry.Value) { $webUnchanged = $false }
    }
    Write-Stage3AResult 'Q' 'Web production files match the audited Stage 4 baseline' $webUnchanged

    $allSwift = (Get-ChildItem -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS') -Filter '*.swift' -File |
        ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName }) -join "`n"
    Write-Stage3AResult 'R' 'Native ad code grants no gameplay reward or career mutation' (
        -not $allSwift.Contains('rewardedReviveUsed = true') -and
        -not $allSwift.Contains('rewardDoubleClaimed = true') -and
        -not $allSwift.Contains('career.xp') -and
        -not $allSwift.Contains('career.cores')
    )

    Write-Host ''
    Write-Host "STAGE 3A TEST RESULT: $passes/18 passed, $failures failed"
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
