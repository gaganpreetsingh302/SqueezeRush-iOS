# Squeeze Rush Stage 2A Implementation Report

Date: 2026-08-04 (America/Toronto)

Scope: legacy `WKScriptMessageHandler` retain-cycle hardening only. Stage 3 was not started.

## 1. Baseline verification

Before any production change, the following documents were read completely:

- `STAGE_2_IMPLEMENTATION_REPORT.md`
- `NATIVE_BRIDGE_PROTOCOL.md`
- `SOURCE_OF_TRUTH.md`

The active project remained `D:\Games\Squeeze rush\SqueezeRushIOS-Advanced-2.0.0`. No file was copied from or written to the protected sibling `D:\Games\Squeeze rush\SqueezeRush`.

All 10 supplied Stage 2 baseline hashes matched before the production edit:

| File | Expected and observed SHA-256 | Result |
|---|---|---|
| `SqueezeRushIOS\Web\game.js` | `E6318E1BF8D533B6AD6F02B9B053A730BD0FB598CD9F5053A16BBE9D25B9C973` | Match |
| `SqueezeRushIOS\Web\index.html` | `6785CE9289404B0F72681871C34C225364C07E431BA01411278D85C3FA24C39C` | Match |
| `SqueezeRushIOS\Web\native-bridge.js` | `4DD3FB2BC5B1A4A0349BAED9B1065E5F2CB1B833EE4ADE1EE9F10959D1092D50` | Match |
| `SqueezeRushIOS\Web\run-lifecycle.js` | `F0EED9B5257260C09A81E54626E146950C202359405AE367FE6E1D3EB680910F` | Match |
| `SqueezeRushIOS\Web\styles.css` | `AF2C5C55B050A7BA77139712F0D081A5967AD5E2DFBB97F6F5F8C3BFB635FB53` | Match |
| `SqueezeRushIOS\GameViewController.swift` | `AF342D1632781D0F0601706C53EF582A255DB9A53C6323FD696DAC38B2A383AD` | Match |
| `SqueezeRushIOS\SqueezeRushNativeBridge.swift` | `6B669B32BB18B7D779167DE6BF898469FDFDA8CECCC29EB4F228D6BD8986FF8F` | Match |
| `SqueezeRushIOS\AppDelegate.swift` | `889597E22D37BC66E53B6B9FE9C061762E0DBDB0497D3128183FED1ACA926C88` | Match |
| `SqueezeRushIOS\Info.plist` | `E31455AC0C1318969D027975C3D1E00D9E0DFEF321F7491E9F1002F6A46E43E0` | Match |
| `SqueezeRushIOS.xcodeproj\project.pbxproj` | `A88497A3BEDD1DA89DE65D7565012D503B1445CA75B81206798F667CA8487E7F` | Match |

The baseline-failure stop condition did not trigger, so `STAGE_2A_BASELINE_FAILURE.md` was not created.

## 2. Backup

- Path: `D:\Games\Squeeze rush\Backups\SqueezeRushIOS-Advanced-2.0.0-pre-stage2a-20260804-195437.zip`
- Size: 3,400,968 bytes
- SHA-256: `B86C0B7F0FB6C7E6E24AE4A4D8DC967950A5904FF805E1DF760F5AA94178216F`
- Archive entries: 73
- Location: outside the active project
- Verification: all 10 required archived production files were opened, hashed, and matched against the originals.

## 3. Exact files changed or created

Production file modified:

- `SqueezeRushIOS\GameViewController.swift`

Tooling files created:

- `tools\Test-Stage2AStatic.ps1`
- `tools\New-Stage2AReviewBundle.ps1`

Documentation files created:

- `STAGE_2A_IMPLEMENTATION_REPORT.md`
- `STAGE_2A_CHANGED_FILES.txt`

External artifacts created:

- the pre-Stage 2A backup listed above;
- `D:\Games\Squeeze rush\ReviewBundles\SqueezeRush-Stage2A-Review-20260804-195805.zip`.

No JavaScript file, `SqueezeRushNativeBridge.swift`, `AppDelegate.swift`, `Info.plist`, protocol document, or Xcode project file was modified.

## 4. Retain cycle before the correction

Stage 2 registered `GameViewController` directly:

```swift
contentController.add(self, name: "SqueezeRushIOS")
```

`WKUserContentController` retains a registered script message handler. The resulting all-strong path was:

```text
GameViewController
  -> WKWebView
  -> WKWebViewConfiguration
  -> WKUserContentController
  -> GameViewController
```

Because the final edge retained the controller, `GameViewController.deinit` could be prevented from beginning. Removing the legacy handler only in `deinit` was therefore not a reliable way to break that cycle.

## 5. Ownership graph after the correction

| Reference | Ownership after Stage 2A |
|---|---|
| `GameViewController -> WKWebView` | Strong (`webView` property; the view hierarchy also retains the web view). |
| `GameViewController -> SqueezeRushNativeBridge` | Strong (`nativeBridge` property). |
| `WKWebView configuration -> WKUserContentController` | Strong. |
| `WKUserContentController -> typed message handler` | Strong registration under `squeezeRushBridge`. |
| `WKUserContentController -> legacy proxy` | Strong registration under `SqueezeRushIOS`. |
| `SqueezeRushNativeBridge -> presentation owner` | Weak. |
| `SqueezeRushNativeBridge -> WKWebView` | Weak. |
| `SqueezeRushNativeBridge -> WKUserContentController` | Weak. |
| `WeakScriptMessageHandler -> GameViewController` | Weak delegate. |

The two possible return paths from the content controller now end in weak references:

```text
GameViewController -> WKWebView -> configuration -> WKUserContentController
  -> WeakScriptMessageHandler --weak--> GameViewController

GameViewController -> WKWebView -> configuration -> WKUserContentController
  -> SqueezeRushNativeBridge --weak--> GameViewController
```

There is no path from `GameViewController` back to itself using only strong references after this correction.

## 6. Proxy implementation

`GameViewController.swift` now contains a private, final `WeakScriptMessageHandler` that:

- conforms to `WKScriptMessageHandler`;
- stores `weak var delegate: WKScriptMessageHandler?`;
- forwards `userContentController(_:didReceive:)` to the delegate using optional chaining;
- performs no parsing, sharing, haptics, typed bridge, or independent application behavior;
- safely does nothing if the delegate has already been released.

The registration is now:

```swift
contentController.add(WeakScriptMessageHandler(delegate: self), name: "SqueezeRushIOS")
```

The content controller retains the proxy, so a separate controller property is unnecessary. The proxy's only reference back to `GameViewController` is weak.

## 7. Weak-delegate and teardown confirmation

The delegate declaration is explicitly weak. `GameViewController.deinit` still performs both teardown paths:

1. `nativeBridge?.detach()` removes `squeezeRushBridge` and clears the typed bridge's weak references and transient state.
2. `removeScriptMessageHandler(forName: "SqueezeRushIOS")` removes the legacy proxy.

Neither removal depends on force-casting, and repeated/native bridge teardown remains nil-safe. Once the legacy handler is removed, the proxy can be released independently; if a message reaches it after its delegate is gone, optional forwarding is a no-op.

## 8. Legacy behavior preservation

The existing `GameViewController.userContentController(_:didReceive:)`, `presentShareSheet(text:)`, `performHaptic(_:)`, and JavaScript `window.SqueezeRushIOS` bootstrap wrapper were not changed. The handler name remains exactly `SqueezeRushIOS`.

Therefore the legacy share and all existing haptic styles retain their Stage 2 behavior. The only change is which object the content controller retains before forwarding the same `WKScriptMessage` to the same controller method.

## 9. Typed bridge preservation

`SqueezeRushNativeBridge.swift` remains byte-identical to Stage 2 with SHA-256 `6B669B32BB18B7D779167DE6BF898469FDFDA8CECCC29EB4F228D6BD8986FF8F`. It is still registered under `squeezeRushBridge`; its owner, web view, and user-content-controller references remain weak; and `nativeBridge.detach()` remains the typed teardown path.

All five production Web files remain byte-identical. Consequently, the typed-first/legacy-second JavaScript preference, protocol version, actions, statuses, schemas, capabilities, stale handling, timeout behavior, and mock transport did not change.

## 10. Test environment, commands, and results

Versions:

- Windows PowerShell `5.1.26100.8972`
- Python launcher/runtime `3.13.3`
- Microsoft Edge `151.0.4129.59`
- Swift compiler frontend `6.0.1`
- Git `2.55.0.windows.2`
- No package or SDK was installed

### Stage 1 lifecycle regression

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

### Stage 2 bridge regression

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

### Existing Stage 2 static checks

Command:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-Stage2Static.ps1
```

Result:

```text
STAGE 2 STATIC CHECK RESULT: 94 passed, 0 failed
```

### Stage 2A static checks

Command:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-Stage2AStatic.ps1
```

Result:

```text
STAGE 2A STATIC CHECK RESULT: 13 passed, 0 failed
```

The 13 checks cover required cases A-L plus Swift syntax parsing: no direct self-registration, proxy conformance, weak delegate, forwarding-only behavior, exact legacy and typed handler names, both removals, no force-cast, byte-identical JavaScript, byte-identical `project.pbxproj`, protected trees, and absence of Stage 3 markers.

### Direct Swift frontend parse

Command:

```powershell
swiftc -frontend -parse .\SqueezeRushIOS\AppDelegate.swift .\SqueezeRushIOS\GameViewController.swift .\SqueezeRushIOS\SqueezeRushNativeBridge.swift
```

Result:

```text
SWIFT_PARSE_EXIT_CODE=0
```

## 11. Manual Xcode and device tests still required

1. Build Debug and Release in Xcode against the real iOS 15+ SDK; Windows `swiftc -frontend -parse` cannot type-check or link UIKit/WebKit.
2. Launch on the iOS 15 minimum simulator and a physical current iPhone.
3. Exercise typed share and every typed haptic style; confirm behavior matches Stage 2.
4. From Safari Web Inspector, invoke legacy `window.SqueezeRushIOS.share(...)` and each legacy haptic strength to verify forwarding through the proxy.
5. Open and cancel both typed and legacy share sheets; confirm gameplay lifecycle and rewards remain unchanged.
6. Repeatedly create and release the game controller in a suitable debug host or navigation test, then use Xcode's Memory Graph/Instruments to confirm the controller, web view, typed bridge, and legacy proxy deallocate.
7. Exercise teardown while JavaScript messages are pending and confirm no crash, duplicate removal, or callback to a released controller.

## 12. Known risks

- Windows Swift parsing validates syntax only; Apple SDK type checking and runtime ownership behavior still require Xcode/device confirmation.
- This project has no native unit-test target that programmatically constructs and releases `GameViewController`.
- A normally root-owned game controller may live for the app session by design, so deallocation testing needs a debug/navigation harness or Instruments inspection that actually releases the owner.
- The legacy handler intentionally retains its pre-Stage 2 validation behavior; Stage 2A changes ownership only.

## 13. Post-change hashes

Changed production file:

| File | Bytes | SHA-256 |
|---|---:|---|
| `SqueezeRushIOS\GameViewController.swift` | 7,218 | `96CA9C6F1E96F6CF39D3E784C7CE4FC7E920A9CA16F95490101711C29693396D` |

New tooling:

| File | Bytes | SHA-256 |
|---|---:|---|
| `tools\Test-Stage2AStatic.ps1` | 8,040 | `E11FA9EFFA9ABDBCA784787D2F34BB1AA8710A093A3D80243FAD81CDD9814DD8` |
| `tools\New-Stage2AReviewBundle.ps1` | 8,660 | `C6BF2D527F556FCC0D2783C01E50AA3C290FDBF99E7ABC0BDACEDD0F43CB5EB0` |

Critical unchanged production files:

| File | SHA-256 |
|---|---|
| `SqueezeRushIOS\SqueezeRushNativeBridge.swift` | `6B669B32BB18B7D779167DE6BF898469FDFDA8CECCC29EB4F228D6BD8986FF8F` |
| `SqueezeRushIOS.xcodeproj\project.pbxproj` | `A88497A3BEDD1DA89DE65D7565012D503B1445CA75B81206798F667CA8487E7F` |
| `SqueezeRushIOS\Web\game.js` | `E6318E1BF8D533B6AD6F02B9B053A730BD0FB598CD9F5053A16BBE9D25B9C973` |
| `SqueezeRushIOS\Web\index.html` | `6785CE9289404B0F72681871C34C225364C07E431BA01411278D85C3FA24C39C` |
| `SqueezeRushIOS\Web\native-bridge.js` | `4DD3FB2BC5B1A4A0349BAED9B1065E5F2CB1B833EE4ADE1EE9F10959D1092D50` |
| `SqueezeRushIOS\Web\run-lifecycle.js` | `F0EED9B5257260C09A81E54626E146950C202359405AE367FE6E1D3EB680910F` |
| `SqueezeRushIOS\Web\styles.css` | `AF2C5C55B050A7BA77139712F0D081A5967AD5E2DFBB97F6F5F8C3BFB635FB53` |

## 14. Scope confirmation

Stage 2A added no advertising, purchase, StoreKit, analytics, ATT, consent, review, More Games, URL-opening, monetization UI, product identifier, ad identifier, SDK, or framework functionality. The protocol, typed bridge, JavaScript, game lifecycle, balance, rewards, sharing behavior, and haptic behavior were not changed.

The protected sibling and archived iOS project trees were not modified. Direct legacy self-registration was removed. Stage 3 was not started.
