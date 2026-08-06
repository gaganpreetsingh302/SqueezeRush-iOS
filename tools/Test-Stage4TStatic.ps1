[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot '..')).Path
$passes = [Collections.Generic.List[string]]::new()
$failures = [Collections.Generic.List[string]]::new()

function Test-Stage4TCondition {
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

$schemeDirectory = Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\xcshareddata\xcschemes'
$existingSchemePath = Join-Path $schemeDirectory 'SqueezeRushIOS.xcscheme'
$internalSchemePath = Join-Path $schemeDirectory 'SqueezeRushIOS-InternalAdTest.xcscheme'
$projectPath = Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\project.pbxproj'
$guardPath = Join-Path $projectRoot 'SqueezeRushIOS\BuildScripts\ValidateAdMobReleaseConfiguration.sh'
$packagePath = Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\project.xcworkspace\xcshareddata\swiftpm\Package.resolved'

$xmlValid = $false
$internalXml = $null
try {
    $internalXml = [xml](Get-Content -Raw -LiteralPath $internalSchemePath)
    $xmlValid = $null -ne $internalXml.Scheme
}
catch {
    Write-Host "XML parse error: $($_.Exception.Message)" -ForegroundColor Red
}
Test-Stage4TCondition $xmlValid 'Internal-ad-test scheme parses as valid XML'

$existingXml = [xml](Get-Content -Raw -LiteralPath $existingSchemePath)
$internalText = Get-Content -Raw -LiteralPath $internalSchemePath
$existingText = Get-Content -Raw -LiteralPath $existingSchemePath
$internalBuildReference = $internalXml.Scheme.BuildAction.BuildActionEntries.BuildActionEntry.BuildableReference
$internalLaunchReference = $internalXml.Scheme.LaunchAction.BuildableProductRunnable.BuildableReference
$existingBuildReference = $existingXml.Scheme.BuildAction.BuildActionEntries.BuildActionEntry.BuildableReference

Test-Stage4TCondition (
    $internalBuildReference.BlueprintIdentifier -eq 'A1B2C3D4E5F6071829300002' -and
    $internalBuildReference.BlueprintName -eq 'SqueezeRushIOS' -and
    $internalBuildReference.BuildableName -eq 'Squeeze Rush.app'
) 'Internal scheme builds the existing SqueezeRushIOS application target'
Test-Stage4TCondition (
    $internalBuildReference.BlueprintIdentifier -eq $existingBuildReference.BlueprintIdentifier -and
    $internalBuildReference.ReferencedContainer -eq $existingBuildReference.ReferencedContainer -and
    $internalLaunchReference.BlueprintIdentifier -eq $existingBuildReference.BlueprintIdentifier -and
    $internalLaunchReference.ReferencedContainer -eq $existingBuildReference.ReferencedContainer
) 'Internal scheme reuses the working scheme blueprint identifier and container reference'

$buildEntry = $internalXml.Scheme.BuildAction.BuildActionEntries.BuildActionEntry
Test-Stage4TCondition (
    $buildEntry.buildForTesting -eq 'YES' -and
    $buildEntry.buildForRunning -eq 'YES' -and
    $buildEntry.buildForProfiling -eq 'YES' -and
    $buildEntry.buildForArchiving -eq 'YES' -and
    $buildEntry.buildForAnalyzing -eq 'YES'
) 'Internal scheme enables the target for every required Xcode action'
Test-Stage4TCondition ($internalXml.Scheme.LaunchAction.buildConfiguration -eq 'Debug') 'Run uses Debug'
Test-Stage4TCondition ($internalXml.Scheme.TestAction.buildConfiguration -eq 'Debug') 'Test uses Debug'
Test-Stage4TCondition ($internalXml.Scheme.ProfileAction.buildConfiguration -eq 'Debug') 'Profile uses Debug'
Test-Stage4TCondition ($internalXml.Scheme.AnalyzeAction.buildConfiguration -eq 'Debug') 'Analyze uses Debug'
Test-Stage4TCondition ($internalXml.Scheme.ArchiveAction.buildConfiguration -eq 'Debug') 'Archive uses Debug'
Test-Stage4TCondition (
    -not $internalText.Contains('<CommandLineArguments') -and
    -not $internalText.Contains('<CommandLineArgument') -and
    -not $internalText.Contains('SQUEEZE_RUSH_UMP_RESET') -and
    -not $internalText.Contains('resetConsent')
) 'Internal scheme contains no consent-reset or other launch argument'
Test-Stage4TCondition (
    -not [regex]::IsMatch($internalText, '(?i)testDevice|deviceIdentifier|[0-9a-f]{40}')
) 'Internal scheme contains no physical test-device identifier'
Test-Stage4TCondition (
    -not [regex]::IsMatch($internalText, '(?i)developmentTeam|teamIdentifier|provisioning|certificate|credential|password|api[_-]?key')
) 'Internal scheme contains no credential, team, certificate, or provisioning data'
Test-Stage4TCondition (
    (Get-FileHash -LiteralPath $existingSchemePath -Algorithm SHA256).Hash -eq 'B2C2E619120C04C6FEB6964E4DF27677681583D36FA29DBD26A4875C82111E7A'
) 'Existing SqueezeRushIOS scheme remains byte-identical'
Test-Stage4TCondition (
    $existingXml.Scheme.ProfileAction.buildConfiguration -eq 'Release' -and
    $existingXml.Scheme.ArchiveAction.buildConfiguration -eq 'Release'
) 'Existing production scheme retains its Release Profile and Archive actions'
$sharedSchemeNames = @(Get-ChildItem -LiteralPath $schemeDirectory -Filter '*.xcscheme' -File | Select-Object -ExpandProperty Name | Sort-Object)
Test-Stage4TCondition (
    $sharedSchemeNames.Count -eq 2 -and
    @($sharedSchemeNames | Where-Object { $_ -eq 'SqueezeRushIOS-InternalAdTest.xcscheme' }).Count -eq 1 -and
    @($sharedSchemeNames | Where-Object { $_ -eq 'SqueezeRushIOS.xcscheme' }).Count -eq 1
) 'Production and internal-test schemes coexist as separate shared schemes'

$stage4ProductionHashes = [ordered]@{
    'SqueezeRushIOS\GameViewController.swift' = '36C0C0DECE0FE4BBA19D53E6391F12EF453E091750C96E4446B3004F79B250A1'
    'SqueezeRushIOS\Info.plist' = '5931E12FF3D7F4BCBECDBB7E8949981F04C48433F8B68DBE296958ACCA0D9B4C'
    'SqueezeRushIOS\PrivacyInfo.xcprivacy' = '521EB6EF8430773E5C010E1838FE9DD8FA5D62B7B76D1CEA8D7D8DAADCB144E2'
    'SqueezeRushIOS\SqueezeRushAdFlowState.swift' = '0D6E5F447BBE77F2EA5585E389977FBFDECB69882F7E5B06FCA121CFB434009C'
    'SqueezeRushIOS\SqueezeRushAdManager.swift' = 'EB34DDD2FF1656B4436A8EFF5281690285DEC7F57984B66BD8876057F58A89EC'
    'SqueezeRushIOS\SqueezeRushConsentManager.swift' = 'EF4D6F88C8F680BE65EED600A3FB760FA1E96CE947F1FCAE0E8E598798AFA3DA'
    'SqueezeRushIOS\SqueezeRushNativeBridge.swift' = '161AC432E2C35BAF0070CD92E868DD07E5E55D462DA8CF50F74501F594E95A98'
    'SqueezeRushIOS\BuildScripts\ValidateAdMobReleaseConfiguration.sh' = 'DAA2EACD27519560FC7998940787AE5B1DBD0C159C47E37CFE6C145B6ED6600F'
    'SqueezeRushIOS.xcodeproj\project.pbxproj' = 'ABC120C228323A6379572F3D3487A8813515E808BD31B0BD424C634E99B4EB3D'
    'SqueezeRushIOS\Web\game.js' = '49951E3BA0D3321FC1349EEFF5A2D8D5975F45711510403C3AF9A1D3B0D15B58'
    'SqueezeRushIOS\Web\index.html' = 'F09B7CC871DEFD5C6CE823BC46AE63E4E95E01E6A179BD225FCC80307816C2F6'
    'SqueezeRushIOS\Web\native-bridge.js' = '33683B8049A2EB9E0E89B53A45012C3826318D5F2D1C11004E6832CB1F72BF95'
    'SqueezeRushIOS\Web\run-lifecycle.js' = '6D0AF635A9C638183035E312BAE26E7076B1561635C649EB7F3266BE124C6397'
    'SqueezeRushIOS\Web\styles.css' = '7C3B6BAFF43C1ED04F631BA302A6F2902AF29FD715ABF1FAE9979E07BAD5D6CB'
}
$productionMatches = $true
foreach ($entry in $stage4ProductionHashes.GetEnumerator()) {
    $actual = (Get-FileHash -LiteralPath (Join-Path $projectRoot $entry.Key) -Algorithm SHA256).Hash
    if ($actual -ne $entry.Value) {
        $productionMatches = $false
        Write-Host "Production hash mismatch: $($entry.Key)" -ForegroundColor Red
    }
}
Test-Stage4TCondition $productionMatches 'All 14 Stage 4 production files remain byte-identical'

$project = Get-Content -Raw -LiteralPath $projectPath
$debugBlock = [regex]::Match($project, 'A1B2C3D4E5F6071829300023 /\* Debug \*/ = \{(?<body>.*?)\n\s*\};\n\s*name = Debug;', 'Singleline').Groups['body'].Value
$releaseBlock = [regex]::Match($project, 'A1B2C3D4E5F6071829300024 /\* Release \*/ = \{(?<body>.*?)\n\s*\};\n\s*name = Release;', 'Singleline').Groups['body'].Value
Test-Stage4TCondition (
    $debugBlock.Contains('ADMOB_APP_ID = "ca-app-pub-3940256099942544~1458002511";') -and
    $debugBlock.Contains('ADMOB_REWARDED_AD_UNIT_ID = "ca-app-pub-3940256099942544/1712485313";') -and
    $debugBlock.Contains('ADMOB_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-3940256099942544/4411468910";')
) 'Debug preserves the three official Google sample/test identifiers'
Test-Stage4TCondition (
    -not $releaseBlock.Contains('3940256099942544') -and
    ([regex]::Matches($releaseBlock, 'ADMOB_(?:APP_ID|REWARDED_AD_UNIT_ID|INTERSTITIAL_AD_UNIT_ID) = "";')).Count -eq 3 -and
    $releaseBlock.Contains('SQUEEZE_RUSH_ADS_RELEASE_APPROVED = NO;')
) 'Release IDs remain empty and Release approval remains NO'
Test-Stage4TCondition (
    (Get-FileHash -LiteralPath $guardPath -Algorithm SHA256).Hash -eq 'DAA2EACD27519560FC7998940787AE5B1DBD0C159C47E37CFE6C145B6ED6600F'
) 'Release validation guard remains byte-identical'

$packageHash = (Get-FileHash -LiteralPath $packagePath -Algorithm SHA256).Hash
$package = Get-Content -Raw -LiteralPath $packagePath | ConvertFrom-Json
$pins = @($package.pins)
$adsPin = @($pins | Where-Object identity -eq 'swift-package-manager-google-mobile-ads')
$umpPin = @($pins | Where-Object identity -eq 'swift-package-manager-google-user-messaging-platform')
Test-Stage4TCondition (
    $packageHash -eq '8E96CD38A6F0A22EFBE3D1D7319D77CA46CAFA303E145D80CFAE7D8BFA088847' -and
    $adsPin.Count -eq 1 -and $adsPin[0].state.version -eq '13.7.0' -and
    $umpPin.Count -eq 1 -and $umpPin[0].state.version -eq '3.1.0'
) 'Package.resolved remains byte-identical at Mobile Ads 13.7.0 and UMP 3.1.0'

$protectedSibling = Join-Path $workspaceRoot 'SqueezeRush\game.js'
Test-Stage4TCondition (
    (Get-FileHash -LiteralPath $protectedSibling -Algorithm SHA256).Hash -eq '022D2B0DA412AFFE10D2960A357B615107A54912A65EEC31EB4686B0040BE257'
) 'Protected sibling source remains unchanged'

Write-Host ''
Write-Host "STAGE 4T STATIC CHECK RESULT: $($passes.Count) passed, $($failures.Count) failed"
if ($failures.Count -gt 0) { exit 1 }
