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
        'game.js' = 'E6318E1BF8D533B6AD6F02B9B053A730BD0FB598CD9F5053A16BBE9D25B9C973'
        'index.html' = '6785CE9289404B0F72681871C34C225364C07E431BA01411278D85C3FA24C39C'
        'native-bridge.js' = '4DD3FB2BC5B1A4A0349BAED9B1065E5F2CB1B833EE4ADE1EE9F10959D1092D50'
        'run-lifecycle.js' = 'F0EED9B5257260C09A81E54626E146950C202359405AE367FE6E1D3EB680910F'
        'styles.css' = 'AF2C5C55B050A7BA77139712F0D081A5967AD5E2DFBB97F6F5F8C3BFB635FB53'
    }
    $webUnchanged = $true
    foreach ($entry in $webHashes.GetEnumerator()) {
        $path = Join-Path $projectRoot (Join-Path 'SqueezeRushIOS\Web' $entry.Key)
        if ((Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash -ne $entry.Value) { $webUnchanged = $false }
    }
    Write-Stage3AResult 'Q' 'No Web production file changed' $webUnchanged

    $allSwift = (Get-ChildItem -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS') -Filter '*.swift' -File |
        ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName }) -join "`n"
    Write-Stage3AResult 'R' 'No Stage 4 gameplay behavior was introduced' (
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
