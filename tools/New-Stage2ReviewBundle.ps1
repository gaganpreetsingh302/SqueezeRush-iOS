[CmdletBinding()]
param(
    [string] $Timestamp = (Get-Date -Format 'yyyyMMdd-HHmmss'),
    [string] $BackupPath = 'D:\Games\Squeeze rush\SqueezeRush\Backups\SqueezeRushIOS-Advanced-2.0.0-pre-stage2-20260803-222252.zip'
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot '..')).Path
$reviewDirectory = Join-Path $workspaceRoot 'ReviewBundles'
$reviewZip = Join-Path $reviewDirectory "SqueezeRush-Stage2-Review-$Timestamp.zip"
$runToken = [guid]::NewGuid().ToString('N')
$tempRoot = Join-Path $env:TEMP "squeeze-rush-stage2-review-$runToken"
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
    $destinationDirectory = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination
}

if (-not (Test-Path -LiteralPath $BackupPath -PathType Leaf)) {
    throw "Pre-Stage 2 backup is missing: $BackupPath"
}
if (Test-Path -LiteralPath $reviewZip) {
    throw "Review ZIP already exists: $reviewZip"
}

$productionPaths = @(
    'SqueezeRushIOS\Web\game.js',
    'SqueezeRushIOS\Web\index.html',
    'SqueezeRushIOS\Web\native-bridge.js',
    'SqueezeRushIOS\GameViewController.swift',
    'SqueezeRushIOS\SqueezeRushNativeBridge.swift',
    'SqueezeRushIOS.xcodeproj\project.pbxproj'
)

$reviewPaths = @(
    'STAGE_2_IMPLEMENTATION_REPORT.md',
    'STAGE_2_CHANGED_FILES.txt',
    'NATIVE_BRIDGE_PROTOCOL.md',
    'SOURCE_OF_TRUTH.md',
    'SqueezeRushIOS\Web\game.js',
    'SqueezeRushIOS\Web\index.html',
    'SqueezeRushIOS\Web\run-lifecycle.js',
    'SqueezeRushIOS\Web\native-bridge.js',
    'SqueezeRushIOS\GameViewController.swift',
    'SqueezeRushIOS\SqueezeRushNativeBridge.swift',
    'SqueezeRushIOS.xcodeproj\project.pbxproj',
    'tools\stage1-lifecycle-tests.html',
    'tools\stage1-lifecycle-tests.js',
    'tools\Run-Stage1LifecycleTests.ps1',
    'tools\Test-Stage1Static.ps1',
    'tools\stage2-bridge-tests.html',
    'tools\stage2-bridge-tests.js',
    'tools\stage2-file-mock-probe.html',
    'tools\Run-Stage2BridgeTests.ps1',
    'tools\Test-Stage2Static.ps1',
    'tools\New-Stage2ReviewBundle.ps1'
)

try {
    Assert-UnderTemp -Path $tempRoot
    New-Item -ItemType Directory -Path $extractRoot, $beforeRoot, $afterRoot, $stagingRoot -Force | Out-Null
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($BackupPath, $extractRoot)
    $backupProjectRoot = Join-Path $extractRoot 'SqueezeRushIOS-Advanced-2.0.0'

    foreach ($relativePath in $productionPaths) {
        $current = Join-Path $projectRoot $relativePath
        if (Test-Path -LiteralPath $current -PathType Leaf) {
            Copy-ReviewFile -SourceRoot $projectRoot -RelativePath $relativePath -DestinationRoot $afterRoot
        }
        $original = Join-Path $backupProjectRoot $relativePath
        if (Test-Path -LiteralPath $original -PathType Leaf) {
            Copy-ReviewFile -SourceRoot $backupProjectRoot -RelativePath $relativePath -DestinationRoot $beforeRoot
        }
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
        throw "git diff failed with exit code $diffExitCode.`n$($diffLines -join [Environment]::NewLine)"
    }
    $diffText = ($diffLines -join [Environment]::NewLine)
    $diffText = $diffText.Replace('a/before/', 'a/').Replace('a/after/', 'a/').Replace('b/after/', 'b/')
    $diffPath = Join-Path $stagingRoot 'STAGE_2_PRODUCTION_CHANGES.diff'
    [System.IO.File]::WriteAllText($diffPath, $diffText + [Environment]::NewLine, $utf8NoBom)

    foreach ($relativePath in $reviewPaths) {
        Copy-ReviewFile -SourceRoot $projectRoot -RelativePath $relativePath -DestinationRoot $stagingRoot
    }

    $manifestLines = [System.Collections.Generic.List[string]]::new()
    $manifestLines.Add('# Squeeze Rush Stage 2 review bundle SHA-256 manifest')
    $manifestLines.Add('# This manifest enumerates every other file in the ZIP; the manifest excludes itself to avoid recursive hashing.')
    $manifestLines.Add("RelativePath`tBytes`tSHA-256")
    $payloadFiles = Get-ChildItem -LiteralPath $stagingRoot -Recurse -File | Sort-Object FullName
    foreach ($file in $payloadFiles) {
        $relative = $file.FullName.Substring($stagingRoot.Length).TrimStart('\').Replace('\', '/')
        $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
        $manifestLines.Add("$relative`t$($file.Length)`t$hash")
    }
    $manifestPath = Join-Path $stagingRoot 'REVIEW_MANIFEST_SHA256.txt'
    [System.IO.File]::WriteAllLines($manifestPath, $manifestLines, $utf8NoBom)

    New-Item -ItemType Directory -Path $reviewDirectory -Force | Out-Null
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $stagingRoot,
        $reviewZip,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $false
    )

    $archive = [System.IO.Compression.ZipFile]::OpenRead($reviewZip)
    try {
        $stagedFiles = Get-ChildItem -LiteralPath $stagingRoot -Recurse -File
        foreach ($file in $stagedFiles) {
            $relative = $file.FullName.Substring($stagingRoot.Length).TrimStart('\').Replace('\', '/')
            $entry = $archive.Entries | Where-Object { $_.FullName.Replace('\', '/') -eq $relative } | Select-Object -First 1
            if (-not $entry) { throw "Review ZIP is missing $relative" }
            $entryStream = $entry.Open()
            try {
                $sha = [System.Security.Cryptography.SHA256]::Create()
                try {
                    $entryHash = ([BitConverter]::ToString($sha.ComputeHash($entryStream))).Replace('-', '')
                }
                finally { $sha.Dispose() }
            }
            finally { $entryStream.Dispose() }
            $sourceHash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
            if ($entryHash -ne $sourceHash) { throw "Review ZIP hash mismatch for $relative" }
        }
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
