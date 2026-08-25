# Monetization Release Setup

The checked-in code is safe for Debug/internal testing. Production monetization remains intentionally blocked until the publisher supplies and reviews account-owned values.

## Product model

- Optional rewarded ad: revive once after an eligible failed run.
- Automatic interstitial: eligible only at a natural break after every third finalized run, when consent is complete and an ad is ready.
- One-time non-consumable entitlement: `Remove Ads`.
- Remove Ads suppresses non-rewarded advertising. Optional rewarded ads remain user-initiated.

## Web game synchronization

The iOS `SqueezeRushIOS/Web` bundle was synchronized from the canonical latest web campaign in `../SqueezeRush` on 2026-08-23, then the iOS lifecycle and native monetization bridge were reapplied. Keep future gameplay changes canonical-first and deliberately repeat this synchronization rather than editing the mobile copy in isolation.

Run `powershell -NoProfile -ExecutionPolicy Bypass -File tools/Test-LatestWebMonetization.ps1` after future syncs. The browser regression page at `tools/latest-web-monetization-tests.html` validates the rendered 25-level campaign, StoreKit controls, rewarded revive, run-end interstitial contract, and Remove Ads suppression through the local native mock.

## iOS account work

1. Create the Squeeze Rush app in AdMob for bundle ID `com.kasiga.squeezerush`.
2. Create production rewarded and interstitial ad units and configure applicable Privacy & messaging forms.
3. Create the non-consumable App Store Connect product whose ID will replace `SQUEEZE_RUSH_REMOVE_ADS_PRODUCT_ID` in Release.
4. Complete agreements, tax, banking, App Privacy, age rating, and review metadata.
5. In the Xcode Cloud workflow, add the following environment variables and mark each value **Secret**:
   - `SQUEEZE_RUSH_ADMOB_APP_ID_RELEASE`
   - `SQUEEZE_RUSH_ADMOB_REWARDED_AD_UNIT_ID_RELEASE`
   - `SQUEEZE_RUSH_ADMOB_INTERSTITIAL_AD_UNIT_ID_RELEASE`
   The Release configuration maps these values into the app bundle without committing account-owned identifiers to source.
6. Set `SQUEEZE_RUSH_ADS_RELEASE_APPROVED = YES` and `SQUEEZE_RUSH_IAP_RELEASE_APPROVED = YES` only after independent review.
7. Archive on Xcode Cloud or macOS, inspect the privacy report, and test consent, rewarded earning/dismissal, purchase, pending/cancelled outcomes, restore, offline behavior, and entitlement persistence on physical devices/TestFlight.

## Android account work

Use the five environment variables documented in `SqueezeRushAndroid\README.md`. Create the matching AdMob app/ad units and one-time Play Console product first. Complete Data safety, Contains ads, target-audience, content-rating, privacy-policy, and in-app-product declarations before approval.

Google recommends a secure backend for purchase verification and cross-device entitlement management. This implementation validates store results on-device and acknowledges Play purchases, but it does not add a publisher backend.
