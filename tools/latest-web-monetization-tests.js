(() => {
  "use strict";

  const summary = document.getElementById("summary");
  const results = document.getElementById("results");
  const frame = document.getElementById("game");
  let passed = 0;
  let failed = 0;

  function record(condition, message) {
    const item = document.createElement("li");
    item.className = condition ? "pass" : "fail";
    item.textContent = `${condition ? "PASS" : "FAIL"}: ${message}`;
    results.appendChild(item);
    if (condition) passed += 1;
    else failed += 1;
  }

  function equal(actual, expected, message) {
    record(Object.is(actual, expected), `${message} (expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)})`);
  }

  async function waitFor(check, timeoutMs, message) {
    const deadline = performance.now() + timeoutMs;
    while (performance.now() < deadline) {
      if (check()) return;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error(message);
  }

  function capabilities(overrides) {
    return Object.assign({
      nativeBridge: true,
      protocolVersion: 1,
      platform: "ios",
      share: true,
      haptics: true,
      rewardedAds: true,
      interstitialAds: true,
      purchases: true,
      restorePurchases: true,
      entitlements: true,
      consent: true,
      canRequestAds: true,
      rewardedAdReady: true,
      interstitialAdReady: true,
      removeAdsEntitled: false,
      removeAdsPrice: "$2.99",
      removeAdsCurrencyCode: "CAD",
      purchaseCatalogState: "ready",
      purchaseStorefrontCountryCode: "CAN",
      purchaseDiagnosticCode: null,
      privacyOptionsRequired: true
    }, overrides || {});
  }

  function enqueueCapabilities(mock, overrides) {
    mock.enqueue("bridge.capabilities", { outcome: "success", data: capabilities(overrides) });
  }

  async function run() {
    try {
      await waitFor(() => frame.contentWindow?.__SqueezeRushMonetizationTest, 5000, "Game test API did not load");
      const gameWindow = frame.contentWindow;
      const gameDocument = gameWindow.document;
      const api = gameWindow.__SqueezeRushMonetizationTest;
      const mock = gameWindow.__SQUEEZE_RUSH_NATIVE_BRIDGE_MOCK__;
      api.prepare();

      equal(gameDocument.getElementById("campaignLabel").textContent, "25-stage campaign", "Latest 25-stage campaign is running in the iOS bundle");
      equal(gameDocument.querySelectorAll("[data-campaign-level]").length, 25, "Campaign ladder renders all 25 levels");
      record(Boolean(gameDocument.querySelector('script[src^="run-lifecycle.js"]')
        && gameDocument.querySelector('script[src^="native-bridge.js"]')), "Lifecycle and native bridge scripts loaded");

      mock.reset();
      mock.enqueue("bridge.capabilities", {
        outcome: "failed",
        error: { code: "bridge_starting", message: "Native bridge is still starting." }
      });
      enqueueCapabilities(mock);
      await api.refreshMonetization();
      const connectingState = api.snapshot().monetization;
      equal(connectingState.hidden, false, "Monetization stays visible during an initial bridge failure");
      equal(connectingState.removeAdsHidden, false, "Remove Ads stays visible during an initial bridge failure");
      equal(connectingState.removeAdsDisabled, true, "Remove Ads is disabled while reconnecting to native StoreKit");
      equal(connectingState.removeAdsLabel, "Remove Ads — Connecting…", "Remove Ads reports the native bridge connection state");
      await waitFor(() => api.snapshot().monetization.removeAdsLabel === "Remove Ads\n$2.99 CAD", 1500, "Remove Ads did not recover after the bridge became ready");

      mock.reset();
      enqueueCapabilities(mock, {
        purchases: false,
        restorePurchases: true,
        entitlements: true,
        removeAdsPrice: null,
        purchaseCatalogState: "empty",
        purchaseStorefrontCountryCode: "USA",
        purchaseDiagnosticCode: "catalog_empty",
        privacyOptionsRequired: false
      });
      enqueueCapabilities(mock);
      await api.refreshMonetization();
      const loadingState = api.snapshot().monetization;
      equal(loadingState.hidden, false, "Monetization menu stays visible while StoreKit loads");
      equal(loadingState.removeAdsHidden, false, "Remove Ads stays visible while StoreKit loads");
      equal(loadingState.removeAdsDisabled, true, "Remove Ads is safely disabled while StoreKit loads");
      equal(loadingState.removeAdsLabel, "Remove Ads — Loading…", "Remove Ads shows an explicit loading state");
      await waitFor(() => api.snapshot().monetization.removeAdsLabel === "Remove Ads\n$2.99 CAD", 1500, "Remove Ads did not refresh after StoreKit became ready");
      equal(api.snapshot().monetization.removeAdsDisabled, false, "Remove Ads enables automatically when StoreKit is ready");

      mock.reset();
      api.exhaustMonetizationRefresh();
      enqueueCapabilities(mock, {
        purchases: false,
        restorePurchases: true,
        entitlements: true,
        removeAdsPrice: null,
        purchaseCatalogState: "empty",
        purchaseStorefrontCountryCode: "USA",
        purchaseDiagnosticCode: "catalog_empty",
        privacyOptionsRequired: false
      });
      await api.refreshMonetization();
      const retryState = api.snapshot().monetization;
      equal(retryState.removeAdsDisabled, false, "Remove Ads remains responsive after automatic StoreKit retries finish");
      equal(retryState.removeAdsLabel, "Remove Ads — Retry", "Remove Ads offers an explicit retry action");
      record(retryState.status.includes("USA / catalog_empty"), "Retry state reports the storefront and bounded catalog diagnostic");

      mock.reset();
      enqueueCapabilities(mock, { removeAdsEntitled: true });
      await api.refreshMonetization();
      const entitledState = api.snapshot().monetization;
      equal(entitledState.removeAdsHidden, false, "Existing entitlement keeps the purchase status visible");
      equal(entitledState.removeAdsDisabled, true, "Existing entitlement disables repeat purchase");
      equal(entitledState.removeAdsLabel, "Ads Removed ✓", "Existing entitlement is clearly labeled");

      mock.reset();
      enqueueCapabilities(mock);
      await api.refreshMonetization();
      const menuState = api.snapshot().monetization;
      equal(menuState.hidden, false, "Monetization menu is visible when native capabilities are available");
      equal(menuState.removeAdsLabel, "Remove Ads\n$2.99 CAD", "Localized Remove Ads price includes its explicit currency code");
      equal(menuState.restoreHidden, false, "Restore Purchase is visible");
      equal(menuState.privacyHidden, false, "Privacy Choices is visible when required");

      mock.reset();
      mock.enqueue("purchase.buy", {
        outcome: "unavailable",
        data: {
          removeAdsEntitled: false,
          catalogState: "failed",
          storefrontCountryCode: "CAN",
          diagnosticCode: "catalog_timeout"
        },
        error: { code: "catalog_timeout", message: "The catalog request timed out." }
      });
      enqueueCapabilities(mock, {
        purchases: false,
        removeAdsPrice: null,
        purchaseCatalogState: "loading",
        purchaseStorefrontCountryCode: "CAN",
        purchaseDiagnosticCode: "catalog_loading"
      });
      gameDocument.getElementById("removeAdsBtn").click();
      await waitFor(() => api.snapshot().monetization.status.includes("CAN / catalog_timeout"), 1000, "Purchase diagnostic was overwritten");
      record(true, "Unavailable purchase preserves the exact native storefront and timeout code");

      mock.reset();
      enqueueCapabilities(mock);
      await api.refreshMonetization();
      mock.enqueue("purchase.buy", { outcome: "success", data: { removeAdsEntitled: true } });
      enqueueCapabilities(mock, { removeAdsEntitled: true });
      gameDocument.getElementById("removeAdsBtn").click();
      await waitFor(() => mock.requests().some(request => request.action === "purchase.buy"), 1000, "Purchase request was not sent");
      await waitFor(() => api.snapshot().monetization.status.includes("Ads removed"), 1000, "Entitlement refresh did not update the UI");
      record(true, "Remove Ads purchase flows through the native StoreKit bridge");

      mock.reset();
      enqueueCapabilities(mock, { removeAdsEntitled: false, privacyOptionsRequired: false });
      api.startRun("campaign");
      api.setRunProgress({ revives: 0, score: 120, encountersCleared: 4 });
      api.endRun("smashed");
      await waitFor(() => api.snapshot().rewardedRevive.offerAvailable, 1000, "Rewarded revive offer did not appear");
      equal(api.snapshot().rewardedRevive.hidden, false, "Rewarded revive appears only after token revives are exhausted");

      mock.enqueue("rewarded.show", { outcome: "success", data: { earned: true, placement: "revive" } });
      await api.requestRewardedRevive();
      await waitFor(() => api.snapshot().lifecycle.lifecyclePhase === "active", 1000, "Earned rewarded revive did not resume the run");
      equal(api.snapshot().lifecycle.rewardedReviveUsed, true, "Verified earned ad grants exactly one rewarded revive");

      api.endRun("timeup");
      await api.leaveResultForMenu();
      await new Promise(resolve => setTimeout(resolve, 30));
      api.setInterstitialCadence(3);
      mock.reset();
      enqueueCapabilities(mock, { removeAdsEntitled: false });
      mock.enqueue("interstitial.show", { outcome: "success", data: { placement: "run_end" } });
      const shown = await api.maybePresentNaturalBreakInterstitial();
      const interstitialRequest = mock.requests().find(request => request.action === "interstitial.show");
      equal(shown, true, "Third finalized run can present a ready interstitial");
      equal(interstitialRequest?.payload?.placement, "run_end", "Interstitial uses the validated run_end placement");
      equal(interstitialRequest?.context?.lifecyclePhase, "finalized", "Interstitial carries finalized lifecycle context");

      api.setInterstitialCadence(3);
      mock.reset();
      enqueueCapabilities(mock, { removeAdsEntitled: true });
      const blocked = await api.maybePresentNaturalBreakInterstitial();
      equal(blocked, false, "Remove Ads entitlement suppresses automatic interstitials");
      equal(mock.requests().filter(request => request.action === "interstitial.show").length, 0, "Entitled player sends no interstitial request");

      summary.textContent = `LATEST WEB MONETIZATION TEST RESULT: ${passed}/${passed + failed} passed, ${failed} failed`;
      summary.className = failed === 0 ? "pass" : "fail";
    } catch (error) {
      record(false, error && error.message ? error.message : String(error));
      summary.textContent = `LATEST WEB MONETIZATION TEST RESULT: ${passed}/${passed + failed} passed, ${failed} failed`;
      summary.className = "fail";
    }
  }

  frame.addEventListener("load", run, { once: true });
})();
