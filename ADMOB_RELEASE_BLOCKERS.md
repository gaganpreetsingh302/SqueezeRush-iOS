# AdMob Release Blockers

Stage 3 is a test-only engineering foundation. A Release/archive build is intentionally configured to fail. Do not set `SQUEEZE_RUSH_ADS_RELEASE_APPROVED = YES` until every applicable item below is complete and independently reviewed.

- [ ] Create or verify the publisher's AdMob account.
- [ ] Register bundle ID `com.kasiga.squeezerush` in AdMob.
- [ ] Obtain the production AdMob application ID.
- [ ] Create the production rewarded ad unit.
- [ ] Create the production interstitial ad unit.
- [ ] Configure the applicable European-regulation consent message in AdMob Privacy & messaging.
- [ ] Configure each applicable US-state privacy message.
- [ ] Determine and document audience, child-directed-treatment, and under-age-of-consent classifications; do not infer them in code.
- [ ] Implement and test a visible privacy-options UI entry point where required.
- [ ] Update the public privacy policy and remove/update the existing “no advertisements” claim.
- [ ] Update App Store Connect privacy labels from the final app/SDK behavior.
- [ ] Resolve packages in Xcode and inspect the aggregated SDK privacy report.
- [ ] Replace all Debug-only Google sample IDs with separately supplied production Release build settings; never fall back to test IDs.
- [ ] Confirm the Release validation script rejects missing IDs, Google sample IDs, and approval values other than `YES`.
- [ ] Complete the Stage 4 gameplay integration and its idempotency/cadence tests; Stage 3 has no gameplay callers.
- [ ] Validate consent, privacy options, rewarded earning/dismissal, interstitial dismissal, failure, offline, backgrounding, and presentation conflicts on supported physical iPhones.
- [ ] Confirm no ad request occurs before `ConsentInformation.shared.canRequestAds` is true.
- [ ] Confirm publisher first-party ID is disabled before SDK initialization.
- [ ] Review whether ATT is legally/platform-required for the final ad configuration; Stage 3 intentionally does not add ATT.
- [ ] Conduct TestFlight tests with production-like configuration under controlled approval.
- [ ] Obtain explicit release approval and only then set `SQUEEZE_RUSH_ADS_RELEASE_APPROVED = YES` in the secured Release configuration.

Production identifiers, account credentials, consent-message configuration, test-device identifiers, and Apple signing material must not be committed to a public review bundle.
