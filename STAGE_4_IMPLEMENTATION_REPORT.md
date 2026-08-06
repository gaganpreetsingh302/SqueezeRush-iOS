# Squeeze Rush Stage 4 Implementation Report

## Outcome

Stage 4 connects one verified earned rewarded advertisement to the existing revive lifecycle. The implementation preserves the token revive, run identity, career-run count, score/progression state, award-snapshot deltas, and existing save formats. Double Rewards and interstitial gameplay presentation remain disconnected. No native Swift, plist, Xcode-project, package, privacy-manifest, build-guard, or identifier file changed.

The active release source remained `SqueezeRushIOS\Web`. Nothing was copied from or written to the protected sibling `D:\Games\Squeeze rush\SqueezeRush`.

## 1. Baseline verification

All required Stage 3C production hashes matched before any production edit:

| File | Required and observed SHA-256 |
|---|---|
| `SqueezeRushIOS\GameViewController.swift` | `36C0C0DECE0FE4BBA19D53E6391F12EF453E091750C96E4446B3004F79B250A1` |
| `SqueezeRushIOS\Info.plist` | `5931E12FF3D7F4BCBECDBB7E8949981F04C48433F8B68DBE296958ACCA0D9B4C` |
| `SqueezeRushIOS\PrivacyInfo.xcprivacy` | `521EB6EF8430773E5C010E1838FE9DD8FA5D62B7B76D1CEA8D7D8DAADCB144E2` |
| `SqueezeRushIOS\SqueezeRushAdFlowState.swift` | `0D6E5F447BBE77F2EA5585E389977FBFDECB69882F7E5B06FCA121CFB434009C` |
| `SqueezeRushIOS\SqueezeRushAdManager.swift` | `EB34DDD2FF1656B4436A8EFF5281690285DEC7F57984B66BD8876057F58A89EC` |
| `SqueezeRushIOS\SqueezeRushConsentManager.swift` | `EF4D6F88C8F680BE65EED600A3FB760FA1E96CE947F1FCAE0E8E598798AFA3DA` |
| `SqueezeRushIOS\SqueezeRushNativeBridge.swift` | `161AC432E2C35BAF0070CD92E868DD07E5E55D462DA8CF50F74501F594E95A98` |
| `SqueezeRushIOS\BuildScripts\ValidateAdMobReleaseConfiguration.sh` | `DAA2EACD27519560FC7998940787AE5B1DBD0C159C47E37CFE6C145B6ED6600F` |
| `SqueezeRushIOS.xcodeproj\project.pbxproj` | `ABC120C228323A6379572F3D3487A8813515E808BD31B0BD424C634E99B4EB3D` |
| `SqueezeRushIOS\Web\game.js` | `E6318E1BF8D533B6AD6F02B9B053A730BD0FB598CD9F5053A16BBE9D25B9C973` |
| `SqueezeRushIOS\Web\index.html` | `6785CE9289404B0F72681871C34C225364C07E431BA01411278D85C3FA24C39C` |
| `SqueezeRushIOS\Web\native-bridge.js` | `4DD3FB2BC5B1A4A0349BAED9B1065E5F2CB1B833EE4ADE1EE9F10959D1092D50` |
| `SqueezeRushIOS\Web\run-lifecycle.js` | `F0EED9B5257260C09A81E54626E146950C202359405AE367FE6E1D3EB680910F` |
| `SqueezeRushIOS\Web\styles.css` | `AF2C5C55B050A7BA77139712F0D081A5967AD5E2DFBB97F6F5F8C3BFB635FB53` |

The protected sibling `SqueezeRush\game.js` remains `022D2B0DA412AFFE10D2960A357B615107A54912A65EEC31EB4686B0040BE257`, and protected sibling/archive file counts remain unchanged.

## 2. Package.resolved verification

`SqueezeRushIOS.xcodeproj\project.xcworkspace\xcshareddata\swiftpm\Package.resolved` existed before Stage 4 and was not modified. It selects exactly:

- `swift-package-manager-google-mobile-ads`: `13.7.0`
- `swift-package-manager-google-user-messaging-platform`: `3.1.0`

Its SHA-256 is `8E96CD38A6F0A22EFBE3D1D7319D77CA46CAFA303E145D80CFAE7D8BFA088847`.

The user-supplied Stage 3C evidence records that this resolution compiled and linked successfully in a real Xcode Cloud Debug iOS build. Stage 4 changed only bundled Web content, so no new Apple/Google SDK type-check claim is made from Windows.

## 3. Backup and branch

- Backup: `D:\Games\Squeeze rush\Backups\SqueezeRushIOS-Advanced-2.0.0-pre-stage4-20260805-212103.zip`
- Size: `7,039,077` bytes
- SHA-256: `8D756DB32B22EB0E9A80C054558881F08C2896BE6802D8DC30E93EB03A987182`
- Required archived files verified: `15/15` (14 supplied production files plus `Package.resolved`)
- Git branch: `feature/stage4-rewarded-revive`

The branch was created only after the baseline matched and Git was confirmed clean. Git identity and credentials were not changed.

## 4. Exact files modified and created

Production Web files modified:

- `SqueezeRushIOS\Web\game.js`
- `SqueezeRushIOS\Web\index.html`
- `SqueezeRushIOS\Web\native-bridge.js`
- `SqueezeRushIOS\Web\run-lifecycle.js`
- `SqueezeRushIOS\Web\styles.css`

Documentation modified or created:

- `NATIVE_BRIDGE_PROTOCOL.md`
- `STAGE_4_IMPLEMENTATION_REPORT.md`
- `STAGE_4_CHANGED_FILES.txt`

Tests and review tooling modified or created:

- `tools\stage2-bridge-tests.js`
- `tools\Run-Stage2BridgeTests.ps1`
- `tools\Run-Stage3Tests.ps1`
- `tools\Run-Stage3ATests.ps1`
- `tools\Run-Stage3BTests.ps1`
- `tools\Test-Stage2Static.ps1`
- `tools\Test-Stage2AStatic.ps1`
- `tools\Test-Stage3Static.ps1`
- `tools\Test-Stage3AStatic.ps1`
- `tools\Test-Stage3BStatic.ps1`
- `tools\stage4-rewarded-revive-tests.html`
- `tools\stage4-rewarded-revive-tests.js`
- `tools\Run-Stage4RewardedReviveTests.ps1`
- `tools\Test-Stage4Static.ps1`
- `tools\New-Stage4ReviewBundle.ps1`

Older regression checks were changed only where an assertion was intentionally superseded: Stage 4 legitimately changes the five Web files, and the verified Xcode Cloud `Package.resolved` now legitimately exists. Those checks now pin the exact audited Stage 4 Web hashes and exact resolved Google versions; their protocol, security, ownership, package, Release, and protected-tree assertions remain active.

The Stage 2 and Stage 4 localhost runners also use a short bounded retry when deleting temporary HTTP log files, preventing a transient Windows file-handle race from turning an already-passed browser suite into a cleanup failure.

No native production file was modified.

## 5. Rewarded-revive eligibility

`isRewardedReviveProductEligible(resultSequence)` requires all product-state conditions before capability lookup:

- lifecycle phase is `result_pending`;
- run is not finalized;
- result sequence is the current sequence;
- pending reason is the genuine death/failure reason `popped` or `smashed`;
- the current mode's existing configuration allows revives (`revives > 0` or `allowRevivePickups == true`);
- token inventory is zero;
- `rewardedReviveUsed` is false;
- no rewarded request is pending.

Consequences of the existing mode configuration are preserved:

- Daily, Arcade, and Zen can reach the offer only after their token inventory is exhausted.
- Chaos remains a no-revive mode.
- Sprint remains a no-revive mode, and `timeup` is always a finalized completion rather than a death.

For an otherwise eligible result, `getCapabilities({ refresh: true, timeoutMs: 5000 })` is called once. The control is shown only when `nativeBridge`, `rewardedAds`, `canRequestAds`, and `rewardedAdReady` are all exactly `true`. There is no polling and no JavaScript network request.

## 6. UI behavior

`index.html` adds one separate `rewardedReviveBtn` labeled `Watch Ad to Revive`; it does not replace or rename `reviveBtn`. The new control is hidden by default.

On request, `game.js`:

- records one active request identity;
- disables token revive, rewarded revive, Retry, Share, and Menu;
- changes only the rewarded-control label to `Loading Ad...`;
- sends one typed native request.

Cancelled, unavailable, failed, stale, timed-out, and unearned results grant nothing. If the same result is still pending, controls are restored, the ad control is hidden until a later result, and a bounded game-owned toast is shown. Raw native or SDK error messages are never displayed. If native support/readiness is absent during the initial capability refresh, the ad control stays hidden and Retry/Menu remain usable.

On a verified earned result, the result panel closes, the normal game controls resume, and no loading label remains. The existing portrait layout is preserved; the added button uses the existing stacked result layout and existing color variables.

## 7. Native request and response flow

The Stage 4 request is:

```json
{
  "action": "rewarded.show",
  "context": {
    "runId": "captured by native-bridge.js",
    "resultSequence": 1,
    "lifecyclePhase": "result_pending"
  },
  "payload": {
    "placement": "revive"
  }
}
```

`native-bridge.js` still uses protocol version 1, the fixed structured receiver, its in-memory pending map, timeouts, and duplicate-response removal. It now locally accepts only the exact Stage 4 rewarded payload `{ placement: "revive" }` and rejects a rewarded request unless the current lifecycle context has a non-empty run ID, a result sequence, and phase `result_pending`.

Native `SqueezeRushAdManager` and `SqueezeRushNativeBridge` were not changed. They continue to return earned metadata only after Google's earned callback and full-screen dismissal, and they never mutate gameplay.

Application code resumes the run only when every condition is true:

- the Promise belongs to the still-active request object;
- the same run and result are still unfinalized and pending;
- response status is `success`;
- response data has `earned === true`;
- response data has `placement === "revive"`;
- response context exactly matches run ID, result sequence, and `result_pending` phase;
- `runLifecycle.reviveWithRewarded(resultSequence)` atomically accepts the result.

## 8. Stale and duplicate protection

The bridge's stale conversion now compares lifecycle phase as well as run ID and result sequence against both the captured request and current lifecycle snapshot. A response for a different run, later result sequence, or changed phase is converted to `stale` before gameplay receives it.

The bridge removes a pending request on the first valid response, so duplicate native callbacks are ignored. `game.js` adds a second application guard: only the exact active request object may settle, and the lifecycle controller accepts only one result decision. Retry and Menu are disabled and their handlers refuse to act while the rewarded Promise is pending. Page/navigation invalidation clears the active application request, making a later Promise completion inert.

## 9. Shared token/rewarded continuation

The original post-token-revive mechanics were extracted without changing their values into `continueRunAfterRevive()`. Both token and rewarded claims call this helper. It:

- resumes the same run;
- preserves score and progression;
- halves the combo using the existing formula;
- removes gates and pickups in the same existing nearby ranges;
- resets player pressure and squeeze to zero;
- grants the existing `2.2`-second invulnerability;
- clears input/result UI and resumes the existing sound, haptic, burst, and HUD behavior.

`reviveWithToken()` still decrements one token, increments `tokenRevivesUsed`, and emits `run_revived` with source `token`. New `reviveWithRewarded()` decrements no token, sets `rewardedReviveUsed` exactly once, and emits `run_revived` with source `rewarded`. Both preserve the same `runId`.

## 10. Reward and career invariants

- `career.totalRuns` is still incremented only by the existing actual-run award path and remains one across a revive.
- The ad callback calls neither `awardRunProgress()` nor `recordRewardDelta()`.
- No callback directly changes XP, Cores, career fields, `runRewardXp`, `runRewardCores`, accumulated rewards, or contract progress.
- Existing `awardSnapshot` values and delta calculations were not changed.
- Token inventory is unchanged by a rewarded revive.
- `rewardedReviveUsed` is run-local and reset by the existing `startRun()` lifecycle reset; it is not persisted in `career.v2`.
- Existing localStorage keys and formats remain unchanged.
- One rewarded revive maximum is enforced by both the run-local flag and the atomic result lock.

## 11. Test environment and commands

Versions used:

- Windows PowerShell: `5.1.26100.8972`
- Python: `3.13.3` (localhost test server)
- Microsoft Edge: `151.0.4129.59` (headless browser)
- Swift compiler: `6.0.1` for frontend syntax parsing and deterministic pure-Swift tests
- Git: `2.55.0.windows.2`

Exact browser/deterministic commands:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Run-Stage1LifecycleTests.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Run-Stage2BridgeTests.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Run-Stage3Tests.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Run-Stage3ATests.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Run-Stage3BTests.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Run-Stage4RewardedReviveTests.ps1
```

Exact static commands:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-Stage2Static.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-Stage2AStatic.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-Stage3Static.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-Stage3AStatic.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-Stage3BStatic.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-Stage4Static.ps1
```

Complete summarized results:

| Gate | Result |
|---|---|
| Stage 1 lifecycle | `10/10 passed, 0 failed` |
| Stage 2 bridge | `21/21 passed, 0 failed`; file mock gate passed |
| Stage 2 static | `94 passed, 0 failed` |
| Stage 2A static | `13 passed, 0 failed` |
| Stage 3 deterministic plus Release guard | `26/26 passed, 0 failed` |
| Stage 3 static | `36 passed, 0 failed` |
| Stage 3A deterministic | `18/18 passed, 0 failed` |
| Stage 3A static | `29 passed, 0 failed` |
| Stage 3B deterministic | `18/18 passed, 0 failed` |
| Stage 3B static | `31 passed, 0 failed` |
| Stage 4 rewarded-revive browser suite | `34/34 passed, 0 failed` |
| Stage 4 static | `54 passed, 0 failed` |
| Swift frontend syntax parsing | Passed for every native Swift file |
| Release validation | Passed: empty/unapproved and Google-sample Release configurations were both rejected |

The Stage 4 suite covers the required scenarios A through AH, including all negative outcomes, stale run/result callbacks, duplicate delivery, rapid taps, pending Retry/Menu races, lifecycle changes, run/career/token/reward invariants, token compatibility, `awardSnapshot`, and the absence of Double Rewards/interstitial callers.

## 12. Manual physical-iPhone Debug test plan

1. Resolve the already-pinned packages in Xcode and build the Debug target on a physical iPhone running iOS 15 or later.
2. Confirm any Google ad presented by this build displays the `Test Ad` label.
3. Die while a token revive is available; confirm only the existing token option is shown.
4. Use the token, die again after tokens are exhausted, and confirm `Watch Ad to Revive` appears only when consent and rewarded readiness permit it.
5. Complete the rewarded test ad; confirm the run resumes only after earned callback plus dismissal.
6. Close/cancel the rewarded ad; confirm the run stays at the result and Retry/Menu become usable.
7. Disable network access; confirm no revive is granted and Retry/Menu remain usable.
8. Confirm no ordinary run ending automatically presents an interstitial.
9. After one rewarded revive, die again in the same run and confirm no second ad revive appears.
10. Confirm Sprint time-up and Chaos deaths never offer an ad revive.
11. Confirm the revived run retains score, run ID, one `career.totalRuns`, and correct token count.
12. Compare XP, Cores, contracts, best score, and career totals before/after the rewarded continuation and final run ending.
13. Exercise small-screen portrait layout and Dynamic Type/device display settings for result-control usability.

## 13. Known risks and limitations

- Stage 4's production Web changes were executed and tested in real Edge/V8 frames on Windows, not inside a new Xcode/iPhone build. The prior Stage 3C Xcode Cloud build proves the unchanged native target and packages, but the final bundled Web behavior still needs the manual iPhone tests above.
- Rewarded readiness can legitimately change after capability refresh. The request therefore still handles native `ad_not_ready`, consent, presentation-busy, failure, cancellation, and timeout outcomes without granting a revive.
- The result remains pending after an attempted ad that fails or is cancelled, as required. The Stage 4 button stays hidden for that result; Retry/Menu remain available rather than repeatedly soliciting an ad.
- The 120-second JavaScript timeout is intentionally long enough for a full rewarded presentation but still bounds a missing native callback.
- The existing public privacy/legal copy is not changed in this test-only stage and remains a Release blocker for any ad-enabled production release.
- The checked-in test IDs and `SQUEEZE_RUSH_ADS_RELEASE_APPROVED = NO` intentionally prevent production Release/archive completion.

## 14. Post-change production hashes

| Changed production file | SHA-256 |
|---|---|
| `SqueezeRushIOS\Web\game.js` | `49951E3BA0D3321FC1349EEFF5A2D8D5975F45711510403C3AF9A1D3B0D15B58` |
| `SqueezeRushIOS\Web\index.html` | `F09B7CC871DEFD5C6CE823BC46AE63E4E95E01E6A179BD225FCC80307816C2F6` |
| `SqueezeRushIOS\Web\native-bridge.js` | `33683B8049A2EB9E0E89B53A45012C3826318D5F2D1C11004E6832CB1F72BF95` |
| `SqueezeRushIOS\Web\run-lifecycle.js` | `6D0AF635A9C638183035E312BAE26E7076B1561635C649EB7F3266BE124C6397` |
| `SqueezeRushIOS\Web\styles.css` | `7C3B6BAFF43C1ED04F631BA302A6F2902AF29FD715ABF1FAE9979E07BAD5D6CB` |

Updated `NATIVE_BRIDGE_PROTOCOL.md` SHA-256: `8814BC9B73413404CE4B61C904FF2A17E629954B59E32B22F0C308BE7E8CD4D4`.

## 15. Scope confirmations

- One earned rewarded revive is connected; it is test-ID only and limited to once per run.
- Existing token revive remains intact and takes precedence.
- Double Rewards is not connected and has no UI or gameplay caller.
- Interstitials have no gameplay caller, cadence, cooldown, or automatic presentation.
- No StoreKit, purchases, Remove Ads, analytics, ATT, IDFA, Firebase, review request, Loop Bloom, More Games, production identifier, or physical test-device identifier was added.
- Release remains blocked with empty Release IDs, approval `NO`, and the unchanged validation script.
- Stage 5 was not started.
