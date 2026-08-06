# Squeeze Rush Stage 3B Implementation Report

Date: 2026-08-04  
Active project: `D:\Games\Squeeze rush\SqueezeRushIOS-Advanced-2.0.0`  
Protected sibling: `D:\Games\Squeeze rush\SqueezeRush`  
Scope: UMP post-request snapshot ordering, completion-order hardening, and strict privacy-options requirement gating. Stage 4 gameplay monetization was not started.

## 1. Baseline verification

All 14 required Stage 3A production hashes matched before any production file was changed. No `STAGE_3B_BASELINE_FAILURE.md` was created.

| File | Required and observed SHA-256 | Result |
|---|---|---|
| `SqueezeRushIOS\SqueezeRushAdFlowState.swift` | `0BE1C85E4099A734FB1D138D624C31244585373C3A6921FA19C55BCF1EC1B257` | Match |
| `SqueezeRushIOS\SqueezeRushConsentManager.swift` | `F7576BA2F79C7BF4A955C5A21D710968F009FC47A15F4E0D074FBD9FE3627A53` | Match |
| `SqueezeRushIOS.xcodeproj\project.pbxproj` | `ABC120C228323A6379572F3D3487A8813515E808BD31B0BD424C634E99B4EB3D` | Match |
| `SqueezeRushIOS\GameViewController.swift` | `36C0C0DECE0FE4BBA19D53E6391F12EF453E091750C96E4446B3004F79B250A1` | Match |
| `SqueezeRushIOS\SqueezeRushAdManager.swift` | `EB34DDD2FF1656B4436A8EFF5281690285DEC7F57984B66BD8876057F58A89EC` | Match |
| `SqueezeRushIOS\SqueezeRushNativeBridge.swift` | `161AC432E2C35BAF0070CD92E868DD07E5E55D462DA8CF50F74501F594E95A98` | Match |
| `SqueezeRushIOS\Info.plist` | `5931E12FF3D7F4BCBECDBB7E8949981F04C48433F8B68DBE296958ACCA0D9B4C` | Match |
| `SqueezeRushIOS\PrivacyInfo.xcprivacy` | `521EB6EF8430773E5C010E1838FE9DD8FA5D62B7B76D1CEA8D7D8DAADCB144E2` | Match |
| `SqueezeRushIOS\BuildScripts\ValidateAdMobReleaseConfiguration.sh` | `DAA2EACD27519560FC7998940787AE5B1DBD0C159C47E37CFE6C145B6ED6600F` | Match |
| `SqueezeRushIOS\Web\game.js` | `E6318E1BF8D533B6AD6F02B9B053A730BD0FB598CD9F5053A16BBE9D25B9C973` | Match |
| `SqueezeRushIOS\Web\index.html` | `6785CE9289404B0F72681871C34C225364C07E431BA01411278D85C3FA24C39C` | Match |
| `SqueezeRushIOS\Web\native-bridge.js` | `4DD3FB2BC5B1A4A0349BAED9B1065E5F2CB1B833EE4ADE1EE9F10959D1092D50` | Match |
| `SqueezeRushIOS\Web\run-lifecycle.js` | `F0EED9B5257260C09A81E54626E146950C202359405AE367FE6E1D3EB680910F` | Match |
| `SqueezeRushIOS\Web\styles.css` | `AF2C5C55B050A7BA77139712F0D081A5967AD5E2DFBB97F6F5F8C3BFB635FB53` | Match |

## 2. Pre-Stage 3B backup

- Path: `D:\Games\Squeeze rush\Backups\SqueezeRushIOS-Advanced-2.0.0-pre-stage3b-20260804-211451.zip`
- Size: 3,481,315 bytes
- SHA-256: `0E2D26AEC2F0759D8C109ED2336346CB8EE0348AC339CE12DEDBE122DC2CF2CE`
- ZIP entries: 97
- Verification: every required baseline file was opened from the archive and its archive-stream SHA-256 matched the source; result `14/14`.
- The ZIP is outside the active project.

## 3. Exact files modified and created

Production files modified:

- `SqueezeRushIOS\SqueezeRushAdFlowState.swift`
- `SqueezeRushIOS\SqueezeRushConsentManager.swift`

Documentation modified:

- `NATIVE_BRIDGE_PROTOCOL.md`
- `PRIVACY_DATA_INVENTORY_STAGE3.md`

Regression tooling modified:

- `tools\stage3a-state-tests.swift`
- `tools\Test-Stage3AStatic.ps1`

Stage 3B test/review tooling created:

- `tools\stage3b-state-tests.swift`
- `tools\Run-Stage3BTests.ps1`
- `tools\Test-Stage3BStatic.ps1`
- `tools\New-Stage3BReviewBundle.ps1`

Delivery files created:

- `STAGE_3B_IMPLEMENTATION_REPORT.md`
- `STAGE_3B_CHANGED_FILES.txt`
- `D:\Games\Squeeze rush\ReviewBundles\SqueezeRush-Stage3B-Review-20260804-212500.zip`

The package metadata did not require an edit because neither repository, version, product, checksum, nor resolution limitation changed. `project.pbxproj`, `GameViewController.swift`, `SqueezeRushAdManager.swift`, `SqueezeRushNativeBridge.swift`, `Info.plist`, `PrivacyInfo.xcprivacy`, the Release guard, and all five production Web files remain byte-identical to the Stage 3A baseline.

## 4. Incorrect Stage 3A call order

Stage 3A configured the UMP parameters, published `ConsentInformation.shared.canRequestAds`, and only then called `requestConsentInfoUpdate`. Google's current UMP guidance says `canRequestAds` remains false until the update request has been called. The early publication therefore could not expose the previous-session value at the documented time.

The misleading state name was:

```swift
initialSnapshotPublished
```

It did not state whether publication occurred before or after the required UMP request.

## 5. Corrected post-request publication order

`requestConsentUpdateOncePerLaunch()` now performs this order on the main thread:

1. `flowState.beginUpdateOnce()` permits one launch request.
2. DEBUG reset/geography parameters are configured.
3. `ConsentInformation.shared.requestConsentInfoUpdate(with:)` is invoked.
4. When that invocation returns, `markPostRequestSnapshotPublished()` records the boundary.
5. `publishSnapshot()` reads the current `ConsentInformation.shared` state immediately, without waiting for the callback.
6. The callback only enqueues completion work onto the main queue.
7. Completion processing publishes the update result exactly once.
8. Only a successful update proceeds to `loadAndPresentIfRequired` and publishes again after form completion.

The production source contains one `requestConsentInfoUpdate` call path.

## 6. Why the check follows the request invocation

Google documents that `ConsentInformation.shared.canRequestAds` always returns false until `requestConsentInfoUpdate` has been called. Immediately after the call, UMP may expose a valid previous-session consent decision even while the network update remains in flight. The manager therefore reads no app-owned cache and manually sets no consent value; every snapshot obtains `canRequestAds` directly from `ConsentInformation.shared`.

An update error still leaves UMP authoritative: the manager marks the update complete, normalizes the error, publishes the current UMP snapshot, and does not invoke the required-form path.

## 7. Completion-order protection

Two independent protections prevent a synchronous or very fast SDK callback from overtaking the immediate publication:

- the UMP callback calls `enqueueConsentUpdateCompletion`, which always uses `DispatchQueue.main.async` before calling the processor;
- `SqueezeRushConsentFlowState.completeUpdate` refuses processing until `postRequestSnapshotPublished` is true.

`updateCompletionProcessed` then allows the completion to settle once. A repeated SDK callback returns `nil`, performs no second publication, and cannot launch another consent form. Main-queue serialization also keeps the state transitions and UIKit work on the expected thread.

## 8. Updated consent-state field names

| Stage 3A field/method | Stage 3B replacement | Meaning |
|---|---|---|
| `initialSnapshotPublished` | `postRequestSnapshotPublished` | The immediate UMP snapshot was published after the request invocation returned. |
| `markInitialSnapshotPublished()` | `markPostRequestSnapshotPublished()` | Records that unambiguous ordering boundary. |
| none | `updateCompletionProcessed` | Prevents duplicate update-completion processing. |

`completeUpdate(errorCode:)` now returns an optional Boolean: `nil` means the completion was premature or duplicate, `false` means an accepted update error that must not load a form, and `true` means an accepted successful update that may continue.

## 9. Privacy-options requirement gate

The former guard accepted either:

- `privacyOptionsRequirementStatus == .required`; or
- general `formStatus == .available`.

The fallback was removed. `presentPrivacyOptions` now reads `ConsentInformation.shared.privacyOptionsRequirementStatus`, maps it to the existing bounded enum, and uses `SqueezeRushPrivacyOptionsPolicy`. Only `.required` returns true. `.unknown` and `.notRequired` return `unavailable` with `privacy_options_unavailable`.

The presentation-owner checks, one-form-at-a-time lock, exactly-once completion, normalized errors, and lack of a production reset action remain unchanged. No visible privacy-options UI was added in Stage 3B.

## 10. Stage 3A SDK race fix remains intact

The ad state still distinguishes:

- `sdkInitializationStarted`: the one `MobileAds.start` request was made;
- `sdkInitialized`: its completion occurred;
- `canRequestAds`: current UMP permission to load or present ads.

The deterministic race test passes this sequence:

```text
updateConsent(true)
-> one SDK start request
-> updateConsent(false)
-> markSDKInitialized while false
-> no load while false
-> updateConsent(true)
-> preload allowed with the initialized SDK
-> no second start request
```

`SqueezeRushAdManager.swift` was not changed. `MobileAds.shared.start` still has one call path and publisher first-party ID is disabled first.

## 11. Package versions and project identity

- Google Mobile Ads repository: `https://github.com/googleads/swift-package-manager-google-mobile-ads.git`
- Google Mobile Ads exact version: `13.7.0`
- Linked product: `GoogleMobileAds`, once
- Google UMP repository: `https://github.com/googleads/swift-package-manager-google-user-messaging-platform.git`
- Google UMP direct exact version: `3.1.0`
- Linked product: `GoogleUserMessagingPlatform`, once
- Swift import: `UserMessagingPlatform`
- Deployment target: iOS 15.0, unchanged
- Bundle identifier: `com.kasiga.squeezerush`, unchanged

No `Package.resolved` was fabricated. Xcode package resolution remains authoritative and pending on macOS.

## 12. Tests, commands, and results

Environment:

- Windows PowerShell `5.1.26100.8972`
- Python `3.13.3`
- Microsoft Edge `151.0.4129.59`
- Swift compiler `6.0.1` for pure-state compilation and frontend syntax parsing
- Git `2.55.0.windows.2`
- `xcodebuild`: unavailable on Windows

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
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Run-Stage3BTests.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-Stage3BStatic.ps1
```

Results:

| Gate | Result |
|---|---|
| Stage 1 lifecycle | `10/10 passed, 0 failed` |
| Stage 2 browser bridge | `21/21 passed, 0 failed`; file mock gate PASS |
| Stage 2 static | `94/94 passed, 0 failed` |
| Stage 2A static | `13/13 passed, 0 failed` |
| Stage 3 deterministic | `26/26 passed, 0 failed` |
| Stage 3 static | `36/36 passed, 0 failed` |
| Stage 3A deterministic | `18/18 passed, 0 failed` |
| Stage 3A static/syntax | `29/29 passed, 0 failed` |
| Stage 3B deterministic A-R | `18/18 passed, 0 failed` |
| Stage 3B static/syntax | `31/31 passed, 0 failed` |
| Release validation guard | PASS: missing, sample, malformed, or unapproved Release configuration rejected |

The Stage 3B deterministic cases cover all requested A-R scenarios: one launch update, strict source ordering, no wait for the immediate publication, direct UMP state, update failure/success, form error clearing, strict privacy gate, overlap, the preserved SDK race recovery, exact packages, unchanged Web hashes, and absence of gameplay integration.

The Stage 3B static suite also verifies one request path, asynchronous completion deferral, post-request/exactly-once state guards, no `formStatus` authorization, no raw IAB strings or raw Google error text, absence of ATT/StoreKit/Firebase/analytics/review/More Games, Debug-only sample IDs, empty Release IDs, approval `NO`, unchanged Release guard, package/product cardinality, weak ownership, unchanged Web/protected trees, and Swift parsing.

`swiftc -frontend -parse` succeeded for all native Swift files. This proves syntax only. Apple UIKit/WebKit and Google SDK type checking/linking did not run and are not claimed.

## 13. Manual Xcode/device tests still required

1. Open `SqueezeRushIOS.xcodeproj` in Xcode 16 or newer.
2. Resolve packages and confirm Google Mobile Ads 13.7.0 and one unified Google UMP 3.1.0 binary/product graph.
3. Build Debug for an iOS 15+ simulator and a physical iPhone.
4. With a valid previous-session consent state, breakpoint/log the launch and confirm the UMP update request is invoked before the immediate `canRequestAds` snapshot.
5. Confirm that immediate snapshot is delivered before the asynchronous update-completion processor, including a fast callback path.
6. Confirm a previous-session true value can initialize Mobile Ads while the update remains in flight.
7. Force an information-update error and confirm the current UMP value is published and no required-form load is attempted.
8. Complete a successful update and required form; confirm stale error codes clear.
9. Test privacy-options status `.required` and confirm presentation succeeds when the owner is available.
10. Test `.unknown` and `.notRequired`; confirm `privacy_options_unavailable`, even if a general consent form is available.
11. Attempt overlapping privacy-options presentations and confirm the second request is unavailable.
12. Reproduce true -> SDK start -> false -> completion -> true and confirm one SDK start plus later preload.
13. Confirm no ATT prompt, visible monetization UI, gameplay-triggered ad, StoreKit, analytics, review, or More Games behavior appears.
14. Confirm ordinary gameplay remains disconnected from ads.
15. Attempt Release/archive with empty or sample IDs and approval `NO`; confirm the guard fails.

## 14. Known risks and production blockers

- Xcode package resolution, Apple/Google SDK type checking, linking, simulator/device execution, and UMP runtime timing were unavailable on Windows.
- The main-queue deferral and state gate are deterministic in source and pure-state tests, but real UMP callback scheduling requires device/simulator confirmation.
- UMP previous-session and privacy-options outcomes depend on the AdMob account's configured privacy messages; those account settings are not claimed.
- A visible privacy-options entry point remains required for an ad-enabled release whenever UMP reports `.required`; Stage 3B deliberately adds no UI.
- `Package.resolved` must select Google Mobile Ads 13.7.0 and UMP 3.1.0 without duplicate UMP linkage.
- Existing Stage 3 release blockers remain: production IDs/account setup, audience classification, privacy policy and labels, privacy report review, Stage 4 gameplay integration, and TestFlight validation.

## 15. Post-change hashes

Changed production files:

| File | Bytes | SHA-256 |
|---|---:|---|
| `SqueezeRushIOS\SqueezeRushAdFlowState.swift` | 10,560 | `0D6E5F447BBE77F2EA5585E389977FBFDECB69882F7E5B06FCA121CFB434009C` |
| `SqueezeRushIOS\SqueezeRushConsentManager.swift` | 10,220 | `EF4D6F88C8F680BE65EED600A3FB760FA1E96CE947F1FCAE0E8E598798AFA3DA` |

Changed supporting files before creation of this report/change manifest:

| File | Bytes | SHA-256 |
|---|---:|---|
| `NATIVE_BRIDGE_PROTOCOL.md` | 17,377 | `6F78F783904C085B3D2144254E79AAC61F05C78C9C97982FA8973A113FB3506E` |
| `PRIVACY_DATA_INVENTORY_STAGE3.md` | 7,324 | `87B4C97807BF4CFBA7342FA9DF0A53A0CDF8750DD7D566B7AECE3E07FEE05A77` |
| `tools\stage3a-state-tests.swift` | 6,306 | `D61BA2A497310AECB8BF1193F1AD97EACB237DB2C4F217963D73A327AB337AA3` |
| `tools\Test-Stage3AStatic.ps1` | 13,953 | `E6E4C34E89FCF62EF5616D1061338FABF357ADDD03689C3E0AFFE521363B424A` |
| `tools\stage3b-state-tests.swift` | 4,929 | `FA3E822FA1F52155FAF2037BA47812A684A0DCC5408FFBF357E2F12DAE67521D` |
| `tools\Run-Stage3BTests.ps1` | 6,192 | `3ED01D1AF1064B6B3947E805DF2E6BFB52160121FD4A1B990CF06A3FD8EEEEA7` |
| `tools\Test-Stage3BStatic.ps1` | 14,885 | `7D5C97EB1FEB366C6CA43AA288FADFBF3FBF700AFD3A400160BD1DC65342DA02` |
| `tools\New-Stage3BReviewBundle.ps1` | 10,065 | `9C340AC3D8C6A230E037C50554B756C183C977D3B64DEEAFA458BC150B8A56F9` |

The review-bundle manifest records final sizes and SHA-256 values for every included file, including this report and `STAGE_3B_CHANGED_FILES.txt`.

Critical unchanged production hashes remain exactly the Stage 3A values in section 1, including Google package/project configuration, `GameViewController.swift`, `SqueezeRushAdManager.swift`, `SqueezeRushNativeBridge.swift`, the Release guard, and all five Web files.

## 16. Scope confirmation

- Request/publication order now follows Google's documented UMP behavior.
- Privacy-options presentation requires the explicit UMP `.required` status.
- The Stage 3A SDK initialization race fix remains intact.
- Google Mobile Ads remains exact 13.7.0 and Google UMP remains direct exact 3.1.0.
- No ad was connected to revive, Double Rewards, XP, Cores, retry, menu, or run finalization.
- No automatic interstitial, gameplay ad button, gameplay UI, StoreKit, analytics, ATT, review prompt, More Games, production ID, or physical test-device ID was added.
- The protected sibling and archived projects were not modified.
- Stage 4 was not started.
