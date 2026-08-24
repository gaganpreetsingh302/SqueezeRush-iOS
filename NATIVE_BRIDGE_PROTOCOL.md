# Squeeze Rush Native Bridge Protocol

## Protocol identity

- Protocol version: `1`
- JavaScript public API: `window.SqueezeRushNative`
- WebKit message-handler name: `squeezeRushBridge`
- Fixed native response destination: `window.SqueezeRushNative.__receive(response)`
- Native implementation: `SqueezeRushNativeBridge`
- Minimum iOS target: iOS 15.0

The bridge is a typed request/response boundary between the bundled Web game and its native Swift host. Protocol version 1 keeps the Stage 2 transport unchanged. Stage 3 added test-only native implementations for rewarded ads, interstitial ads, and UMP consent status/privacy-options presentation. Stage 4 connects only the existing rewarded-revive lifecycle to the test rewarded-ad service. Haptics and sharing remain implemented. Purchases, entitlements, analytics, review, and More Games remain reserved and unavailable.

Stage 4 deliberately enables only `{ "placement": "revive" }` in the bundled JavaScript validator. The native validator still reserves `double_rewards`, but no Double Rewards UI or caller exists. There is no interstitial gameplay caller, cadence, or automatic presentation. The v1 envelope and native action allowlist are unchanged.

## JavaScript API

`window.SqueezeRushNative` is frozen and installed as a non-writable global. It exposes:

- `protocolVersion`: `1`.
- `actions`: frozen action constants.
- `statuses`: frozen response-status constants.
- `hapticStyles`: frozen accepted haptic styles.
- `isNativeAvailable()`: true only when the WebKit handler exists or the explicit localhost mock is active.
- `request(action, payload, options)`: creates one request and returns a Promise that resolves to a response envelope.
- `getCapabilities(options)`: returns a cached capability response by default; `{ refresh: true }` forces a new request.
- `cancelPending(reason)`: resolves every pending request as `cancelled` and clears the pending registry.
- `__receive(response)`: the single fixed native response destination. Application code must not call it.

`request()` rejects only local programmer misuse that cannot form a valid request, such as an unknown action, malformed payload, unsupported haptic style, empty/oversized share text, or invalid timeout option. Native unavailability, cancellation, failure, invalid native input handling, stale context, and timeout are operational outcomes and resolve with a response envelope.

## Request schema

```json
{
  "protocolVersion": 1,
  "requestId": "sr-1-550e8400-e29b-41d4-a716-446655440000",
  "action": "haptic.perform",
  "context": {
    "runId": "550e8400-e29b-41d4-a716-446655440001",
    "resultSequence": 1,
    "lifecyclePhase": "result_pending"
  },
  "payload": {
    "style": "success"
  }
}
```

Required fields:

| Field | Validation |
|---|---|
| `protocolVersion` | Integer exactly equal to `1`. |
| `requestId` | Unique, non-empty, at most 128 characters, using only ASCII letters, digits, `.`, `_`, `:`, and `-`. |
| `action` | Exact member of the v1 allowlist. |
| `context` | Object with exactly `runId`, `resultSequence`, and `lifecyclePhase`. |
| `context.runId` | Non-empty bounded string using the request-ID character set, or `null`. |
| `context.resultSequence` | Non-negative integer or `null`. |
| `context.lifecyclePhase` | `idle`, `countdown`, `active`, `result_pending`, `finalized`, or `null`. |
| `payload` | Object validated independently for the selected action. |

JavaScript captures context at dispatch time from `window.SqueezeRushLifecycle.snapshot()`. It does not accept caller-supplied run IDs.

## Response schema

```json
{
  "protocolVersion": 1,
  "requestId": "sr-1-550e8400-e29b-41d4-a716-446655440000",
  "action": "haptic.perform",
  "status": "success",
  "context": {
    "runId": "550e8400-e29b-41d4-a716-446655440001",
    "resultSequence": 1,
    "lifecyclePhase": "result_pending"
  },
  "data": {
    "performed": true,
    "style": "success"
  },
  "error": null
}
```

Every response must contain:

- protocol version `1`;
- the exact pending `requestId` and action;
- a supported status;
- a well-formed context object;
- an object-valued `data` field;
- `error: null` for `success`, or an object with non-empty `code` and `message` for every non-success status.

Malformed, unknown, duplicate, wrong-version, wrong-action, or otherwise unroutable responses are ignored. The original pending request remains protected by its timeout.

## Response statuses

| Status | Meaning |
|---|---|
| `success` | The validated native operation completed successfully. It is not itself authority to grant a gameplay reward or paid entitlement. |
| `unavailable` | The handler, capability, presentation surface, or Stage 3+ implementation is unavailable. |
| `cancelled` | The user, page teardown, or native operation cancelled without completing. |
| `failed` | The validated native operation attempted work but failed. |
| `invalid_request` | Swift rejected the envelope or action payload after it had enough routing information to reply safely. |
| `stale` | JavaScript determined that a lifecycle-scoped callback belongs to an old run or result sequence. |
| `timeout` | No valid response arrived before the configured deadline; the request was removed from the pending registry. |

Ad dismissal is not an earned reward. Rewarded success requires the Google `userDidEarnReward` callback followed by dismissal. A request being sent, an ad loading or presenting, an impression, a click, dismissal alone, or an unverified mock outcome never changes score, XP, Cores, revive flags, purchase state, or entitlements. Stage 4 application code claims a revive only after it independently verifies `status: success`, `earned: true`, placement `revive`, the active request identity, and the current pending run/result context.

## Action allowlist and native payload validation

JavaScript and Swift contain the same exact action list:

| Action | Protocol v1 native payload | Current behavior |
|---|---|---|
| `bridge.capabilities` | Empty object. | Fully implemented. |
| `haptic.perform` | Exactly `{ "style": string }`; style is `light`, `medium`, `heavy`, `success`, or `error`. | Performs the existing UIKit feedback and returns `success`. Unknown styles return `invalid_request`. |
| `share.present` | Exactly `{ "text": string }`; trimmed content must be non-empty and at most 1,000 characters. | Presents the existing `UIActivityViewController`. Arbitrary activity-controller configuration is rejected because no other keys are accepted. |
| `rewarded.show` | Native validation recognizes exactly `{ "placement": "revive" }` or `{ "placement": "double_rewards" }`; requires non-null `runId` and `resultSequence`, and phase `result_pending`. The Stage 4 bundled JavaScript validator permits only `revive`. | The native test-ad service checks consent, SDK readiness, ad readiness, and the presentation lock. Earned success settles only after the earned callback and dismissal. Native code grants no gameplay reward. Stage 4 game code may resume the same run once only for a verified earned `revive` response. `double_rewards` remains disconnected. |
| `interstitial.show` | Exactly `{ "placement": "run_end" }`; requires non-null `runId` and `resultSequence`, and phase `result_pending` or `finalized`. | Explicit test-ad presentation foundation. There is no cadence, cooldown, or automatic caller. Success settles only after normal dismissal. |
| `purchase.buy` | Empty object; no product ID exists. | Returns `unavailable` / `not_implemented_stage3`. |
| `purchase.restore` | Empty object. | Returns `unavailable` / `not_implemented_stage3`. |
| `entitlements.refresh` | Empty object. | Returns `unavailable` / `not_implemented_stage3`. |
| `review.request` | Empty object. | Returns `unavailable` / `not_implemented_stage3`. |
| `moreGames.open` | Empty object; no URL or app identifier exists. | Returns `unavailable` / `not_implemented_stage3`. |
| `analytics.track` | Empty object; no event transmission exists. | Returns `unavailable` / `not_implemented_stage3`. |
| `consent.status` | `{}`, `{ "operation": "status" }`, or `{ "operation": "presentPrivacyOptions" }`. | Status returns bounded UMP state. Privacy-options presentation is allowed only when UMP reports `privacyOptionsRequirementStatus == required` and cannot overlap another form. General consent-form availability does not authorize it. No reset operation is exposed. |

There is no general-purpose URL action and no JavaScript-source execution action.

## Capability response

Native iOS response data:

```json
{
  "nativeBridge": true,
  "protocolVersion": 1,
  "platform": "ios",
  "share": true,
  "haptics": true,
  "rewardedAds": true,
  "interstitialAds": true,
  "purchases": false,
  "restorePurchases": false,
  "entitlements": false,
  "reviewRequest": false,
  "moreGames": false,
  "analytics": false,
  "consent": true,
  "adsTestMode": true,
  "adSdkInitialized": false,
  "canRequestAds": false,
  "rewardedAdReady": false,
  "interstitialAdReady": false,
  "privacyOptionsRequired": false,
  "consentStatus": "unknown"
}
```

The static `true` values indicate compiled native support, not production readiness. `adsTestMode` is true only when the Debug configuration contains the official Google sample publisher number. Readiness fields change with consent, SDK initialization, loading, and presentation. Stage 3 never reports production readiness.

A browser with no native handler returns the unchanged local Stage 2 `success` capability response with `nativeBridge: false`, `platform: "browser"`, and every native feature flag false. Capability data is cached only in memory. Call `getCapabilities({ refresh: true })` to explicitly refresh it.

`consent.status` data has this bounded shape:

```json
{
  "consentStatus": "unknown",
  "canRequestAds": false,
  "privacyOptionsRequired": "unknown",
  "updateCompleted": false,
  "formPresentationInProgress": false,
  "lastErrorCode": null,
  "isUsingTestConfiguration": false
}
```

`consentStatus` is one of `unknown`, `required`, `not_required`, or `obtained`. `privacyOptionsRequired` is one of `unknown`, `required`, or `not_required`. Error codes are normalized and bounded; raw localized UMP or Google Mobile Ads errors do not cross the bridge.

## Lifecycle context and stale responses

`rewarded.show` and `interstitial.show` are lifecycle-scoped by default. A future action can also request lifecycle enforcement through the internal request option without changing the envelope.

For a lifecycle-scoped response, JavaScript verifies:

1. response `runId` and `resultSequence` equal the values captured in the request;
2. response lifecycle phase equals the phase captured in the request;
3. the current `SqueezeRushLifecycle.snapshot()` still has the request's non-null `runId`;
4. the current snapshot still has the request's non-null `resultSequence`;
5. the current snapshot still has the request's non-null lifecycle phase.

Any mismatch is converted to a standardized `stale` response with error code `stale_lifecycle_context` before application code receives it. The native/mocked result cannot revive a different run or reward a later result.

## Timeout, concurrency, and duplicate handling

- Default timeout: 15,000 milliseconds.
- Allowed configured range: 1 through 120,000 milliseconds.
- The game uses 2,500 milliseconds for fire-and-forget haptics and 60,000 milliseconds for the share sheet.
- The Stage 4 rewarded-revive gameplay request uses the allowed 120,000-millisecond maximum while the native ad is presented.
- Every request ID is unique for the page session and is never reused.
- Pending requests are held only in an in-memory `Map`.
- Concurrent requests have independent timers and response routing.
- The first valid response removes and settles its request.
- Later duplicate responses find no pending request and are ignored.
- Invalid responses do not remove the pending request.
- `pagehide` and `beforeunload` cancel and clear all pending requests.

## Native transport and presentation rules

`SqueezeRushNativeBridge` adopts `WKScriptMessageHandler`. It parses the WebKit body with optional casts only, checks version/ID/action/context/payload, registers accepted in-flight IDs, and executes UIKit work on the main thread.

The bridge has weak references to its `UIViewController` presentation owner and `WKWebView`. It removes the registered handler during teardown. Sharing is limited to a string activity item; a second share request or an incompatible already-presented controller returns `unavailable`. The response is `success`, `cancelled`, or `failed` based on the activity controller completion.

Swift calls one compile-time receiver string and supplies the response through `WKWebView.callAsyncJavaScript` arguments:

```swift
window.SqueezeRushNative.__receive(response)
```

No request data is interpolated into executable JavaScript.

`SqueezeRushConsentManager` invokes the once-per-launch UMP information update and, immediately after that invocation returns, publishes the current UMP snapshot. This ordering lets UMP expose an authoritative previous-session `canRequestAds` value without waiting for the network completion. The UMP callback is queued onto the main thread, and the consent flow state refuses completion processing until the post-request snapshot has been published; duplicate completions are ignored. An update error is normalized and published without attempting a required form. A successful update clears stale error state, publishes, and then calls `ConsentForm.loadAndPresentIfRequired(from:)`; successful consent/privacy form completion also clears stale operation errors. Privacy-options presentation requires UMP's explicit `.required` privacy-options status and never falls back to general `formStatus`. `SqueezeRushAdManager` requests `MobileAds` startup at most once after consent permits ads. SDK completion is recorded even if consent changes while startup is in flight, but loading and presentation still require the current `ConsentInformation.shared.canRequestAds` value. Publisher first-party ID is disabled before SDK startup. Both services hold their presentation owner weakly.

The ad manager owns one full-screen presentation session. Rewarded and interstitial operations share that lock. Every session can settle once; later delegate callbacks are ignored. Ads are cleared and scheduled to reload after dismissal or presentation failure. Native code returns earned metadata but never grants a revive, XP, Cores, or a doubled reward.

## Stage 4 rewarded-revive application rule

The game refreshes capabilities once for an otherwise eligible death result and shows the separate `rewardedReviveBtn` only when native rewarded support, consent, and rewarded readiness are all true. A token revive always takes precedence. Sprint time-up and modes whose existing configuration forbids revives never receive the offer.

Starting an ad request does not claim or finalize the result. While it is pending, the game disables conflicting result controls and tracks one active request identity. A cancelled, unavailable, failed, stale, timed-out, or unearned result leaves the same result pending and grants nothing. A verified earned result atomically calls `reviveWithRewarded(resultSequence)`, sets `rewardedReviveUsed` once, emits `run_revived` with source `rewarded`, and uses the same continuation cleanup as a token revive. It preserves `runId`, `career.totalRuns`, score/progression state, token inventory, and the Stage 1 `awardSnapshot` delta mechanism. It does not award XP or Cores.

## Deterministic mock

The mock activates only when both conditions are true:

1. `location.hostname` is exactly `localhost` or `127.0.0.1`;
2. the URL contains `nativeBridgeMock=1`.

It does not activate on `file://`, an empty hostname, an arbitrary remote hostname, localhost without the explicit value, or the normal bundled iOS file URL.

Only in active mock mode, `window.__SQUEEZE_RUSH_NATIVE_BRIDGE_MOCK__` provides deterministic test configuration:

- `enqueue(action, descriptor)` queues one action-specific result;
- `reset()` clears queued mock responses, logs, and capability cache;
- `requests()` returns recorded structured request envelopes;
- `pendingCount()` reports current pending registry size;
- `deliver(response)` injects a test response into the same validator used for native responses;
- `canActivateFor(url)` tests the exact production mock gate;
- `capabilities` exposes the immutable mock capability data.

Supported descriptors cover success, unavailable, cancelled, failed, delayed, no-response/timeout, duplicate, malformed, mismatched-action, and stale run/result contexts. Mock data contains no ad IDs, product IDs, URLs, or analytics endpoints.

## Security boundaries

- Exact protocol version, action, status, request ID, context, payload, data, and error validation.
- No force-casting of message input in Swift.
- No dynamically supplied callback names or executable JavaScript.
- No arbitrary native URL opening or activity-controller configuration.
- No network calls in the bridge.
- No bridge or capability localStorage keys.
- Native ad callbacks never mutate purchase, entitlement, revive, XP, Core, review, analytics, or gameplay state.
- Stage 4 JavaScript permits one revive only after verified earned metadata and an exact current run/result/phase match; duplicate and late callbacks are inert.
- UMP is the only consent-state authority; the app does not parse raw IAB strings.
- The previous-session ad-permission check occurs only after invoking `requestConsentInfoUpdate`, and privacy-options presentation requires UMP's explicit `required` status.
- Google Mobile Ads startup cannot be requested until UMP reports `canRequestAds`; ad loading and presentation always require the current value to remain true.
- Google Mobile Ads is directly pinned to 13.7.0 and Google UMP is directly pinned to 3.1.0 under the same package identity used by Mobile Ads' transitive UMP requirement.
- Only official Google sample IDs exist, and only in Debug build settings. Release has empty IDs and a deterministic approval guard.
- Operational errors resolve defensively so gameplay remains independent of bridge availability.
- Detailed native validation logging exists only in DEBUG builds.

## Stage 5+ extension rule

Later stages keep the v1 envelope, fixed receiver, allowlisted action names, request IDs, validation, timeouts, concurrency, and lifecycle stale checks. Gameplay integration plugs in by:

1. defining its bounded action payload schema in JavaScript and Swift;
2. updating the existing JavaScript action-payload validator without changing the envelope;
3. using the existing typed Swift handler;
4. returning a structured operational response;
5. keeping static support separate from dynamic readiness;
6. authorizing gameplay rewards only from `success` plus `earned: true`, after JavaScript stale-context and per-run idempotency checks.

If a future change cannot remain backward compatible with these schemas, it must introduce a new protocol version rather than weakening version 1 validation.
