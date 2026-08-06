[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot '..')).Path
$webRoot = Join-Path $projectRoot 'SqueezeRushIOS\Web'
$passes = [System.Collections.Generic.List[string]]::new()
$failures = [System.Collections.Generic.List[string]]::new()

function Test-Stage4Condition {
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

$gamePath = Join-Path $webRoot 'game.js'
$indexPath = Join-Path $webRoot 'index.html'
$bridgePath = Join-Path $webRoot 'native-bridge.js'
$lifecyclePath = Join-Path $webRoot 'run-lifecycle.js'
$stylesPath = Join-Path $webRoot 'styles.css'
$projectPath = Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\project.pbxproj'
$guardPath = Join-Path $projectRoot 'SqueezeRushIOS\BuildScripts\ValidateAdMobReleaseConfiguration.sh'
$packagePath = Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\project.xcworkspace\xcshareddata\swiftpm\Package.resolved'

$game = Get-Content -Raw -LiteralPath $gamePath
$index = Get-Content -Raw -LiteralPath $indexPath
$bridge = Get-Content -Raw -LiteralPath $bridgePath
$lifecycle = Get-Content -Raw -LiteralPath $lifecyclePath
$styles = Get-Content -Raw -LiteralPath $stylesPath
$project = Get-Content -Raw -LiteralPath $projectPath
$allSwift = (Get-ChildItem -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS') -Filter '*.swift' -File |
    ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName }) -join "`n"

$rewardedButtonCount = ([regex]::Matches($index, '\bid=["'']rewardedReviveBtn["'']')).Count
Test-Stage4Condition ($rewardedButtonCount -eq 1 -and $index.Contains('Watch Ad to Revive')) `
    'Rewarded revive has one dedicated DOM control with the bounded Stage 4 label'
Test-Stage4Condition ($index.Contains('id="reviveBtn" class="primary hidden">Revive</button>')) `
    'Existing token-revive control and label remain intact'
Test-Stage4Condition ($game.Contains('document.getElementById("rewardedReviveBtn")') -and
    $game.Contains('rewardedReviveBtn.addEventListener("click", requestRewardedRevive)')) `
    'Rewarded button is wired to one explicit request handler'
Test-Stage4Condition ($styles.Contains('button.rewarded-revive') -and $styles.Contains('button:disabled')) `
    'Rewarded control has portrait-compatible styling and disabled feedback'

$requestStart = $game.IndexOf('async function requestRewardedRevive()', [StringComparison]::Ordinal)
$requestEnd = $game.IndexOf('function settleRewardedReviveRequest', $requestStart, [StringComparison]::Ordinal)
$requestBody = $game.Substring($requestStart, $requestEnd - $requestStart)
$settleStart = $requestEnd
$settleEnd = $game.IndexOf('function restoreResultControlsAfterRewardedFailure', $settleStart, [StringComparison]::Ordinal)
$settleBody = $game.Substring($settleStart, $settleEnd - $settleStart)
$eligibilityStart = $game.IndexOf('function isRewardedReviveProductEligible', [StringComparison]::Ordinal)
$eligibilityEnd = $game.IndexOf('function setResultControlsDisabled', $eligibilityStart, [StringComparison]::Ordinal)
$eligibilityBody = $game.Substring($eligibilityStart, $eligibilityEnd - $eligibilityStart)
$capabilityStart = $game.IndexOf('async function refreshRewardedReviveOffer', [StringComparison]::Ordinal)
$capabilityEnd = $requestStart
$capabilityBody = $game.Substring($capabilityStart, $capabilityEnd - $capabilityStart)

Test-Stage4Condition ($requestBody.Contains('window.SqueezeRushNative.actions.REWARDED_SHOW') -and
    ([regex]::Matches($requestBody, '\{\s*placement:\s*"revive"\s*\}')).Count -eq 1) `
    'Gameplay sends exact rewarded.show placement revive payload'
Test-Stage4Condition ($requestBody.Contains('activeRewardedReviveRequest') -and
    $requestBody.Contains('setResultControlsDisabled(true)') -and
    $requestBody.Contains('Loading Ad...')) `
    'Rewarded request atomically locks duplicate and conflicting UI actions'
Test-Stage4Condition ($settleBody.Contains('activeRewardedReviveRequest !== request')) `
    'Only the active rewarded request may settle gameplay'
Test-Stage4Condition ($settleBody.Contains('response.status === "success"') -and
    $settleBody.Contains('response.data.earned === true') -and
    $settleBody.Contains('response.data.placement === "revive"')) `
    'Verified revive requires success, earned true, and exact revive placement'
Test-Stage4Condition ($settleBody.Contains('response.context.runId === request.runId') -and
    $settleBody.Contains('response.context.resultSequence === request.resultSequence') -and
    $settleBody.Contains('response.context.lifecyclePhase === runLifecycle.phases.RESULT_PENDING')) `
    'Application verifies the exact run, result sequence, and pending phase'
Test-Stage4Condition ($settleBody.Contains('isSamePendingResult(request)') -and
    $settleBody.Contains('runLifecycle.reviveWithRewarded(request.resultSequence)')) `
    'Lifecycle is rechecked immediately before the atomic rewarded claim'
Test-Stage4Condition (-not [regex]::IsMatch($settleBody, 'status\s*===\s*"success"\s*\)\s*\{\s*continueRunAfterRevive')) `
    'Status success alone cannot resume gameplay'
Test-Stage4Condition (-not [regex]::IsMatch($settleBody, 'career\.|runReward|accumulated|awardRunProgress|recordRewardDelta')) `
    'Rewarded callback directly modifies no XP, Core, career, or award field'

$rewardedLifecycleStart = $lifecycle.IndexOf('function reviveWithRewarded', [StringComparison]::Ordinal)
$rewardedLifecycleEnd = $lifecycle.IndexOf('function claimResultAction', $rewardedLifecycleStart, [StringComparison]::Ordinal)
$rewardedLifecycleBody = $lifecycle.Substring($rewardedLifecycleStart, $rewardedLifecycleEnd - $rewardedLifecycleStart)
$tokenLifecycleStart = $lifecycle.IndexOf('function reviveWithToken', [StringComparison]::Ordinal)
$tokenLifecycleEnd = $rewardedLifecycleStart
$tokenLifecycleBody = $lifecycle.Substring($tokenLifecycleStart, $tokenLifecycleEnd - $tokenLifecycleStart)
Test-Stage4Condition ($rewardedLifecycleBody.Contains('state.rewardedReviveUsed') -and
    $rewardedLifecycleBody.Contains('state.rewardedReviveUsed = true')) `
    'Lifecycle permits no more than one rewarded revive per run'
Test-Stage4Condition (-not $rewardedLifecycleBody.Contains('state.revives -=') -and
    -not $rewardedLifecycleBody.Contains('tokenRevivesUsed')) `
    'Rewarded revive consumes no token and increments no token counter'
Test-Stage4Condition ($rewardedLifecycleBody.Contains('source: "rewarded"') -and
    $tokenLifecycleBody.Contains('source: "token"')) `
    'Rewarded and token revive events retain distinct bounded sources'
Test-Stage4Condition ($tokenLifecycleBody.Contains('state.revives -= 1') -and
    $tokenLifecycleBody.Contains('state.tokenRevivesUsed += 1')) `
    'Existing token-revive consumption remains unchanged'
Test-Stage4Condition (([regex]::Matches($game, 'continueRunAfterRevive\(\)')).Count -eq 3 -and
    $game.Contains('function continueRunAfterRevive()')) `
    'Token and rewarded paths share one continuation implementation'
Test-Stage4Condition ($game.Contains('player.pressure = 0;') -and
    $game.Contains('player.squeeze = 0;') -and $game.Contains('player.invulnerable = 2.2;')) `
    'Shared continuation preserves pressure reset and revive invulnerability'

Test-Stage4Condition ($eligibilityBody.Contains('runLifecycle.phases.RESULT_PENDING') -and
    $eligibilityBody.Contains('!snapshot.runFinalized') -and $eligibilityBody.Contains('isDeathResult(state.pendingReason)')) `
    'Eligibility requires an unfinalized pending genuine-death result'
Test-Stage4Condition ($eligibilityBody.Contains('modeAllowsRevive()') -and
    $game.Contains('return reason === "popped" || reason === "smashed";')) `
    'Eligibility preserves existing mode rules and excludes Sprint time-up'
Test-Stage4Condition ($eligibilityBody.Contains('state.revives <= 0') -and
    $eligibilityBody.Contains('!snapshot.rewardedReviveUsed') -and
    $eligibilityBody.Contains('!activeRewardedReviveRequest')) `
    'Eligibility excludes token availability, prior use, and pending requests'
Test-Stage4Condition ($capabilityBody.Contains('getCapabilities({ refresh: true, timeoutMs: 5000 })')) `
    'Each eligible result refreshes capabilities once without polling'
foreach ($field in @('nativeBridge', 'rewardedAds', 'canRequestAds', 'rewardedAdReady')) {
    Test-Stage4Condition ($capabilityBody.Contains("capabilities.$field === true")) `
        "Rewarded offer requires capability field $field"
}

Test-Stage4Condition ($bridge.Contains('payload.placement !== "revive"') -and
    $bridge.Contains('rewarded.show requires placement revive during Stage 4')) `
    'JavaScript bridge allowlists only revive placement for rewarded.show'
Test-Stage4Condition ($bridge.Contains('context.lifecyclePhase !== "result_pending"') -and
    $bridge.Contains('!context.runId') -and $bridge.Contains('context.resultSequence === null')) `
    'Bridge rejects rewarded requests without a pending run and result sequence'
Test-Stage4Condition ($bridge.Contains('requestContext.lifecyclePhase !== responseContext.lifecyclePhase') -and
    $bridge.Contains('currentContext.lifecyclePhase !== requestContext.lifecyclePhase')) `
    'Bridge stale conversion includes response and current lifecycle phase'
Test-Stage4Condition ($bridge.Contains('const pendingRequests = new Map()') -and
    $bridge.Contains('pendingRequests.delete(entry.requestId)')) `
    'Bridge retains timeout and duplicate-settlement registry protection'
Test-Stage4Condition ($bridge.Contains('root.SqueezeRushLifecycle.snapshot()') -and
    $bridge.Contains('receiveNativeResponse(response)')) `
    'Bridge captures lifecycle context and retains one fixed structured receiver'
Test-Stage4Condition ($bridge.Contains('url.hostname === "localhost" || url.hostname === "127.0.0.1"') -and
    $bridge.Contains('url.searchParams.get("nativeBridgeMock") === "1"')) `
    'Browser mock remains restricted to explicit localhost activation'

Test-Stage4Condition (-not $index.Contains('doubleRewardsBtn') -and
    -not $game.Contains('placement: "double_rewards"')) `
    'No Double Rewards UI or gameplay caller exists'
Test-Stage4Condition (-not $game.Contains('INTERSTITIAL_SHOW') -and
    -not $game.Contains('interstitial.show')) `
    'No interstitial gameplay caller or automatic presentation exists'
Test-Stage4Condition (-not $game.Contains('rewardDoubleClaimed = true')) `
    'Stage 4 does not activate rewardDoubleClaimed'
Test-Stage4Condition (-not $allSwift.Contains('import StoreKit') -and -not $allSwift.Contains('SKPayment')) `
    'No StoreKit or purchase implementation exists'
Test-Stage4Condition (-not $allSwift.Contains('import AppTrackingTransparency') -and
    -not $allSwift.Contains('ATTrackingManager') -and
    -not (Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS\Info.plist')).Contains('NSUserTrackingUsageDescription')) `
    'No ATT implementation or usage description exists'
Test-Stage4Condition (-not $allSwift.Contains('Firebase') -and -not $allSwift.Contains('GoogleAnalytics')) `
    'No Firebase or analytics SDK exists'
Test-Stage4Condition (-not $allSwift.Contains('SKStoreReviewController') -and -not $allSwift.Contains('requestReview(')) `
    'No review request implementation exists'
Test-Stage4Condition (-not $allSwift.Contains('LoopBloom') -and -not $allSwift.Contains('UIApplication.shared.open')) `
    'No Loop Bloom or More Games behavior exists'

$gmaBlock = [regex]::Match($project, 'XCRemoteSwiftPackageReference "swift-package-manager-google-mobile-ads" \*/ = \{(?<body>.*?)\n\s*\};', 'Singleline').Groups['body'].Value
$umpBlock = [regex]::Match($project, 'XCRemoteSwiftPackageReference "swift-package-manager-google-user-messaging-platform" \*/ = \{(?<body>.*?)\n\s*\};', 'Singleline').Groups['body'].Value
Test-Stage4Condition ($gmaBlock.Contains('kind = exactVersion;') -and $gmaBlock.Contains('version = 13.7.0;')) `
    'Google Mobile Ads project dependency remains exact 13.7.0'
Test-Stage4Condition ($umpBlock.Contains('kind = exactVersion;') -and $umpBlock.Contains('version = 3.1.0;')) `
    'Google UMP project dependency remains exact 3.1.0'
$package = Get-Content -Raw -LiteralPath $packagePath | ConvertFrom-Json
$pins = @($package.pins)
$adsPin = @($pins | Where-Object identity -eq 'swift-package-manager-google-mobile-ads')
$umpPin = @($pins | Where-Object identity -eq 'swift-package-manager-google-user-messaging-platform')
Test-Stage4Condition ($adsPin.Count -eq 1 -and $adsPin[0].state.version -eq '13.7.0' -and
    $umpPin.Count -eq 1 -and $umpPin[0].state.version -eq '3.1.0') `
    'Package.resolved selects Mobile Ads 13.7.0 and UMP 3.1.0 exactly'

$debugBlock = [regex]::Match($project, 'A1B2C3D4E5F6071829300023 /\* Debug \*/ = \{(?<body>.*?)\n\s*\};\n\s*name = Debug;', 'Singleline').Groups['body'].Value
$releaseBlock = [regex]::Match($project, 'A1B2C3D4E5F6071829300024 /\* Release \*/ = \{(?<body>.*?)\n\s*\};\n\s*name = Release;', 'Singleline').Groups['body'].Value
Test-Stage4Condition ($debugBlock.Contains('ADMOB_APP_ID = "ca-app-pub-3940256099942544~1458002511";') -and
    $debugBlock.Contains('ADMOB_REWARDED_AD_UNIT_ID = "ca-app-pub-3940256099942544/1712485313";') -and
    $debugBlock.Contains('ADMOB_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-3940256099942544/4411468910";')) `
    'Debug retains only the three official Google sample/test identifiers'
Test-Stage4Condition (-not $releaseBlock.Contains('3940256099942544') -and
    ([regex]::Matches($releaseBlock, 'ADMOB_(?:APP_ID|REWARDED_AD_UNIT_ID|INTERSTITIAL_AD_UNIT_ID) = "";')).Count -eq 3) `
    'Release identifiers remain empty with no test fallback'
Test-Stage4Condition ($releaseBlock.Contains('SQUEEZE_RUSH_ADS_RELEASE_APPROVED = NO;') -and
    (Get-FileHash -Algorithm SHA256 -LiteralPath $guardPath).Hash -eq 'DAA2EACD27519560FC7998940787AE5B1DBD0C159C47E37CFE6C145B6ED6600F') `
    'Release remains blocked and its validation guard is unchanged'
$allAdIdentifiers = @([regex]::Matches($project, 'ca-app-pub-[0-9]+[~/][0-9]+') | ForEach-Object Value | Sort-Object -Unique)
$expectedTestIdentifiers = @(
    'ca-app-pub-3940256099942544~1458002511',
    'ca-app-pub-3940256099942544/1712485313',
    'ca-app-pub-3940256099942544/4411468910'
)
Test-Stage4Condition ($allAdIdentifiers.Count -eq 3 -and @(Compare-Object $allAdIdentifiers $expectedTestIdentifiers).Count -eq 0) `
    'No production ad identifier was added'

$nativeExpectedHashes = [ordered]@{
    'SqueezeRushIOS\GameViewController.swift' = '36C0C0DECE0FE4BBA19D53E6391F12EF453E091750C96E4446B3004F79B250A1'
    'SqueezeRushIOS\Info.plist' = '5931E12FF3D7F4BCBECDBB7E8949981F04C48433F8B68DBE296958ACCA0D9B4C'
    'SqueezeRushIOS\PrivacyInfo.xcprivacy' = '521EB6EF8430773E5C010E1838FE9DD8FA5D62B7B76D1CEA8D7D8DAADCB144E2'
    'SqueezeRushIOS\SqueezeRushAdFlowState.swift' = '0D6E5F447BBE77F2EA5585E389977FBFDECB69882F7E5B06FCA121CFB434009C'
    'SqueezeRushIOS\SqueezeRushAdManager.swift' = 'EB34DDD2FF1656B4436A8EFF5281690285DEC7F57984B66BD8876057F58A89EC'
    'SqueezeRushIOS\SqueezeRushConsentManager.swift' = 'EF4D6F88C8F680BE65EED600A3FB760FA1E96CE947F1FCAE0E8E598798AFA3DA'
    'SqueezeRushIOS\SqueezeRushNativeBridge.swift' = '161AC432E2C35BAF0070CD92E868DD07E5E55D462DA8CF50F74501F594E95A98'
    'SqueezeRushIOS\BuildScripts\ValidateAdMobReleaseConfiguration.sh' = 'DAA2EACD27519560FC7998940787AE5B1DBD0C159C47E37CFE6C145B6ED6600F'
    'SqueezeRushIOS.xcodeproj\project.pbxproj' = 'ABC120C228323A6379572F3D3487A8813515E808BD31B0BD424C634E99B4EB3D'
}
$nativeUnchanged = $true
foreach ($entry in $nativeExpectedHashes.GetEnumerator()) {
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $projectRoot $entry.Key)).Hash -ne $entry.Value) { $nativeUnchanged = $false }
}
Test-Stage4Condition $nativeUnchanged 'All native, plist, project, and Release-guard production files remain unchanged'

$protectedTrees = @(
    [pscustomobject]@{ Path = (Join-Path $workspaceRoot 'SqueezeRush'); Count = 9 },
    [pscustomobject]@{ Path = (Join-Path $workspaceRoot 'SqueezeRushIOS'); Count = 25 },
    [pscustomobject]@{ Path = (Join-Path $workspaceRoot 'Artifacts\iOS-Projects\SqueezeRush-iOS-Revision-2.0.0'); Count = 32 }
)
$protected = $true
foreach ($tree in $protectedTrees) {
    if (@(Get-ChildItem -LiteralPath $tree.Path -Recurse -File).Count -ne $tree.Count) { $protected = $false }
}
Test-Stage4Condition ($protected -and
    (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $workspaceRoot 'SqueezeRush\game.js')).Hash -eq '022D2B0DA412AFFE10D2960A357B615107A54912A65EEC31EB4686B0040BE257') `
    'Protected sibling and archived projects remain unchanged'

foreach ($key in @('squeezeRush.best.v1', 'squeezeRush.modeBest.v1', 'squeezeRush.career.v2', 'squeezeRush.settings.v2')) {
    Test-Stage4Condition ($game.Contains($key)) "Existing localStorage key remains unchanged: $key"
}

$swiftCompiler = Get-Command swiftc -ErrorAction SilentlyContinue
if ($swiftCompiler) {
    $swiftFiles = @(Get-ChildItem -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS') -Filter '*.swift' -File | Select-Object -ExpandProperty FullName)
    $parseOutput = & $swiftCompiler.Source -frontend -parse $swiftFiles 2>&1 | Out-String
    $parseExit = $LASTEXITCODE
    Test-Stage4Condition ($parseExit -eq 0) 'All native Swift files pass Swift frontend syntax parsing'
    if ($parseExit -ne 0) { Write-Host $parseOutput }
}
else {
    Test-Stage4Condition $false 'Swift compiler is available for syntax parsing'
}

Write-Host ''
Write-Host "STAGE 4 STATIC CHECK RESULT: $($passes.Count) passed, $($failures.Count) failed"
if ($failures.Count -gt 0) { exit 1 }
