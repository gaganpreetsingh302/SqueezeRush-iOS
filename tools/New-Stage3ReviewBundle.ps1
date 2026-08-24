[CmdletBinding()]
param(
    [string] $Timestamp = (Get-Date -Format 'yyyyMMdd-HHmmss'),
    [string] $BackupPath = 'D:\Games\Squeeze rush\SqueezeRush\Backups\SqueezeRushIOS-Advanced-2.0.0-pre-stage3-20260804-201624.zip'
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot '..')).Path
$reviewDirectory = Join-Path $workspaceRoot 'ReviewBundles'
$reviewZip = Join-Path $reviewDirectory "SqueezeRush-Stage3-Review-$Timestamp.zip"
$tempRoot = Join-Path $env:TEMP ("squeeze-rush-stage3-review-" + [guid]::NewGuid().ToString('N'))
$extractRoot = Join-Path $tempRoot 'extracted'
$beforeRoot = Join-Path $tempRoot 'before'
$afterRoot = Join-Path $tempRoot 'after'
$stagingRoot = Join-Path $tempRoot 'review'
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

function Assert-UnderTemp {
    param([Parameter(Mandatory)] [string] $Path)
    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $fullTemp = (Resolve-Path -LiteralPath $env:TEMP).Path
    if (-not $fullPath.StartsWith($fullTemp, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing temporary operation outside the temporary directory: $fullPath"
    }
}

function Copy-ReviewFile {
    param(
        [Parameter(Mandatory)] [string] $SourceRoot,
        [Parameter(Mandatory)] [string] $RelativePath,
        [Parameter(Mandatory)] [string] $DestinationRoot
    )
    $source = Join-Path $SourceRoot $RelativePath
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Required review file is missing: $source"
    }
    $destination = Join-Path $DestinationRoot $RelativePath
    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination
}

if (-not (Test-Path -LiteralPath $BackupPath -PathType Leaf)) {
    throw "Pre-Stage 3 backup is missing: $BackupPath"
}
if (Test-Path -LiteralPath $reviewZip) {
    throw "Review ZIP already exists: $reviewZip"
}

$baselineHashes = [ordered]@{
    'SqueezeRushIOS\Web\game.js' = 'E6318E1BF8D533B6AD6F02B9B053A730BD0FB598CD9F5053A16BBE9D25B9C973'
    'SqueezeRushIOS\Web\index.html' = '6785CE9289404B0F72681871C34C225364C07E431BA01411278D85C3FA24C39C'
    'SqueezeRushIOS\Web\native-bridge.js' = '4DD3FB2BC5B1A4A0349BAED9B1065E5F2CB1B833EE4ADE1EE9F10959D1092D50'
    'SqueezeRushIOS\Web\run-lifecycle.js' = 'F0EED9B5257260C09A81E54626E146950C202359405AE367FE6E1D3EB680910F'
    'SqueezeRushIOS\Web\styles.css' = 'AF2C5C55B050A7BA77139712F0D081A5967AD5E2DFBB97F6F5F8C3BFB635FB53'
    'SqueezeRushIOS\GameViewController.swift' = '96CA9C6F1E96F6CF39D3E784C7CE4FC7E920A9CA16F95490101711C29693396D'
    'SqueezeRushIOS\SqueezeRushNativeBridge.swift' = '6B669B32BB18B7D779167DE6BF898469FDFDA8CECCC29EB4F228D6BD8986FF8F'
    'SqueezeRushIOS\AppDelegate.swift' = '889597E22D37BC66E53B6B9FE9C061762E0DBDB0497D3128183FED1ACA926C88'
    'SqueezeRushIOS\Info.plist' = 'E31455AC0C1318969D027975C3D1E00D9E0DFEF321F7491E9F1002F6A46E43E0'
    'SqueezeRushIOS.xcodeproj\project.pbxproj' = 'A88497A3BEDD1DA89DE65D7565012D503B1445CA75B81206798F667CA8487E7F'
}

$productionPaths = @(
    'SqueezeRushIOS\GameViewController.swift',
    'SqueezeRushIOS\Info.plist',
    'SqueezeRushIOS\PrivacyInfo.xcprivacy',
    'SqueezeRushIOS\SqueezeRushAdFlowState.swift',
    'SqueezeRushIOS\SqueezeRushAdManager.swift',
    'SqueezeRushIOS\SqueezeRushConsentManager.swift',
    'SqueezeRushIOS\SqueezeRushNativeBridge.swift',
    'SqueezeRushIOS\BuildScripts\ValidateAdMobReleaseConfiguration.sh',
    'SqueezeRushIOS.xcodeproj\project.pbxproj'
)

$reviewPaths = @(
    'STAGE_3_IMPLEMENTATION_REPORT.md',
    'STAGE_3_CHANGED_FILES.txt',
    'ADMOB_RELEASE_BLOCKERS.md',
    'PRIVACY_DATA_INVENTORY_STAGE3.md',
    'STAGE_3_PACKAGE_METADATA.json',
    'SOURCE_OF_TRUTH.md',
    'NATIVE_BRIDGE_PROTOCOL.md',
    'SqueezeRushIOS\GameViewController.swift',
    'SqueezeRushIOS\Info.plist',
    'SqueezeRushIOS\PrivacyInfo.xcprivacy',
    'SqueezeRushIOS\SqueezeRushAdFlowState.swift',
    'SqueezeRushIOS\SqueezeRushAdManager.swift',
    'SqueezeRushIOS\SqueezeRushConsentManager.swift',
    'SqueezeRushIOS\SqueezeRushNativeBridge.swift',
    'SqueezeRushIOS\BuildScripts\ValidateAdMobReleaseConfiguration.sh',
    'SqueezeRushIOS.xcodeproj\project.pbxproj',
    'tools\stage1-lifecycle-tests.html',
    'tools\stage1-lifecycle-tests.js',
    'tools\Run-Stage1LifecycleTests.ps1',
    'tools\stage2-bridge-tests.html',
    'tools\stage2-bridge-tests.js',
    'tools\stage2-file-mock-probe.html',
    'tools\Run-Stage2BridgeTests.ps1',
    'tools\Test-Stage2Static.ps1',
    'tools\Test-Stage2AStatic.ps1',
    'tools\stage3-state-tests.swift',
    'tools\Run-Stage3Tests.ps1',
    'tools\Test-Stage3Static.ps1',
    'tools\New-Stage3ReviewBundle.ps1'
)

try {
    Assert-UnderTemp -Path $tempRoot
    New-Item -ItemType Directory -Path $extractRoot, $beforeRoot, $afterRoot, $stagingRoot -Force | Out-Null
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($BackupPath, $extractRoot)
    $nestedBackupRoot = Join-Path $extractRoot 'SqueezeRushIOS-Advanced-2.0.0'
    $backupProjectRoot = if (Test-Path -LiteralPath $nestedBackupRoot -PathType Container) { $nestedBackupRoot } else { $extractRoot }

    foreach ($entry in $baselineHashes.GetEnumerator()) {
        $source = Join-Path $backupProjectRoot $entry.Key
        $hash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
        if ($hash -ne $entry.Value) {
            throw "Review diff source baseline mismatch: $($entry.Key)"
        }
    }

    foreach ($relativePath in $productionPaths) {
        $baselineSource = Join-Path $backupProjectRoot $relativePath
        if (Test-Path -LiteralPath $baselineSource -PathType Leaf) {
            Copy-ReviewFile -SourceRoot $backupProjectRoot -RelativePath $relativePath -DestinationRoot $beforeRoot
        }
        Copy-ReviewFile -SourceRoot $projectRoot -RelativePath $relativePath -DestinationRoot $afterRoot
    }

    Push-Location $tempRoot
    try {
        $previousPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            $diffLines = & git -c core.autocrlf=false diff --no-index --binary --src-prefix=a/ --dst-prefix=b/ -- before after 2>&1
            $diffExitCode = $LASTEXITCODE
        }
        finally {
            $ErrorActionPreference = $previousPreference
        }
    }
    finally {
        Pop-Location
    }
    if ($diffExitCode -gt 1) {
        throw "git diff failed with exit code $diffExitCode."
    }
    $diffText = ($diffLines -join [Environment]::NewLine)
    $diffText = $diffText.Replace('a/before/', 'a/').Replace('a/after/', 'a/').Replace('b/after/', 'b/')
    foreach ($relativePath in $productionPaths) {
        if (-not $diffText.Contains($relativePath.Replace('\', '/'))) {
            throw "Stage 3 production diff is missing $relativePath"
        }
    }
    $diffPath = Join-Path $stagingRoot 'STAGE_3_PRODUCTION_CHANGES.diff'
    [System.IO.File]::WriteAllText($diffPath, $diffText + [Environment]::NewLine, $utf8NoBom)

    foreach ($relativePath in $reviewPaths) {
        Copy-ReviewFile -SourceRoot $projectRoot -RelativePath $relativePath -DestinationRoot $stagingRoot
    }
    $resolvedPath = Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\project.xcworkspace\xcshareddata\swiftpm\Package.resolved'
    if (Test-Path -LiteralPath $resolvedPath -PathType Leaf) {
        Copy-ReviewFile -SourceRoot $projectRoot -RelativePath 'SqueezeRushIOS.xcodeproj\project.xcworkspace\xcshareddata\swiftpm\Package.resolved' -DestinationRoot $stagingRoot
    }

    $manifestLines = [System.Collections.Generic.List[string]]::new()
    $manifestLines.Add('# Squeeze Rush Stage 3 review bundle SHA-256 manifest')
    $manifestLines.Add('# This manifest covers every other file in the ZIP and excludes itself to avoid recursive hashing.')
    $manifestLines.Add("RelativePath`tBytes`tSHA-256")
    foreach ($file in (Get-ChildItem -LiteralPath $stagingRoot -Recurse -File | Sort-Object FullName)) {
        $relative = $file.FullName.Substring($stagingRoot.Length).TrimStart('\').Replace('\', '/')
        $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
        $manifestLines.Add("$relative`t$($file.Length)`t$hash")
    }
    [System.IO.File]::WriteAllLines((Join-Path $stagingRoot 'REVIEW_MANIFEST_SHA256.txt'), $manifestLines, $utf8NoBom)

    New-Item -ItemType Directory -Path $reviewDirectory -Force | Out-Null
    [System.IO.Compression.ZipFile]::CreateFromDirectory($stagingRoot, $reviewZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)

    $archive = [System.IO.Compression.ZipFile]::OpenRead($reviewZip)
    try {
        foreach ($file in (Get-ChildItem -LiteralPath $stagingRoot -Recurse -File)) {
            $relative = $file.FullName.Substring($stagingRoot.Length).TrimStart('\').Replace('\', '/')
            $entry = $archive.Entries | Where-Object { $_.FullName.Replace('\', '/') -eq $relative } | Select-Object -First 1
            if (-not $entry) { throw "Review ZIP is missing $relative" }
            $stream = $entry.Open()
            try {
                $sha = [System.Security.Cryptography.SHA256]::Create()
                try { $entryHash = ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '') }
                finally { $sha.Dispose() }
            }
            finally { $stream.Dispose() }
            if ($entryHash -ne (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash) {
                throw "Review ZIP hash mismatch for $relative"
            }
        }
        $forbidden = @($archive.Entries | Where-Object {
            $_.FullName -match '(^|/|\\)\.git(/|\\|$)|DerivedData|\.mobileprovision$|\.(p12|cer|key)$|(^|/|\\)(build|Build)(/|\\)'
        })
        if ($forbidden.Count -gt 0) { throw 'Review ZIP contains a forbidden build, signing, credential, or Git entry.' }
    }
    finally { $archive.Dispose() }

    $zipItem = Get-Item -LiteralPath $reviewZip
    Write-Host "REVIEW_ZIP_PATH=$reviewZip"
    Write-Host "REVIEW_ZIP_SIZE=$($zipItem.Length)"
    Write-Host "REVIEW_ZIP_SHA256=$((Get-FileHash -LiteralPath $reviewZip -Algorithm SHA256).Hash)"
    Write-Host "REVIEW_ZIP_FILES=$((Get-ChildItem -LiteralPath $stagingRoot -Recurse -File).Count)"
}
finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Assert-UnderTemp -Path $tempRoot
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
