# Squeeze Rush Stage 3 Implementation Report

Date: 2026-08-04  
Active project: `D:\Games\Squeeze rush\SqueezeRushIOS-Advanced-2.0.0`  
Protected sibling: `D:\Games\Squeeze rush\SqueezeRush`  
Scope: test-only Google Mobile Ads 13.7.0 package integration, UMP consent foundation, native rewarded/interstitial services, protocol-v1 native actions, Release blocking, privacy inventory, and deterministic state tests. Gameplay monetization is not connected.

## 1. Baseline hash verification

All ten required Stage 2A production files matched before any production change. No `STAGE_3_BASELINE_FAILURE.md` was created.

| File | Required and observed SHA-256 | Result |
|---|---|---|
| `SqueezeRushIOS\Web\game.js` | `E6318E1BF8D533B6AD6F02B9B053A730BD0FB598CD9F5053A16BBE9D25B9C973` | Match |
| `SqueezeRushIOS\Web\index.html` | `6785CE9289404B0F72681871C34C225364C07E431BA01411278D85C3FA24C39C` | Match |
| `SqueezeRushIOS\Web\native-bridge.js` | `4DD3FB2BC5B1A4A0349BAED9B1065E5F2CB1B833EE4ADE1EE9F10959D1092D50` | Match |
| `SqueezeRushIOS\Web\run-lifecycle.js` | `F0EED9B5257260C09A81E54626E146950C202359405AE367FE6E1D3EB680910F` | Match |
| `SqueezeRushIOS\Web\styles.css` | `AF2C5C55B050A7BA77139712F0D081A5967AD5E2DFBB97F6F5F8C3BFB635FB53` | Match |
| `SqueezeRushIOS\GameViewController.swift` | `96CA9C6F1E96F6CF39D3E784C7CE4FC7E920A9CA16F95490101711C29693396D` | Match |
| `SqueezeRushIOS\SqueezeRushNativeBridge.swift` | `6B669B32BB18B7D779167DE6BF898469FDFDA8CECCC29EB4F228D6BD8986FF8F` | Match |
| `SqueezeRushIOS\AppDelegate.swift` | `889597E22D37BC66E53B6B9FE9C061762E0DBDB0497D3128183FED1ACA926C88` | Match |
| `SqueezeRushIOS\Info.plist` | `E31455AC0C1318969D027975C3D1E00D9E0DFEF321F7491E9F1002F6A46E43E0` | Match |
| `SqueezeRushIOS.xcodeproj\project.pbxproj` | `A88497A3BEDD1DA89DE65D7565012D503B1445CA75B81206798F667CA8487E7F` | Match |

## 2. Pre-Stage 3 backup

- Path: `D:\Games\Squeeze rush\Backups\SqueezeRushIOS-Advanced-2.0.0-pre-stage3-20260804-201624.zip`
- Size: 3,412,476 bytes
- SHA-256: `BF83E7F9329380BFEDF19F99D0D79201F6C47013CFC9984023FA772F969CCD38`
- ZIP entries: 77
- Verification: all ten required files were opened from the archive and their archive-stream SHA-256 values matched the originals.
- Location: outside the active project.

## 3. Files modified and created

Production files modified:

- `SqueezeRushIOS\GameViewController.swift`
- `SqueezeRushIOS\Info.plist`
- `SqueezeRushIOS\SqueezeRushNativeBridge.swift`
- `SqueezeRushIOS.xcodeproj\project.pbxproj`

Production files created:

- `SqueezeRushIOS\SqueezeRushAdFlowState.swift`
- `SqueezeRushIOS\SqueezeRushAdManager.swift`
- `SqueezeRushIOS\SqueezeRushConsentManager.swift`
- `SqueezeRushIOS\PrivacyInfo.xcprivacy`
- `SqueezeRushIOS\BuildScripts\ValidateAdMobReleaseConfiguration.sh`

Documentation/metadata modified or created:

- `NATIVE_BRIDGE_PROTOCOL.md`
- `STAGE_3_PACKAGE_METADATA.json`
- `PRIVACY_DATA_INVENTORY_STAGE3.md`
- `ADMOB_RELEASE_BLOCKERS.md`
- `STAGE_3_IMPLEMENTATION_REPORT.md`
- `STAGE_3_CHANGED_FILES.txt`

Test/review tooling modified or created:

- `tools\Test-Stage2Static.ps1`
- `tools\Test-Stage2AStatic.ps1`
- `tools\stage3-state-tests.swift`
- `tools\Run-Stage3Tests.ps1`
- `tools\Test-Stage3Static.ps1`
- `tools\New-Stage3ReviewBundle.ps1`

External artifacts:

- the backup ZIP above;
- `D:\Games\Squeeze rush\ReviewBundles\SqueezeRush-Stage3-Review-20260804-203434.zip`.

Intentionally unchanged: all five production Web files, `AppDelegate.swift`, bundle identifier, iOS deployment target, game data, game UI, gameplay, balance, controls, sharing behavior, haptics behavior, and localStorage formats. No `Package.resolved` was fabricated.

## 4. Official package repository and versions

Official sources were checked on 2026-08-04 before the project was edited.

- Direct package: `https://github.com/googleads/swift-package-manager-google-mobile-ads.git`
- Exact direct version: Google Mobile Ads `13.7.0`
- Official tag commit: `868149fc50d1452078e83540e636cf519bac3e6a`
- Xcode package requirement: `exactVersion` / `13.7.0`
- Linked product: `GoogleMobileAds`
- The official 13.7.0 manifest declares UMP repository `https://github.com/googleads/swift-package-manager-google-user-messaging-platform.git` with range `1.1.0..<4.0.0`.
- Selected highest compatible official UMP tag: `3.1.0`
- Official UMP tag commit: `13b248eaa73b7826f0efb1bcf455e251d65ecb1b`
- No duplicate top-level UMP package reference was added because the official Google Mobile Ads package already declares its UMP product dependency.

The package-referenced binary downloads were checked against their official manifest checksums:

| Artifact | SHA-256 |
|---|---|
| Google Mobile Ads 13.7.0 | `e89ba382a6244f5c8d92941015b12d98678689ebe14960eaa4c1d5951784a9c2` |
| UMP 3.1.0 | `90fe6bf3b0f4ce0d0199628c0871de58b6f673375148b98d52348aecc86db231` |

`STAGE_3_PACKAGE_METADATA.json` preserves repositories, versions, commits, artifact URLs, checksums, and resolution limitations in machine-readable form.

## 5. Package-resolution limitations

The official 13.7.0 package checkout was asked to resolve with:

```powershell
swift package resolve
```

The Windows Swift 6.0.1 toolchain failed while compiling the package manifest because its Windows SDK module graph reported a cyclic dependency involving `ucrt` and `_visualc_intrinsics`. It failed before it could produce authoritative dependency resolution. Therefore:

- `Package.resolved` was not created;
- no resolution result was invented;
- UMP `3.1.0` is the selected/expected highest compatible official tag, not yet an Xcode-generated resolution record;
- Xcode 16+ package resolution is a mandatory manual gate;
- UIKit, WebKit, GoogleMobileAds, and UserMessagingPlatform type checking/linking were not claimed on Windows.

If Xcode proves that importing `UserMessagingPlatform` from the application target needs an explicit top-level product reference, add the official UMP package at exact `3.1.0` only after that evidence and document the project change. Do not add it speculatively.

## 6. Build-setting design

`project.pbxproj` now supplies build-expanded values consumed through `Info.plist`:

| Setting | Debug | Release |
|---|---|---|
| `ADMOB_APP_ID` | official sample app ID | empty |
| `ADMOB_REWARDED_AD_UNIT_ID` | official rewarded test ID | empty |
| `ADMOB_INTERSTITIAL_AD_UNIT_ID` | official interstitial test ID | empty |
| `SQUEEZE_RUSH_ADS_RELEASE_APPROVED` | `NO` | `NO` |
| `SQUEEZE_RUSH_UMP_DEBUG_GEOGRAPHY` | empty unless a tester explicitly changes it | empty |

Only Debug contains Google's sample publisher number `3940256099942544`. Swift reads the expanded private ad-unit keys from the main bundle. It never falls back to test IDs in non-Debug builds and does not print identifiers.

The deployment target remains iOS 15.0 in every project and target configuration. `PRODUCT_BUNDLE_IDENTIFIER` remains `com.kasiga.squeezerush`.

## 7. Release-safety guard

`ValidateAdMobReleaseConfiguration.sh` is the first target build phase. It performs no network access and exits immediately for non-Release builds. For Release it rejects:

- missing application/rewarded/interstitial IDs;
- an ID containing Google's sample publisher number `3940256099942544`;
- a malformed app or ad-unit ID;
- `SQUEEZE_RUSH_ADS_RELEASE_APPROVED` other than exactly `YES`.

Release currently has empty IDs and approval `NO`, so it deterministically fails. The automated guard test supplied missing and sample values and observed non-zero exits. No production-looking placeholder exists.

## 8. Info.plist and SKAdNetwork changes

`Info.plist` adds:

- `GADApplicationIdentifier` = `$(ADMOB_APP_ID)`;
- `SqueezeRushRewardedAdUnitID` = `$(ADMOB_REWARDED_AD_UNIT_ID)`;
- `SqueezeRushInterstitialAdUnitID` = `$(ADMOB_INTERSTITIAL_AD_UNIT_ID)`;
- `SqueezeRushUMPDebugGeography` = `$(SQUEEZE_RUSH_UMP_DEBUG_GEOGRAPHY)`;
- 50 `SKAdNetworkItems` identifiers from Google's current iOS quick-start list, retrieved 2026-08-04 from `https://developers.google.com/admob/ios/quick-start`.

It does not add `NSUserTrackingUsageDescription`, ATT, location permissions, URL schemes, or `WKAppBoundDomains`.

## 9. Consent-manager architecture

`SqueezeRushConsentManager` uses current UMP APIs and owns no global mutable singleton. It:

- holds its `UIViewController` presentation owner weakly;
- accepts no guessed under-age or child-directed classification;
- starts `requestConsentInfoUpdate(with:)` once per app launch;
- invokes `ConsentForm.loadAndPresentIfRequired(from:)` after the update callback;
- publishes `ConsentInformation.shared.canRequestAds` immediately after the update and again after form processing, including recoverable-error paths;
- publishes bounded `unknown`, `required`, `not_required`, and `obtained` consent values;
- publishes bounded `unknown`, `required`, and `not_required` privacy-options values;
- normalizes errors to domain/code tokens and never exposes localized UMP messages to JavaScript;
- locks consent/privacy presentation so two forms cannot overlap;
- uses a request sequence and consumes the stored completion once;
- supports UMP privacy-options presentation without manually changing consent;
- reads no raw IAB string;
- never resets consent automatically.

DEBUG-only explicit controls are `-SqueezeRushUMPResetConsent`, `-SqueezeRushUMPTestEEA`, `-SqueezeRushUMPTestUSState`, `-SqueezeRushUMPTestOther`, or the Debug geography build setting. No physical test-device identifier is checked in. Reset is not exposed through protocol v1.

## 10. Ad-manager architecture

`SqueezeRushAdManager` wraps Google Mobile Ads and uses `SqueezeRushAdStateCoordinator` for independently testable state rules. It:

- holds its presentation owner weakly;
- calls `setPublisherFirstPartyIDEnabled(false)` before SDK initialization;
- starts `MobileAds` at most once after consent permits ads;
- never loads an ad before consent and initialization;
- preloads at most one rewarded and one interstitial ad;
- exposes test mode, SDK initialization, readiness, and presentation-busy state;
- enforces one shared full-screen presentation lock;
- rejects incompatible/already-presented UI;
- clears and schedules the matching ad to reload after dismissal or presentation failure;
- discards an in-flight load result if consent is no longer available;
- normalizes SDK errors without crossing raw localized messages into JavaScript;
- cancels an active operation once during teardown and drops weak owner references.

No banner, app-open, rewarded-interstitial, server-side verification, mediation adapter, precise-location input, analytics SDK, or automatic presentation exists.

## 11. Bridge action behavior

Protocol version remains `1`; the exact 12-action allowlist and fixed structured receiver are unchanged.

### `rewarded.show`

- Native payload must be exactly `{ "placement": "revive" }` or `{ "placement": "double_rewards" }`.
- Context requires non-null `runId`, non-null non-negative `resultSequence`, and `lifecyclePhase: "result_pending"`.
- Invalid placement/context returns `invalid_request`.
- Consent, SDK, presentation lock, and readiness return bounded `unavailable` codes: `consent_not_ready`, `ad_sdk_not_ready`, `presentation_busy`, or `ad_not_ready`.
- Dismissal after the earned callback returns `success` with placement, `earned: true`, a bounded reward type, and finite reward amount.
- Dismissal without earning returns `cancelled` and `earned: false`.
- Presentation failure returns `failed`.
- Native code never revives, doubles, or writes a gameplay reward.

### `interstitial.show`

- Native payload must be exactly `{ "placement": "run_end" }`.
- Context requires non-null `runId` and result sequence, with phase `result_pending` or `finalized`.
- It uses the same consent/SDK/readiness/presentation checks.
- Normal dismissal returns `success`; presentation failure returns `failed`.
- No cadence, cooldown, run counter, or automatic caller exists.

### `consent.status`

- Accepts `{}`, `{ "operation": "status" }`, or `{ "operation": "presentPrivacyOptions" }`.
- Status returns only the safe bounded snapshot.
- Privacy options require UMP availability/requirement and an available presentation owner.
- Overlap returns `unavailable`; UMP state is never manually altered.

Purchases, restore, entitlements, review, More Games, and analytics remain `unavailable` with `not_implemented_stage3`.

`bridge.capabilities` retains every Stage 2 field, reports compiled support for rewarded/interstitial/consent, leaves all later features false, and adds test/readiness fields. Static support is not production readiness.

## 12. Exactly-once rewarded-result logic

`SqueezeRushAdPresentationSession` separates earning from settlement:

1. The earned callback records reward type/amount once but returns no bridge result.
2. Dismissal calls `settleAfterDismissal()`.
3. A rewarded session succeeds only if earning was previously recorded.
4. Otherwise dismissal produces `cancelled` / `earned: false`.
5. Presentation failure and teardown have separate one-time settlement methods.
6. Every method checks `settled`; duplicate earned/dismiss/failure callbacks produce no second result.
7. `SqueezeRushNativeBridge.settle` independently removes the request ID before sending, so a repeated service completion cannot send twice.

This native result is evidence only. Stage 3 does not apply it to a run or grant XP/Cores/revive state.

## 13. Consent gating

`GameViewController.viewDidAppear` starts UMP through a one-launch guard. The consent callback captures the ad manager weakly and forwards the safe Boolean. The state coordinator permits SDK startup only on the first true value. Loading requires all of: not torn down, consent true, SDK initialized, no existing ad, and no in-progress load. Presentation repeats consent/SDK/readiness checks at both bridge and service boundaries.

Publisher first-party ID is disabled immediately before the one allowed `MobileAds.shared.start` call. There is no ad request before that start completes.

## 14. Ownership graph

| Reference | Strength |
|---|---|
| `GameViewController -> WKWebView` | Strong |
| `GameViewController -> SqueezeRushNativeBridge` | Strong |
| `GameViewController -> SqueezeRushConsentManager` | Strong |
| `GameViewController -> SqueezeRushAdManager` | Strong |
| `WKWebViewConfiguration -> WKUserContentController` | Strong |
| `WKUserContentController -> typed bridge` | Strong while registered |
| `WKUserContentController -> legacy proxy` | Strong while registered |
| typed bridge -> presentation owner/web view/user-content controller/ad service/consent service | Weak |
| legacy proxy -> `GameViewController` | Weak |
| consent manager -> presentation owner | Weak |
| ad manager -> presentation owner | Weak |
| consent-state callback -> ad manager | Weak capture |
| Google/UMP async callbacks -> manager | Weak capture |

No path returns to `GameViewController` using only strong references. Stage 2A's `WeakScriptMessageHandler` remains intact. Teardown removes `SqueezeRushIOS`, calls `nativeBridge.detach()` for `squeezeRushBridge`, cancels manager work once, and clears weak owners.

## 15. Privacy-manifest findings

The old build phase that deleted and regenerated an empty app privacy manifest was removed. A checked-in app-owned manifest now declares no app-owned tracking, tracking domains, collected data, or required-reason APIs.

The verified Google Mobile Ads 13.7.0 manifest includes seven collected-data categories, with Device ID marked linked and used for tracking, plus System Boot Time `35F9.1`, User Defaults `CA92.1`, and Disk Space `E174.1` required reasons. The verified UMP 3.1.0 manifest includes three unlinked/nontracking App Functionality categories and User Defaults `CA92.1`. Both SDK manifests omit top-level tracking/tracking-domain keys; this report does not reinterpret that absence as a legal conclusion.

Full declarations and unresolved decisions are in `PRIVACY_DATA_INVENTORY_STAGE3.md`. App Store Connect labels are not complete. Audience classification is unresolved. The existing public “no advertisements” claim must change before an ad-enabled release.

## 16. Test environment, commands, and results

Versions:

- Windows PowerShell `5.1.26100.8972`
- Python `3.13.3`
- Microsoft Edge `151.0.4129.59`
- Swift compiler frontend `6.0.1` for syntax parsing and pure-state compilation
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
```

Final results:

| Gate | Result |
|---|---|
| Stage 1 lifecycle | `10/10 passed, 0 failed` |
| Stage 2 browser bridge | `21/21 passed, 0 failed`; file mock gate PASS |
| Stage 2 static | `94/94 passed, 0 failed` |
| Stage 2A static | `13/13 passed, 0 failed` |
| Stage 3 deterministic tests A-Z | `26/26 passed, 0 failed` |
| Stage 3 static/syntax | `36/36 passed, 0 failed` |
| Release guard | PASS: missing/sample/unapproved Release configuration rejected |

The Stage 3 A-Z suite covers consent startup, initialization idempotency, no pre-init loads, readiness, the cross-format presentation lock, earned-before-dismissal behavior, cancellation, failures, reload signals, teardown, bounded consent state, privacy-form overlap, lifecycle/placement validation, no gameplay reward mutation, exact Debug IDs, empty Release IDs, and guard rejection.

Static checks cover official repository/version metadata, selected UMP 3.1.0, no fabricated resolution, Debug-only sample IDs, Release blocking, plist expansion, the 50-entry SKAdNetwork list, absence of ATT/location/Firebase/analytics/StoreKit/review/cross-promotion, unchanged Web hashes, protected trees, weak ownership, normalized errors, earned+dismissal requirements, consent/init request gates, target membership, app manifest replacement, iOS 15/bundle preservation, and Swift syntax parsing of every native file.

`swiftc -frontend -parse` succeeded, but this proves syntax only. It does not prove Apple/Google SDK type checking or linkage.

## 17. Manual Xcode/iPhone test plan

1. On macOS, open `SqueezeRushIOS.xcodeproj` in Xcode 16 or newer.
2. Resolve Swift packages; do not change the exact direct package requirement.
3. Confirm Google Mobile Ads resolves exactly to 13.7.0.
4. Confirm the generated `Package.resolved` selects UMP exactly 3.1.0; stop and review any discrepancy.
5. Build Debug on an iOS 15+ simulator and confirm all Swift/SDK symbols type-check and link.
6. Build Debug on a physical iPhone using the owner's legitimate signing configuration.
7. Launch and confirm one UMP information update runs per launch, not after every share/form return.
8. Confirm no ATT prompt appears.
9. At a breakpoint/log review, confirm publisher first-party ID is disabled before `MobileAds.start`.
10. From Safari Web Inspector, call `bridge.capabilities` and inspect support versus readiness fields.
11. Call `consent.status` and verify only bounded fields/errors are returned.
12. When UMP requires/allows it, present privacy options and confirm a second request cannot overlap.
13. Exercise `rewarded.show` through a DEBUG/native integration harness with a valid result-pending context and placement. The protected Stage 2 JavaScript validator still rejects non-empty reserved payloads, so no gameplay/Web caller exists in Stage 3.
14. Confirm the rewarded creative displays Google's Test Ad label.
15. Complete a rewarded test ad and record the earned callback.
16. Confirm the bridge succeeds only after both earning and dismissal, exactly once.
17. Dismiss/cancel a rewarded ad without earning and confirm `cancelled`, `earned: false`, and no gameplay change.
18. Present the interstitial test ad only through an explicit DEBUG/native integration request; confirm normal dismissal settles once.
19. Attempt reward/interstitial/share/consent overlap and confirm incompatible presentation is refused.
20. Play multiple ordinary runs and verify no ad appears automatically and no UI/balance/reward behavior changed.
21. Inspect Xcode's aggregated privacy report for the app, Google Mobile Ads, and UMP; reconcile it with `PRIVACY_DATA_INVENTORY_STAGE3.md`.
22. Attempt a Release build/archive with current empty IDs/approval `NO`, then with Google sample IDs; confirm both fail before compilation proceeds.

## 18. Known risks and uncertainties

- Xcode package resolution, Apple/Google SDK type checking, linking, simulator runtime, device UI, and the privacy report were unavailable on Windows and remain mandatory.
- UMP 3.1.0 is selected from verified official metadata as the highest tag satisfying the 13.7.0 range. Only Xcode's generated `Package.resolved` can confirm the actual graph in this project.
- The app target imports `UserMessagingPlatform` through the transitive dependency declared by the official Google Mobile Ads package. Xcode must confirm that product visibility works without a duplicate top-level package.
- The protected Stage 2 `native-bridge.js` recognizes the reserved action names but rejects their new non-empty Stage 3 payloads. This is intentional under the explicit no-Web-change rule and guarantees no ordinary gameplay caller; native/manual test harnessing is needed until a later stage updates the Web validator.
- The app owner has not supplied an AdMob account, production IDs, consent-message configuration, final audience classification, signing credentials, or privacy-label decisions. No claim is made that they exist.
- UMP geography outcomes depend on account/message configuration and test settings, so the consent UI cannot be proven on Windows.
- Google SDK delegates and presentation behavior require device testing, including background/foreground and dismissal timing.
- Debug ad-load failures currently leave readiness false until consent is republished or a presentation-driven reload occurs; production retry/backoff policy is a later operational decision.
- The app privacy manifest describes app-owned behavior only. Final labels must reflect the aggregated binary and actual configuration.

## 19. Production blockers

`ADMOB_RELEASE_BLOCKERS.md` is the controlling checklist. Major blockers are the AdMob account/app registration, production app/ad-unit IDs, European and applicable US-state messages, audience classification, visible privacy options, policy/label updates, Xcode privacy review, replacing test configuration, explicit Release approval, Stage 4 gameplay integration, and TestFlight/device validation.

Release/archive is deliberately blocked today.

## 20. Post-change production hashes

| Production file | Bytes | SHA-256 |
|---|---:|---|
| `SqueezeRushIOS\GameViewController.swift` | 8,172 | `36C0C0DECE0FE4BBA19D53E6391F12EF453E091750C96E4446B3004F79B250A1` |
| `SqueezeRushIOS\Info.plist` | 6,164 | `5931E12FF3D7F4BCBECDBB7E8949981F04C48433F8B68DBE296958ACCA0D9B4C` |
| `SqueezeRushIOS\PrivacyInfo.xcprivacy` | 373 | `521EB6EF8430773E5C010E1838FE9DD8FA5D62B7B76D1CEA8D7D8DAADCB144E2` |
| `SqueezeRushIOS\SqueezeRushAdFlowState.swift` | 9,495 | `CAA8308BF713BB796C1AE9CE910EAB1B8748C6F349F02818F170FECC8ABD6B33` |
| `SqueezeRushIOS\SqueezeRushAdManager.swift` | 13,932 | `EB34DDD2FF1656B4436A8EFF5281690285DEC7F57984B66BD8876057F58A89EC` |
| `SqueezeRushIOS\SqueezeRushConsentManager.swift` | 9,726 | `3C4938204BAB916FFF6F02D94BD48FF48D574978046C404BAFF103B7172C98C3` |
| `SqueezeRushIOS\SqueezeRushNativeBridge.swift` | 28,690 | `161AC432E2C35BAF0070CD92E868DD07E5E55D462DA8CF50F74501F594E95A98` |
| `SqueezeRushIOS\BuildScripts\ValidateAdMobReleaseConfiguration.sh` | 1,264 | `DAA2EACD27519560FC7998940787AE5B1DBD0C159C47E37CFE6C145B6ED6600F` |
| `SqueezeRushIOS.xcodeproj\project.pbxproj` | 17,039 | `EE6E22E38E4DFA6C8AF61B1CA7FCDA1EA20B03A9D1054E4AEC320BBBD952344A` |

Unchanged Web source hashes remain exactly the Stage 2A values in section 1.

## 21. Gameplay-connection confirmation

No production Web file changed. No button, panel, automatic trigger, cadence, cooldown, run counter, revive call, double-reward call, XP/Core write, finalization hook, or interstitial hook was added. Native success is never applied to gameplay. Ordinary runs show no ad in Stage 3.

## 22. Identifier confirmation

Only the three official Google sample/test identifiers exist, and only in Debug target build settings. Release settings are empty. No production identifier, production-looking placeholder, test-device identifier, AdMob account credential, signing item, product identifier, URL, or analytics endpoint was added.

## 23. Scope confirmation

- Google Mobile Ads 13.7.0 and its official UMP dependency are the only new SDK foundation.
- No ATT or `NSUserTrackingUsageDescription` was added.
- No StoreKit, purchase, restore, entitlement, Firebase, analytics, review, Loop Bloom, More Games, or arbitrary URL behavior was added.
- No game UI or gameplay monetization was added.
- The protected sibling and archived older iOS projects were not modified.
- Stage 4 was not started.
