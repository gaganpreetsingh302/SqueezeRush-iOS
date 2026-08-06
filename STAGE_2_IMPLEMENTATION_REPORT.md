# Squeeze Rush Monetization Stage 2 Implementation Report

Date: 2026-08-03 (America/Toronto)

Scope: protocol version 1 typed JavaScript-to-Swift bridge, defensive native validation, deterministic browser mock transport, and preservation of existing share/haptic behavior. Stage 3 was not started.

## 1. Baseline verification and protection

The four required Stage 1 documents were read completely before implementation:

- `D:\Games\Squeeze rush\SQUEEZE_RUSH_AUDIT.md`
- `SOURCE_OF_TRUTH.md`
- `STAGE_1_IMPLEMENTATION_REPORT.md`
- `STAGE_1_CHANGED_FILES.txt`

The release source remained the embedded `SqueezeRushIOS\Web` folder. Nothing was copied or merged from `D:\Games\Squeeze rush\SqueezeRush`.

### Stage 1 hash gate

All eight required files matched the supplied Stage 1 hashes before any production edit:

| File | Expected and observed SHA-256 | Result |
|---|---|---|
| `SqueezeRushIOS\Web\game.js` | `CCE4CA742E19959B48D8D19FD7FE1397FADE74B4307A5CD438A7C352B7AE22A6` | Match |
| `SqueezeRushIOS\Web\index.html` | `56C3C07E2AD75D42FB69BCF28D0749C675CA899E6CDBD60D3922D88C3837402C` | Match |
| `SqueezeRushIOS\Web\run-lifecycle.js` | `F0EED9B5257260C09A81E54626E146950C202359405AE367FE6E1D3EB680910F` | Match |
| `SqueezeRushIOS\Web\styles.css` | `AF2C5C55B050A7BA77139712F0D081A5967AD5E2DFBB97F6F5F8C3BFB635FB53` | Match |
| `SqueezeRushIOS\GameViewController.swift` | `45FAA9B9B0E01200451A888234482D62F5CD599513F69266D3F76D42B17FD273` | Match |
| `SqueezeRushIOS\AppDelegate.swift` | `889597E22D37BC66E53B6B9FE9C061762E0DBDB0497D3128183FED1ACA926C88` | Match |
| `SqueezeRushIOS\Info.plist` | `E31455AC0C1318969D027975C3D1E00D9E0DFEF321F7491E9F1002F6A46E43E0` | Match |
| `SqueezeRushIOS.xcodeproj\project.pbxproj` | `ACD382F806FD6B66C332CB0BA516E00BCA7169DB0B3C5CF81EECA08DC4DB22C4` | Match |

The baseline-failure stop condition did not trigger. `STAGE_2_BASELINE_FAILURE.md` was not created.

### Pre-Stage 2 backup

- Path: `D:\Games\Squeeze rush\Backups\SqueezeRushIOS-Advanced-2.0.0-pre-stage2-20260803-222252.zip`
- Size: 3,365,071 bytes
- SHA-256: `5980A0C5152C3EF18B32D6CC7D0F7D91C12A3207AF6B5CAB5B4B36FAB1B28FCD`
- Location: outside the active project
- Verification: all eight required archive entries were opened, hashed, and compared with their originals; all matched.

Git identity was not modified and no name/email was invented.

## 2. Exact files modified and created

Production files modified:

- `SqueezeRushIOS\Web\game.js`
- `SqueezeRushIOS\Web\index.html`
- `SqueezeRushIOS\GameViewController.swift`
- `SqueezeRushIOS.xcodeproj\project.pbxproj`

Production files created:

- `SqueezeRushIOS\Web\native-bridge.js`
- `SqueezeRushIOS\SqueezeRushNativeBridge.swift`

Documentation/tooling files created:

- `NATIVE_BRIDGE_PROTOCOL.md`
- `STAGE_2_IMPLEMENTATION_REPORT.md`
- `STAGE_2_CHANGED_FILES.txt`
- `tools\stage2-bridge-tests.html`
- `tools\stage2-bridge-tests.js`
- `tools\stage2-file-mock-probe.html`
- `tools\Run-Stage2BridgeTests.ps1`
- `tools\Test-Stage2Static.ps1`
- `tools\New-Stage2ReviewBundle.ps1`

External artifacts created:

- pre-Stage 2 backup listed above;
- `D:\Games\Squeeze rush\ReviewBundles\SqueezeRush-Stage2-Review-20260803-223812.zip`.

Intentionally unchanged production files include `run-lifecycle.js`, `styles.css`, `AppDelegate.swift`, and `Info.plist`. Existing Stage 1 documents/tests were not rewritten.

## 3. JavaScript bridge architecture

`native-bridge.js` is a dependency-free IIFE loaded between the Stage 1 lifecycle controller and `game.js`:

1. `run-lifecycle.js`
2. `native-bridge.js`
3. `game.js`

It installs a frozen, non-writable `window.SqueezeRushNative` API with:

- `protocolVersion`
- frozen `actions`, `statuses`, and `hapticStyles`
- `isNativeAvailable()`
- `request(action, payload, options)`
- `getCapabilities(options)`
- `cancelPending(reason)`
- `__receive(response)` as the sole fixed native response destination

The implementation maintains:

- an in-memory `Map` of pending requests;
- a session-wide issued-ID set so request IDs are not reused;
- independent timers per concurrent request;
- an in-memory capability-response cache with explicit `{ refresh: true }` support;
- automatic lifecycle context captured from `window.SqueezeRushLifecycle.snapshot()`;
- teardown cancellation on both `pagehide` and `beforeunload`.

Direct programmer misuse rejects the Promise with `TypeError`. Every operational result—including missing native handler, unavailable feature, cancellation, native failure, stale callback, and timeout—resolves as a standardized response envelope. No request, response, or capability is stored in localStorage.

## 4. Swift bridge architecture

`SqueezeRushNativeBridge.swift` adds:

- `SqueezeRushBridgeAction`: typed exact action enum;
- `SqueezeRushBridgeStatus`: typed exact status enum;
- typed context, error, request, haptic-style, and validated-payload values;
- `SqueezeRushNativeBridge`: `WKScriptMessageHandler` implementation;
- in-flight request dictionary and share-presentation lock;
- bounded input parsers with optional casts only;
- fixed structured response dispatch through `WKWebView.callAsyncJavaScript` arguments.

`GameViewController.viewDidLoad()` constructs the bridge, registers the fixed handler name `squeezeRushBridge`, and attaches the created `WKWebView`. `deinit` detaches the bridge and also preserves removal of the legacy `SqueezeRushIOS` handler.

The bridge holds its `UIViewController` presentation owner, `WKWebView`, and `WKUserContentController` weakly. Accepted requests are recorded in flight and removed at settlement. UIKit work is performed on the main thread. A second share request or any incompatible already-presented controller returns `unavailable` instead of overlapping presentation.

The new Swift file has one file reference, one Sources build-file record, one group entry, and one Sources-phase entry in `project.pbxproj`. The iOS 15.0 deployment target remains unchanged in all four build settings.

## 5. Full protocol version 1 action allowlist

| Action | Stage 2 behavior |
|---|---|
| `bridge.capabilities` | Implemented; returns exact native feature availability. |
| `haptic.perform` | Implemented for `light`, `medium`, `heavy`, `success`, and `error`. |
| `share.present` | Implemented for one non-empty text string up to 1,000 characters. |
| `rewarded.show` | Recognized; valid empty payload returns `unavailable` / `not_implemented_stage2`. |
| `interstitial.show` | Recognized; valid empty payload returns `unavailable` / `not_implemented_stage2`. |
| `purchase.buy` | Recognized; valid empty payload returns `unavailable` / `not_implemented_stage2`. |
| `purchase.restore` | Recognized; valid empty payload returns `unavailable` / `not_implemented_stage2`. |
| `entitlements.refresh` | Recognized; valid empty payload returns `unavailable` / `not_implemented_stage2`. |
| `review.request` | Recognized; valid empty payload returns `unavailable` / `not_implemented_stage2`. |
| `moreGames.open` | Recognized; valid empty payload returns `unavailable` / `not_implemented_stage2`. |
| `analytics.track` | Recognized; valid empty payload returns `unavailable` / `not_implemented_stage2`. |
| `consent.status` | Recognized; valid empty payload returns `unavailable` / `not_implemented_stage2`. |

The JavaScript and Swift lists are statically compared and match exactly. No general-purpose open URL action exists.

## 6. Request and response examples

Request:

```json
{
  "protocolVersion": 1,
  "requestId": "sr-1-550e8400-e29b-41d4-a716-446655440000",
  "action": "share.present",
  "context": {
    "runId": "550e8400-e29b-41d4-a716-446655440001",
    "resultSequence": 1,
    "lifecyclePhase": "result_pending"
  },
  "payload": {
    "text": "I scored 42 in Squeeze Rush."
  }
}
```

Successful response:

```json
{
  "protocolVersion": 1,
  "requestId": "sr-1-550e8400-e29b-41d4-a716-446655440000",
  "action": "share.present",
  "status": "success",
  "context": {
    "runId": "550e8400-e29b-41d4-a716-446655440001",
    "resultSequence": 1,
    "lifecyclePhase": "result_pending"
  },
  "data": { "completed": true },
  "error": null
}
```

Reserved Stage 2 response:

```json
{
  "protocolVersion": 1,
  "requestId": "sr-2-550e8400-e29b-41d4-a716-446655440002",
  "action": "rewarded.show",
  "status": "unavailable",
  "context": {
    "runId": "550e8400-e29b-41d4-a716-446655440001",
    "resultSequence": 1,
    "lifecyclePhase": "result_pending"
  },
  "data": {},
  "error": {
    "code": "not_implemented_stage2",
    "message": "This action is reserved but unavailable during Stage 2."
  }
}
```

## 7. Validation and security decisions

- Protocol version must be integer `1`.
- Request IDs are non-empty, at most 128 characters, and limited to ASCII letters, digits, `.`, `_`, `:`, and `-`.
- Actions and statuses are exact allowlists.
- Context must contain exactly `runId`, `resultSequence`, and `lifecyclePhase` with bounded values/types.
- Haptic style is an exact five-value allowlist; unknown values return `invalid_request`.
- Share payload has exactly one `text` field, must be non-whitespace, and is limited to 1,000 characters.
- Reserved Stage 2 actions accept only an empty payload and perform no native feature operation.
- Swift never force-casts bridge message input.
- Swift validation logs are compiled only in DEBUG builds.
- Native code calls one fixed receiver string and passes response data as a structured `callAsyncJavaScript` argument.
- No request value, share text, action, request ID, or callback name is interpolated into JavaScript source.
- No `evaluateJavaScript`, arbitrary JavaScript input, general URL operation, network request, or bridge localStorage key exists.
- Public JavaScript constants/API are frozen where practical.
- Bridge success never directly grants a revive, XP, Cores, purchase, or entitlement.
- Cancellation/dismissal never represents an earned ad reward.

## 8. Stale callback prevention

`rewarded.show` and `interstitial.show` are automatically lifecycle-scoped. The request stores the captured `runId` and `resultSequence`. Before a valid native response is exposed to application code, JavaScript verifies:

1. response context equals request context for run ID and result sequence;
2. the current lifecycle snapshot still has the request's non-null run ID;
3. the current snapshot still has the request's non-null result sequence.

Any mismatch becomes status `stale` with error code `stale_lifecycle_context`. Tests cover both a new-run mismatch and a second-result-sequence mismatch. A successful mock response by itself also leaves `rewardedReviveUsed` false.

## 9. Duplicate and concurrency prevention

- Request IDs contain a session serial plus UUID/random component and are checked against every prior issued ID.
- Swift rejects a duplicate ID while the original is in flight and does not disturb the original operation.
- JavaScript removes a pending request before resolving its first valid response.
- Any later duplicate has no pending entry and is ignored.
- Unknown IDs, wrong actions, wrong versions, malformed context/status/data/error, and malformed response objects cannot settle another request.
- Two concurrent requests retain independent IDs, timers, actions, contexts, and resolutions.

## 10. Existing share and haptics preservation

Only `shareScore()` and `haptic(style)` received small integration changes:

- typed `SqueezeRushNative` is preferred when a native handler or explicit mock is available;
- the existing `window.SqueezeRushIOS.share/haptic` wrapper remains unchanged as the iOS fallback;
- the existing Android and browser fallbacks remain present;
- haptic requests are fire-and-forget and never await the game loop;
- typed share uses the existing activity sheet and the original user-facing toast text;
- native share success/cancellation/failure resolves defensively;
- no typed failure triggers a second legacy share presentation;
- share tests confirm lifecycle, career, XP, Cores, run ID, result sequence, and finalization are unchanged;
- Stage 1's original legacy share test remains passing.

The legacy native handler was intentionally not deleted in Stage 2.

## 11. Capabilities

Native iOS reports:

```json
{
  "nativeBridge": true,
  "protocolVersion": 1,
  "platform": "ios",
  "share": true,
  "haptics": true,
  "rewardedAds": false,
  "interstitialAds": false,
  "purchases": false,
  "restorePurchases": false,
  "entitlements": false,
  "reviewRequest": false,
  "moreGames": false,
  "analytics": false,
  "consent": false
}
```

A browser without the handler returns `success` locally with `nativeBridge: false`, `platform: "browser"`, and every native feature flag false. Capabilities are cached in memory and the tests prove explicit refresh creates a new request.

## 12. Mock-mode restrictions

Mock transport activates only if:

1. `location.hostname` is exactly `localhost` or `127.0.0.1`; and
2. `nativeBridgeMock=1` is explicitly present.

It is inactive for file URLs, empty hostnames, remote hosts, localhost without the query value, and the production iOS `file://` path. An additional real Edge file-URL probe loads `native-bridge.js` with the query parameter and confirms `FILE MOCK GATE: PASS`.

Only in active mock mode, `window.__SQUEEZE_RUSH_NATIVE_BRIDGE_MOCK__` can queue success, unavailable, cancelled, failed, delayed, no-response, duplicate, malformed, mismatched-action, and stale-context results. Mock data contains no ad ID, product ID, More Games URL, Loop Bloom identifier, or analytics endpoint.

## 13. Test environment and exact commands

Versions:

- Windows PowerShell `5.1.26100.8972`
- Python `3.13.3` standard-library HTTP server
- Microsoft Edge `151.0.4129.59`
- Swift compiler `6.0.1` Windows frontend used for syntax parsing only
- Git `2.55.0.windows.2`
- No package or SDK installation

### Stage 1 lifecycle regression suite

Command:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Run-Stage1LifecycleTests.ps1
```

Result:

```text
STAGE 1 TEST RESULT: 10/10 passed, 0 failed
A PASS  B PASS  C PASS  D PASS  E PASS
F PASS  G PASS  H PASS  I PASS  J PASS
```

### Stage 2 bridge suite

Command:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Run-Stage2BridgeTests.ps1
```

Result:

```text
STAGE 2 BRIDGE TEST RESULT: 21/21 passed, 0 failed
A PASS  B PASS  C PASS  D PASS  E PASS  F PASS  G PASS
H PASS  I PASS  J PASS  K PASS  L PASS  M PASS  N PASS
O PASS  P PASS  Q PASS  R PASS  S PASS  T PASS  U PASS
FILE MOCK GATE: PASS
```

The Stage 2 cases cover browser/native capabilities, cache/refresh, one-time settlement, unavailable/cancelled/failed responses, timeout cleanup, duplicate and unknown IDs, mismatched action, invalid version, malformed response survival, unique concurrent requests, matching/stale lifecycle contexts, teardown cancellation, exact mock gating, share invariants, non-blocking haptics, and an embedded full Stage 1 rerun.

### Stage 2 static and syntax checks

Command:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-Stage2Static.ps1
```

Result:

```text
STAGE 2 STATIC CHECK RESULT: 94 passed, 0 failed
```

Checks cover the required script order, exact shared action list/statuses, DOM/reference integrity, fixed structured receiver, no force-cast input, Swift syntax parsing, Xcode Sources membership, iOS 15 preservation, legacy/typed integration, mock gates, lifecycle stale checks, existing storage keys, pre-stage backup, protected trees, and absence of Stage 3+ SDKs/APIs/identifiers/network endpoints.

## 14. Manual Xcode and iPhone tests still required

1. Open `SqueezeRushIOS.xcodeproj` on a supported Mac and compile Debug and Release against the real iOS SDK.
2. Confirm `SqueezeRushNativeBridge.swift` appears in the `SqueezeRushIOS` target's Compile Sources and `native-bridge.js` is copied through the existing Web folder resource.
3. Launch on the iOS 15 minimum simulator/device and a current physical iPhone; confirm `bridge.capabilities` returns the exact native data.
4. Use Safari Web Inspector to submit malformed bodies, wrong versions, unknown actions, invalid IDs, malformed contexts, invalid haptic styles, empty/oversized share text, and duplicate IDs; confirm no crash.
5. Exercise all five haptic styles on a physical device and compare with the prior release behavior.
6. Open, complete, and cancel the share sheet; verify lifecycle, score, XP, Cores, rewards, and result state remain unchanged.
7. Rapidly request Share twice and attempt Share while another controller is presented; confirm the second request returns unavailable and no overlap occurs.
8. Leave a share sheet open beyond the JavaScript timeout, then dismiss it; confirm the late native callback is ignored and no duplicate presentation occurs.
9. Reload/terminate/background the WebView with requests pending; confirm cancellation/late-response behavior and no retained controller/WebView.
10. Confirm normal file-based app loading never exposes `__SQUEEZE_RUSH_NATIVE_BRIDGE_MOCK__`, even if a query is appended.
11. Repeat Stage 1 Daily/Arcade revive, Sprint time-up, Retry/Menu rapid-tap, save upgrade, share, sound, haptic, control, animation, and visual checks on device.
12. Inspect the archived app and confirm there are no unexpected frameworks, product identifiers, URLs, or metadata changes.

## 15. Known risks and uncertainties

- Windows `swiftc -frontend -parse` proves Swift syntax only. It cannot type-check or link UIKit/WebKit; Xcode remains a required release gate.
- `WKWebView.callAsyncJavaScript` structured-argument behavior and activity-controller completion have not been executed on an iPhone in this environment.
- A share sheet can remain open longer than the game's 60-second JavaScript share timeout. The request safely times out and any later response is ignored, but that edge case still needs device UX review.
- The legacy `SqueezeRushIOS` handler remains deliberately available as a compatibility fallback and retains its pre-Stage 2 minimal validation. New monetization actions exist only on the typed handler.
- Capability cache and pending requests are intentionally in-memory and reset on page reload.
- Reserved Stage 3+ payloads are deliberately empty in Stage 2. Later stages must add bounded validators on both sides before enabling a capability.
- No native unit-test target exists. Malformed native input is covered structurally/staticly and must also be exercised through Safari Web Inspector on a Mac/iPhone.

## 16. Post-change production hashes

| Production file | Bytes | Post-change SHA-256 |
|---|---:|---|
| `SqueezeRushIOS\Web\game.js` | 67,372 | `E6318E1BF8D533B6AD6F02B9B053A730BD0FB598CD9F5053A16BBE9D25B9C973` |
| `SqueezeRushIOS\Web\index.html` | 7,813 | `6785CE9289404B0F72681871C34C225364C07E431BA01411278D85C3FA24C39C` |
| `SqueezeRushIOS\Web\native-bridge.js` | 21,898 | `4DD3FB2BC5B1A4A0349BAED9B1065E5F2CB1B833EE4ADE1EE9F10959D1092D50` |
| `SqueezeRushIOS\GameViewController.swift` | 6,733 | `AF342D1632781D0F0601706C53EF582A255DB9A53C6323FD696DAC38B2A383AD` |
| `SqueezeRushIOS\SqueezeRushNativeBridge.swift` | 18,200 | `6B669B32BB18B7D779167DE6BF898469FDFDA8CECCC29EB4F228D6BD8986FF8F` |
| `SqueezeRushIOS.xcodeproj\project.pbxproj` | 13,412 | `A88497A3BEDD1DA89DE65D7565012D503B1445CA75B81206798F667CA8487E7F` |

Unchanged Stage 1 production hashes:

- `run-lifecycle.js`: `F0EED9B5257260C09A81E54626E146950C202359405AE367FE6E1D3EB680910F`
- `styles.css`: `AF2C5C55B050A7BA77139712F0D081A5967AD5E2DFBB97F6F5F8C3BFB635FB53`
- `AppDelegate.swift`: `889597E22D37BC66E53B6B9FE9C061762E0DBDB0497D3128183FED1ACA926C88`
- `Info.plist`: `E31455AC0C1318969D027975C3D1E00D9E0DFEF321F7491E9F1002F6A46E43E0`

## 17. Stage 2 scope and protected-source confirmation

Stage 2 added no:

- advertising SDK or real rewarded/interstitial ad;
- StoreKit import, purchase implementation, product identifier, or entitlement;
- analytics SDK, analytics transmission, endpoint, or network call;
- ATT framework, tracking prompt, or consent SDK;
- review API or prompt;
- More Games URL, Loop Bloom identifier, or URL-opening implementation;
- visible monetization UI;
- production ad ID or placeholder production identifier;
- App Store metadata, legal-page, privacy-manifest, `Info.plist`, or `AppDelegate` change.

Static checks confirm the sibling `D:\Games\Squeeze rush\SqueezeRush` remains at 9 files, has no Stage 2 write timestamp, and its distinct `game.js` remains SHA-256 `022D2B0DA412AFFE10D2960A357B615107A54912A65EEC31EB4686B0040BE257`. The older `SqueezeRushIOS` tree and archived revision also retain their original file counts and contain no Stage 2 writes.

Stage 3 was not started.
