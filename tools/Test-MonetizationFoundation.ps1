[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot '..')).Path
$androidRoot = Join-Path $workspaceRoot 'SqueezeRushAndroid'
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

$purchasePath = Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushPurchaseManager.swift'
$bridgePath = Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRushNativeBridge.swift'
$controllerPath = Join-Path $projectRoot 'SqueezeRushIOS\GameViewController.swift'
$projectPath = Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\project.pbxproj'
$plistPath = Join-Path $projectRoot 'SqueezeRushIOS\Info.plist'
$guardPath = Join-Path $projectRoot 'SqueezeRushIOS\BuildScripts\ValidateAdMobReleaseConfiguration.sh'
$webGamePath = Join-Path $projectRoot 'SqueezeRushIOS\Web\game.js'
$webIndexPath = Join-Path $projectRoot 'SqueezeRushIOS\Web\index.html'
$purchase = Get-Content -Raw -LiteralPath $purchasePath
$bridge = Get-Content -Raw -LiteralPath $bridgePath
$controller = Get-Content -Raw -LiteralPath $controllerPath
$project = Get-Content -Raw -LiteralPath $projectPath
$plist = Get-Content -Raw -LiteralPath $plistPath
$guard = Get-Content -Raw -LiteralPath $guardPath
$webGame = Get-Content -Raw -LiteralPath $webGamePath
$webIndex = Get-Content -Raw -LiteralPath $webIndexPath

Test-Condition ($purchase.Contains('import StoreKit') -and $purchase.Contains('Product.products(for:') -and $purchase.Contains('Transaction.currentEntitlements')) 'iOS uses StoreKit 2 products and verified current entitlements'
Test-Condition ($purchase.Contains('Transaction.updates') -and $purchase.Contains('transaction.finish()')) 'iOS listens for transaction updates and finishes verified transactions'
Test-Condition ($purchase.Contains('AppStore.sync()')) 'iOS restore uses AppStore sync'
Test-Condition (([regex]::Matches($project, 'SqueezeRushPurchaseManager\.swift in Sources')).Count -eq 2) 'iOS purchase manager is referenced once by the target source phase'
Test-Condition ($controller.Contains('purchaseService: purchaseManager') -and $controller.Contains('purchaseManager.start()')) 'iOS controller owns and starts the purchase service'
Test-Condition ($bridge.Contains('case purchaseBuy = "purchase.buy"') -and $bridge.Contains('handlePurchase(request:')) 'iOS bridge connects purchase.buy to the purchase service'
Test-Condition ($bridge.Contains('"removeAdsEntitled"') -and $bridge.Contains('"removeAdsPrice"')) 'iOS capabilities expose bounded Remove Ads entitlement data'
Test-Condition ($plist.Contains('SqueezeRushRemoveAdsProductID') -and $plist.Contains('$(SQUEEZE_RUSH_REMOVE_ADS_PRODUCT_ID)')) 'iOS product identifier is build-configured through Info.plist'
Test-Condition (([regex]::Matches($project, 'SQUEEZE_RUSH_REMOVE_ADS_PRODUCT_ID = com\.kasiga\.squeezerush\.remove_ads;')).Count -eq 2) 'iOS Debug and Release use the submitted Remove Ads product identifier'
Test-Condition ($project.Contains('SQUEEZE_RUSH_IAP_RELEASE_APPROVED = YES;') -and $guard.Contains('SQUEEZE_RUSH_IAP_RELEASE_APPROVED must equal YES')) 'iOS IAP Release is explicitly approved and remains protected by the validation gate'
Test-Condition ($project.Contains('com.apple.InAppPurchase = {') -and $project.Contains('enabled = 1;')) 'iOS target explicitly declares the In-App Purchase capability'
Test-Condition ($purchase.Contains('startupProductRetryDelaysNanoseconds') -and $purchase.Contains('purchaseProductRetryDelaysNanoseconds') -and $purchase.Contains('loadProductWithRetry') -and $purchase.Contains('Storefront.updates') -and $purchase.Contains('Storefront.current')) 'iOS retries StoreKit product loading and refreshes for storefront changes'
Test-Condition ($bridge.Contains('purchaseService?.prepareProducts()') -and $controller.Contains('UIApplication.didBecomeActiveNotification')) 'iOS actively prepares products from capability and foreground events'
Test-Condition ($bridge.Contains('"purchaseCatalogState"') -and $bridge.Contains('"purchaseDiagnosticCode"')) 'iOS exposes bounded StoreKit diagnostics for TestFlight verification'
Test-Condition ((Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\xcshareddata\xcschemes\SqueezeRushIOS.xcscheme')).Hash -eq 'B2C2E619120C04C6FEB6964E4DF27677681583D36FA29DBD26A4875C82111E7A') 'Existing iOS production scheme remains byte-identical'
Test-Condition ((Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS.xcodeproj\xcshareddata\xcschemes\SqueezeRushIOS-InternalAdTest.xcscheme')).Contains('SqueezeRush.storekit')) 'Internal iOS scheme uses the local StoreKit test catalog'
Test-Condition ((Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'SqueezeRushIOS\SqueezeRush.storekit')).Contains('com.kasiga.squeezerush.remove_ads')) 'Local StoreKit catalog defines the Remove Ads non-consumable'
Test-Condition ($webIndex.Contains('id="removeAdsBtn"') -and $webIndex.Contains('id="restorePurchasesBtn"')) 'iOS menu includes purchase and restore controls'
Test-Condition ($webGame.Contains('PURCHASE_BUY') -and $webGame.Contains('PURCHASE_RESTORE') -and $webGame.Contains('removeAdsEntitled')) 'iOS web game consumes purchase and entitlement responses'

$gradlePath = Join-Path $androidRoot 'app\build.gradle'
$manifestPath = Join-Path $androidRoot 'app\src\main\AndroidManifest.xml'
$activityPath = Join-Path $androidRoot 'app\src\main\java\com\kasiga\squeezerush\MainActivity.java'
$androidBridgePath = Join-Path $androidRoot 'app\src\main\java\com\kasiga\squeezerush\SqueezeRushNativeBridge.java'
$billingPath = Join-Path $androidRoot 'app\src\main\java\com\kasiga\squeezerush\SqueezeRushBillingManager.java'
$androidGamePath = Join-Path $androidRoot 'app\src\main\assets\game.js'
$gradle = Get-Content -Raw -LiteralPath $gradlePath
$manifest = Get-Content -Raw -LiteralPath $manifestPath
$activity = Get-Content -Raw -LiteralPath $activityPath
$androidBridge = Get-Content -Raw -LiteralPath $androidBridgePath
$billing = Get-Content -Raw -LiteralPath $billingPath
$androidGame = Get-Content -Raw -LiteralPath $androidGamePath

Test-Condition ($gradle.Contains('play-services-ads:25.4.0') -and $gradle.Contains('user-messaging-platform:4.0.0')) 'Android pins current Google Mobile Ads and UMP dependencies'
Test-Condition ($gradle.Contains('billing:9.1.0')) 'Android pins Google Play Billing 9.1.0'
Test-Condition ($gradle.Contains('SQUEEZE_RUSH_MONETIZATION_RELEASE_APPROVED') -and $gradle.Contains('validateReleaseMonetizationConfiguration')) 'Android Release has an explicit monetization validation gate'
Test-Condition ($manifest.Contains('com.google.android.gms.ads.APPLICATION_ID') -and $manifest.Contains('${admobAppId}')) 'Android manifest receives the build-specific AdMob application ID'
Test-Condition ($activity.Contains('SqueezeRushConsentManager') -and $activity.Contains('SqueezeRushAdManager') -and $activity.Contains('SqueezeRushBillingManager')) 'Android activity owns consent, ads, and billing services'
Test-Condition ($billing.Contains('enablePendingPurchases') -and $billing.Contains('enableAutoServiceReconnection') -and $billing.Contains('acknowledgePurchase')) 'Android billing supports pending purchases, reconnection, and acknowledgement'
Test-Condition ($androidBridge.Contains('"rewarded.show"') -and $androidBridge.Contains('"purchase.buy"') -and $androidBridge.Contains('"purchase.restore"')) 'Android native bridge exposes rewarded, purchase, and restore actions'
Test-Condition ($androidGame.Contains('Watch Ad to Revive') -and $androidGame.Contains('response.data?.earned === true')) 'Android grants a revive only after an earned rewarded response'
Test-Condition (-not $androidGame.Contains('No ads. No in-app purchases.')) 'Android game source no longer claims monetization is absent'

Write-Host ''
Write-Host "MONETIZATION FOUNDATION RESULT: $($passes.Count) passed, $($failures.Count) failed"
if ($failures.Count -gt 0) { exit 1 }
