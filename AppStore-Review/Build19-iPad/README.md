# 3.0.0 (19): iPad compatibility layout repair

Addresses the September 1 Guideline 4 review of build 18 on iPad Air 11-inch (M3).
The iPhone-only destination, production scheme, StoreKit product, ad identifiers,
and purchase implementation are intentionally unchanged.

## Repair

- Menu, instructions, results, and victory panels now explicitly allow vertical
  touch scrolling. Previously the document touch handler canceled their swipes.
- Panel bounds account for the same safe-area spacing as their overlays.
- Short compatibility windows omit decorative menu artwork while keeping the
  actual controls readable; content scrolls rather than being scaled down.
- Purchase controls adapt to available width and visible actions. Text, progress
  captions, challenge descriptions, and secondary controls have larger sizing.
- Generic panel controls are at least 44 CSS pixels high. Canvas touch handling
  remains isolated from menu scrolling.
- The native build number and both changed web asset URLs identify build 19.

## Verification

Use `tools/ipad-layout-regression.md` for the reproducible browser test. It covers
320x568, 375x667, 430x932, and 820x1180 layouts, including actual Chromium touch
swipes, menu, expanded challenges, instructions, results, map, and victory.
Each run preserves a timestamped report and screenshots in this directory.

The original baseline reproduced non-scrolling overflow at 320x568 and 375x667.
Existing monetization checks: 30 static latest-web checks, 31 foundation checks,
and 31 browser/mock bridge integration checks passed after the repair.

Browser evidence uses mocked native service responses (including CAD pricing).
It is not a physical iPad, an iOS simulator, or a real StoreKit purchase test.
The signed iOS archive must be built by Xcode Cloud and selected separately in
App Store Connect. Do not describe source or browser checks as a signed build.

## App Review notes

Build 19 addresses the iPad compatibility layout issue reported for build 18.
We corrected touch-event handling so all overflowing menu and result panels
can scroll, matched panel sizes to the available safe area, enlarged small
controls and labels, and reduced decorative content on short screens.
The main menu retains Remove Ads (with store price and currency), Restore
Purchase, and Privacy Choices. Game modes, bonus challenges, instructions,
revive/results, and campaign navigation remain accessible by vertical scrolling.
