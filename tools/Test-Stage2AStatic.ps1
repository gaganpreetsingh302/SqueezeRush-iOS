[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot '..')).Path
$failures = [System.Collections.Generic.List[string]]::new()
$passes = [System.Collections.Generic.List[string]]::new()

function Test-Stage2ACondition {
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

$controllerPath = Join-Path $projectRoot 'SqueezeRushIOS\GameViewController.swift'
$nativeBridgePath = Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushNativeBridge.swift'
$projectPath = Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\project.pbxproj'
$controller = Get-Content -Raw -LiteralPath $controllerPath
$nativeBridge = Get-Content -Raw -LiteralPath $nativeBridgePath
$project = Get-Content -Raw -LiteralPath $projectPath

Test-Stage2ACondition (-not $controller.Contains('contentController.add(self, name: "SqueezeRushIOS")')) `
    'A. GameViewController no longer registers itself directly as SqueezeRushIOS'

$proxyMatch = [regex]::Match(
    $controller,
    'private final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler \{(?<body>.*?)\r?\n\}\r?\n\r?\nfinal class GameViewController',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)
$proxyBody = $proxyMatch.Groups['body'].Value
Test-Stage2ACondition $proxyMatch.Success `
    'B. A dedicated forwarding proxy conforms to WKScriptMessageHandler'
Test-Stage2ACondition ([regex]::IsMatch($proxyBody, '\bweak\s+var\s+delegate:\s*WKScriptMessageHandler\?')) `
    'C. The forwarding proxy delegate is weak'

$forwardCount = ([regex]::Matches($proxyBody, 'delegate\?\.userContentController\s*\(')).Count
$independentBehaviorMarkers = @(
    'message.body', 'performHaptic', 'presentShareSheet', 'SqueezeRushNativeBridge',
    'callAsyncJavaScript', 'evaluateJavaScript', 'postMessage', 'switch ', 'guard ', ' if '
)
$independentBehavior = @($independentBehaviorMarkers | Where-Object { $proxyBody.Contains($_) })
Test-Stage2ACondition (
    $forwardCount -eq 1 -and
    $proxyBody.Contains('self.delegate = delegate') -and
    $independentBehavior.Count -eq 0
) 'D. The proxy only stores its weak delegate and forwards messages without bridge behavior'

$legacyRegistrationCount = ([regex]::Matches(
    $controller,
    'contentController\.add\(WeakScriptMessageHandler\(delegate:\s*self\),\s*name:\s*"SqueezeRushIOS"\)'
)).Count
Test-Stage2ACondition ($legacyRegistrationCount -eq 1) `
    'E. The weak proxy is registered exactly once under SqueezeRushIOS'

Test-Stage2ACondition (
    $controller -match 'let\s+nativeBridge\s*=\s*SqueezeRushNativeBridge\s*\(' -and
    $controller.Contains('nativeBridge.register(with: contentController)') -and
    $nativeBridge.Contains('static let messageHandlerName = "squeezeRushBridge"') -and
    $nativeBridge.Contains('userContentController.add(self, name: Self.messageHandlerName)')
) 'F. The typed bridge remains registered under squeezeRushBridge'

Test-Stage2ACondition (
    $controller.Contains('removeScriptMessageHandler(forName: "SqueezeRushIOS")') -and
    $controller.Contains('nativeBridge?.detach()') -and
    $nativeBridge.Contains('removeScriptMessageHandler(forName: Self.messageHandlerName)')
) 'G. Legacy and typed message-handler teardown paths remain present'

$swiftProduction = $controller + "`n" + $nativeBridge + "`n" + (Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS\AppDelegate.swift'))
Test-Stage2ACondition (-not $swiftProduction.Contains('as!')) `
    'H. No Swift force-cast was introduced'

$unchangedWebHashes = [ordered]@{
    'SqueezeRushIOS\Web\game.js' = 'E6318E1BF8D533B6AD6F02B9B053A730BD0FB598CD9F5053A16BBE9D25B9C973'
    'SqueezeRushIOS\Web\index.html' = '6785CE9289404B0F72681871C34C225364C07E431BA01411278D85C3FA24C39C'
    'SqueezeRushIOS\Web\native-bridge.js' = '4DD3FB2BC5B1A4A0349BAED9B1065E5F2CB1B833EE4ADE1EE9F10959D1092D50'
    'SqueezeRushIOS\Web\run-lifecycle.js' = 'F0EED9B5257260C09A81E54626E146950C202359405AE367FE6E1D3EB680910F'
    'SqueezeRushIOS\Web\styles.css' = 'AF2C5C55B050A7BA77139712F0D081A5967AD5E2DFBB97F6F5F8C3BFB635FB53'
}
$webHashesMatch = $true
foreach ($entry in $unchangedWebHashes.GetEnumerator()) {
    $actualHash = (Get-FileHash -LiteralPath (Join-Path $projectRoot $entry.Key) -Algorithm SHA256).Hash
    if ($actualHash -ne $entry.Value) {
        $webHashesMatch = $false
        Write-Host "Web hash mismatch: $($entry.Key)" -ForegroundColor Red
    }
}
Test-Stage2ACondition $webHashesMatch `
    'I. All five production Web files remain byte-identical to Stage 2'

Test-Stage2ACondition (
    -not $project.Contains('WeakScriptMessageHandler.swift') -and
    $project.Contains('SqueezeRushAdManager.swift') -and
    $project.Contains('SqueezeRushConsentManager.swift')
) 'J. The weak proxy remains inline; project changes are limited to later Stage 3 integration files'

$protectedTrees = @(
    [pscustomobject]@{ Path = (Join-Path $workspaceRoot 'SqueezeRush'); ExpectedFiles = 9 },
    [pscustomobject]@{ Path = (Join-Path $workspaceRoot 'SqueezeRushIOS'); ExpectedFiles = 25 },
    [pscustomobject]@{ Path = (Join-Path $workspaceRoot 'Artifacts\iOS-Projects\SqueezeRush-iOS-Revision-2.0.0'); ExpectedFiles = 32 }
)
$stage2StartUtc = [datetime]::Parse('2026-08-04T02:22:52Z').ToUniversalTime()
$protectedTreesMatch = $true
foreach ($tree in $protectedTrees) {
    $files = @(Get-ChildItem -LiteralPath $tree.Path -Recurse -File)
    $latestWrite = $files | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
    if ($files.Count -ne $tree.ExpectedFiles -or $null -eq $latestWrite -or $latestWrite.LastWriteTimeUtc -ge $stage2StartUtc) {
        $protectedTreesMatch = $false
        Write-Host "Protected tree changed: $($tree.Path)" -ForegroundColor Red
    }
}
$siblingGameHash = (Get-FileHash -LiteralPath (Join-Path $workspaceRoot 'SqueezeRush\game.js') -Algorithm SHA256).Hash
Test-Stage2ACondition (
    $protectedTreesMatch -and
    $siblingGameHash -eq '022D2B0DA412AFFE10D2960A357B615107A54912A65EEC31EB4686B0040BE257'
) 'K. Protected sibling and archive trees remain unchanged'

$productionText = $swiftProduction + "`n" + $project
$forbiddenMarkers = @(
    'import StoreKit', 'SKPaymentQueue', 'Product.products', 'Transaction.currentEntitlements',
    'AppTrackingTransparency', 'ATTrackingManager', 'NSUserTrackingUsageDescription',
    'SKStoreReviewController', 'requestReview(', 'FirebaseAnalytics', 'FirebaseCore',
    'Loop Bloom', 'LoopBloom', 'UIApplication.shared.open', 'window.open(',
    'XMLHttpRequest', 'WebSocket(', 'fetch(',
    'productIdentifier', 'adUnit'
)
$forbiddenFound = @($forbiddenMarkers | Where-Object { $productionText.Contains($_) })
Test-Stage2ACondition ($forbiddenFound.Count -eq 0) `
    'L. No purchase, ATT, analytics, review, More Games, arbitrary URL, or web-network feature was introduced'

$swiftCompiler = Get-Command swiftc -ErrorAction SilentlyContinue
if ($swiftCompiler) {
    $parseOutput = & $swiftCompiler.Source -frontend -parse `
        (Join-Path $projectRoot 'SqueezeRushIOS\AppDelegate.swift') `
        $controllerPath `
        $nativeBridgePath 2>&1 | Out-String
    $parseExitCode = $LASTEXITCODE
    Test-Stage2ACondition ($parseExitCode -eq 0) `
        'Swift source passes swiftc frontend syntax parsing'
    if ($parseExitCode -ne 0) {
        Write-Host $parseOutput
    }
}
else {
    Test-Stage2ACondition $false 'Swift compiler is available for syntax parsing'
}

Write-Host ''
Write-Host "STAGE 2A STATIC CHECK RESULT: $($passes.Count) passed, $($failures.Count) failed"
if ($failures.Count -gt 0) {
    exit 1
}
