[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot '..')).Path
$passes = [System.Collections.Generic.List[string]]::new()
$failures = [System.Collections.Generic.List[string]]::new()

function Test-Stage3ACondition {
    param([Parameter(Mandatory)] [bool] $Condition, [Parameter(Mandatory)] [string] $Message)
    if ($Condition) { $script:passes.Add($Message); Write-Host "PASS: $Message" }
    else { $script:failures.Add($Message); Write-Host "FAIL: $Message" -ForegroundColor Red }
}

$projectPath = Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\project.pbxproj'
$flowPath = Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushAdFlowState.swift'
$adPath = Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushAdManager.swift'
$consentPath = Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushConsentManager.swift'
$controllerPath = Join-Path $projectRoot 'SqueezeRushIOS\GameViewController.swift'
$infoPath = Join-Path $projectRoot 'SqueezeRushIOS\Info.plist'
$guardPath = Join-Path $projectRoot 'SqueezeRushIOS\BuildScripts\ValidateAdMobReleaseConfiguration.sh'
$metadataPath = Join-Path $projectRoot 'STAGE_3_PACKAGE_METADATA.json'

$project = Get-Content -Raw -LiteralPath $projectPath
$flow = Get-Content -Raw -LiteralPath $flowPath
$ad = Get-Content -Raw -LiteralPath $adPath
$consent = Get-Content -Raw -LiteralPath $consentPath
$controller = Get-Content -Raw -LiteralPath $controllerPath
$info = Get-Content -Raw -LiteralPath $infoPath
$guard = Get-Content -Raw -LiteralPath $guardPath
$metadata = Get-Content -Raw -LiteralPath $metadataPath | ConvertFrom-Json

$gmaRepository = 'https://github.com/googleads/swift-package-manager-google-mobile-ads.git'
$umpRepository = 'https://github.com/googleads/swift-package-manager-google-user-messaging-platform.git'
$gmaBlock = [regex]::Match($project, 'XCRemoteSwiftPackageReference "swift-package-manager-google-mobile-ads" \*/ = \{(?<body>.*?)\n\s*\};', 'Singleline').Groups['body'].Value
$umpBlock = [regex]::Match($project, 'XCRemoteSwiftPackageReference "swift-package-manager-google-user-messaging-platform" \*/ = \{(?<body>.*?)\n\s*\};', 'Singleline').Groups['body'].Value

Test-Stage3ACondition (([regex]::Matches($project, [regex]::Escape("repositoryURL = `"$gmaRepository`";"))).Count -eq 1) `
    'Exactly one direct Google Mobile Ads repository reference exists'
Test-Stage3ACondition ($gmaBlock.Contains('kind = exactVersion;') -and $gmaBlock.Contains('version = 13.7.0;') -and
    ([regex]::Matches($project, 'version = 13\.7\.0;')).Count -eq 1) `
    'Google Mobile Ads package reference is exact 13.7.0 once'
Test-Stage3ACondition (([regex]::Matches($project, [regex]::Escape("repositoryURL = `"$umpRepository`";"))).Count -eq 1) `
    'Exactly one direct Google UMP repository reference exists'
Test-Stage3ACondition ($umpBlock.Contains('kind = exactVersion;') -and $umpBlock.Contains('version = 3.1.0;') -and
    ([regex]::Matches($project, 'version = 3\.1\.0;')).Count -eq 1) `
    'Google UMP package reference is exact 3.1.0 once'
Test-Stage3ACondition (([regex]::Matches($project, 'productName = GoogleMobileAds;')).Count -eq 1 -and
    ([regex]::Matches($project, 'productName = GoogleUserMessagingPlatform;')).Count -eq 1) `
    'Each Swift package product dependency exists exactly once'

$targetProducts = [regex]::Match($project, 'packageProductDependencies = \((?<body>.*?)\);', 'Singleline').Groups['body'].Value
$frameworkFiles = [regex]::Match($project, 'PBXFrameworksBuildPhase;(?<body>.*?)runOnlyForDeploymentPostprocessing', 'Singleline').Groups['body'].Value
Test-Stage3ACondition (([regex]::Matches($targetProducts, '/\* GoogleMobileAds \*/')).Count -eq 1 -and
    ([regex]::Matches($targetProducts, '/\* GoogleUserMessagingPlatform \*/')).Count -eq 1) `
    'Target package-product entries contain each Google product once'
Test-Stage3ACondition (([regex]::Matches($project, '/\* GoogleMobileAds in Frameworks \*/ = \{isa = PBXBuildFile;')).Count -eq 1 -and
    ([regex]::Matches($project, '/\* GoogleUserMessagingPlatform in Frameworks \*/ = \{isa = PBXBuildFile;')).Count -eq 1 -and
    ([regex]::Matches($frameworkFiles, '/\* GoogleMobileAds in Frameworks \*/')).Count -eq 1 -and
    ([regex]::Matches($frameworkFiles, '/\* GoogleUserMessagingPlatform in Frameworks \*/')).Count -eq 1) `
    'Frameworks phase links each Google package product exactly once'
Test-Stage3ACondition ($metadata.mobileAds.version -eq '13.7.0' -and
    $metadata.ump.directProjectDependency -eq $true -and
    $metadata.ump.directExactVersion -eq '3.1.0' -and
    $metadata.ump.productName -eq 'GoogleUserMessagingPlatform' -and
    $metadata.ump.importModule -eq 'UserMessagingPlatform') `
    'Package metadata records exact direct UMP product and Swift import'
Test-Stage3ACondition (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\project.xcworkspace\xcshareddata\swiftpm\Package.resolved'))) `
    'No Package.resolved was fabricated on Windows'

$debugBlock = [regex]::Match($project, 'A1B2C3D4E5F6071829300023 /\* Debug \*/ = \{(?<body>.*?)\n\s*\};\n\s*name = Debug;', 'Singleline').Groups['body'].Value
$releaseBlock = [regex]::Match($project, 'A1B2C3D4E5F6071829300024 /\* Release \*/ = \{(?<body>.*?)\n\s*\};\n\s*name = Release;', 'Singleline').Groups['body'].Value
Test-Stage3ACondition ($debugBlock.Contains('ADMOB_APP_ID = "ca-app-pub-3940256099942544~1458002511";') -and
    $debugBlock.Contains('ADMOB_REWARDED_AD_UNIT_ID = "ca-app-pub-3940256099942544/1712485313";') -and
    $debugBlock.Contains('ADMOB_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-3940256099942544/4411468910";')) `
    'Debug retains exactly the official Google test IDs'
Test-Stage3ACondition (-not $releaseBlock.Contains('3940256099942544') -and
    ([regex]::Matches($releaseBlock, 'ADMOB_(?:APP_ID|REWARDED_AD_UNIT_ID|INTERSTITIAL_AD_UNIT_ID) = "";')).Count -eq 3) `
    'Release retains empty ad identifiers'
Test-Stage3ACondition ((Get-FileHash -Algorithm SHA256 -LiteralPath $guardPath).Hash -eq
    'DAA2EACD27519560FC7998940787AE5B1DBD0C159C47E37CFE6C145B6ED6600F' -and
    $releaseBlock.Contains('SQUEEZE_RUSH_ADS_RELEASE_APPROVED = NO;')) `
    'Release validation guard remains byte-identical and approval remains NO'

$productionSwift = (Get-ChildItem -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS') -Filter '*.swift' -File |
    ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName }) -join "`n"
$productionText = $productionSwift + "`n" + $project + "`n" + $info + "`n" + $guard
Test-Stage3ACondition (-not $productionText.Contains('import AppTrackingTransparency') -and
    -not $productionText.Contains('ATTrackingManager') -and -not $info.Contains('NSUserTrackingUsageDescription')) `
    'No ATT implementation or usage description exists'
Test-Stage3ACondition (-not $productionText.Contains('import StoreKit') -and -not $productionText.Contains('SKPayment')) `
    'No StoreKit or purchase implementation exists'
Test-Stage3ACondition (-not $productionText.Contains('Firebase') -and -not $productionText.Contains('import GoogleAnalytics')) `
    'No Firebase or analytics SDK exists'
Test-Stage3ACondition (-not $productionText.Contains('SKStoreReviewController') -and
    -not $productionText.Contains('requestReview(')) `
    'No review API exists'
Test-Stage3ACondition (-not $productionText.Contains('LoopBloom') -and
    -not $productionText.Contains('UIApplication.shared.open')) `
    'No More Games or URL-opening behavior exists'

$webHashes = [ordered]@{
    'game.js'='E6318E1BF8D533B6AD6F02B9B053A730BD0FB598CD9F5053A16BBE9D25B9C973';
    'index.html'='6785CE9289404B0F72681871C34C225364C07E431BA01411278D85C3FA24C39C';
    'native-bridge.js'='4DD3FB2BC5B1A4A0349BAED9B1065E5F2CB1B833EE4ADE1EE9F10959D1092D50';
    'run-lifecycle.js'='F0EED9B5257260C09A81E54626E146950C202359405AE367FE6E1D3EB680910F';
    'styles.css'='AF2C5C55B050A7BA77139712F0D081A5967AD5E2DFBB97F6F5F8C3BFB635FB53'
}
$webUnchanged = $true
foreach($entry in $webHashes.GetEnumerator()){
    if((Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $projectRoot (Join-Path 'SqueezeRushIOS\Web' $entry.Key))).Hash -ne $entry.Value){$webUnchanged=$false}
}
Test-Stage3ACondition $webUnchanged 'All five production Web files remain byte-identical to Stage 3'

$protectedTrees = @(
    [pscustomobject]@{Path=(Join-Path $workspaceRoot 'SqueezeRush');Count=9},
    [pscustomobject]@{Path=(Join-Path $workspaceRoot 'SqueezeRushIOS');Count=25},
    [pscustomobject]@{Path=(Join-Path $workspaceRoot 'Artifacts\iOS-Projects\SqueezeRush-iOS-Revision-2.0.0');Count=32}
)
$protected=$true
foreach($tree in $protectedTrees){if(@(Get-ChildItem -LiteralPath $tree.Path -Recurse -File).Count -ne $tree.Count){$protected=$false}}
Test-Stage3ACondition ($protected -and
    (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $workspaceRoot 'SqueezeRush\game.js')).Hash -eq
    '022D2B0DA412AFFE10D2960A357B615107A54912A65EEC31EB4686B0040BE257') `
    'Protected sibling and archived projects remain unchanged'

$beginIndex = $consent.IndexOf('flowState.beginUpdateOnce()', [StringComparison]::Ordinal)
$postRequestMarkIndex = $consent.IndexOf('flowState.markPostRequestSnapshotPublished()', [StringComparison]::Ordinal)
$requestIndex = $consent.IndexOf('ConsentInformation.shared.requestConsentInfoUpdate', [StringComparison]::Ordinal)
$postRequestPublishIndex = $consent.IndexOf('self.publishSnapshot()', $postRequestMarkIndex, [StringComparison]::Ordinal)
$completionProcessorIndex = $consent.IndexOf('private func processConsentUpdateCompletion', [StringComparison]::Ordinal)
Test-Stage3ACondition ($beginIndex -ge 0 -and $requestIndex -gt $beginIndex -and
    $postRequestMarkIndex -gt $requestIndex -and $postRequestPublishIndex -gt $postRequestMarkIndex -and
    $completionProcessorIndex -gt $postRequestPublishIndex -and
    $consent.Contains('DispatchQueue.main.async { [weak self] in')) `
    'Consent request precedes immediate post-request snapshot and deferred completion processing'
$completeIndex = $consent.IndexOf('completeUpdate(errorCode: errorCode)', [StringComparison]::Ordinal)
$completionPublishIndex = $consent.IndexOf('publishSnapshot()', $completeIndex, [StringComparison]::Ordinal)
$errorGuardIndex = $consent.IndexOf('guard shouldLoadRequiredForm else { return }', $completeIndex, [StringComparison]::Ordinal)
$loadIndex = $consent.IndexOf('loadAndPresentRequiredForm()', $completeIndex, [StringComparison]::Ordinal)
Test-Stage3ACondition ($flow.Contains('return errorCode == nil') -and $completeIndex -ge 0 -and
    $completionPublishIndex -gt $completeIndex -and $errorGuardIndex -gt $completionPublishIndex -and $loadIndex -gt $errorGuardIndex) `
    'Consent update errors publish and return before required-form loading'
Test-Stage3ACondition ($flow.Contains('lastErrorCode = errorCode') -and
    $consent.Contains('completeConsentForm(errorCode: errorCode)') -and
    $consent.Contains('completePrivacyOptions(errorCode: errorCode)')) `
    'Successful consent/form/privacy operations clear stale error state through nil error codes'
Test-Stage3ACondition ($consent.Contains('canRequestAds: information.canRequestAds') -and
    -not $consent.Contains('IAB') -and -not $consent.Contains('localizedDescription')) `
    'UMP remains the consent authority and raw consent/error text is not exposed'

$markStart = $flow.IndexOf('mutating func markSDKInitialized()', [StringComparison]::Ordinal)
$markEnd = $flow.IndexOf('mutating func setRewardedReady', $markStart, [StringComparison]::Ordinal)
$markBody = $flow.Substring($markStart, $markEnd - $markStart)
Test-Stage3ACondition ($markBody.Contains('sdkInitializationStarted') -and
    $markBody.Contains('sdkInitialized = true') -and -not $markBody.Contains('canRequestAds')) `
    'SDK completion no longer depends on current canRequestAds'
Test-Stage3ACondition (([regex]::Matches($ad, 'MobileAds\.shared\.start')).Count -eq 1 -and
    $ad.IndexOf('setPublisherFirstPartyIDEnabled(false)', [StringComparison]::Ordinal) -lt
    $ad.IndexOf('MobileAds.shared.start', [StringComparison]::Ordinal)) `
    'MobileAds start has one path and publisher first-party ID is disabled first'
Test-Stage3ACondition ($flow.Contains('guard !isTornDown else { return false }') -and
    $flow.Contains('rewardedReady = false') -and $flow.Contains('interstitialReady = false')) `
    'Teardown and consent loss prevent recovery while clearing readiness'
Test-Stage3ACondition ($controller.IndexOf('consentManager.onConsentStateChanged', [StringComparison]::Ordinal) -ge 0 -and
    $controller.Contains('requestConsentUpdateOncePerLaunch()') -and
    -not $controller.Contains('MobileAds.shared') -and $controller.Contains('[weak adManager]')) `
    'GameViewController preserves listener-first, one-launch, weak ownership without direct SDK start'
Test-Stage3ACondition ($controller.Contains('WeakScriptMessageHandler(delegate: self)') -and
    -not $controller.Contains('contentController.add(self, name: "SqueezeRushIOS")')) `
    'Stage 2A weak legacy handler and typed/legacy bridge ownership remain intact'

$swiftCompiler=Get-Command swiftc -ErrorAction SilentlyContinue
if($swiftCompiler){
    $swiftFiles=@(Get-ChildItem -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS') -Filter '*.swift' -File | Select-Object -ExpandProperty FullName)
    $parseOutput=& $swiftCompiler.Source -frontend -parse $swiftFiles 2>&1 | Out-String
    $parseExit=$LASTEXITCODE
    Test-Stage3ACondition ($parseExit -eq 0) 'All native Swift files pass Swift frontend syntax parsing'
    if($parseExit -ne 0){Write-Host $parseOutput}
}else{Test-Stage3ACondition $false 'Swift compiler is available for syntax parsing'}

Write-Host ''
Write-Host "STAGE 3A STATIC CHECK RESULT: $($passes.Count) passed, $($failures.Count) failed"
if($failures.Count -gt 0){exit 1}
