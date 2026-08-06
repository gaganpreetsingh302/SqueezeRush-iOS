# Squeeze Rush Stage 3A Implementation Report

Date: 2026-08-04  
Active project: `D:\Games\Squeeze rush\SqueezeRushIOS-Advanced-2.0.0`  
Protected sibling: `D:\Games\Squeeze rush\SqueezeRush`  
Scope: exact UMP dependency pinning, previous-session consent publication, consent error-path correction, and Mobile Ads SDK-start race hardening. Stage 4 gameplay monetization was not started.

## 1. Baseline verification

All 14 required Stage 3 hashes matched before any production file was changed. No `STAGE_3A_BASELINE_FAILURE.md` was created.

| File | Required and observed SHA-256 | Result |
|---|---|---|
| `SqueezeRushIOS\GameViewController.swift` | `36C0C0DECE0FE4BBA19D53E6391F12EF453E091750C96E4446B3004F79B250A1` | Match |
| `SqueezeRushIOS\Info.plist` | `5931E12FF3D7F4BCBECDBB7E8949981F04C48433F8B68DBE296958ACCA0D9B4C` | Match |
| `SqueezeRushIOS\PrivacyInfo.xcprivacy` | `521EB6EF8430773E5C010E1838FE9DD8FA5D62B7B76D1CEA8D7D8DAADCB144E2` | Match |
| `SqueezeRushIOS\SqueezeRushAdFlowState.swift` | `CAA8308BF713BB796C1AE9CE910EAB1B8748C6F349F02818F170FECC8ABD6B33` | Match |
| `SqueezeRushIOS\SqueezeRushAdManager.swift` | `EB34DDD2FF1656B4436A8EFF5281690285DEC7F57984B66BD8876057F58A89EC` | Match |
| `SqueezeRushIOS\SqueezeRushConsentManager.swift` | `3C4938204BAB916FFF6F02D94BD48FF48D574978046C404BAFF103B7172C98C3` | Match |
| `SqueezeRushIOS\SqueezeRushNativeBridge.swift` | `161AC432E2C35BAF0070CD92E868DD07E5E55D462DA8CF50F74501F594E95A98` | Match |
| `SqueezeRushIOS\BuildScripts\ValidateAdMobReleaseConfiguration.sh` | `DAA2EACD27519560FC7998940787AE5B1DBD0C159C47E37CFE6C145B6ED6600F` | Match |
| `SqueezeRushIOS.xcodeproj\project.pbxproj` | `EE6E22E38E4DFA6C8AF61B1CA7FCDA1EA20B03A9D1054E4AEC320BBBD952344A` | Match |
| `SqueezeRushIOS\Web\game.js` | `E6318E1BF8D533B6AD6F02B9B053A730BD0FB598CD9F5053A16BBE9D25B9C973` | Match |
| `SqueezeRushIOS\Web\index.html` | `6785CE9289404B0F72681871C34C225364C07E431BA01411278D85C3FA24C39C` | Match |
| `SqueezeRushIOS\Web\native-bridge.js` | `4DD3FB2BC5B1A4A0349BAED9B1065E5F2CB1B833EE4ADE1EE9F10959D1092D50` | Match |
| `SqueezeRushIOS\Web\run-lifecycle.js` | `F0EED9B5257260C09A81E54626E146950C202359405AE367FE6E1D3EB680910F` | Match |
| `SqueezeRushIOS\Web\styles.css` | `AF2C5C55B050A7BA77139712F0D081A5967AD5E2DFBB97F6F5F8C3BFB635FB53` | Match |

## 2. Backup

- Path: `D:\Games\Squeeze rush\Backups\SqueezeRushIOS-Advanced-2.0.0-pre-stage3a-20260804-205540.zip`
- Size: 3,454,788 bytes
- SHA-256: `D1AE321B590A60E8EA3D472C9521D929EF021CB37EF9FA74409AAD67177296CD`
- Entries: 91
- Verification: every required baseline file was opened from the ZIP and its archive-stream SHA-256 matched; result `14/14`.
- The ZIP is outside the active project.

## 3. Exact files modified and created

Production files modified:

- `SqueezeRushIOS\SqueezeRushAdFlowState.swift`
- `SqueezeRushIOS\SqueezeRushConsentManager.swift`
- `SqueezeRushIOS.xcodeproj\project.pbxproj`

Documentation/metadata modified:

- `STAGE_3_PACKAGE_METADATA.json`
- `NATIVE_BRIDGE_PROTOCOL.md`
- `PRIVACY_DATA_INVENTORY_STAGE3.md`

Testing modified or created:

- `tools\Test-Stage3Static.ps1`
- `tools\stage3a-state-tests.swift`
- `tools\Run-Stage3ATests.ps1`
- `tools\Test-Stage3AStatic.ps1`
- `tools\New-Stage3AReviewBundle.ps1`

Delivery files created:

- `STAGE_3A_IMPLEMENTATION_REPORT.md`
- `STAGE_3A_CHANGED_FILES.txt`
- `D:\Games\Squeeze rush\ReviewBundles\SqueezeRush-Stage3A-Review-20260804-210106.zip`

`GameViewController.swift`, `SqueezeRushAdManager.swift`, `SqueezeRushNativeBridge.swift`, `Info.plist`, `PrivacyInfo.xcprivacy`, the Release guard, and all five Web production files required no change.

## 4. Exact package references and product dependencies

Official manifests were retrieved and read on 2026-08-04:

- Google Mobile Ads 13.7.0: `https://raw.githubusercontent.com/googleads/swift-package-manager-google-mobile-ads/13.7.0/Package.swift`
- Google UMP 3.1.0: `https://raw.githubusercontent.com/googleads/swift-package-manager-google-user-messaging-platform/3.1.0/Package.swift`
- UMP guide: `https://developers.google.com/admob/ios/privacy`
- Official Swift consent sample: `https://github.com/googleads/googleads-mobile-ios-examples`

The project now contains exactly these direct package references:

| Package | Repository | Requirement | Product linked once |
|---|---|---|---|
| Google Mobile Ads | `https://github.com/googleads/swift-package-manager-google-mobile-ads.git` | `exactVersion 13.7.0` | `GoogleMobileAds` |
| Google UMP | `https://github.com/googleads/swift-package-manager-google-user-messaging-platform.git` | `exactVersion 3.1.0` | `GoogleUserMessagingPlatform` |

The UMP product is present once in `packageProductDependencies` and once in the Frameworks phase through one `PBXBuildFile`. Swift source continues to use:

```swift
import UserMessagingPlatform
```

Google Mobile Ads 13.7.0's official package declares the same UMP package identity with range `1.1.0..<4.0.0`. Exact UMP `3.1.0` satisfies that range. SwiftPM is expected to unify the direct and transitive requirements into one package/binary graph; the project does not define a second UMP repository identity or manually embed an XCFramework.

## 5. Why UMP is now pinned directly

Stage 3 relied on the compatible UMP version selected through Google Mobile Ads' transitive range. Stage 3A makes the app target's direct UMP usage auditable and deterministic:

- app source imports `UserMessagingPlatform` directly;
- the project links the official `GoogleUserMessagingPlatform` product directly;
- UMP cannot float within `1.1.0..<4.0.0`;
- Mobile Ads remains exact 13.7.0;
- expected resolution is explicitly Mobile Ads 13.7.0 plus UMP 3.1.0.

## 6. Package-resolution limitations

`xcodebuild` is unavailable on Windows. The prior official-package resolution attempt failed in the Windows Swift 6.0.1 SDK module graph before dependencies could be resolved. Stage 3A therefore did not fabricate `Package.resolved` or claim Apple/Google SDK type checking.

Authoritative Xcode resolution remains pending. Xcode must generate a graph selecting exactly:

- `swift-package-manager-google-mobile-ads` 13.7.0;
- `swift-package-manager-google-user-messaging-platform` 3.1.0.

Any second UMP identity, duplicate binary, different version, product-link warning, or package conflict is a stop condition.

## 7. Consent flow before and after

Before Stage 3A:

1. `requestConsentInfoUpdate` started without first publishing the previous-session snapshot.
2. Its callback set an error value, published, and called `loadAndPresentIfRequired` even when the update failed.
3. A later successful update/form/privacy operation did not consistently clear a stale `lastErrorCode`.

After Stage 3A:

1. `beginUpdateOnce()` still enforces one update attempt per launch.
2. Explicit DEBUG test reset/geography configuration is applied first.
3. The current bounded UMP snapshot is published.
4. `requestConsentInfoUpdate` then starts.
5. `SqueezeRushConsentFlowState.completeUpdate(errorCode:)` records/clears the error and returns whether required-form loading is allowed.
6. The callback publishes once and returns immediately on error.
7. Only a successful update calls `loadAndPresentIfRequired`.
8. Consent-form and privacy-options completions record a normalized error or clear it with `nil`, then publish the updated snapshot.

No raw localized error, IAB string, stored consent override, automatic reset, ATT prompt, or visible privacy UI was added.

## 8. Previous-session consent behavior

`GameViewController.viewDidLoad()` installs `onConsentStateChanged` before `viewDidAppear()` can start consent collection. The listener weakly forwards every snapshot to `adManager.updateConsent(canRequestAds:)`.

When `requestConsentUpdateOncePerLaunch()` begins, `SqueezeRushConsentManager` reads its snapshot from `ConsentInformation.shared`, marks the initial publication, and calls `publishSnapshot()` before `requestConsentInfoUpdate`. If UMP's previous-session value already allows ads, that authoritative value can request the one SDK startup immediately while the mandatory launch update is in flight.

The manager does not invent or persist a consent decision. UMP remains authoritative.

## 9. Consent update-error behavior

On update error:

- `updateCompleted` becomes true;
- the error is normalized from domain/code only;
- `lastErrorCode` is set;
- the current UMP snapshot is published;
- `loadAndPresentIfRequired` is not called;
- UMP's previous-session `canRequestAds` remains untouched.

On update success, `lastErrorCode` is cleared before publishing and form loading. Successful required-form or privacy-options completion similarly clears its prior error. Failure records the new normalized error. Completion locks and exactly-once request sequencing are preserved.

## 10. SDK initialization race before and after

Before Stage 3A, `markSDKInitialized()` required `canRequestAds` to still be true. A true -> start in flight -> false sequence rejected the SDK completion but left `sdkInitializationStarted` true, permanently preventing another start or successful recovery.

After Stage 3A:

- `sdkInitializationStarted` means the one SDK start was requested;
- `sdkInitialized` means its completion was received;
- `canRequestAds` independently represents current permission to load/present;
- `markSDKInitialized()` requires only not torn down, start requested, and not already initialized;
- SDK completion while consent is false records initialization, while `preloadAdsIfAllowed()` still refuses all loads;
- a later true consent state sees the already initialized SDK and preloads without calling `MobileAds.start` again;
- false consent clears ready flags and the manager clears retained ads, but does not pretend the process-global SDK became uninitialized;
- teardown rejects later consent recovery and SDK completion.

Publisher first-party ID remains disabled before the single `MobileAds.shared.start` path. No retry/backoff was added.

## 11. Coordinator state-transition table

| Event | `canRequestAds` | `sdkInitializationStarted` | `sdkInitialized` | Readiness/load outcome |
|---|---:|---:|---:|---|
| Initial | false | false | false | no load |
| `updateConsent(true)` first time | true | true | false | returns “start SDK”; no load yet |
| repeated `updateConsent(true)` while starting | true | true | false | no second start |
| `updateConsent(false)` while starting | false | true | false | readiness cleared; no load |
| SDK completion while false | false | true | true | completion retained; no load |
| later `updateConsent(true)` | true | true | true | no second start; preload allowed |
| `updateConsent(false)` after initialized | false | true | true | readiness/ads cleared; SDK remains initialized |
| `teardown()` | false | retained | retained | all readiness/presentation cleared; later recovery blocked |

The deterministic tests also cover `true, true, false, true` and observe exactly one start request.

## 12. Ownership and GameViewController review

- `GameViewController` strongly owns the web view, native bridge, consent manager, and ad manager.
- Consent/ad managers hold their presentation owner weakly.
- The consent-state closure captures `adManager` weakly.
- Google/UMP async callbacks capture their manager weakly.
- The typed bridge holds the presentation owner, web view, user-content controller, consent service, and ad service weakly.
- `WeakScriptMessageHandler` still holds `GameViewController` weakly.
- `viewDidAppear` still has the one-launch guard and is the only consent-flow start location.
- `GameViewController` does not call `MobileAds` directly.
- Typed `squeezeRushBridge` and legacy `SqueezeRushIOS` share/haptic behavior are unchanged.

No all-strong path returns to `GameViewController`.

## 13. Test commands and results

Environment:

- Windows PowerShell `5.1.26100.8972`
- Python `3.13.3`
- Microsoft Edge `151.0.4129.59`
- Swift compiler `6.0.1` Windows target, used for pure-state compilation and syntax parsing
- Git `2.55.0.windows.2`
- Xcode/xcodebuild unavailable

Exact commands, run from the active project:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Run-Stage1LifecycleTests.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Run-Stage2BridgeTests.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-Stage2Static.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-Stage2AStatic.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Run-Stage3Tests.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-Stage3Static.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Run-Stage3ATests.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-Stage3AStatic.ps1
```

Final results:

| Gate | Result |
|---|---|
| Stage 1 lifecycle | `10/10 passed, 0 failed` |
| Stage 2 browser bridge | `21/21 passed, 0 failed`; file mock gate PASS |
| Stage 2 static | `94/94 passed, 0 failed` |
| Stage 2A static | `13/13 passed, 0 failed` |
| Stage 3 deterministic | `26/26 passed, 0 failed` |
| Stage 3 static | `36/36 passed, 0 failed` |
| Stage 3A deterministic A-R | `18/18 passed, 0 failed` |
| Stage 3A static/syntax | `29/29 passed, 0 failed` |
| Release guard | PASS: missing, sample, malformed, or unapproved Release configuration is rejected |

Stage 3A deterministic cases cover immediate previous-state publication; update failure/no form; preserved UMP permission; error clearing; one-time SDK start; false-during-start completion; initialized-but-no-load state; later recovery without restart; repeated transitions; readiness clearing; teardown; both exact packages/products; unchanged Web; and no Stage 4 behavior.

Stage 3A static checks cover exact repository/version/product cardinality, target and Frameworks membership, no fabricated resolution, unchanged test/Release identifiers and guard, absence of ATT/StoreKit/Firebase/analytics/review/More Games, protected files, consent ordering/error return, error clearing, UMP authority, consent-independent SDK completion, one SDK-start path, first-party-ID ordering, teardown, weak ownership, legacy handler preservation, and syntax parsing of every Swift file.

`swiftc -frontend -parse` passed. This is syntax validation only, not Apple/Google SDK type checking or linkage.

## 14. Manual Xcode/device tests

1. Open `SqueezeRushIOS.xcodeproj` in Xcode 16 or newer.
2. Resolve packages and inspect the generated `Package.resolved`.
3. Confirm one package identity for Google Mobile Ads at exact 13.7.0.
4. Confirm one package identity for UMP at exact 3.1.0.
5. Confirm target package products and Link Binary With Libraries contain `GoogleMobileAds` and `GoogleUserMessagingPlatform` once each, with no duplicate-binary warning.
6. Build Debug for an iOS 15+ simulator and verify `import UserMessagingPlatform` type-checks.
7. Build Debug for a physical iPhone with legitimate signing.
8. With a previous-session consent state that permits ads, launch and confirm capabilities can reflect SDK startup before the update callback, while the update still runs once.
9. Simulate a consent-information update error and confirm no required form attempt occurs; verify the UMP `canRequestAds` value remains authoritative.
10. Complete a later successful update/form/privacy-options operation and confirm `lastErrorCode` clears.
11. Reproduce true -> SDK starting -> false -> SDK completion -> true; confirm one SDK start, no load while false, and preload after the final true.
12. Confirm changing consent to false clears loaded/readiness state without claiming the SDK uninitialized.
13. Confirm returning from a form/share sheet does not restart the launch flow.
14. Confirm no ATT prompt, gameplay monetization UI, automatic ad, StoreKit, analytics, review, or More Games behavior appears.
15. Re-run the Release archive guard and confirm current empty IDs/approval `NO` fail.

## 15. Known risks

- Xcode package resolution and SDK type checking/linking remain pending. Windows cannot prove SwiftPM graph unification or absence of an Xcode linker warning.
- A generated `Package.resolved` must be reviewed rather than blindly accepted; only 13.7.0 and 3.1.0 are approved.
- UMP previous-session state and forced update-error behavior require device/simulator validation against the real SDK and configured AdMob messages.
- SDK startup is process-global; deterministic tests validate the coordinator decisions, not Google runtime internals.
- The Debug reset launch argument intentionally clears UMP state before the immediate snapshot, preventing stale pre-reset permission from being published; this must be verified in Xcode.
- The protected Stage 2 JavaScript still has no gameplay ad caller. Stage 3A does not change that boundary.
- Production privacy/account/audience blockers documented in Stage 3 remain unresolved.

## 16. Post-change hashes

Changed production files:

| File | Bytes | SHA-256 |
|---|---:|---|
| `SqueezeRushIOS\SqueezeRushAdFlowState.swift` | 10,162 | `0BE1C85E4099A734FB1D138D624C31244585373C3A6921FA19C55BCF1EC1B257` |
| `SqueezeRushIOS\SqueezeRushConsentManager.swift` | 9,926 | `F7576BA2F79C7BF4A955C5A21D710968F009FC47A15F4E0D074FBD9FE3627A53` |
| `SqueezeRushIOS.xcodeproj\project.pbxproj` | 18,110 | `ABC120C228323A6379572F3D3487A8813515E808BD31B0BD424C634E99B4EB3D` |

Changed supporting files before creation of this report/change manifest:

| File | Bytes | SHA-256 |
|---|---:|---|
| `NATIVE_BRIDGE_PROTOCOL.md` | 16,701 | `7D7E05FC8FF51987CD1F061BDBD3404797D68A928D2189D5CCBB49DFB2790EA9` |
| `PRIVACY_DATA_INVENTORY_STAGE3.md` | 6,777 | `C4707F84F20B4BF6273090F9F316F08D1DFBED9FFCBD166830513EE7437BC078` |
| `STAGE_3_PACKAGE_METADATA.json` | 1,840 | `F4F91919D273A02F44E2222956D01616C55D8A828742834AC3FC66E7D18922DD` |
| `tools\Test-Stage3Static.ps1` | 16,365 | `68B31D780D6B97B9B3D48778255530DAFC89A40B787424927DD8EB9448922769` |
| `tools\stage3a-state-tests.swift` | 5,949 | `2FD77ABAA8D88D6BAE23B5BC285C0F6C50A3F844E0C73B1C39D4A8627FFAA39B` |
| `tools\Run-Stage3ATests.ps1` | 4,804 | `C1842A2EEB706D7722ADE4D34916692F3F1288D7E44117750C8395FA8AC63447` |
| `tools\Test-Stage3AStatic.ps1` | 13,578 | `BFDD16537E6F9616862F645A3C90CD550B0D4A4D3EF1D977900387E4E67E111E` |

The review-bundle manifest records final hashes for every delivery file, including this report and the changed-files list.

Critical unchanged files retain their Stage 3 hashes, including `GameViewController.swift`, `SqueezeRushAdManager.swift`, `SqueezeRushNativeBridge.swift`, the Release guard, `Info.plist`, and all five Web files.

## 17. Stage 4 confirmation

No ad is connected to revive, Double Rewards, XP, Cores, retry, menu, or run finalization. No automatic interstitial, cadence, cooldown, gameplay button, gameplay UI, StoreKit, analytics, ATT, review prompt, More Games action, production identifier, or test-device identifier was added. The protected sibling/archive sources were not modified.

Stage 4 was not started.
