# iPad compatibility layout regression

`ipad-layout-regression.cjs` tests the bundled `SqueezeRushIOS/Web` files at
320 × 568, 375 × 667, 430 × 932, and 820 × 1180 CSS pixels. A local HTTP server
must serve the repository root. Set `BASE_URL` if it is not on port 8896.

Run with Node.js and Playwright installed (or the bundled Codex runtime):

```powershell
$env:BASE_URL = 'http://127.0.0.1:8896'
& 'C:\Users\g_sin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' tools\ipad-layout-regression.cjs
```

The harness checks the main menu, expanded bonus challenges, instructions,
game-over with rewarded revive, campaign map, and level victory. Assertions cover
safe-area containment, horizontal overflow, 44-pixel touch targets, overlapping
controls, clipped captions, and vertical scrolling. Overflowing panels are swiped
through Chromium's touch input protocol; directly assigning `scrollTop` would
miss the event-cancellation bug that motivated this regression.
The canvas must retain `touch-action: none` and cancel its own touch movement so
enabling menu scrolling does not change gameplay gesture behavior.

At the two smallest viewports it also checks loading, retry, and purchased menu
states, including a lone retry button when restore/privacy actions are unavailable.

Existing game debug/test entry points select deterministic game states, and the
existing bridge mock supplies Canadian purchase pricing and available ad services.
The `ios-app` class matches the native wrapper. The test does not inject styles
or alter layout markup.

Each execution creates a new timestamped evidence directory under
`AppStore-Review/Build19-iPad/`, containing `report.json` and viewport screenshots.
Set `EVIDENCE_DIR` to write somewhere else. Screenshots include `mocked-native`
in their filenames because they are browser layout evidence, not proof of native
StoreKit purchases or actual iPad execution. Use a physical iPad or an Xcode iPad
simulator to verify WKWebView and the signed app separately.
