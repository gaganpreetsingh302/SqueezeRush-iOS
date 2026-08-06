# Squeeze Rush Stage 3 Privacy Data Inventory

Retrieval and inspection date: 2026-08-04

This is an engineering inventory for the test-only Stage 3 integration. It is not legal advice, a completed App Store Connect privacy label, or final privacy-policy wording. Stage 3 is intentionally blocked from Release.

## Sources inspected

- Google Mobile Ads iOS quick start and SKAdNetwork list: https://developers.google.com/admob/ios/quick-start
- Google UMP/privacy implementation guide: https://developers.google.com/admob/ios/privacy
- Google privacy strategies: https://developers.google.com/admob/ios/privacy/strategies
- Google Mobile Ads data-disclosure guidance: https://developers.google.com/admob/ios/privacy/data-disclosure
- Official Google Mobile Ads Swift package, exact tag `13.7.0`: https://github.com/googleads/swift-package-manager-google-mobile-ads.git
- Official Google UMP Swift package, direct exact project dependency `3.1.0`: https://github.com/googleads/swift-package-manager-google-user-messaging-platform.git

The official binary archives referenced by those package manifests were downloaded to a temporary directory, checked against their package SHA-256 checksums, inspected, and deleted. No downloaded SDK archive is checked into or included in the review bundle.

## App-owned Stage 3 behavior

The checked-in app manifest is `SqueezeRushIOS/PrivacyInfo.xcprivacy`. It declares:

- `NSPrivacyTracking`: `false`;
- no app-owned tracking domains;
- no app-owned collected-data types;
- no app-owned required-reason API declarations.

This describes only code owned by Squeeze Rush. It does not suppress, replace, or restate the privacy manifests embedded in Google Mobile Ads or UMP. The prior Xcode build phase that deleted and recreated an empty privacy manifest was removed; the app manifest is now a reviewable source file.

The app does not add ATT, request IDFA access, pass precise location, initialize Firebase/Google Analytics, read raw IAB consent strings, or guess child-directed/under-age classifications. Publisher first-party ID is disabled before `MobileAds` starts.

## Google Mobile Ads 13.7.0 manifest

The manifest inside the verified Google Mobile Ads 13.7.0 XCFramework declares the following.

### Tracking

- The `NSPrivacyTracking` key is absent.
- The `NSPrivacyTrackingDomains` key is absent.
- `DeviceID` is individually marked as linked to the user and used for tracking.

The absence of top-level keys is recorded exactly as supplied; it is not interpreted here as a legal conclusion that no tracking occurs.

### Collected data

| Data category | Linked | Tracking | Declared purposes |
|---|---:|---:|---|
| Other Diagnostic Data | No | No | Third-Party Advertising, Developer Advertising, Analytics |
| Coarse Location | Yes | No | Third-Party Advertising, Analytics, Developer Advertising |
| Performance Data | No | No | Third-Party Advertising, Developer Advertising, Analytics |
| Crash Data | No | No | Analytics |
| Advertising Data | Yes | No | Third-Party Advertising, Analytics, Developer Advertising |
| Product Interaction | Yes | No | Analytics, Developer Advertising, Third-Party Advertising |
| Device ID | Yes | Yes | Third-Party Advertising, Analytics, Developer Advertising |

### Required-reason APIs

| API category | Reason code |
|---|---|
| System Boot Time | `35F9.1` |
| User Defaults | `CA92.1` |
| Disk Space | `E174.1` |

## Google User Messaging Platform 3.1.0 manifest

The manifest inside the verified UMP 3.1.0 XCFramework declares the following.

### Tracking

- The `NSPrivacyTracking` key is absent.
- The `NSPrivacyTrackingDomains` key is absent.

### Collected data

| Data category | Linked | Tracking | Declared purposes |
|---|---:|---:|---|
| Coarse Location | No | No | App Functionality |
| Performance Data | No | No | App Functionality |
| Product Interaction | No | No | App Functionality |

### Required-reason APIs

| API category | Reason code |
|---|---|
| User Defaults | `CA92.1` |

## Runtime and consent boundaries

- The once-per-launch `requestConsentInfoUpdate` invocation occurs before the immediate UMP snapshot is published. This follows UMP's requirement that `canRequestAds` remains false until the update request has been called while still allowing a valid previous-session value to become authoritative without waiting for network completion.
- Update-completion processing is dispatched onto the main queue and state-gated behind the post-request publication, so a very fast callback cannot overtake the immediate snapshot and a duplicate callback cannot complete twice.
- UMP consent information is still updated once each app launch after a valid presentation owner exists.
- `ConsentForm.loadAndPresentIfRequired(from:)` runs only after a successful information update; update errors are normalized and published without attempting a form.
- Successful update, required-form, and privacy-options operations clear stale operation errors before publishing the resulting snapshot.
- Google Mobile Ads startup is requested only after `canRequestAds` becomes true. If consent changes while startup is in flight, SDK completion is retained, but no rewarded or interstitial request is loaded unless the current value is true.
- No consent value is manually changed by the bridge. The production bridge exposes status and privacy-options presentation only; presentation is authorized only when UMP reports `privacyOptionsRequirementStatus == .required`, never merely because a general consent form is available.
- Debug consent reset/geography controls require an explicit launch argument or Debug build setting. No physical test-device identifier is stored.
- Stage 3 contains only Google sample ad identifiers in Debug. Release identifiers are empty and the Release build guard fails.

## Unresolved owner and App Store decisions

Before any ad-enabled release, the app owner must:

- determine the app's audience, child-directed-treatment, and under-age-of-consent classification;
- create/verify the AdMob account and configure applicable European-regulation and US-state messages;
- decide the final App Store Connect privacy answers using the app's actual configuration, serving geography, account settings, consent choices, and Xcode privacy report;
- determine whether Apple's tracking disclosure and ATT requirements apply to the final configuration;
- provide a visible in-app privacy-options entry point where required;
- update the privacy policy and other public legal text;
- update App Store Connect privacy labels;
- verify the archived app's aggregated privacy report after Xcode resolves Google Mobile Ads 13.7.0 and UMP 3.1.0.

The existing public statement that Squeeze Rush contains “no advertisements” must be changed before any build with advertisements is released. Stage 3 does not update that public page and must not be submitted to the App Store.

## Current conclusion

The app-owned manifest is no longer misleadingly generated as an empty build artifact, and the two SDK manifests have been inventoried. Privacy disclosure work is not complete. Release remains intentionally blocked until production identifiers, account/message configuration, audience decisions, policy wording, App Store labels, archive privacy-report review, and TestFlight validation are complete.
