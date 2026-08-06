[CmdletBinding()]
param(
    [string] $Timestamp = (Get-Date -Format 'yyyyMMdd-HHmmss'),
    [string] $BackupPath = 'D:\Games\Squeeze rush\Backups\SqueezeRushIOS-Advanced-2.0.0-pre-stage3a-20260804-205540.zip'
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot '..')).Path
$reviewDirectory = Join-Path $workspaceRoot 'ReviewBundles'
$reviewZip = Join-Path $reviewDirectory "SqueezeRush-Stage3A-Review-$Timestamp.zip"
$tempRoot = Join-Path $env:TEMP ("squeeze-rush-stage3a-review-" + [guid]::NewGuid().ToString('N'))
$extractRoot = Join-Path $tempRoot 'extracted'
$beforeRoot = Join-Path $tempRoot 'before'
$afterRoot = Join-Path $tempRoot 'after'
$stagingRoot = Join-Path $tempRoot 'review'
$utf8NoBom = [Text.UTF8Encoding]::new($false)

function Assert-UnderTemp {
    param([Parameter(Mandatory)] [string] $Path)
    $fullPath = [IO.Path]::GetFullPath($Path)
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
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Required review file is missing: $source" }
    $destination = Join-Path $DestinationRoot $RelativePath
    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination
}

if (-not (Test-Path -LiteralPath $BackupPath -PathType Leaf)) { throw "Pre-Stage 3A backup is missing: $BackupPath" }
if (Test-Path -LiteralPath $reviewZip) { throw "Review ZIP already exists: $reviewZip" }

$baselineHashes = [ordered]@{
    'SqueezeRushIOS\GameViewController.swift'='36C0C0DECE0FE4BBA19D53E6391F12EF453E091750C96E4446B3004F79B250A1'
    'SqueezeRushIOS\Info.plist'='5931E12FF3D7F4BCBECDBB7E8949981F04C48433F8B68DBE296958ACCA0D9B4C'
    'SqueezeRushIOS\PrivacyInfo.xcprivacy'='521EB6EF8430773E5C010E1838FE9DD8FA5D62B7B76D1CEA8D7D8DAADCB144E2'
    'SqueezeRushIOS\SqueezeRushAdFlowState.swift'='CAA8308BF713BB796C1AE9CE910EAB1B8748C6F349F02818F170FECC8ABD6B33'
    'SqueezeRushIOS\SqueezeRushAdManager.swift'='EB34DDD2FF1656B4436A8EFF5281690285DEC7F57984B66BD8876057F58A89EC'
    'SqueezeRushIOS\SqueezeRushConsentManager.swift'='3C4938204BAB916FFF6F02D94BD48FF48D574978046C404BAFF103B7172C98C3'
    'SqueezeRushIOS\SqueezeRushNativeBridge.swift'='161AC432E2C35BAF0070CD92E868DD07E5E55D462DA8CF50F74501F594E95A98'
    'SqueezeRushIOS\BuildScripts\ValidateAdMobReleaseConfiguration.sh'='DAA2EACD27519560FC7998940787AE5B1DBD0C159C47E37CFE6C145B6ED6600F'
    'SqueezeRushIOS.xcodeproj\project.pbxproj'='EE6E22E38E4DFA6C8AF61B1CA7FCDA1EA20B03A9D1054E4AEC320BBBD952344A'
    'SqueezeRushIOS\Web\game.js'='E6318E1BF8D533B6AD6F02B9B053A730BD0FB598CD9F5053A16BBE9D25B9C973'
    'SqueezeRushIOS\Web\index.html'='6785CE9289404B0F72681871C34C225364C07E431BA01411278D85C3FA24C39C'
    'SqueezeRushIOS\Web\native-bridge.js'='4DD3FB2BC5B1A4A0349BAED9B1065E5F2CB1B833EE4ADE1EE9F10959D1092D50'
    'SqueezeRushIOS\Web\run-lifecycle.js'='F0EED9B5257260C09A81E54626E146950C202359405AE367FE6E1D3EB680910F'
    'SqueezeRushIOS\Web\styles.css'='AF2C5C55B050A7BA77139712F0D081A5967AD5E2DFBB97F6F5F8C3BFB635FB53'
}

$productionPaths = @(
    'SqueezeRushIOS\SqueezeRushAdFlowState.swift',
    'SqueezeRushIOS\SqueezeRushConsentManager.swift',
    'SqueezeRushIOS.xcodeproj\project.pbxproj'
)

$reviewPaths = @(
    'STAGE_3A_IMPLEMENTATION_REPORT.md',
    'STAGE_3A_CHANGED_FILES.txt',
    'STAGE_3_PACKAGE_METADATA.json',
    'SOURCE_OF_TRUTH.md',
    'NATIVE_BRIDGE_PROTOCOL.md',
    'PRIVACY_DATA_INVENTORY_STAGE3.md',
    'SqueezeRushIOS.xcodeproj\project.pbxproj',
    'SqueezeRushIOS\SqueezeRushAdFlowState.swift',
    'SqueezeRushIOS\SqueezeRushAdManager.swift',
    'SqueezeRushIOS\SqueezeRushConsentManager.swift',
    'SqueezeRushIOS\GameViewController.swift',
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
    'tools\stage3a-state-tests.swift',
    'tools\Run-Stage3ATests.ps1',
    'tools\Test-Stage3AStatic.ps1',
    'tools\New-Stage3AReviewBundle.ps1'
)

try {
    Assert-UnderTemp -Path $tempRoot
    New-Item -ItemType Directory -Path $extractRoot,$beforeRoot,$afterRoot,$stagingRoot -Force | Out-Null
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::ExtractToDirectory($BackupPath,$extractRoot)
    $nested = Join-Path $extractRoot 'SqueezeRushIOS-Advanced-2.0.0'
    $backupRoot = if(Test-Path -LiteralPath $nested -PathType Container){$nested}else{$extractRoot}

    foreach($entry in $baselineHashes.GetEnumerator()){
        $hash=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $backupRoot $entry.Key)).Hash
        if($hash -ne $entry.Value){throw "Review diff baseline mismatch: $($entry.Key)"}
    }
    foreach($relative in $productionPaths){
        Copy-ReviewFile -SourceRoot $backupRoot -RelativePath $relative -DestinationRoot $beforeRoot
        Copy-ReviewFile -SourceRoot $projectRoot -RelativePath $relative -DestinationRoot $afterRoot
    }

    Push-Location $tempRoot
    try{
        $previous=$ErrorActionPreference;$ErrorActionPreference='Continue'
        try{$diffLines=& git -c core.autocrlf=false diff --no-index --binary --src-prefix=a/ --dst-prefix=b/ -- before after 2>&1;$diffExit=$LASTEXITCODE}
        finally{$ErrorActionPreference=$previous}
    }finally{Pop-Location}
    if($diffExit -gt 1){throw "git diff failed with exit code $diffExit"}
    $diffText=($diffLines -join [Environment]::NewLine).Replace('a/before/','a/').Replace('a/after/','a/').Replace('b/after/','b/')
    if(([regex]::Matches($diffText,'(?m)^diff --git ')).Count -ne 3){throw 'Stage 3A production diff must contain exactly three changed production files.'}
    foreach($relative in $productionPaths){if(-not $diffText.Contains($relative.Replace('\','/'))){throw "Production diff is missing $relative"}}
    [IO.File]::WriteAllText((Join-Path $stagingRoot 'STAGE_3A_PRODUCTION_CHANGES.diff'),$diffText+[Environment]::NewLine,$utf8NoBom)

    foreach($relative in $reviewPaths){Copy-ReviewFile -SourceRoot $projectRoot -RelativePath $relative -DestinationRoot $stagingRoot}
    $resolvedRelative='SqueezeRushIOS.xcodeproj\project.xcworkspace\xcshareddata\swiftpm\Package.resolved'
    if(Test-Path -LiteralPath (Join-Path $projectRoot $resolvedRelative) -PathType Leaf){Copy-ReviewFile -SourceRoot $projectRoot -RelativePath $resolvedRelative -DestinationRoot $stagingRoot}

    $manifest=[Collections.Generic.List[string]]::new()
    $manifest.Add('# Squeeze Rush Stage 3A review bundle SHA-256 manifest')
    $manifest.Add('# Every other ZIP file is listed; this manifest excludes itself to avoid recursive hashing.')
    $manifest.Add("RelativePath`tBytes`tSHA-256")
    foreach($file in Get-ChildItem -LiteralPath $stagingRoot -Recurse -File | Sort-Object FullName){
        $relative=$file.FullName.Substring($stagingRoot.Length).TrimStart('\').Replace('\','/')
        $manifest.Add("$relative`t$($file.Length)`t$((Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash)")
    }
    [IO.File]::WriteAllLines((Join-Path $stagingRoot 'REVIEW_MANIFEST_SHA256.txt'),$manifest,$utf8NoBom)

    New-Item -ItemType Directory -Path $reviewDirectory -Force | Out-Null
    [IO.Compression.ZipFile]::CreateFromDirectory($stagingRoot,$reviewZip,[IO.Compression.CompressionLevel]::Optimal,$false)
    $archive=[IO.Compression.ZipFile]::OpenRead($reviewZip)
    try{
        foreach($file in Get-ChildItem -LiteralPath $stagingRoot -Recurse -File){
            $relative=$file.FullName.Substring($stagingRoot.Length).TrimStart('\').Replace('\','/')
            $entry=$archive.Entries|Where-Object{$_.FullName.Replace('\','/') -eq $relative}|Select-Object -First 1
            if(!$entry){throw "Review ZIP is missing $relative"}
            $stream=$entry.Open();try{$sha=[Security.Cryptography.SHA256]::Create();try{$entryHash=[BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','')}finally{$sha.Dispose()}}finally{$stream.Dispose()}
            if($entryHash -ne (Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash){throw "Review ZIP hash mismatch: $relative"}
        }
        $forbidden=@($archive.Entries|Where-Object{$_.FullName -match '(^|/|\\)\.git(/|\\|$)|DerivedData|\.mobileprovision$|\.(p12|cer|key)$|(^|/|\\)(build|Build)(/|\\)'})
        if($forbidden.Count -gt 0){throw 'Review ZIP contains forbidden Git, build, signing, or credential content.'}
    }finally{$archive.Dispose()}

    $item=Get-Item -LiteralPath $reviewZip
    Write-Host "REVIEW_ZIP_PATH=$reviewZip"
    Write-Host "REVIEW_ZIP_SIZE=$($item.Length)"
    Write-Host "REVIEW_ZIP_SHA256=$((Get-FileHash -Algorithm SHA256 -LiteralPath $reviewZip).Hash)"
    Write-Host "REVIEW_ZIP_FILES=$((Get-ChildItem -LiteralPath $stagingRoot -Recurse -File).Count)"
}
finally{
    if(Test-Path -LiteralPath $tempRoot){Assert-UnderTemp -Path $tempRoot;Remove-Item -LiteralPath $tempRoot -Recurse -Force}
}
