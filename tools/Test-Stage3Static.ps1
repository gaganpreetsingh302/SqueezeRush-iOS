[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot '..')).Path
$webRoot = Join-Path $projectRoot 'SqueezeRushIOS\Web'
$passes = [System.Collections.Generic.List[string]]::new()
$failures = [System.Collections.Generic.List[string]]::new()

function Test-Stage3Condition {
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

$projectPath = Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\project.pbxproj'
$infoPath = Join-Path $projectRoot 'SqueezeRushIOS\Info.plist'
$privacyPath = Join-Path $projectRoot 'SqueezeRushIOS\PrivacyInfo.xcprivacy'
$controllerPath = Join-Path $projectRoot 'SqueezeRushIOS\GameViewController.swift'
$bridgePath = Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushNativeBridge.swift'
$flowPath = Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushAdFlowState.swift'
$consentPath = Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushConsentManager.swift'
$adPath = Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushAdManager.swift'
$guardPath = Join-Path $projectRoot 'SqueezeRushIOS\BuildScripts\ValidateAdMobReleaseConfiguration.sh'
$metadataPath = Join-Path $projectRoot 'STAGE_3_PACKAGE_METADATA.json'

$project = Get-Content -Raw -LiteralPath $projectPath
$info = Get-Content -Raw -LiteralPath $infoPath
$privacy = Get-Content -Raw -LiteralPath $privacyPath
$controller = Get-Content -Raw -LiteralPath $controllerPath
$bridge = Get-Content -Raw -LiteralPath $bridgePath
$flow = Get-Content -Raw -LiteralPath $flowPath
$consent = Get-Content -Raw -LiteralPath $consentPath
$ad = Get-Content -Raw -LiteralPath $adPath
$guard = Get-Content -Raw -LiteralPath $guardPath
$metadata = Get-Content -Raw -LiteralPath $metadataPath | ConvertFrom-Json

Test-Stage3Condition (
    ([regex]::Matches($project, 'repositoryURL = "https://github.com/googleads/swift-package-manager-google-mobile-ads\.git";')).Count -eq 1
) 'Official Google Mobile Ads package repository appears exactly once'
Test-Stage3Condition (
    $project.Contains('kind = exactVersion;') -and $project.Contains('version = 13.7.0;')
) 'Google Mobile Ads direct package is pinned to exact version 13.7.0'
Test-Stage3Condition (
    $project.Contains('productName = GoogleMobileAds;') -and
    $project.Contains('GoogleMobileAds in Frameworks')
) 'GoogleMobileAds product is linked to the SqueezeRushIOS target'
Test-Stage3Condition (
    $metadata.mobileAds.version -eq '13.7.0' -and
    $metadata.ump.declaredRequirement -eq '1.1.0..<4.0.0' -and
    $metadata.ump.selectedHighestCompatibleVersion -eq '3.1.0'
) 'Recorded official metadata selects UMP 3.1.0 from the declared compatible range'
$packageResolvedPath = Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\project.xcworkspace\xcshareddata\swiftpm\Package.resolved'
$packageResolved = if (Test-Path -LiteralPath $packageResolvedPath -PathType Leaf) {
    Get-Content -Raw -LiteralPath $packageResolvedPath | ConvertFrom-Json
} else { $null }
$resolvedPins = if ($packageResolved) { @($packageResolved.pins) } else { @() }
$resolvedAds = @($resolvedPins | Where-Object identity -eq 'swift-package-manager-google-mobile-ads')
$resolvedUmp = @($resolvedPins | Where-Object identity -eq 'swift-package-manager-google-user-messaging-platform')
Test-Stage3Condition (
    $resolvedAds.Count -eq 1 -and $resolvedAds[0].state.version -eq '13.7.0' -and
    $resolvedUmp.Count -eq 1 -and $resolvedUmp[0].state.version -eq '3.1.0'
) 'Xcode Cloud Package.resolved selects Mobile Ads 13.7.0 and UMP 3.1.0 exactly'
Test-Stage3Condition (
    ([regex]::Matches($project, 'repositoryURL = "https://github.com/googleads/swift-package-manager-google-user-messaging-platform\.git";')).Count -eq 1 -and
    $project.Contains('productName = GoogleUserMessagingPlatform;') -and
    $metadata.ump.directExactVersion -eq '3.1.0'
) 'One direct exact UMP 3.1.0 package/product reference is present for app-target imports'

$debugBlock = [regex]::Match(
    $project,
    'A1B2C3D4E5F6071829300023 /\* Debug \*/ = \{(?<body>.*?)\n\s*\};\n\s*name = Debug;',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
).Groups['body'].Value
$releaseBlock = [regex]::Match(
    $project,
    'A1B2C3D4E5F6071829300024 /\* Release \*/ = \{(?<body>.*?)\n\s*\};\n\s*name = Release;',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
).Groups['body'].Value

Test-Stage3Condition (
    $debugBlock.Contains('ADMOB_APP_ID = "ca-app-pub-3940256099942544~1458002511";') -and
    $debugBlock.Contains('ADMOB_REWARDED_AD_UNIT_ID = "ca-app-pub-3940256099942544/1712485313";') -and
    $debugBlock.Contains('ADMOB_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-3940256099942544/4411468910";')
) 'Debug uses exactly the three official Google sample/test identifiers'
Test-Stage3Condition (
    -not $releaseBlock.Contains('3940256099942544') -and
    ([regex]::Matches($releaseBlock, 'ADMOB_(?:APP_ID|REWARDED_AD_UNIT_ID|INTERSTITIAL_AD_UNIT_ID) = "";')).Count -eq 3
) 'Release contains no Google test identifier and no fallback identifier'
Test-Stage3Condition (
    $debugBlock.Contains('SQUEEZE_RUSH_ADS_RELEASE_APPROVED = NO;') -and
    $releaseBlock.Contains('SQUEEZE_RUSH_ADS_RELEASE_APPROVED = NO;')
) 'Release approval is explicitly disabled by default'
Test-Stage3Condition (
    $guard.Contains('CONFIGURATION:-') -and
    $guard.Contains('3940256099942544') -and
    $guard.Contains('SQUEEZE_RUSH_ADS_RELEASE_APPROVED') -and
    $guard.Contains('Release is intentionally blocked') -and
    $project.Contains('Validate Release Ad Configuration')
) 'Deterministic Release build guard rejects missing, sample, invalid, or unapproved IDs'
Test-Stage3Condition (
    $info.Contains('<key>GADApplicationIdentifier</key>') -and
    $info.Contains('<string>$(ADMOB_APP_ID)</string>') -and
    $info.Contains('<string>$(ADMOB_REWARDED_AD_UNIT_ID)</string>') -and
    $info.Contains('<string>$(ADMOB_INTERSTITIAL_AD_UNIT_ID)</string>')
) 'Info.plist uses build-setting expansion for every AdMob identifier'

$expectedSKAdNetworks = @(
    'cstr6suwn9.skadnetwork','4fzdc2evr5.skadnetwork','2fnua5tdw4.skadnetwork','ydx93a7ass.skadnetwork',
    'p78axxw29g.skadnetwork','v72qych5uu.skadnetwork','ludvb6z3bs.skadnetwork','cp8zw746q7.skadnetwork',
    '3sh42y64q3.skadnetwork','c6k4g5qg8m.skadnetwork','s39g8k73mm.skadnetwork','wg4vff78zm.skadnetwork',
    '3qy4746246.skadnetwork','f38h382jlk.skadnetwork','hs6bdukanm.skadnetwork','mlmmfzh3r3.skadnetwork',
    'v4nxqhlyqp.skadnetwork','wzmmz9fp6w.skadnetwork','su67r6k2v3.skadnetwork','yclnxrl5pm.skadnetwork',
    't38b2kh725.skadnetwork','7ug5zh24hu.skadnetwork','gta9lk7p23.skadnetwork','vutu7akeur.skadnetwork',
    'y5ghdn5j9k.skadnetwork','v9wttpbfk9.skadnetwork','n38lu8286q.skadnetwork','47vhws6wlr.skadnetwork',
    'kbd757ywx3.skadnetwork','9t245vhmpl.skadnetwork','a2p9lx4jpn.skadnetwork','22mmun2rn5.skadnetwork',
    '44jx6755aq.skadnetwork','k674qkevps.skadnetwork','4468km3ulz.skadnetwork','2u9pt9hc89.skadnetwork',
    '8s468mfl3y.skadnetwork','klf5c3l5u5.skadnetwork','ppxm28t8ap.skadnetwork','kbmxgpxpgc.skadnetwork',
    'uw77j35x4d.skadnetwork','578prtvx9j.skadnetwork','4dzt52r2t5.skadnetwork','tl55sbb4fm.skadnetwork',
    'c3frkrj4fj.skadnetwork','e5fvkxwrpn.skadnetwork','8c4e2ghe7u.skadnetwork','3rd42ekr43.skadnetwork',
    '97r2b46745.skadnetwork','3qcr597p9d.skadnetwork'
)
$actualSKAdNetworks = @([regex]::Matches($info, '[a-z0-9]{10}\.skadnetwork') | ForEach-Object { $_.Value })
Test-Stage3Condition (
    $actualSKAdNetworks.Count -eq 50 -and
    ($actualSKAdNetworks -join '|') -eq ($expectedSKAdNetworks -join '|')
) 'Info.plist contains the complete 50-entry Google SKAdNetwork list retrieved 2026-08-04'

$allSwift = @(
    Get-ChildItem -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS') -Filter '*.swift' -File |
        ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName }
) -join "`n"
$productionText = $allSwift + "`n" + $project + "`n" + $info + "`n" + $privacy + "`n" + $guard

Test-Stage3Condition (
    -not $productionText.Contains('import AppTrackingTransparency') -and
    -not $info.Contains('NSUserTrackingUsageDescription') -and
    -not $productionText.Contains('ATTrackingManager')
) 'ATT is neither imported, described, nor requested'
Test-Stage3Condition (
    -not $info.Contains('NSLocation') -and -not $info.Contains('CFBundleURLTypes') -and
    -not $info.Contains('WKAppBoundDomains')
) 'No location permission, arbitrary URL scheme, or app-bound-domain key was added'
Test-Stage3Condition (
    $ad.IndexOf('setPublisherFirstPartyIDEnabled(false)', [StringComparison]::Ordinal) -ge 0 -and
    $ad.IndexOf('setPublisherFirstPartyIDEnabled(false)', [StringComparison]::Ordinal) -lt
        $ad.IndexOf('MobileAds.shared.start', [StringComparison]::Ordinal)
) 'Publisher first-party ID is disabled before Mobile Ads initialization'
Test-Stage3Condition (
    -not $productionText.Contains('Firebase') -and -not $productionText.Contains('import GoogleAnalytics')
) 'No Firebase or analytics SDK was added'
Test-Stage3Condition (
    -not $allSwift.Contains('BannerView') -and -not $allSwift.Contains('AppOpenAd') -and
    -not $allSwift.Contains('RewardedInterstitialAd')
) 'No banner, app-open, or rewarded-interstitial integration exists'
Test-Stage3Condition (
    -not $productionText.Contains('import StoreKit') -and -not $productionText.Contains('SKPayment')
) 'No StoreKit or purchase implementation exists'
Test-Stage3Condition (
    -not $productionText.Contains('SKStoreReviewController') -and
    -not $productionText.Contains('LoopBloom') -and
    -not $productionText.Contains('UIApplication.shared.open')
) 'No review request, Loop Bloom, More Games, or URL-opening behavior exists'

$webHashes = [ordered]@{
    'game.js' = '49951E3BA0D3321FC1349EEFF5A2D8D5975F45711510403C3AF9A1D3B0D15B58'
    'index.html' = 'F09B7CC871DEFD5C6CE823BC46AE63E4E95E01E6A179BD225FCC80307816C2F6'
    'native-bridge.js' = '33683B8049A2EB9E0E89B53A45012C3826318D5F2D1C11004E6832CB1F72BF95'
    'run-lifecycle.js' = '6D0AF635A9C638183035E312BAE26E7076B1561635C649EB7F3266BE124C6397'
    'styles.css' = '7C3B6BAFF43C1ED04F631BA302A6F2902AF29FD715ABF1FAE9979E07BAD5D6CB'
}
$webMatches = $true
foreach ($entry in $webHashes.GetEnumerator()) {
    if ((Get-FileHash -LiteralPath (Join-Path $webRoot $entry.Key) -Algorithm SHA256).Hash -ne $entry.Value) {
        $webMatches = $false
    }
}
Test-Stage3Condition $webMatches 'All gameplay Web files match the audited Stage 4 controlled baseline'

$protectedTrees = @(
    [pscustomobject]@{ Path = (Join-Path $workspaceRoot 'SqueezeRush'); ExpectedFiles = 9 },
    [pscustomobject]@{ Path = (Join-Path $workspaceRoot 'SqueezeRushIOS'); ExpectedFiles = 25 },
    [pscustomobject]@{ Path = (Join-Path $workspaceRoot 'Artifacts\iOS-Projects\SqueezeRush-iOS-Revision-2.0.0'); ExpectedFiles = 32 }
)
$stage2StartUtc = [datetime]::Parse('2026-08-04T02:22:52Z').ToUniversalTime()
$protectedMatch = $true
foreach ($tree in $protectedTrees) {
    $files = @(Get-ChildItem -LiteralPath $tree.Path -Recurse -File)
    $latest = $files | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
    if ($files.Count -ne $tree.ExpectedFiles -or $null -eq $latest -or $latest.LastWriteTimeUtc -ge $stage2StartUtc) {
        $protectedMatch = $false
    }
}
Test-Stage3Condition (
    $protectedMatch -and
    (Get-FileHash -LiteralPath (Join-Path $workspaceRoot 'SqueezeRush\game.js') -Algorithm SHA256).Hash -eq
        '022D2B0DA412AFFE10D2960A357B615107A54912A65EEC31EB4686B0040BE257'
) 'Protected sibling and archived iOS projects remain unchanged'

Test-Stage3Condition (
    $controller.Contains('WeakScriptMessageHandler(delegate: self)') -and
    -not $controller.Contains('contentController.add(self, name: "SqueezeRushIOS")')
) 'Stage 2A weak legacy message-handler proxy remains intact'
Test-Stage3Condition (
    ([regex]::Matches($consent + $ad, 'weak var presentationOwner')).Count -eq 2 -and
    $bridge.Contains('private weak var presentationOwner') -and
    $bridge.Contains('private weak var adService') -and
    $bridge.Contains('private weak var consentService') -and
    $controller.Contains('[weak adManager]')
) 'Managers and bridge have no strong reference path back to GameViewController'
Test-Stage3Condition (
    -not $ad.Contains('localizedDescription') -and -not $consent.Contains('localizedDescription') -and
    $bridge.Contains('The ad operation did not complete successfully.')
) 'No raw Google SDK error message crosses the native bridge'
Test-Stage3Condition (
    $flow.Contains('guard kind == .rewarded, !settled, !earned') -and
    $flow.Contains('if earned {') -and
    $ad.Contains('recordEarned(type: rewardType, amount: rewardAmount)') -and
    $ad.Contains('settleAfterDismissal()')
) 'Reward success requires the earned callback and waits for dismissal'
Test-Stage3Condition (
    -not $allSwift.Contains('rewardedReviveUsed = true') -and
    -not $allSwift.Contains('rewardDoubleClaimed = true') -and
    -not $allSwift.Contains('career.xp') -and
    -not $allSwift.Contains('career.cores')
) 'Native ad callbacks grant no gameplay reward or lifecycle mutation'
Test-Stage3Condition (
    $ad.Contains('guard coordinator.canRequestAds, coordinator.sdkInitialized') -and
    ([regex]::Matches($ad, 'coordinator\.canRequestAds,\s*\r?\n\s*coordinator\.sdkInitialized')).Count -ge 2 -and
    $controller.Contains('adManager?.updateConsent(canRequestAds: snapshot.canRequestAds)')
) 'No ad request occurs before consent and Mobile Ads initialization'
Test-Stage3Condition (
    $consent.Contains('requestConsentInfoUpdate(with: parameters)') -and
    $consent.Contains('loadAndPresentIfRequired(from: owner)') -and
    $consent.Contains('presentPrivacyOptionsForm(from: owner)') -and
    -not $consent.Contains('IAB')
) 'Consent manager uses current UMP APIs without reading raw IAB strings'
Test-Stage3Condition (
    $consent.Contains('beginUpdateOnce()') -and $consent.Contains('beginFormPresentation()') -and
    $consent.Contains('#if DEBUG') -and $consent.Contains('-SqueezeRushUMPResetConsent') -and
    -not $consent.Contains('testDeviceIdentifiers')
) 'Consent update/form locks and DEBUG-only testing contain no physical test-device ID'
Test-Stage3Condition (
    $bridge.Contains('case rewarded(SqueezeRushRewardedPlacement)') -and
    $bridge.Contains('case interstitial(SqueezeRushInterstitialPlacement)') -and
    $bridge.Contains('case consent(SqueezeRushConsentOperation)') -and
    $bridge.Contains('rewardedAds": true') -and $bridge.Contains('consent": true')
) 'Existing protocol v1 actions now expose bounded Stage 3 support and dynamic readiness'

Test-Stage3Condition (
    ([regex]::Matches($project, 'IPHONEOS_DEPLOYMENT_TARGET = 15\.0;')).Count -eq 4 -and
    ([regex]::Matches($project, 'PRODUCT_BUNDLE_IDENTIFIER = com\.kasiga\.squeezerush;')).Count -eq 2
) 'iOS 15.0 and bundle identifier com.kasiga.squeezerush remain unchanged'
foreach ($swiftName in @('SqueezeRushAdFlowState.swift', 'SqueezeRushConsentManager.swift', 'SqueezeRushAdManager.swift')) {
    $fileReferenceCount = ([regex]::Matches($project, [regex]::Escape("$swiftName */ = {isa = PBXFileReference;"))).Count
    $sourceCount = ([regex]::Matches($project, [regex]::Escape("$swiftName in Sources */,"))).Count
    Test-Stage3Condition ($fileReferenceCount -eq 1 -and $sourceCount -eq 1) "$swiftName is referenced once and included in target Sources"
}
Test-Stage3Condition (
    $project.Contains('PrivacyInfo.xcprivacy in Resources') -and
    -not $project.Contains('Generate Privacy Manifest') -and
    $privacy.Contains('<key>NSPrivacyTracking</key>')
) 'Checked-in app privacy manifest replaces the generated-empty build phase'

$swiftCompiler = Get-Command swiftc -ErrorAction SilentlyContinue
if ($swiftCompiler) {
    $swiftFiles = @(Get-ChildItem -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS') -Filter '*.swift' -File | Select-Object -ExpandProperty FullName)
    $parseOutput = & $swiftCompiler.Source -frontend -parse $swiftFiles 2>&1 | Out-String
    $parseExitCode = $LASTEXITCODE
    Test-Stage3Condition ($parseExitCode -eq 0) 'All native Swift files pass Swift frontend syntax parsing'
    if ($parseExitCode -ne 0) { Write-Host $parseOutput }
}
else {
    Test-Stage3Condition $false 'Swift compiler is available for syntax parsing'
}

Write-Host ''
Write-Host "STAGE 3 STATIC CHECK RESULT: $($passes.Count) passed, $($failures.Count) failed"
if ($failures.Count -gt 0) { exit 1 }
