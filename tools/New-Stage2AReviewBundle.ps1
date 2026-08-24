[CmdletBinding()]
param(
    [string] $Timestamp = (Get-Date -Format 'yyyyMMdd-HHmmss'),
    [string] $BackupPath = 'D:\Games\Squeeze rush\SqueezeRush\Backups\SqueezeRushIOS-Advanced-2.0.0-pre-stage2a-20260804-195437.zip'
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot '..')).Path
$reviewDirectory = Join-Path $workspaceRoot 'ReviewBundles'
$reviewZip = Join-Path $reviewDirectory "SqueezeRush-Stage2A-Review-$Timestamp.zip"
$runToken = [guid]::NewGuid().ToString('N')
$tempRoot = Join-Path $env:TEMP "squeeze-rush-stage2a-review-$runToken"
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
    throw "Pre-Stage 2A backup is missing: $BackupPath"
}
if (Test-Path -LiteralPath $reviewZip) {
    throw "Review ZIP already exists: $reviewZip"
}

$productionPaths = @(
    'SqueezeRushIOS\GameViewController.swift'
)

$reviewPaths = @(
    'STAGE_2A_IMPLEMENTATION_REPORT.md',
    'STAGE_2A_CHANGED_FILES.txt',
    'SOURCE_OF_TRUTH.md',
    'NATIVE_BRIDGE_PROTOCOL.md',
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
    'tools\Test-Stage2AStatic.ps1',
    'tools\New-Stage2AReviewBundle.ps1'
)

try {
    Assert-UnderTemp -Path $tempRoot
    New-Item -ItemType Directory -Path $extractRoot, $beforeRoot, $afterRoot, $stagingRoot -Force | Out-Null
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($BackupPath, $extractRoot)

    $nestedBackupRoot = Join-Path $extractRoot 'SqueezeRushIOS-Advanced-2.0.0'
    $backupProjectRoot = if (Test-Path -LiteralPath $nestedBackupRoot -PathType Container) {
        $nestedBackupRoot
    }
    else {
        $extractRoot
    }

    $baselineControllerHash = (Get-FileHash -LiteralPath (Join-Path $backupProjectRoot 'SqueezeRushIOS\GameViewController.swift') -Algorithm SHA256).Hash
    if ($baselineControllerHash -ne 'AF342D1632781D0F0601706C53EF582A255DB9A53C6323FD696DAC38B2A383AD') {
        throw 'The review diff source does not match the verified Stage 2 GameViewController baseline.'
    }

    foreach ($relativePath in $productionPaths) {
        Copy-ReviewFile -SourceRoot $backupProjectRoot -RelativePath $relativePath -DestinationRoot $beforeRoot
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
        throw "git diff failed with exit code $diffExitCode.`n$($diffLines -join [Environment]::NewLine)"
    }

    $diffText = ($diffLines -join [Environment]::NewLine)
    $diffText = $diffText.Replace('a/before/', 'a/').Replace('a/after/', 'a/').Replace('b/after/', 'b/')
    if (([regex]::Matches($diffText, '(?m)^diff --git ')).Count -ne 1 -or
        -not $diffText.Contains('SqueezeRushIOS/GameViewController.swift')) {
        throw 'Stage 2A production diff must contain exactly GameViewController.swift.'
    }
    $diffPath = Join-Path $stagingRoot 'STAGE_2A_PRODUCTION_CHANGES.diff'
    [System.IO.File]::WriteAllText($diffPath, $diffText + [Environment]::NewLine, $utf8NoBom)

    foreach ($relativePath in $reviewPaths) {
        Copy-ReviewFile -SourceRoot $projectRoot -RelativePath $relativePath -DestinationRoot $stagingRoot
    }

    $manifestLines = [System.Collections.Generic.List[string]]::new()
    $manifestLines.Add('# Squeeze Rush Stage 2A review bundle SHA-256 manifest')
    $manifestLines.Add('# This manifest enumerates every other file in the ZIP and excludes itself to avoid recursive hashing.')
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
            if (-not $entry) {
                throw "Review ZIP is missing $relative"
            }
            $entryStream = $entry.Open()
            try {
                $sha = [System.Security.Cryptography.SHA256]::Create()
                try {
                    $entryHash = ([BitConverter]::ToString($sha.ComputeHash($entryStream))).Replace('-', '')
                }
                finally {
                    $sha.Dispose()
                }
            }
            finally {
                $entryStream.Dispose()
            }
            $sourceHash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
            if ($entryHash -ne $sourceHash) {
                throw "Review ZIP hash mismatch for $relative"
            }
        }

        $forbiddenEntries = @($archive.Entries | Where-Object {
            $_.FullName -match '(^|/|\\)\.git(/|\\|$)|DerivedData|\.mobileprovision$|\.(p12|cer|key)$|(^|/|\\)(build|Build)(/|\\)'
        })
        if ($forbiddenEntries.Count -gt 0) {
            throw 'Review ZIP contains a forbidden build, signing, credential, or Git entry.'
        }
    }
    finally {
        $archive.Dispose()
    }

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
