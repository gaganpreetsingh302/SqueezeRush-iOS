[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$webRoot = Join-Path $projectRoot 'SqueezeRushIOS\Web'
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot '..')).Path
$failures = [System.Collections.Generic.List[string]]::new()
$passes = [System.Collections.Generic.List[string]]::new()

function Test-Stage1Condition {
    param(
        [Parameter(Mandatory)] [bool] $Condition,
        [Parameter(Mandatory)] [string] $Message
    )

    if ($Condition) {
        $script:passes.Add($Message)
        Write-Host "PASS: $Message"
    }
    else {
        $script:failures.Add($Message)
        Write-Host "FAIL: $Message" -ForegroundColor Red
    }
}

function Get-RelativeProjectPath {
    param([Parameter(Mandatory)] [string] $Path)
    $resolvedPath = [System.IO.Path]::GetFullPath($Path)
    if ($resolvedPath.StartsWith($projectRoot, [StringComparison]::OrdinalIgnoreCase)) {
        return $resolvedPath.Substring($projectRoot.Length).TrimStart('\')
    }
    return $resolvedPath
}

$expectedUnchangedHashes = [ordered]@{
    'SqueezeRushIOS\Web\styles.css' = 'AF2C5C55B050A7BA77139712F0D081A5967AD5E2DFBB97F6F5F8C3BFB635FB53'
    'SqueezeRushIOS\GameViewController.swift' = '45FAA9B9B0E01200451A888234482D62F5CD599513F69266D3F76D42B17FD273'
    'SqueezeRushIOS\AppDelegate.swift' = '889597E22D37BC66E53B6B9FE9C061762E0DBDB0497D3128183FED1ACA926C88'
    'SqueezeRushIOS\Info.plist' = 'E31455AC0C1318969D027975C3D1E00D9E0DFEF321F7491E9F1002F6A46E43E0'
    'SqueezeRushIOS.xcodeproj\project.pbxproj' = 'ACD382F806FD6B66C332CB0BA516E00BCA7169DB0B3C5CF81EECA08DC4DB22C4'
}

foreach ($entry in $expectedUnchangedHashes.GetEnumerator()) {
    $path = Join-Path $projectRoot $entry.Key
    $actual = if (Test-Path -LiteralPath $path -PathType Leaf) {
        (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
    }
    else {
        ''
    }
    Test-Stage1Condition ($actual -eq $entry.Value) "$($entry.Key) remains byte-for-byte unchanged"
}

$backupPath = Join-Path $workspaceRoot 'Backups\SqueezeRushIOS-Advanced-2.0.0-pre-stage1-20260803-215030.zip'
Test-Stage1Condition (Test-Path -LiteralPath $backupPath -PathType Leaf) 'Pre-Stage 1 ZIP backup exists outside the active project'

$protectedTrees = @(
    [pscustomobject]@{ Path = (Join-Path $workspaceRoot 'SqueezeRush'); ExpectedFiles = 9 },
    [pscustomobject]@{ Path = (Join-Path $workspaceRoot 'SqueezeRushIOS'); ExpectedFiles = 25 },
    [pscustomobject]@{ Path = (Join-Path $workspaceRoot 'Artifacts\iOS-Projects\SqueezeRush-iOS-Revision-2.0.0'); ExpectedFiles = 32 }
)
$stage1StartUtc = [datetime]::Parse('2026-08-04T01:50:30Z').ToUniversalTime()
foreach ($tree in $protectedTrees) {
    $files = @(Get-ChildItem -LiteralPath $tree.Path -Recurse -File)
    $latestWrite = $files | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
    Test-Stage1Condition ($files.Count -eq $tree.ExpectedFiles) "Protected tree file count is unchanged: $($tree.Path)"
    Test-Stage1Condition ($null -ne $latestWrite -and $latestWrite.LastWriteTimeUtc -lt $stage1StartUtc) "Protected tree contains no file written during Stage 1: $($tree.Path)"
}
$siblingGamePath = Join-Path $workspaceRoot 'SqueezeRush\game.js'
$siblingGameHash = (Get-FileHash -LiteralPath $siblingGamePath -Algorithm SHA256).Hash
Test-Stage1Condition ($siblingGameHash -eq '022D2B0DA412AFFE10D2960A357B615107A54912A65EEC31EB4686B0040BE257') 'Sibling SqueezeRush\game.js still matches its audited pre-Stage 1 SHA-256'

$indexPath = Join-Path $webRoot 'index.html'
$gamePath = Join-Path $webRoot 'game.js'
$lifecyclePath = Join-Path $webRoot 'run-lifecycle.js'
$index = Get-Content -Raw -LiteralPath $indexPath
$game = Get-Content -Raw -LiteralPath $gamePath
$lifecycle = Get-Content -Raw -LiteralPath $lifecyclePath

$idMatches = [regex]::Matches($index, '\bid\s*=\s*["'']([^"'']+)["'']')
$idGroups = $idMatches | ForEach-Object { $_.Groups[1].Value } | Group-Object
$duplicateIds = @($idGroups | Where-Object Count -gt 1 | ForEach-Object Name)
Test-Stage1Condition ($duplicateIds.Count -eq 0) 'Production index.html contains no duplicate DOM IDs'
if ($duplicateIds.Count -gt 0) {
    Write-Host ('      Duplicate IDs: ' + ($duplicateIds -join ', '))
}

$knownIds = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($match in $idMatches) { [void] $knownIds.Add($match.Groups[1].Value) }
$referencedIds = [regex]::Matches($game, 'document\.getElementById\(["'']([^"'']+)["'']\)') |
    ForEach-Object { $_.Groups[1].Value } |
    Sort-Object -Unique
$missingIds = @($referencedIds | Where-Object { -not $knownIds.Contains($_) })
Test-Stage1Condition ($missingIds.Count -eq 0) 'Every game.js getElementById reference exists in production index.html'
if ($missingIds.Count -gt 0) {
    Write-Host ('      Missing IDs: ' + ($missingIds -join ', '))
}

$lifecycleScriptIndex = $index.IndexOf('<script src="run-lifecycle.js"></script>', [StringComparison]::Ordinal)
$gameScriptIndex = $index.IndexOf('<script src="game.js"></script>', [StringComparison]::Ordinal)
Test-Stage1Condition ($lifecycleScriptIndex -ge 0 -and $gameScriptIndex -gt $lifecycleScriptIndex) 'run-lifecycle.js loads before game.js'

$requiredLifecycleFields = @(
    'runId', 'lifecyclePhase', 'resultSequence', 'runFinalized', 'finalizationReason',
    'accumulatedXpReward', 'accumulatedCoreReward', 'tokenRevivesUsed',
    'rewardedReviveUsed', 'rewardDoubleClaimed'
)
foreach ($field in $requiredLifecycleFields) {
    Test-Stage1Condition ($game.Contains($field) -and $lifecycle.Contains($field)) "Lifecycle field $field is wired through state and controller"
}

$requiredEvents = @('run_started', 'result_shown', 'run_revived', 'run_finalized', 'reward_changed')
foreach ($eventName in $requiredEvents) {
    Test-Stage1Condition $lifecycle.Contains("`"$eventName`"") "Lifecycle extension event $eventName exists"
}

$storageKeys = @(
    'squeezeRush.best.v1',
    'squeezeRush.modeBest.v1',
    'squeezeRush.career.v2',
    'squeezeRush.settings.v2'
)
foreach ($storageKey in $storageKeys) {
    Test-Stage1Condition $game.Contains("`"$storageKey`"") "Existing storage key $storageKey is preserved"
}

$localReferences = [regex]::Matches($index, '(?:src|href)=["'']([^"''#?]+)["'']') |
    ForEach-Object { $_.Groups[1].Value } |
    Where-Object { $_ -notmatch '^(?:[a-z]+:|//)' } |
    Sort-Object -Unique
$missingReferences = [System.Collections.Generic.List[string]]::new()
foreach ($reference in $localReferences) {
    $target = Join-Path $webRoot $reference
    if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
        $missingReferences.Add($reference)
    }
}
Test-Stage1Condition ($missingReferences.Count -eq 0) 'All local files referenced by production index.html exist'
if ($missingReferences.Count -gt 0) {
    Write-Host ('      Missing references: ' + ($missingReferences -join ', '))
}

$productionStage1Text = $index + "`n" + $game + "`n" + $lifecycle
$forbiddenMarkers = @(
    'GoogleMobileAds', 'GADInterstitial', 'StoreKit', 'SKPaymentQueue',
    'AppTrackingTransparency', 'ATTrackingManager', 'SKStoreReviewController',
    'FirebaseAnalytics', 'Loop Bloom', 'More Games'
)
foreach ($marker in $forbiddenMarkers) {
    Test-Stage1Condition (-not $productionStage1Text.Contains($marker)) "No Stage 2 marker '$marker' was added to production Web files"
}

$gitDirectory = Join-Path $projectRoot '.git'
$parentGitDirectory = Join-Path $workspaceRoot '.git'
Test-Stage1Condition (Test-Path -LiteralPath $gitDirectory -PathType Container) 'Git repository is initialized inside the active Xcode project'
Test-Stage1Condition (-not (Test-Path -LiteralPath $parentGitDirectory -PathType Container)) 'Stage 1 did not initialize Git at the workspace parent'

$changedPaths = @(
    (Join-Path $projectRoot 'SOURCE_OF_TRUTH.md'),
    $gamePath,
    $indexPath,
    $lifecyclePath,
    (Join-Path $projectRoot 'tools\stage1-lifecycle-tests.html'),
    (Join-Path $projectRoot 'tools\stage1-lifecycle-tests.js'),
    (Join-Path $projectRoot 'tools\Run-Stage1LifecycleTests.ps1'),
    (Join-Path $projectRoot 'tools\Test-Stage1Static.ps1'),
    (Join-Path $projectRoot 'STAGE_1_IMPLEMENTATION_REPORT.md'),
    (Join-Path $projectRoot 'STAGE_1_CHANGED_FILES.txt')
)
foreach ($path in $changedPaths) {
    Test-Stage1Condition (Test-Path -LiteralPath $path -PathType Leaf) "Expected Stage 1 file exists: $(Get-RelativeProjectPath $path)"
}

Write-Host ''
Write-Host "STATIC CHECK RESULT: $($passes.Count) passed, $($failures.Count) failed"
if ($failures.Count -gt 0) {
    exit 1
}
