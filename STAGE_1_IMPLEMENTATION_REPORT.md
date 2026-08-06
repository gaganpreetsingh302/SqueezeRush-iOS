# Squeeze Rush Monetization Stage 1 Implementation Report

Date: 2026-08-03 (America/Toronto)

Scope: protected release baseline and explicit, idempotent run lifecycle only. Stage 2 was not started.

## 1. Protected release baseline

The release baseline is the embedded game shipped by the active native Xcode project:

`D:\Games\Squeeze rush\SqueezeRushIOS-Advanced-2.0.0\SqueezeRushIOS\Web`

`SOURCE_OF_TRUTH.md` records this decision. The sibling `D:\Games\Squeeze rush\SqueezeRush` source is explicitly excluded from automatic copy, merge, or synchronization.

### Backup

- ZIP: `D:\Games\Squeeze rush\Backups\SqueezeRushIOS-Advanced-2.0.0-pre-stage1-20260803-215030.zip`
- Size: 3,325,537 bytes
- ZIP SHA-256: `529BC633F36DA79BCA1A43473885B04E48B9452C5CB0E222E992CC8F25DF3C1F`
- The ZIP is outside the project being backed up.
- Each required archived file was opened from the ZIP and its SHA-256 was compared with the original. All seven comparisons matched.

### Original file hashes

| File | Bytes | Original SHA-256 |
|---|---:|---|
| `SqueezeRushIOS\Web\game.js` | 61,089 | `430A1E72B6CA8A4068CAD77A9C35F961119D2D8536FF61FE1F12CA1B1E4B6839` |
| `SqueezeRushIOS\Web\index.html` | 7,727 | `85354670FEA9B1DCAFE9F86AA22E181F82E17FED2BDC0E19FF72E3FA3AD1D09E` |
| `SqueezeRushIOS\Web\styles.css` | 19,923 | `AF2C5C55B050A7BA77139712F0D081A5967AD5E2DFBB97F6F5F8C3BFB635FB53` |
| `SqueezeRushIOS\GameViewController.swift` | 6,434 | `45FAA9B9B0E01200451A888234482D62F5CD599513F69266D3F76D42B17FD273` |
| `SqueezeRushIOS\AppDelegate.swift` | 584 | `889597E22D37BC66E53B6B9FE9C061762E0DBDB0497D3128183FED1ACA926C88` |
| `SqueezeRushIOS\Info.plist` | 1,418 | `E31455AC0C1318969D027975C3D1E00D9E0DFEF321F7491E9F1002F6A46E43E0` |
| `SqueezeRushIOS.xcodeproj\project.pbxproj` | 12,904 | `ACD382F806FD6B66C332CB0BA516E00BCA7169DB0B3C5CF81EECA08DC4DB22C4` |

### Git

Git `2.55.0.windows.2` was available. The active project was not already a repository, so Git was initialized only in `D:\Games\Squeeze rush\SqueezeRushIOS-Advanced-2.0.0`. The existing `.gitignore` already excluded Xcode build/derived data, signing exports, and macOS metadata, so it did not need to be changed.

No baseline commit was made because neither `user.name` nor `user.email` was configured. No identity was invented, and this did not block Stage 1 implementation. The workspace parent was not initialized as a repository.

## 2. Lifecycle before and after

### Before Stage 1

`startRun(mode)` reset gameplay and reward state. Every `endRun(reason)` immediately called the existing best-score and `awardRunProgress()` paths, displayed the result, and offered token revive when available. `reviveRun()` decremented `state.revives` and resumed play. There was no run identifier, lifecycle phase, result sequence, finalization boundary, or atomic result-action guard.

The pre-existing `state.runAwarded` flag already prevented `career.totalRuns` from increasing again after a token revive, and `state.awardSnapshot` already converted later results in the same run into award deltas. Stage 1 preserved both behaviors.

### After Stage 1

`SqueezeRushIOS\Web\run-lifecycle.js` now owns a small lifecycle controller used by the existing monolithic game. The phases are:

1. `idle`
2. `countdown`
3. `active`
4. `result_pending`
5. `finalized`

`startRun(mode)` creates a unique run ID and resets lifecycle/revive/reward/finalization state. `endRun(reason)` advances the result sequence and enters `result_pending` before any result award or UI work. A valid token revive resumes `active` with the same `runId`. A result with no valid token path finalizes immediately after the result is shown. Retry and Menu atomically claim the pending result action, finalize once, and then navigate.

Sprint `timeup` is explicitly not revive eligible and finalizes with reason `timeup`. Share remains an independent action and does not start, revive, or finalize a run.

## 3. Newly added lifecycle fields

| Field | Purpose |
|---|---|
| `runId` | Unique identifier created once by each `startRun(mode)` call. Uses `crypto.randomUUID()` when available and a timestamp/random/serial fallback otherwise. |
| `lifecyclePhase` | Current phase: `idle`, `countdown`, `active`, `result_pending`, or `finalized`. |
| `resultSequence` | Monotonic result/death sequence within the current run; starts at zero and increments at each accepted `endRun(reason)`. |
| `runFinalized` | Idempotency flag; once true, the current run cannot be finalized or revived again. |
| `finalizationReason` | Stable reason recorded at finalization, such as `timeup`, `no_revive:smashed`, or `declined_retry:smashed`. |
| `accumulatedXpReward` | Sum of every existing `xpDelta` awarded during the current run, including post-revive deltas. |
| `accumulatedCoreReward` | Sum of every existing score/contract `coreDelta` awarded during the current run. |
| `tokenRevivesUsed` | Count of accepted existing token revives in the current run. |
| `rewardedReviveUsed` | Reserved Stage 1 field, reset to `false`; no rewarded revive behavior exists yet. |
| `rewardDoubleClaimed` | Reserved Stage 1 field, reset to `false`; no double-reward behavior exists yet. |
| `resultActionLocked` | Internal atomic guard preventing repeated Retry, Menu, or Revive taps from winning the same result decision more than once. |

These fields are in-memory run state. They are not written into `squeezeRush.career.v2` or any other existing save key.

## 4. Lifecycle extension points

Future integration code can subscribe through the read/subscription-only global `window.SqueezeRushLifecycle`:

- `on(eventName, listener)` registers a listener and returns an unsubscribe function.
- `off(eventName, listener)` removes a listener.
- `snapshot()` returns immutable lifecycle values without exposing controller mutation methods.
- `events` and `phases` expose the documented constants.

Events:

| Event | Additional parameters |
|---|---|
| `run_started` | `mode`, `startingLevel`, `startingRevives` |
| `result_shown` | `reason`, `canTokenRevive`, `score`, `xpReward`, `coreReward` |
| `run_revived` | `source`, `resultReason`, `revivesRemaining` |
| `run_finalized` | `reason` |
| `reward_changed` | `xpDelta`, `coreDelta` |

Every event payload also includes the lifecycle snapshot, including `runId` and `resultSequence`, so a future native callback can reject stale requests. No registered listeners is a supported no-op. Unknown events return a no-op unsubscribe function. Listener and development-logger exceptions are caught and do not propagate into gameplay.

Development-only transition/event logging is disabled by default. It can be enabled with the `lifecycleDebug` query parameter or by setting `window.__SQUEEZE_RUSH_LIFECYCLE_DEBUG__ = true` before `game.js` runs. It logs transitions and lifecycle actions only; it does not log per animation frame.

## 5. Career run count remains exactly once

The existing `state.runAwarded` mechanism was deliberately retained:

1. `startRun(mode)` resets `state.runAwarded` to `false` exactly once for the new run.
2. The first accepted `endRun(reason)` calls the existing `awardRunProgress()` function.
3. `awardRunProgress()` increments `career.totalRuns` only when `state.runAwarded` is false, then changes it to true.
4. Token revive calls `reviveRun()` only. It does not call `startRun()`, reset `runAwarded`, or create a new `runId`.
5. Later results in the revived run therefore cannot increment `career.totalRuns` again.
6. Retry must finalize the old result before it can navigate to instructions. The later explicit start creates a different `runId` and resets `runAwarded` for that genuinely new run.

The deterministic tests confirm one career run across two result sequences with a token revive.

## 6. `awardSnapshot` compatibility and accumulated rewards

The original formula and ordering remain unchanged:

```text
xp = max(5, round(score * 0.45 + gatesPassed * 2 + perfects * 5 + bossGates * 6))
xpDelta = max(0, xp - awardSnapshot.xp)
scoreCores = floor(score / 80)
coreDelta = max(0, scoreCores - awardSnapshot.scoreCores) + newly completed contract rewards
```

The original five-field snapshot remains:

`{ xp, scoreCores, gates, nearMisses, pickups }`

Existing XP, Core, contract completion, total gates, total near misses, total pickups, best combo, best score, and mode-best calculations were not changed. Stage 1 adds one call after those deltas are calculated: `recordRewardDelta(xpDelta, coreDelta)`. This mirrors the same awarded deltas into `accumulatedXpReward` and `accumulatedCoreReward` and emits `reward_changed` safely. It does not calculate or award anything independently.

In the revive test, the first result awards 7 XP. The post-revive result has a cumulative entitlement of 25 XP, so the unchanged snapshot logic awards only the remaining 18 XP. Career XP, `runRewardXp`, `awardSnapshot.xp`, and `accumulatedXpReward` all finish at 25, with no duplicate grant.

## 7. Finalization rules

- Valid token revive path: remain `result_pending` while the player decides.
- Accepted token revive: return to `active`, preserve `runId`, increment `resultSequence` only on the next result, and prevent stale result actions from resuming the prior decision.
- Retry from `result_pending`: atomically claim Retry, finalize once with `declined_retry:<result reason>`, then show the existing instructions UI.
- Menu from `result_pending`: atomically claim Menu, finalize once with `declined_menu:<result reason>`, then show the existing menu UI.
- Death/result with no token revive: show the result and immediately finalize with `no_revive:<result reason>`.
- Sprint time-up: show the completed result and immediately finalize with `timeup`.
- Already finalized: repeated finalization and revive calls fail without changing state.
- Rapid repeated result actions: `resultActionLocked` allows only the first valid action to navigate.
- Share: leaves phase, finalization, run ID, career data, and rewards unchanged.

## 8. Exact files modified or created

Production files:

- Modified: `SqueezeRushIOS\Web\game.js`
- Modified: `SqueezeRushIOS\Web\index.html`
- Created: `SqueezeRushIOS\Web\run-lifecycle.js`

Documentation and test tooling:

- Created: `SOURCE_OF_TRUTH.md`
- Created: `tools\stage1-lifecycle-tests.html`
- Created: `tools\stage1-lifecycle-tests.js`
- Created: `tools\Run-Stage1LifecycleTests.ps1`
- Created: `tools\Test-Stage1Static.ps1`
- Created: `STAGE_1_IMPLEMENTATION_REPORT.md`
- Created: `STAGE_1_CHANGED_FILES.txt`

Repository metadata was created under `.git` by `git init`; generated `.git` internals are not production source and are not enumerated in `STAGE_1_CHANGED_FILES.txt`. The pre-existing `.gitignore` was not modified.

No Swift, plist, Xcode project, CSS, asset, legal-page, metadata, sibling-source, older-project, or archived-project file was changed.

The Xcode project already packages `SqueezeRushIOS\Web` as a folder resource (`Web in Resources`), so the new `run-lifecycle.js` is included by that existing folder reference without editing `project.pbxproj`.

## 9. Post-change production hashes

| Production file | Bytes | Post-change SHA-256 |
|---|---:|---|
| `SqueezeRushIOS\Web\game.js` | 66,771 | `CCE4CA742E19959B48D8D19FD7FE1397FADE74B4307A5CD438A7C352B7AE22A6` |
| `SqueezeRushIOS\Web\index.html` | 7,770 | `56C3C07E2AD75D42FB69BCF28D0749C675CA899E6CDBD60D3922D88C3837402C` |
| `SqueezeRushIOS\Web\run-lifecycle.js` | 8,773 | `F0EED9B5257260C09A81E54626E146950C202359405AE367FE6E1D3EB680910F` |

Required files intentionally left unchanged still match their original hashes: `styles.css`, `GameViewController.swift`, `AppDelegate.swift`, `Info.plist`, and `project.pbxproj`.

## 10. Automated and deterministic test results

The harness uses no JavaScript test framework or installed package. It starts a temporary Python localhost server, loads the actual production `SqueezeRushIOS\Web\index.html` in installed Microsoft Edge headless mode, and accesses a test surface that exists only when explicitly enabled or when the game is served from `localhost`/`127.0.0.1` with `stage1Test`. The animation loop is stopped only in test mode. The production file/WKWebView path does not expose this surface by default.

Test environment:

- Windows PowerShell
- Python `3.13.3` standard-library `http.server`
- Microsoft Edge `151.0.4129.59`
- No npm, Node.js, package, or SDK installation

### Lifecycle, reward, save, and share scenarios

Exact command:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Run-Stage1LifecycleTests.ps1
```

Output:

```text
STAGE 1 TEST RESULT: 10/10 passed, 0 failed
PASS: A. Normal run with no revive: PASS
PASS: B. Token revive remains pending and preserves runId: PASS
PASS: C. Revived run awards snapshot deltas and finalizes once: PASS
PASS: D. Decline revive with Retry: PASS
PASS: E. Decline revive with Menu: PASS
PASS: F. Sprint time-up is a final outcome: PASS
PASS: G. Repeated result actions are idempotent: PASS
PASS: H. Existing save compatibility: PASS
PASS: I. Corrupt save fallback: PASS
PASS: J. Share does not mutate lifecycle: PASS
```

The real production scripts parsed and executed in every scenario. A JavaScript syntax/load error in `run-lifecycle.js`, `game.js`, or the harness prevents the gated test API from loading and fails the suite.

### Static and protected-tree checks

Exact command:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-Stage1Static.ps1
```

Final output summary:

```text
STATIC CHECK RESULT: 58 passed, 0 failed
```

The 58 checks cover:

- unchanged hashes for `styles.css`, `GameViewController.swift`, `AppDelegate.swift`, `Info.plist`, and `project.pbxproj`;
- backup existence outside the active project;
- unchanged protected-tree file counts and no file timestamps written during Stage 1 for the sibling source, older iOS project, and archived iOS project;
- audited sibling `SqueezeRush\game.js` SHA-256 still `022D2B0DA412AFFE10D2960A357B615107A54912A65EEC31EB4686B0040BE257`;
- no duplicate production DOM IDs;
- every literal `game.js` `getElementById` reference exists;
- all locally referenced production HTML assets exist;
- `run-lifecycle.js` loads before `game.js`;
- all lifecycle fields, events, and existing localStorage keys are present;
- no production markers for ads, StoreKit, ATT, review requests, Firebase Analytics, Loop Bloom, or More Games;
- Git exists only at the active project scope;
- every expected Stage 1 source/tool file exists.

The in-app browser surface reported no available browser. The deterministic browser suite therefore used the installed Edge executable in headless command-line mode. This does not replace the required iOS WebKit tests below.

## 11. Save compatibility

The following keys and formats are unchanged:

- `squeezeRush.best.v1`: numeric string
- `squeezeRush.modeBest.v1`: JSON object keyed by mode
- `squeezeRush.career.v2`: existing JSON career object
- `squeezeRush.settings.v2`: existing JSON settings object

No key was renamed, cleared, or migrated. Valid seeded data loaded, continued, and rewrote successfully. Corrupt JSON continued through the existing safe-default paths and produced valid career/mode-best JSON after a run. Lifecycle fields and reserved monetization fields are not stored in `career.v2`. Purchase persistence remains deliberately unimplemented for Stage 1 and must use a separate native/monetization store in a later stage.

## 12. Manual tests still required on a Mac and iPhone

1. Open `SqueezeRushIOS.xcodeproj` on a supported Mac and build the current target for an iOS Simulator and a physical iPhone.
2. Inspect the built application resources and confirm `Web/run-lifecycle.js` is copied with the existing Web folder resource.
3. Launch through the actual `GameViewController`/`WKWebView` and confirm there are no JavaScript console errors.
4. Run Daily and Arcade through first death, wait on the revive decision, revive, die again, and verify one career run plus cumulative delta rewards.
5. Run Sprint through natural time-up and confirm there is no revive offer.
6. Smoke-test Zen and Chaos to confirm their existing mode rules and revive counts remain unchanged.
7. Rapidly tap Revive, Retry, and Menu on a physical touch screen; confirm one accepted action, one navigation, and no reward duplication.
8. Background/foreground the app during active play and during `result_pending`; confirm the existing pause/resume behavior and lifecycle state are acceptable.
9. Open Share from a pending and a finalized result; cancel and complete the native share sheet and confirm lifecycle/career values are unchanged.
10. Install over a build containing real published-player saves or use a copied WebKit localStorage data set; verify bests, career, contracts, and sound settings remain intact.
11. Confirm sound, haptics, controls, animation timing, score display, existing text, and visual layout match the release baseline.
12. Use Safari Web Inspector with development logging enabled for a debug run to verify `runId` and `resultSequence` transitions across revive and retry.

## 13. Known risks and uncertainties

- Xcode, iOS Simulator, code signing, and physical `WKWebView` execution are unavailable on this Windows host. The Xcode build and WebKit-specific checks remain manual gates.
- The automated suite uses Chromium/Edge, not JavaScriptCore/WebKit. The JavaScript uses browser features already compatible with the current game and includes a fallback for `crypto.randomUUID()`, but an iOS build is still required.
- Lifecycle state is intentionally in memory and is not crash-resume persistence. Terminating the app during a run will continue to follow the game's existing restart behavior.
- The existing synchronous localStorage implementation and its existing behavior on quota/write failure were not changed.
- Existing rewards are still granted at each result before the token-revive decision, matching the release baseline. A later Double Rewards implementation must use the accumulated totals and `rewardDoubleClaimed` without re-running `awardRunProgress()`.
- `window.SqueezeRushLifecycle` is only the JavaScript extension boundary. No Swift message handler or native monetization bridge was added in this stage.
- A Git baseline commit is still absent until the project owner configures a valid Git identity and chooses to commit.

## 14. Stage 1 scope confirmation

Stage 1 added no:

- advertisements or ad SDK;
- in-app purchase or StoreKit code;
- analytics SDK or gameplay/monetization analytics transmission;
- App Tracking Transparency prompt or framework;
- privacy-consent SDK or flow;
- App Store review prompt;
- deep link or More Games/Loop Bloom cross-promotion;
- production ad or product identifiers;
- App Store metadata or legal-page change.

`AppDelegate.swift`, `Info.plist`, `SqueezeRushIOS.xcodeproj\project.pbxproj`, `styles.css`, native controller code, assets, and App Store copy were not modified.

The sibling `D:\Games\Squeeze rush\SqueezeRush` source was not modified. It still contains 9 files, no file in it has a Stage 1 write timestamp, and its distinct audited `game.js` SHA-256 remains `022D2B0DA412AFFE10D2960A357B615107A54912A65EEC31EB4686B0040BE257`.

Stage 2 was not started.
