[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot '..')).Path
$webRoot = Join-Path $projectRoot 'SqueezeRushIOS\Web'
$failures = [System.Collections.Generic.List[string]]::new()
$passes = [System.Collections.Generic.List[string]]::new()

function Test-Stage2Condition {
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

$unchangedHashes = [ordered]@{
    'SqueezeRushIOS\Web\run-lifecycle.js' = '6D0AF635A9C638183035E312BAE26E7076B1561635C649EB7F3266BE124C6397'
    'SqueezeRushIOS\Web\styles.css' = '7C3B6BAFF43C1ED04F631BA302A6F2902AF29FD715ABF1FAE9979E07BAD5D6CB'
    'SqueezeRushIOS\AppDelegate.swift' = '889597E22D37BC66E53B6B9FE9C061762E0DBDB0497D3128183FED1ACA926C88'
}
foreach ($entry in $unchangedHashes.GetEnumerator()) {
    $path = Join-Path $projectRoot $entry.Key
    $actual = if (Test-Path -LiteralPath $path -PathType Leaf) {
        (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
    } else { '' }
    Test-Stage2Condition ($actual -eq $entry.Value) "$($entry.Key) matches the audited Stage 4 controlled baseline"
}
$stage3Info = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS\Info.plist')
Test-Stage2Condition (
    $stage3Info.Contains('<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>') -and
    $stage3Info.Contains('<string>UIInterfaceOrientationPortrait</string>') -and
    $stage3Info.Contains('<key>GADApplicationIdentifier</key>')
) 'Info.plist preserves Stage 2 identity/orientation while adding audited Stage 3 configuration'

$backupPath = Join-Path $workspaceRoot 'Backups\SqueezeRushIOS-Advanced-2.0.0-pre-stage2-20260803-222252.zip'
$backupHash = if (Test-Path -LiteralPath $backupPath -PathType Leaf) {
    (Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash
} else { '' }
Test-Stage2Condition ($backupHash -eq '5980A0C5152C3EF18B32D6CC7D0F7D91C12A3207AF6B5CAB5B4B36FAB1B28FCD') 'Verified pre-Stage 2 backup exists outside the active project'

$protectedTrees = @(
    [pscustomobject]@{ Path = (Join-Path $workspaceRoot 'SqueezeRush'); ExpectedFiles = 9 },
    [pscustomobject]@{ Path = (Join-Path $workspaceRoot 'SqueezeRushIOS'); ExpectedFiles = 25 },
    [pscustomobject]@{ Path = (Join-Path $workspaceRoot 'Artifacts\iOS-Projects\SqueezeRush-iOS-Revision-2.0.0'); ExpectedFiles = 32 }
)
$stage2StartUtc = [datetime]::Parse('2026-08-04T02:22:52Z').ToUniversalTime()
foreach ($tree in $protectedTrees) {
    $files = @(Get-ChildItem -LiteralPath $tree.Path -Recurse -File)
    $latestWrite = $files | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
    Test-Stage2Condition ($files.Count -eq $tree.ExpectedFiles) "Protected tree file count is unchanged: $($tree.Path)"
    Test-Stage2Condition ($null -ne $latestWrite -and $latestWrite.LastWriteTimeUtc -lt $stage2StartUtc) "Protected tree contains no file written during Stage 2: $($tree.Path)"
}
$siblingGameHash = (Get-FileHash -LiteralPath (Join-Path $workspaceRoot 'SqueezeRush\game.js') -Algorithm SHA256).Hash
Test-Stage2Condition ($siblingGameHash -eq '022D2B0DA412AFFE10D2960A357B615107A54912A65EEC31EB4686B0040BE257') 'Sibling SqueezeRush\game.js still matches its audited protected SHA-256'

$indexPath = Join-Path $webRoot 'index.html'
$gamePath = Join-Path $webRoot 'game.js'
$bridgePath = Join-Path $webRoot 'native-bridge.js'
$swiftBridgePath = Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushNativeBridge.swift'
$controllerPath = Join-Path $projectRoot 'SqueezeRushIOS\GameViewController.swift'
$projectPath = Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\project.pbxproj'
$index = Get-Content -Raw -LiteralPath $indexPath
$game = Get-Content -Raw -LiteralPath $gamePath
$bridge = Get-Content -Raw -LiteralPath $bridgePath
$swiftBridge = Get-Content -Raw -LiteralPath $swiftBridgePath
$controller = Get-Content -Raw -LiteralPath $controllerPath
$project = Get-Content -Raw -LiteralPath $projectPath

$idMatches = [regex]::Matches($index, '\bid\s*=\s*["'']([^"'']+)["'']')
$duplicateIds = @($idMatches | ForEach-Object { $_.Groups[1].Value } | Group-Object | Where-Object Count -gt 1)
Test-Stage2Condition ($duplicateIds.Count -eq 0) 'Production index.html contains no duplicate DOM IDs'

$knownIds = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($match in $idMatches) { [void] $knownIds.Add($match.Groups[1].Value) }
$referencedIds = [regex]::Matches($game, 'document\.getElementById\(["'']([^"'']+)["'']\)') |
    ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
$missingIds = @($referencedIds | Where-Object { -not $knownIds.Contains($_) })
Test-Stage2Condition ($missingIds.Count -eq 0) 'Every game.js getElementById reference exists in production index.html'

$runLifecycleIndex = $index.IndexOf('<script src="run-lifecycle.js"></script>', [StringComparison]::Ordinal)
$nativeBridgeIndex = $index.IndexOf('<script src="native-bridge.js"></script>', [StringComparison]::Ordinal)
$gameScriptIndex = $index.IndexOf('<script src="game.js"></script>', [StringComparison]::Ordinal)
Test-Stage2Condition ($runLifecycleIndex -ge 0 -and $nativeBridgeIndex -gt $runLifecycleIndex -and $gameScriptIndex -gt $nativeBridgeIndex) 'Production scripts load run-lifecycle.js, native-bridge.js, then game.js'

$localReferences = [regex]::Matches($index, '(?:src|href)=["'']([^"''#?]+)["'']') |
    ForEach-Object { $_.Groups[1].Value } |
    Where-Object { $_ -notmatch '^(?:[a-z]+:|//)' } |
    Sort-Object -Unique
$missingReferences = @($localReferences | Where-Object { -not (Test-Path -LiteralPath (Join-Path $webRoot $_) -PathType Leaf) })
Test-Stage2Condition ($missingReferences.Count -eq 0) 'All local files referenced by production index.html exist'

$expectedActions = @(
    'bridge.capabilities', 'haptic.perform', 'share.present', 'rewarded.show',
    'interstitial.show', 'purchase.buy', 'purchase.restore', 'entitlements.refresh',
    'review.request', 'moreGames.open', 'analytics.track', 'consent.status'
) | Sort-Object
$javascriptActionBlock = [regex]::Match($bridge, 'const ACTIONS = Object\.freeze\(\{(?<body>.*?)\}\);', 'Singleline').Groups['body'].Value
$javascriptActions = @([regex]::Matches($javascriptActionBlock, ':\s*"([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Sort-Object)
$swiftActionBlock = [regex]::Match($swiftBridge, 'enum SqueezeRushBridgeAction:.*?\{(?<body>.*?)\n\}', 'Singleline').Groups['body'].Value
$swiftActions = @([regex]::Matches($swiftActionBlock, 'case\s+\w+\s*=\s*"([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Sort-Object)
Test-Stage2Condition (($javascriptActions -join '|') -eq ($expectedActions -join '|')) 'JavaScript action allowlist exactly matches protocol version 1'
Test-Stage2Condition (($swiftActions -join '|') -eq ($expectedActions -join '|')) 'Swift action allowlist exactly matches protocol version 1'
Test-Stage2Condition (($javascriptActions -join '|') -eq ($swiftActions -join '|')) 'JavaScript and Swift action allowlists are identical'

$expectedStatuses = @('success', 'unavailable', 'cancelled', 'failed', 'invalid_request', 'stale', 'timeout')
foreach ($status in $expectedStatuses) {
    Test-Stage2Condition ($bridge.Contains("`"$status`"") -and $swiftBridge.Contains($status)) "Bridge status $status exists in JavaScript and Swift"
}

$requiredStorageKeys = @(
    'squeezeRush.best.v1', 'squeezeRush.modeBest.v1',
    'squeezeRush.career.v2', 'squeezeRush.settings.v2'
)
foreach ($key in $requiredStorageKeys) {
    Test-Stage2Condition $game.Contains("`"$key`"") "Existing localStorage key $key remains unchanged"
}
Test-Stage2Condition (-not $bridge.Contains('localStorage')) 'native-bridge.js stores no request or capability state in localStorage'

Test-Stage2Condition $bridge.Contains('const pendingRequests = new Map()') 'JavaScript bridge uses an in-memory pending-request registry'
Test-Stage2Condition ($bridge.Contains('pagehide') -and $bridge.Contains('beforeunload') -and $bridge.Contains('cancelPending')) 'JavaScript bridge settles pending requests during page teardown'
Test-Stage2Condition ($bridge.Contains('window.SqueezeRushNative.__receive(response)') -eq $false) 'JavaScript transport does not dynamically execute the native receiver string'
Test-Stage2Condition ($swiftBridge.Contains('private static let receiverScript = "window.SqueezeRushNative.__receive(response)"')) 'Swift uses one fixed JavaScript response receiver'
Test-Stage2Condition ($swiftBridge.Contains('callAsyncJavaScript') -and $swiftBridge.Contains('arguments: ["response": response]')) 'Swift passes response data as a structured callAsyncJavaScript argument'
Test-Stage2Condition (-not $swiftBridge.Contains('evaluateJavaScript')) 'Swift bridge does not use interpolated evaluateJavaScript callbacks'
Test-Stage2Condition (-not $game.Contains('__receive(')) 'Application game code never calls the fixed native receiver directly'
Test-Stage2Condition ($bridge.Contains('Object.freeze') -and $bridge.Contains('Object.defineProperty(root, "SqueezeRushNative"')) 'Public JavaScript bridge surface is frozen and non-writable'
Test-Stage2Condition ($bridge.Contains('url.hostname === "localhost"') -and $bridge.Contains('url.hostname === "127.0.0.1"') -and $bridge.Contains('nativeBridgeMock')) 'Mock activation is guarded by exact localhost hostnames and explicit query value'
Test-Stage2Condition ($bridge.Contains('SqueezeRushLifecycle') -and $bridge.Contains('resultSequence') -and $bridge.Contains('stale_lifecycle_context')) 'JavaScript bridge enforces lifecycle stale-response handling'

Test-Stage2Condition ($controller.Contains('window.SqueezeRushIOS') -and $controller.Contains('name: "SqueezeRushIOS"')) 'Legacy SqueezeRushIOS share/haptic wrapper remains available'
Test-Stage2Condition (
    $controller.Contains('SqueezeRushNativeBridge(') -and
    $controller.Contains('presentationOwner: self') -and
    $controller.Contains('nativeBridge.register')
) 'GameViewController registers the typed bridge'
Test-Stage2Condition ($controller.Contains('nativeBridge?.detach()')) 'GameViewController tears down the typed bridge handler'
Test-Stage2Condition ($game.Contains('SqueezeRushNative?.isNativeAvailable()') -and $game.Contains('share.present') -and $game.Contains('haptic.perform')) 'Game prefers the typed bridge for share and haptics'
Test-Stage2Condition ($game.Contains('SqueezeRushIOS?.share') -and $game.Contains('SqueezeRushIOS?.haptic')) 'Game retains the legacy iOS share/haptic fallback'

$swiftFileReferenceCount = ([regex]::Matches($project, 'SqueezeRushNativeBridge\.swift \*/ = \{isa = PBXFileReference;')).Count
$swiftBuildFileCount = ([regex]::Matches($project, 'SqueezeRushNativeBridge\.swift in Sources \*/ = \{isa = PBXBuildFile;')).Count
$swiftSourcesEntryCount = ([regex]::Matches($project, '/\* SqueezeRushNativeBridge\.swift in Sources \*/,')).Count
Test-Stage2Condition ($swiftFileReferenceCount -eq 1 -and $swiftBuildFileCount -eq 1 -and $swiftSourcesEntryCount -eq 1) 'New Swift bridge file is referenced exactly once and included in the Sources phase'
Test-Stage2Condition (([regex]::Matches($project, 'IPHONEOS_DEPLOYMENT_TARGET = 15\.0;')).Count -eq 4) 'iOS 15.0 deployment target remains unchanged in every configuration'
Test-Stage2Condition (-not $swiftBridge.Contains('as!')) 'Swift bridge contains no force-cast of untrusted input'
Test-Stage2Condition ($swiftBridge.Contains('message.body') -and $swiftBridge.Contains('as? [String: Any]')) 'Swift validates the bridge message body as an optional dictionary cast'
Test-Stage2Condition ($swiftBridge.Contains('shareRequestId') -and $swiftBridge.Contains('share_already_presented')) 'Swift bridge prevents overlapping share presentations'
Test-Stage2Condition ($swiftBridge.Contains('weak var presentationOwner') -and $swiftBridge.Contains('weak var webView')) 'Swift bridge keeps presentation owner and WKWebView weakly'
Test-Stage2Condition ($swiftBridge.Contains('#if DEBUG') -and $swiftBridge.Contains('#endif')) 'Detailed Swift bridge logging is DEBUG-only'

$productionText = $index + "`n" + $game + "`n" + $bridge + "`n" + $controller + "`n" + $swiftBridge + "`n" + $project
$forbiddenMarkers = @(
    'GoogleMobileAds', 'GADInterstitial', 'GADRewarded', 'AdMob', 'ca-app-pub', 'UMPConsent',
    'import StoreKit', 'SKPaymentQueue', 'Product.products', 'Transaction.currentEntitlements',
    'AppTrackingTransparency', 'ATTrackingManager', 'NSUserTrackingUsageDescription',
    'SKStoreReviewController', 'requestReview(', 'FirebaseAnalytics', 'FirebaseCore',
    'Loop Bloom', 'LoopBloom', 'UIApplication.shared.open', 'window.open(',
    'XMLHttpRequest', 'WebSocket(', 'fetch(', 'http://', 'https://'
)
foreach ($marker in $forbiddenMarkers) {
    $condition = switch ($marker) {
        'GoogleMobileAds' {
            $project.Contains('repositoryURL = "https://github.com/googleads/swift-package-manager-google-mobile-ads.git";') -and
                $project.Contains('version = 13.7.0;')
        }
        'AdMob' {
            $project.Contains('ValidateAdMobReleaseConfiguration.sh') -and
                $project.Contains('SQUEEZE_RUSH_ADS_RELEASE_APPROVED = NO;')
        }
        'ca-app-pub' {
            ([regex]::Matches($project, 'ca-app-pub-3940256099942544')).Count -eq 3
        }
        'https://' {
            -not (($index + "`n" + $game + "`n" + $bridge + "`n" + $controller + "`n" + $swiftBridge).Contains('https://')) -and
                $project.Contains('https://github.com/googleads/swift-package-manager-google-mobile-ads.git')
        }
        default { -not $productionText.Contains($marker) }
    }
    Test-Stage2Condition $condition "Stage 2 boundary remains compatible with controlled Stage 3 marker: $marker"
}
Test-Stage2Condition (-not $productionText.Contains('productIdentifier')) 'No purchase product identifier was added'
Test-Stage2Condition (
    ([regex]::Matches($project, 'ca-app-pub-[0-9]+[/~][0-9]+') | ForEach-Object { $_.Value } | Sort-Object -Unique).Count -eq 3 -and
    ([regex]::Matches($project, 'ca-app-pub-(?!3940256099942544)[0-9]+')).Count -eq 0
) 'No production ad-unit identifier was added'
Test-Stage2Condition (-not $javascriptActions.Contains('url.open')) 'No general-purpose open URL action exists'

$swiftCompiler = Get-Command swiftc -ErrorAction SilentlyContinue
if ($swiftCompiler) {
    $parseOutput = & $swiftCompiler.Source -frontend -parse `
        (Join-Path $projectRoot 'SqueezeRushIOS\AppDelegate.swift') `
        $controllerPath `
        $swiftBridgePath 2>&1 | Out-String
    $parseExitCode = $LASTEXITCODE
    Test-Stage2Condition ($parseExitCode -eq 0) 'All Swift source passes swiftc frontend syntax parsing'
    if ($parseExitCode -ne 0) { Write-Host $parseOutput }
}
else {
    Test-Stage2Condition $false 'Swift compiler is available for syntax parsing'
}

$expectedFiles = @(
    'SqueezeRushIOS\Web\native-bridge.js',
    'SqueezeRushIOS\SqueezeRushNativeBridge.swift',
    'tools\stage2-bridge-tests.html',
    'tools\stage2-bridge-tests.js',
    'tools\stage2-file-mock-probe.html',
    'tools\Run-Stage2BridgeTests.ps1',
    'tools\Test-Stage2Static.ps1',
    'tools\New-Stage2ReviewBundle.ps1',
    'NATIVE_BRIDGE_PROTOCOL.md',
    'STAGE_2_IMPLEMENTATION_REPORT.md',
    'STAGE_2_CHANGED_FILES.txt'
)
foreach ($relative in $expectedFiles) {
    $path = Join-Path $projectRoot $relative
    Test-Stage2Condition (Test-Path -LiteralPath $path -PathType Leaf) "Expected Stage 2 file exists: $(Get-RelativeProjectPath $path)"
}

Write-Host ''
Write-Host "STAGE 2 STATIC CHECK RESULT: $($passes.Count) passed, $($failures.Count) failed"
if ($failures.Count -gt 0) { exit 1 }
