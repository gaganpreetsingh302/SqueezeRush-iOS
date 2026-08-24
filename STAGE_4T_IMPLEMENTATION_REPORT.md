# Squeeze Rush Stage 4T Implementation Report

## Outcome

Stage 4T adds one separate shared Xcode scheme, `SqueezeRushIOS-InternalAdTest`, for internal TestFlight device testing of the Stage 4 rewarded revive. It builds the existing `SqueezeRushIOS` target and uses `Debug` for Run, Test, Profile, Analyze, and Archive.

The existing `SqueezeRushIOS` scheme remains byte-identical and continues to use `Release` for Profile and Archive. No gameplay, Swift, Web, plist, privacy, package, Xcode project, identifier, signing, or Release-protection file changed.

## 1. Protected baseline and backup

Before creating the scheme:

- Git branch was `feature/stage4-rewarded-revive`.
- The worktree was clean.
- All 14 production hashes recorded in `STAGE_4_IMPLEMENTATION_REPORT.md` matched exactly.
- The existing `SqueezeRushIOS.xcscheme` SHA-256 was recorded as `B2C2E619120C04C6FEB6964E4DF27677681583D36FA29DBD26A4875C82111E7A`.
- `Package.resolved` was `8E96CD38A6F0A22EFBE3D1D7319D77CA46CAFA303E145D80CFAE7D8BFA088847` and selected Mobile Ads `13.7.0` plus UMP `3.1.0`.
- `project.pbxproj` remained `ABC120C228323A6379572F3D3487A8813515E808BD31B0BD424C634E99B4EB3D`.
- The Release guard remained `DAA2EACD27519560FC7998940787AE5B1DBD0C159C47E37CFE6C145B6ED6600F`.

Backup:

- Path: `D:\Games\Squeeze rush\Backups\SqueezeRushIOS-Advanced-2.0.0-pre-stage4t-20260806-194718.zip`
- Size: `3,515,029` bytes
- SHA-256: `FE9F7B144847428C9F8D95162F9219FE0A4CDF1C5625955F4F36767A14E65305`
- Entries: `89`
- Required protected entries verified against originals: `16/16`

The archive contains the project content and excludes repository metadata and generated build directories. A failed zero-byte archive attempt caused by an unavailable PowerShell compression type was detected immediately, removed, and replaced by the verified archive above.

## 2. Exact files created or modified

Created:

- `SqueezeRushIOS.xcodeproj\xcshareddata\xcschemes\SqueezeRushIOS-InternalAdTest.xcscheme`
- `tools\Test-Stage4TStatic.ps1`
- `STAGE_4T_IMPLEMENTATION_REPORT.md`
- `STAGE_4T_CHANGED_FILES.txt`
- `D:\Games\Squeeze rush\Backups\SqueezeRushIOS-Advanced-2.0.0-pre-stage4t-20260806-194718.zip`
- `D:\Games\Squeeze rush\ReviewBundles\SqueezeRush-Stage4T-Review-20260806-194958.zip`

Modified production files: none.

## 3. Existing and internal-test schemes

| Action | Existing `SqueezeRushIOS` | New `SqueezeRushIOS-InternalAdTest` |
|---|---:|---:|
| Build target | `SqueezeRushIOS` | `SqueezeRushIOS` |
| Run | Debug | Debug |
| Test | Debug | Debug |
| Profile | Release | Debug |
| Analyze | Debug | Debug |
| Archive | Release | Debug |
| Shared | Yes | Yes |

Both schemes use:

- Blueprint identifier: `A1B2C3D4E5F6071829300002`
- Blueprint name: `SqueezeRushIOS`
- Buildable name: `Squeeze Rush.app`
- Container reference: `container:SqueezeRushIOS.xcodeproj`

The new scheme is stored at the required shared location:

`SqueezeRushIOS.xcodeproj\xcshareddata\xcschemes\SqueezeRushIOS-InternalAdTest.xcscheme`

Its size is `2,932` bytes and its SHA-256 is `D911F9045C4D0221A4DD28485FC36D9574F9E7927D432DFC42F974C25808CAC5`.

It contains no command-line arguments, automatic consent reset, physical test-device identifier, credential, Apple team ID, certificate, provisioning data, or environment-specific secret.

## 4. XML and safety validation

`tools\Test-Stage4TStatic.ps1` parses the new file through PowerShell's XML parser and validates its structure and all action configurations. Result:

`STAGE 4T STATIC CHECK RESULT: 21 passed, 0 failed`

The checks confirm:

- valid XML;
- the existing app target, blueprint identifier, and container are reused;
- all required build-action flags are enabled;
- Run, Test, Profile, Analyze, and Archive use Debug;
- no launch/reset arguments or device/credential data exist;
- the original scheme remains byte-identical and retains Release Archive/Profile;
- the two schemes coexist as distinct shared schemes;
- all 14 Stage 4 production hashes remain exact;
- Debug retains only Google's three official sample/test identifiers;
- Release IDs remain empty and approval remains `NO`;
- the Release guard and `Package.resolved` remain byte-identical;
- the protected sibling source remains unchanged.

## 5. Regression results

Environment:

- Windows PowerShell `5.1.26100.8972`
- Python `3.13.3`
- Microsoft Edge `151.0.4129.59`
- Swift compiler `6.0.1` for deterministic tests and syntax parsing
- Git `2.55.0.windows.2`

Commands:

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
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Run-Stage4RewardedReviveTests.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-Stage4Static.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-Stage4TStatic.ps1
```

Results:

| Gate | Result |
|---|---|
| Stage 1 lifecycle | `10/10 passed, 0 failed` |
| Stage 2 bridge | `21/21 passed, 0 failed` |
| Stage 2 static | `94 passed, 0 failed` |
| Stage 2A static | `13 passed, 0 failed` |
| Stage 3 deterministic and Release guard | `26/26 passed, 0 failed` |
| Stage 3 static | `36 passed, 0 failed` |
| Stage 3A deterministic | `18/18 passed, 0 failed` |
| Stage 3A static | `29 passed, 0 failed` |
| Stage 3B deterministic | `18/18 passed, 0 failed` |
| Stage 3B static | `31 passed, 0 failed` |
| Stage 4 rewarded revive | `34/34 passed, 0 failed` |
| Stage 4 static | `54 passed, 0 failed` |
| Stage 4T static/XML | `21 passed, 0 failed` |

## 6. Production and Release protections

All production files remain byte-identical to the Stage 4 hashes. In particular:

- no Swift or Web source changed;
- `Info.plist`, `PrivacyInfo.xcprivacy`, and `project.pbxproj` did not change;
- the existing shared scheme did not change;
- Package.swift references and `Package.resolved` did not change;
- Debug keeps only the official Google sample/test IDs;
- Release keeps all three ad identifiers empty;
- `SQUEEZE_RUSH_ADS_RELEASE_APPROVED = NO` remains unchanged;
- the deterministic Release validation script remains unchanged and still rejects missing/test IDs;
- no signing, team, certificate, provisioning, or credential material was added.

Release remains intentionally blocked. The Debug-archive scheme does not weaken or bypass the production Release guard; it is a separate internal-test path and must never replace the `SqueezeRushIOS` production scheme.

## 7. Manual Xcode Cloud workflow

Apple documents `TestFlight (Internal Testing Only)` as the Archive action's Deployment Preparation option for archives intended only for team/internal TestFlight distribution. An Archive action is required for TestFlight distribution, and an internal tester group must exist before configuring the internal TestFlight post-action:

- [Configuring Xcode Cloud workflow actions](https://developer.apple.com/documentation/xcode/configuring-your-xcode-cloud-workflow-s-actions)
- [Distributing Xcode Cloud builds through TestFlight](https://developer.apple.com/documentation/xcode/distributing-your-xcode-cloud-builds-through-testflight)

Recommended controlled workflow:

1. Push the local Stage 4T commit on `feature/stage4-rewarded-revive` to the repository used by Xcode Cloud.
2. Open the project in Xcode 16 or newer and choose **Product > Scheme > Manage Schemes**.
3. Confirm both shared schemes appear. Do not edit, rename, or replace `SqueezeRushIOS`.
4. Select `SqueezeRushIOS-InternalAdTest` and verify Archive, Profile, Run, Test, and Analyze all show `Debug` in **Edit Scheme**.
5. In Xcode's Cloud report navigator or the Xcode Cloud area of App Store Connect, create a new workflow dedicated to internal ad testing. Do not repurpose the production workflow.
6. Name it clearly, for example `Squeeze Rush Internal Ad Test`.
7. Select the `SqueezeRushIOS-InternalAdTest` shared scheme.
8. Limit the start condition to manual starts or changes on `feature/stage4-rewarded-revive`; do not attach it to production tags or the production branch.
9. Add an iOS Archive action. Set **Deployment Preparation** to **TestFlight (Internal Testing Only)**.
10. Add a TestFlight internal-testing post-action and select only an existing internal tester group. Create that group in App Store Connect first if necessary.
11. Do not add consent-reset launch arguments, test-device IDs, production ad IDs, or Release approval environment overrides.
12. Use the already committed `Package.resolved`; confirm build logs resolve Google Mobile Ads `13.7.0` and Google UMP `3.1.0`.
13. Start the workflow and confirm the archive action invokes `SqueezeRushIOS-InternalAdTest` with Debug configuration.
14. Confirm the uploaded build is marked internal-only in TestFlight. Do not promote it to external testing or App Store submission.
15. Install it from the internal tester group and run the Stage 4 physical-device rewarded-revive plan from `STAGE_4_IMPLEMENTATION_REPORT.md`, including the Google `Test Ad` label, token precedence, earned-only revive, cancel/failure behavior, one revive per run, Sprint/Chaos exclusions, and unchanged XP/Cores/totalRuns.

Apple states that builds uploaded as TestFlight Internal Only can be assigned only to internal tester groups, not external testers or customers.

## 8. Scope confirmation

- This stage created only the separate internal-test shared scheme and audit/test artifacts.
- No gameplay or production code changed.
- No StoreKit, purchase, Double Rewards, interstitial caller/cadence, analytics, ATT, review prompt, More Games, production ad ID, or Stage 5 functionality was added.
- The existing production scheme remains unchanged.
- Release remains blocked.
- Stage 4T stops here.
