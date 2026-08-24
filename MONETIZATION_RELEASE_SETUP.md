# Monetization Release Setup

The checked-in code is safe for Debug/internal testing. Production monetization remains intentionally blocked until the publisher supplies and reviews account-owned values.

## Product model

- Optional rewarded ad: revive once after an eligible failed run.
- One-time non-consumable entitlement: `Remove Ads`.
- Remove Ads suppresses non-rewarded advertising. Optional rewarded ads remain user-initiated.

## iOS account work

1. Create the Squeeze Rush app in AdMob for bundle ID `com.kasiga.squeezerush`.
2. Create production rewarded and interstitial ad units and configure applicable Privacy & messaging forms.
3. Create the non-consumable App Store Connect product whose ID will replace `SQUEEZE_RUSH_REMOVE_ADS_PRODUCT_ID` in Release.
4. Complete agreements, tax, banking, App Privacy, age rating, and review metadata.
5. Put production identifiers in secured Xcode/Xcode Cloud Release settings. Do not commit them to source.
6. Set `SQUEEZE_RUSH_ADS_RELEASE_APPROVED = YES` and `SQUEEZE_RUSH_IAP_RELEASE_APPROVED = YES` only after independent review.
7. Archive on Xcode Cloud or macOS, inspect the privacy report, and test consent, rewarded earning/dismissal, purchase, pending/cancelled outcomes, restore, offline behavior, and entitlement persistence on physical devices/TestFlight.

## Android account work

Use the five environment variables documented in `SqueezeRushAndroid\README.md`. Create the matching AdMob app/ad units and one-time Play Console product first. Complete Data safety, Contains ads, target-audience, content-rating, privacy-policy, and in-app-product declarations before approval.

Google recommends a secure backend for purchase verification and cross-device entitlement management. This implementation validates store results on-device and acknowledges Play purchases, but it does not add a publisher backend.
