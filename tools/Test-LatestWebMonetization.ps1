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
$project = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\project.pbxproj')

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
Test-Condition ($game.Contains('PURCHASE_BUY') -and $game.Contains('PURCHASE_RESTORE') -and $game.Contains('removeAdsPrice')) 'Latest menu is wired to StoreKit purchase, restore, and localized price capabilities'
Test-Condition ($lifecycle.Contains('lifecyclePhase !== PHASES.RESULT_PENDING') -and $lifecycle.Contains('state.rewardedReviveUsed = true')) 'Lifecycle rejects invalid rewarded-revive state transitions'
Test-Condition ($project.Contains('SQUEEZE_RUSH_REMOVE_ADS_PRODUCT_ID = "";') -and $project.Contains('SQUEEZE_RUSH_IAP_RELEASE_APPROVED = NO;')) 'Release IAP identifiers and approval remain intentionally blocked until App Store values are supplied'
Test-Condition ((Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\xcshareddata\xcschemes\SqueezeRushIOS.xcscheme')).Hash -eq 'B2C2E619120C04C6FEB6964E4DF27677681583D36FA29DBD26A4875C82111E7A') 'Protected production scheme remains byte-identical'

Write-Host ''
Write-Host "LATEST WEB MONETIZATION RESULT: $($passes.Count) passed, $($failures.Count) failed"
if ($failures.Count -gt 0) { exit 1 }
