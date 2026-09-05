[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot '..')).Path
$canonicalRoot = Join-Path $workspaceRoot 'SqueezeRush'
$webRoot = Join-Path $projectRoot 'SqueezeRushIOS\Web'
$passes = [Collections.Generic.List[string]]::new()
$failures = [Collections.Generic.List[string]]::new()

function Test-Condition {
    param([Parameter(Mandatory)] [bool] $Condition, [Parameter(Mandatory)] [string] $Message)
    if ($Condition) {
        $script:passes.Add($Message)
        Write-Host "PASS: $Message"
    }
    else {
        $script:failures.Add($Message)
        Write-Host "FAIL: $Message" -ForegroundColor Red
    }
}

$index = Get-Content -Raw -LiteralPath (Join-Path $webRoot 'index.html')
$game = Get-Content -Raw -LiteralPath (Join-Path $webRoot 'game.js')
$styles = Get-Content -Raw -LiteralPath (Join-Path $webRoot 'styles.css')
$bridge = Get-Content -Raw -LiteralPath (Join-Path $webRoot 'native-bridge.js')
$lifecycle = Get-Content -Raw -LiteralPath (Join-Path $webRoot 'run-lifecycle.js')
$swiftBridge = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushNativeBridge.swift')
$adFlow = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushAdFlowState.swift')
$controller = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS\GameViewController.swift')
$purchase = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushPurchaseManager.swift')
$project = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\project.pbxproj')
$infoPlist = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS\Info.plist')

Test-Condition ($index.Contains('id="campaignLadder"') -and $game.Contains('campaignLevelNames') -and $game.Contains('Crawler King') -and $game.Contains('campaignChallenges')) 'iOS Web bundle contains the latest 25-level campaign source'
Test-Condition ($game.Contains('assets/crawlers/goblin-front-running.png') -and (Test-Path -LiteralPath (Join-Path $webRoot 'assets\social\squeeze-rush-share.png'))) 'Latest crawler and social assets are bundled for iOS'

$assetMatches = $true
foreach ($relativePath in @(
    'assets\crawlers\goblin-front-running.png',
    'assets\crawlers\CRAFTPIX-LICENSE.txt',
    'assets\social\squeeze-rush-share.png'
)) {
    $canonicalHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $canonicalRoot $relativePath)).Hash
    $iosHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $webRoot $relativePath)).Hash
    if ($canonicalHash -ne $iosHash) { $assetMatches = $false }
}
Test-Condition $assetMatches 'Bundled iOS media assets match the canonical web game byte-for-byte'

$lifecyclePosition = $index.IndexOf('src="run-lifecycle.js')
$bridgePosition = $index.IndexOf('src="native-bridge.js')
$gamePosition = $index.IndexOf('src="game.js')
Test-Condition ($lifecyclePosition -ge 0 -and $lifecyclePosition -lt $bridgePosition -and $bridgePosition -lt $gamePosition) 'Lifecycle and native bridge load before the latest game code'
Test-Condition ($index.Contains('id="removeAdsBtn"') -and $index.Contains('id="restorePurchasesBtn"') -and $index.Contains('id="privacyOptionsBtn"')) 'Latest menu exposes Remove Ads, Restore Purchase, and Privacy Choices'
Test-Condition ($index.Contains('id="rewardedReviveBtn"') -and $styles.Contains('button.rewarded-revive')) 'Latest result screen exposes an optional rewarded revive control'
Test-Condition ($game.Contains('createController(state') -and $game.Contains('runLifecycle.beginResult') -and $game.Contains('runLifecycle.reviveWithRewarded')) 'Latest campaign is reconnected to the protected run lifecycle'
Test-Condition ($game.Contains('response.data.earned === true') -and $game.Contains('response.data.placement === "revive"') -and $game.Contains('contextMatches')) 'Rewarded revive requires a verified earned response for the same result'
Test-Condition ($game.Contains('finalizedRunsSinceInterstitial < 3') -and $game.Contains('capabilities.removeAdsEntitled !== true') -and $game.Contains('{ placement: "run_end" }')) 'Run-end interstitial cadence is gated by readiness, consent, and Remove Ads entitlement'
Test-Condition ($bridge.Contains('interstitial.show requires placement run_end') -and $adFlow.Contains('case runEnd = "run_end"') -and $swiftBridge.Contains('presentInterstitial(placement:')) 'JavaScript and Swift agree on the run_end interstitial contract'
Test-Condition ($game.Contains('PURCHASE_BUY') -and $game.Contains('PURCHASE_RESTORE') -and $swiftBridge.Contains('"removeAdsPrice"') -and $swiftBridge.Contains('"removeAdsCurrencyCode"')) 'Latest menu is wired to StoreKit purchase, restore, localized price, and currency capabilities'
Test-Condition ($game.Contains('removeAdsReadyLabel(capabilities)') -and $game.Contains('/^[A-Z]{3}$/') -and $game.Contains('${currencyCode ? ` ${currencyCode}` : ""}')) 'Ready Remove Ads control renders a bounded ISO currency code beside the localized StoreKit price'
Test-Condition ($game.Contains('Remove Ads — Loading…') -and $game.Contains('scheduleMonetizationRefresh()') -and $game.Contains('Remove Ads — Retry') -and $game.Contains('purchaseCatalogFailureMessage(capabilities)')) 'Remove Ads remains visible, refreshes while StoreKit loads, and offers a diagnostic retry state'
Test-Condition ($game.Contains('Remove Ads — Connecting…') -and $game.Contains('Ads Removed ✓') -and $game.Contains('removeAdsBtn.classList.toggle("hidden", !showPurchaseSurface)')) 'iOS keeps an explicit Remove Ads state visible through bridge failures and existing entitlements'
Test-Condition ($index.Contains('game.js?v=2026-09-05-build-19') -and $index.Contains('styles.css?v=2026-09-05-build-19') -and $index.IndexOf('id="monetizationActions"') -lt $index.IndexOf('class="mode-grid"')) 'TestFlight loads build 19 responsive purchase UI and places monetization before the game modes'
$purchaseStartPosition = $controller.IndexOf('purchaseManager.start()', [StringComparison]::Ordinal)
$gameLoadPosition = $controller.IndexOf('loadGame(in: webView)', [StringComparison]::Ordinal)
Test-Condition ($purchaseStartPosition -ge 0 -and $purchaseStartPosition -lt $gameLoadPosition) 'StoreKit product loading starts before the bundled game is loaded'
Test-Condition ($controller.Contains('URLQueryItem(name: "appBuild"') -and $controller.Contains('CFBundleShortVersionString') -and $controller.Contains('CFBundleVersion') -and $controller.Contains('loadFileURL(versionedIndexURL')) 'Each TestFlight build loads a versioned bundled page URL instead of a stale WebKit cache entry'
Test-Condition ($lifecycle.Contains('lifecyclePhase !== PHASES.RESULT_PENDING') -and $lifecycle.Contains('state.rewardedReviveUsed = true')) 'Lifecycle rejects invalid rewarded-revive state transitions'
Test-Condition ($project.Contains('SQUEEZE_RUSH_REMOVE_ADS_PRODUCT_ID = com.kasiga.squeezerush.remove_ads;') -and $project.Contains('SQUEEZE_RUSH_IAP_RELEASE_APPROVED = YES;')) 'Release uses the submitted Remove Ads product identifier and explicit IAP approval'
Test-Condition ($project.Contains('com.apple.InAppPurchase = {') -and $project.Contains('enabled = 1;')) 'Xcode target explicitly declares the In-App Purchase capability'
Test-Condition ($project.Contains('ADMOB_APP_ID = "$(SQUEEZE_RUSH_ADMOB_APP_ID_RELEASE)";') -and $project.Contains('ADMOB_REWARDED_AD_UNIT_ID = "$(SQUEEZE_RUSH_ADMOB_REWARDED_AD_UNIT_ID_RELEASE)";') -and $project.Contains('ADMOB_INTERSTITIAL_AD_UNIT_ID = "$(SQUEEZE_RUSH_ADMOB_INTERSTITIAL_AD_UNIT_ID_RELEASE)";')) 'Release obtains production AdMob identifiers from Xcode Cloud environment settings'
Test-Condition (([regex]::Matches($project, 'SQUEEZE_RUSH_ADS_RELEASE_APPROVED = YES;')).Count -eq 1) 'Release advertising has explicit production-build approval'
Test-Condition (([regex]::Matches($project, 'CURRENT_PROJECT_VERSION = 19;')).Count -eq 2 -and ([regex]::Matches($project, 'MARKETING_VERSION = 3\.0\.0;')).Count -eq 2) 'Debug and Release identify App Store version 3.0.0 build 19'
Test-Condition ($purchase.Contains('startupProductRetryDelaysNanoseconds') -and $purchase.Contains('purchaseProductRetryDelaysNanoseconds') -and $purchase.Contains('loadProductWithRetry') -and $purchase.Contains('Storefront.updates') -and $purchase.Contains('refreshStorefrontDiagnostics()')) 'StoreKit retries product loading and refreshes storefront diagnostics independently'
Test-Condition ($swiftBridge.Contains('purchaseService?.prepareProducts()') -and $controller.Contains('UIApplication.didBecomeActiveNotification')) 'Capability and foreground events actively restart StoreKit catalog loading'
Test-Condition ($purchase.Contains('productRequestTimeoutNanoseconds') -and $purchase.Contains('productsWithTimeout(for:') -and $purchase.Contains('"catalog_timeout"')) 'Build 16 bounds StoreKit product requests with an explicit timeout'
Test-Condition ($swiftBridge.Contains('"purchaseCatalogState"') -and $swiftBridge.Contains('"purchaseDiagnosticCode"') -and $purchase.Contains('"catalog_loading"') -and $game.Contains('response.error?.code')) 'Build 16 preserves native StoreKit diagnostics through the purchase response'
Test-Condition ($swiftBridge.Contains('import CoreFoundation') -and $swiftBridge.Contains('CFGetTypeID(number) != CFBooleanGetTypeID()') -and -not $swiftBridge.Contains('if value is Bool')) 'Build 17 accepts JavaScript protocol numbers without misclassifying NSNumber one as Boolean'
Test-Condition ($infoPlist.Contains('<string>$(MARKETING_VERSION)</string>') -and $infoPlist.Contains('<string>$(CURRENT_PROJECT_VERSION)</string>')) 'Info.plist obtains the app version and build number from Xcode build settings'
Test-Condition ((Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\xcshareddata\xcschemes\SqueezeRushIOS.xcscheme')).Hash -eq 'B2C2E619120C04C6FEB6964E4DF27677681583D36FA29DBD26A4875C82111E7A') 'Protected production scheme remains byte-identical'

Write-Host ''
Write-Host "LATEST WEB MONETIZATION RESULT: $($passes.Count) passed, $($failures.Count) failed"
if ($failures.Count -gt 0) { exit 1 }
