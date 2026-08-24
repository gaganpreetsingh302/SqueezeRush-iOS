[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot '..')).Path
$passes = [System.Collections.Generic.List[string]]::new()
$failures = [System.Collections.Generic.List[string]]::new()

function Test-Stage3BCondition {
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

$projectPath = Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\project.pbxproj'
$flowPath = Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushAdFlowState.swift'
$adPath = Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushAdManager.swift'
$consentPath = Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushConsentManager.swift'
$bridgePath = Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushNativeBridge.swift'
$controllerPath = Join-Path $projectRoot 'SqueezeRushIOS\GameViewController.swift'
$infoPath = Join-Path $projectRoot 'SqueezeRushIOS\Info.plist'
$guardPath = Join-Path $projectRoot 'SqueezeRushIOS\BuildScripts\ValidateAdMobReleaseConfiguration.sh'

$project = Get-Content -Raw -LiteralPath $projectPath
$flow = Get-Content -Raw -LiteralPath $flowPath
$ad = Get-Content -Raw -LiteralPath $adPath
$consent = Get-Content -Raw -LiteralPath $consentPath
$bridge = Get-Content -Raw -LiteralPath $bridgePath
$controller = Get-Content -Raw -LiteralPath $controllerPath
$info = Get-Content -Raw -LiteralPath $infoPath
$guard = Get-Content -Raw -LiteralPath $guardPath
$allSwift = (Get-ChildItem -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS') -Filter '*.swift' -File |
    ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName }) -join "`n"
$productionText = $allSwift + "`n" + $project + "`n" + $info + "`n" + $guard

$requestCount = ([regex]::Matches($consent, 'ConsentInformation\.shared\.requestConsentInfoUpdate')).Count
$requestIndex = $consent.IndexOf('ConsentInformation.shared.requestConsentInfoUpdate', [StringComparison]::Ordinal)
$postRequestMarkIndex = $consent.IndexOf('flowState.markPostRequestSnapshotPublished()', [StringComparison]::Ordinal)
$postRequestPublishIndex = $consent.IndexOf('self.publishSnapshot()', $postRequestMarkIndex, [StringComparison]::Ordinal)
$processorIndex = $consent.IndexOf('private func processConsentUpdateCompletion', [StringComparison]::Ordinal)

Test-Stage3BCondition ($requestCount -eq 1) 'Exactly one requestConsentInfoUpdate call path exists'
Test-Stage3BCondition ($requestIndex -ge 0 -and $postRequestMarkIndex -gt $requestIndex -and
    $postRequestPublishIndex -gt $postRequestMarkIndex) `
    'Immediate snapshot mark and publication occur after the update request invocation'
Test-Stage3BCondition ($processorIndex -gt $postRequestPublishIndex -and
    $consent.Contains('DispatchQueue.main.async { [weak self] in') -and
    ([regex]::Matches($consent, 'processConsentUpdateCompletion\(error\)')).Count -eq 1) `
    'Update completion is deferred until after post-request publication'
Test-Stage3BCondition ($flow.Contains('guard updateStarted, postRequestSnapshotPublished, !updateCompletionProcessed') -and
    $flow.Contains('updateCompletionProcessed = true')) `
    'Consent update completion is post-request-gated and exactly once'
Test-Stage3BCondition ($consent.Contains('canRequestAds: information.canRequestAds') -and
    -not $consent.Contains('private var canRequestAds')) `
    'Immediate and later snapshots read canRequestAds from UMP without a local cache'

$completeIndex = $consent.IndexOf('flowState.completeUpdate(errorCode: errorCode)', [StringComparison]::Ordinal)
$completionPublishIndex = $consent.IndexOf('publishSnapshot()', $completeIndex, [StringComparison]::Ordinal)
$errorGuardIndex = $consent.IndexOf('guard shouldLoadRequiredForm else { return }', $completeIndex, [StringComparison]::Ordinal)
$loadIndex = $consent.IndexOf('loadAndPresentRequiredForm()', $completeIndex, [StringComparison]::Ordinal)
Test-Stage3BCondition ($completeIndex -ge 0 -and $completionPublishIndex -gt $completeIndex -and
    $errorGuardIndex -gt $completionPublishIndex -and $loadIndex -gt $errorGuardIndex) `
    'Update errors publish current UMP state and return before required-form loading'
Test-Stage3BCondition ($flow.Contains('lastErrorCode = errorCode') -and
    $consent.Contains('completeConsentForm(errorCode: errorCode)') -and
    $consent.Contains('completePrivacyOptions(errorCode: errorCode)')) `
    'Successful update, form, and privacy operations clear stale errors with nil'

$privacyStart = $consent.IndexOf('func presentPrivacyOptions(', [StringComparison]::Ordinal)
$privacyEnd = $consent.IndexOf('func teardown()', $privacyStart, [StringComparison]::Ordinal)
$privacyBody = $consent.Substring($privacyStart, $privacyEnd - $privacyStart)
$policyStart = $flow.IndexOf('enum SqueezeRushPrivacyOptionsPolicy', [StringComparison]::Ordinal)
$policyEnd = $flow.IndexOf('struct SqueezeRushConsentSnapshot', $policyStart, [StringComparison]::Ordinal)
$policyBody = $flow.Substring($policyStart, $policyEnd - $policyStart)
Test-Stage3BCondition ($privacyBody.Contains('information.privacyOptionsRequirementStatus') -and
    $privacyBody.Contains('SqueezeRushPrivacyOptionsPolicy.canPresent') -and
    $policyBody.Contains('requirement == .required')) `
    'Privacy-options presentation requires the explicit UMP required status'
Test-Stage3BCondition (-not $privacyBody.Contains('formStatus') -and -not $consent.Contains('formStatus')) `
    'General formStatus cannot authorize privacy-options presentation'
Test-Stage3BCondition ($privacyBody.Contains('privacy_options_unavailable') -and
    $privacyBody.Contains('beginFormPresentation()')) `
    'Unknown/not-required privacy options are unavailable and overlap protection remains'

Test-Stage3BCondition (-not [regex]::IsMatch($productionText, '\bIAB(?:TCF|TCString|Consent|GPP)?\b') -and
    -not $consent.Contains('localizedDescription') -and -not $ad.Contains('localizedDescription')) `
    'No raw IAB strings or localized SDK errors cross the bridge'
Test-Stage3BCondition (-not $productionText.Contains('import AppTrackingTransparency') -and
    -not $productionText.Contains('ATTrackingManager') -and -not $info.Contains('NSUserTrackingUsageDescription')) `
    'No ATT implementation or usage description exists'
Test-Stage3BCondition (-not $productionText.Contains('import StoreKit') -and
    -not $productionText.Contains('SKPayment')) `
    'No StoreKit implementation exists'
Test-Stage3BCondition (-not $productionText.Contains('Firebase') -and
    -not $productionText.Contains('GoogleAnalytics')) `
    'No Firebase or analytics SDK exists'
Test-Stage3BCondition (-not $productionText.Contains('SKStoreReviewController') -and
    -not $productionText.Contains('requestReview(')) `
    'No review API exists'
Test-Stage3BCondition (-not $productionText.Contains('LoopBloom') -and
    -not $productionText.Contains('UIApplication.shared.open')) `
    'No More Games or arbitrary URL behavior exists'

$gmaRepository = 'https://github.com/googleads/swift-package-manager-google-mobile-ads.git'
$umpRepository = 'https://github.com/googleads/swift-package-manager-google-user-messaging-platform.git'
$gmaBlock = [regex]::Match($project, 'XCRemoteSwiftPackageReference "swift-package-manager-google-mobile-ads" \*/ = \{(?<body>.*?)\n\s*\};', 'Singleline').Groups['body'].Value
$umpBlock = [regex]::Match($project, 'XCRemoteSwiftPackageReference "swift-package-manager-google-user-messaging-platform" \*/ = \{(?<body>.*?)\n\s*\};', 'Singleline').Groups['body'].Value
Test-Stage3BCondition (([regex]::Matches($project, [regex]::Escape("repositoryURL = `"$gmaRepository`";"))).Count -eq 1 -and
    $gmaBlock.Contains('kind = exactVersion;') -and $gmaBlock.Contains('version = 13.7.0;')) `
    'Google Mobile Ads remains one direct exact 13.7.0 dependency'
Test-Stage3BCondition (([regex]::Matches($project, [regex]::Escape("repositoryURL = `"$umpRepository`";"))).Count -eq 1 -and
    $umpBlock.Contains('kind = exactVersion;') -and $umpBlock.Contains('version = 3.1.0;')) `
    'Google UMP remains one direct exact 3.1.0 dependency'
Test-Stage3BCondition (([regex]::Matches($project, 'productName = GoogleMobileAds;')).Count -eq 1 -and
    ([regex]::Matches($project, 'productName = GoogleUserMessagingPlatform;')).Count -eq 1 -and
    ([regex]::Matches($project, '/\* GoogleMobileAds in Frameworks \*/ = \{isa = PBXBuildFile;')).Count -eq 1 -and
    ([regex]::Matches($project, '/\* GoogleUserMessagingPlatform in Frameworks \*/ = \{isa = PBXBuildFile;')).Count -eq 1) `
    'Google package products and Frameworks entries remain singular'

$debugBlock = [regex]::Match($project, 'A1B2C3D4E5F6071829300023 /\* Debug \*/ = \{(?<body>.*?)\n\s*\};\n\s*name = Debug;', 'Singleline').Groups['body'].Value
$releaseBlock = [regex]::Match($project, 'A1B2C3D4E5F6071829300024 /\* Release \*/ = \{(?<body>.*?)\n\s*\};\n\s*name = Release;', 'Singleline').Groups['body'].Value
Test-Stage3BCondition ($debugBlock.Contains('ADMOB_APP_ID = "ca-app-pub-3940256099942544~1458002511";') -and
    $debugBlock.Contains('ADMOB_REWARDED_AD_UNIT_ID = "ca-app-pub-3940256099942544/1712485313";') -and
    $debugBlock.Contains('ADMOB_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-3940256099942544/4411468910";')) `
    'Debug test IDs remain the three official Google identifiers'
Test-Stage3BCondition (-not $releaseBlock.Contains('3940256099942544') -and
    ([regex]::Matches($releaseBlock, 'ADMOB_(?:APP_ID|REWARDED_AD_UNIT_ID|INTERSTITIAL_AD_UNIT_ID) = "";')).Count -eq 3) `
    'Release ad identifiers remain empty with no sample fallback'
Test-Stage3BCondition ($releaseBlock.Contains('SQUEEZE_RUSH_ADS_RELEASE_APPROVED = NO;') -and
    (Get-FileHash -Algorithm SHA256 -LiteralPath $guardPath).Hash -eq
        'DAA2EACD27519560FC7998940787AE5B1DBD0C159C47E37CFE6C145B6ED6600F') `
    'Release approval remains NO and validation guard remains byte-identical'
$allAdIdentifiers = @([regex]::Matches($project, 'ca-app-pub-[0-9]+[~/][0-9]+') | ForEach-Object Value | Sort-Object -Unique)
$expectedTestIdentifiers = @(
    'ca-app-pub-3940256099942544~1458002511',
    'ca-app-pub-3940256099942544/1712485313',
    'ca-app-pub-3940256099942544/4411468910'
)
Test-Stage3BCondition ($allAdIdentifiers.Count -eq 3 -and
    (@(Compare-Object $allAdIdentifiers $expectedTestIdentifiers).Count -eq 0)) `
    'No production or production-looking ad identifier exists'

$markStart = $flow.IndexOf('mutating func markSDKInitialized()', [StringComparison]::Ordinal)
$markEnd = $flow.IndexOf('mutating func setRewardedReady', $markStart, [StringComparison]::Ordinal)
$markBody = $flow.Substring($markStart, $markEnd - $markStart)
Test-Stage3BCondition ($markBody.Contains('sdkInitializationStarted') -and
    $markBody.Contains('sdkInitialized = true') -and -not $markBody.Contains('canRequestAds')) `
    'Stage 3A SDK completion remains independent of current consent'
Test-Stage3BCondition (([regex]::Matches($ad, 'MobileAds\.shared\.start')).Count -eq 1 -and
    $ad.IndexOf('setPublisherFirstPartyIDEnabled(false)', [StringComparison]::Ordinal) -lt
    $ad.IndexOf('MobileAds.shared.start', [StringComparison]::Ordinal)) `
    'Mobile Ads start remains single-path with first-party ID disabled first'

Test-Stage3BCondition ($controller.Contains('final class WeakScriptMessageHandler') -and
    $controller.Contains('weak var delegate: WKScriptMessageHandler?') -and
    -not $controller.Contains('contentController.add(self, name: "SqueezeRushIOS")')) `
    'WeakScriptMessageHandler remains and direct controller registration is absent'
Test-Stage3BCondition ($consent.Contains('private weak var presentationOwner: UIViewController?') -and
    $ad.Contains('private weak var presentationOwner: UIViewController?') -and
    $bridge.Contains('private weak var presentationOwner: UIViewController?') -and
    $controller.Contains('[weak adManager]')) `
    'Consent, ad, and bridge ownership back to the controller remains weak'

$webHashes = [ordered]@{
    'game.js'='49951E3BA0D3321FC1349EEFF5A2D8D5975F45711510403C3AF9A1D3B0D15B58';
    'index.html'='F09B7CC871DEFD5C6CE823BC46AE63E4E95E01E6A179BD225FCC80307816C2F6';
    'native-bridge.js'='33683B8049A2EB9E0E89B53A45012C3826318D5F2D1C11004E6832CB1F72BF95';
    'run-lifecycle.js'='6D0AF635A9C638183035E312BAE26E7076B1561635C649EB7F3266BE124C6397';
    'styles.css'='7C3B6BAFF43C1ED04F631BA302A6F2902AF29FD715ABF1FAE9979E07BAD5D6CB'
}
$webUnchanged = $true
foreach ($entry in $webHashes.GetEnumerator()) {
    $path = Join-Path $projectRoot (Join-Path 'SqueezeRushIOS\Web' $entry.Key)
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash -ne $entry.Value) {
        $webUnchanged = $false
    }
}
Test-Stage3BCondition $webUnchanged 'All five production Web files match the audited Stage 4 controlled baseline'

$protectedTrees = @(
    [pscustomobject]@{Path=(Join-Path $workspaceRoot 'SqueezeRush');Count=9},
    [pscustomobject]@{Path=(Join-Path $workspaceRoot 'SqueezeRushIOS');Count=25},
    [pscustomobject]@{Path=(Join-Path $workspaceRoot 'Artifacts\iOS-Projects\SqueezeRush-iOS-Revision-2.0.0');Count=32}
)
$protected = $true
foreach ($tree in $protectedTrees) {
    if (@(Get-ChildItem -LiteralPath $tree.Path -Recurse -File).Count -ne $tree.Count) {
        $protected = $false
    }
}
Test-Stage3BCondition ($protected -and
    (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $workspaceRoot 'SqueezeRush\game.js')).Hash -eq
        '022D2B0DA412AFFE10D2960A357B615107A54912A65EEC31EB4686B0040BE257') `
    'Protected sibling and archived projects remain unchanged'

Test-Stage3BCondition (-not $allSwift.Contains('rewardedReviveUsed = true') -and
    -not $allSwift.Contains('rewardDoubleClaimed = true') -and
    -not $allSwift.Contains('career.xp') -and -not $allSwift.Contains('career.cores')) `
    'Native ad code contains no gameplay reward or career mutation'

$swiftCompiler = Get-Command swiftc -ErrorAction SilentlyContinue
if ($swiftCompiler) {
    $swiftFiles = @(Get-ChildItem -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS') -Filter '*.swift' -File |
        Select-Object -ExpandProperty FullName)
    $parseOutput = & $swiftCompiler.Source -frontend -parse $swiftFiles 2>&1 | Out-String
    $parseExit = $LASTEXITCODE
    Test-Stage3BCondition ($parseExit -eq 0) 'All native Swift files pass Swift frontend syntax parsing'
    if ($parseExit -ne 0) { Write-Host $parseOutput }
}
else {
    Test-Stage3BCondition $false 'Swift compiler is available for syntax parsing'
}

Write-Host ''
Write-Host "STAGE 3B STATIC CHECK RESULT: $($passes.Count) passed, $($failures.Count) failed"
if ($failures.Count -gt 0) { exit 1 }
