(function stage4RewardedReviveTests() {
  "use strict";

  const storageKeys = [
    "squeezeRush.best.v1",
    "squeezeRush.modeBest.v1",
    "squeezeRush.career.v2",
    "squeezeRush.settings.v2"
  ];
  const runButton = document.getElementById("runTests");
  const summary = document.getElementById("summary");
  const resultsList = document.getElementById("results");
  let activeFrame = null;
  let gameSourcePromise = null;

  const readyCapabilities = Object.freeze({
    nativeBridge: true,
    protocolVersion: 1,
    platform: "ios",
    share: true,
    haptics: true,
    rewardedAds: true,
    interstitialAds: true,
    purchases: false,
    restorePurchases: false,
    entitlements: false,
    reviewRequest: false,
    moreGames: false,
    analytics: false,
    consent: true,
    adsTestMode: true,
    adSdkInitialized: true,
    canRequestAds: true,
    rewardedAdReady: true,
    interstitialAdReady: false,
    privacyOptionsRequired: false,
    consentStatus: "obtained"
  });

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function equal(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
    }
  }

  function wait(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
  }

  async function waitFor(predicate, timeoutMs, message) {
    const started = performance.now();
    while (performance.now() - started < timeoutMs) {
      if (predicate()) return;
      await wait(5);
    }
    throw new Error(message || "Timed out waiting for a condition.");
  }

  function clearGameStorage() {
    for (const key of storageKeys) localStorage.removeItem(key);
  }

  function loadGame() {
    clearGameStorage();
    return new Promise((resolve, reject) => {
      const frame = document.createElement("iframe");
      activeFrame = frame;
      const timeout = window.setTimeout(() => {
        frame.remove();
        reject(new Error("Timed out loading the embedded Web game."));
      }, 8000);

      frame.addEventListener("error", () => {
        window.clearTimeout(timeout);
        frame.remove();
        reject(new Error("The embedded Web game frame failed to load."));
      }, { once: true });
      frame.addEventListener("load", () => {
        window.clearTimeout(timeout);
        const gameWindow = frame.contentWindow;
        const api = gameWindow && gameWindow.__SqueezeRushStage1Test;
        const bridge = gameWindow && gameWindow.SqueezeRushNative;
        const mock = gameWindow && gameWindow.__SQUEEZE_RUSH_NATIVE_BRIDGE_MOCK__;
        if (!api || !bridge || !mock) {
          frame.remove();
          reject(new Error("The Stage 4 localhost fixture was unavailable."));
          return;
        }
        api.prepare();
        mock.reset();
        resolve({ frame, gameWindow, api, bridge, mock });
      }, { once: true });

      const query = new URLSearchParams({
        stage1Test: String(Date.now()),
        nativeBridgeMock: "1"
      });
      frame.src = `../SqueezeRushIOS/Web/index.html?${query}`;
      document.body.appendChild(frame);
    });
  }

  function closeGame(context) {
    if (context && context.bridge) context.bridge.cancelPending("Stage 4 test cleanup.");
    if (context && context.frame) context.frame.remove();
    activeFrame = null;
  }

  function capabilityData(overrides) {
    return Object.assign({}, readyCapabilities, overrides || {});
  }

  function enqueueCapabilities(context, overrides, descriptorOverrides) {
    context.mock.enqueue("bridge.capabilities", Object.assign({
      outcome: "success",
      data: capabilityData(overrides)
    }, descriptorOverrides || {}));
  }

  function enqueueEarned(context, overrides) {
    context.mock.enqueue("rewarded.show", Object.assign({
      outcome: "success",
      data: {
        placement: "revive",
        earned: true,
        rewardType: "rewarded",
        rewardAmount: 1
      }
    }, overrides || {}));
  }

  function observeRevives(context) {
    const payloads = [];
    context.gameWindow.SqueezeRushLifecycle.on("run_revived", payload => payloads.push(payload));
    return payloads;
  }

  async function beginEligibleResult(context, options) {
    const settings = Object.assign({ mode: "daily", reason: "smashed", progress: {} }, options || {});
    enqueueCapabilities(context, settings.capabilities);
    context.api.startRun(settings.mode);
    context.api.setRunProgress(Object.assign({ revives: 0 }, settings.progress));
    context.api.endRun(settings.reason);
    await waitFor(() => context.api.snapshot().rewardedRevive.offerAvailable, 500, "Rewarded revive offer did not become available.");
    return context.api.snapshot();
  }

  async function completeEarnedRevive(context, responseOverrides) {
    enqueueEarned(context, responseOverrides);
    const button = context.gameWindow.document.getElementById("rewardedReviveBtn");
    button.click();
    await waitFor(() => context.api.snapshot().lifecycle.lifecyclePhase === "active", 800, "Earned revive did not resume the run.");
    return context.api.snapshot();
  }

  async function sourceText() {
    if (!gameSourcePromise) {
      gameSourcePromise = fetch("../SqueezeRushIOS/Web/game.js", { cache: "no-store" }).then(response => {
        if (!response.ok) throw new Error(`Unable to read game.js: HTTP ${response.status}`);
        return response.text();
      });
    }
    return gameSourcePromise;
  }

  async function scenarioA() {
    const context = await loadGame();
    try {
      context.api.startRun("daily");
      context.api.endRun("smashed");
      const snapshot = context.api.snapshot();
      equal(snapshot.revives, 1, "Token revive remains available");
      equal(snapshot.rewardedRevive.hidden, true, "Rewarded control hidden while token exists");
      equal(snapshot.lifecycle.lifecyclePhase, "result_pending", "Token result remains pending");
    } finally { closeGame(context); }
  }

  async function scenarioB() {
    const context = await loadGame();
    try {
      context.api.startRun("sprint");
      context.api.endRun("timeup");
      const snapshot = context.api.snapshot();
      equal(snapshot.rewardedRevive.hidden, true, "Sprint time-up hides rewarded revive");
      equal(snapshot.lifecycle.lifecyclePhase, "finalized", "Sprint time-up finalizes");
    } finally { closeGame(context); }
  }

  async function scenarioC() {
    const context = await loadGame();
    try {
      context.api.startRun("chaos");
      context.api.endRun("smashed");
      const snapshot = context.api.snapshot();
      equal(snapshot.rewardedRevive.hidden, true, "Chaos does not gain a revive path");
      equal(snapshot.lifecycle.lifecyclePhase, "finalized", "Forbidden-mode death finalizes");
    } finally { closeGame(context); }
  }

  async function scenarioD() {
    const context = await loadGame();
    try {
      context.api.startRun("daily");
      context.api.setRunProgress({ revives: 0, rewardedReviveUsed: true });
      context.api.endRun("smashed");
      const snapshot = context.api.snapshot();
      equal(snapshot.rewardedRevive.hidden, true, "Used rewarded revive is not offered again");
      equal(snapshot.lifecycle.rewardedReviveUsed, true, "Used flag remains set");
    } finally { closeGame(context); }
  }

  async function scenarioE() {
    const context = await loadGame();
    try {
      enqueueCapabilities(context, { nativeBridge: false, rewardedAds: false, canRequestAds: false, rewardedAdReady: false });
      context.api.startRun("daily");
      context.api.setRunProgress({ revives: 0 });
      context.api.endRun("smashed");
      await waitFor(() => context.api.snapshot().lifecycle.lifecyclePhase === "finalized", 500, "Unsupported result did not finalize.");
      equal(context.api.snapshot().rewardedRevive.hidden, true, "Unsupported native bridge hides control");
    } finally { closeGame(context); }
  }

  async function scenarioF() {
    const context = await loadGame();
    try {
      enqueueCapabilities(context, { canRequestAds: false });
      context.api.startRun("daily");
      context.api.setRunProgress({ revives: 0 });
      context.api.endRun("smashed");
      await waitFor(() => context.api.snapshot().lifecycle.lifecyclePhase === "finalized", 500, "Consent-blocked result did not finalize.");
      equal(context.api.snapshot().rewardedRevive.hidden, true, "Consent false hides control");
    } finally { closeGame(context); }
  }

  async function scenarioG() {
    const context = await loadGame();
    try {
      enqueueCapabilities(context, { rewardedAdReady: false });
      context.api.startRun("daily");
      context.api.setRunProgress({ revives: 0 });
      context.api.endRun("smashed");
      await waitFor(() => context.api.snapshot().lifecycle.lifecyclePhase === "finalized", 500, "Not-ready result did not finalize.");
      equal(context.api.snapshot().rewardedRevive.hidden, true, "Not-ready ad hides control");
    } finally { closeGame(context); }
  }

  async function scenarioH() {
    const context = await loadGame();
    try {
      const snapshot = await beginEligibleResult(context);
      equal(snapshot.rewardedRevive.hidden, false, "Eligible control is visible");
      equal(snapshot.rewardedRevive.label, "Watch Ad to Revive", "Eligible label");
    } finally { closeGame(context); }
  }

  async function scenarioI() {
    const context = await loadGame();
    try {
      await beginEligibleResult(context);
      context.mock.enqueue("rewarded.show", { outcome: "cancelled" });
      context.api.requestRewardedRevive();
      context.api.requestRewardedRevive();
      await waitFor(() => !context.api.snapshot().rewardedRevive.requestPending, 500, "Rewarded request did not settle.");
      equal(context.mock.requests().filter(item => item.action === "rewarded.show").length, 1, "Exactly one native rewarded request");
    } finally { closeGame(context); }
  }

  async function scenarioJ() {
    const context = await loadGame();
    try {
      await beginEligibleResult(context);
      context.mock.enqueue("rewarded.show", { outcome: "cancelled" });
      context.api.requestRewardedRevive();
      await waitFor(() => context.mock.requests().some(item => item.action === "rewarded.show"), 200, "Rewarded request missing.");
      const request = context.mock.requests().find(item => item.action === "rewarded.show");
      equal(request.payload.placement, "revive", "Placement payload");
      equal(Object.keys(request.payload).length, 1, "No extra payload fields");
    } finally { closeGame(context); }
  }

  async function scenarioK() {
    const context = await loadGame();
    try {
      const pending = await beginEligibleResult(context);
      context.mock.enqueue("rewarded.show", { outcome: "cancelled" });
      context.api.requestRewardedRevive();
      await waitFor(() => context.mock.requests().some(item => item.action === "rewarded.show"), 200, "Rewarded request missing.");
      const request = context.mock.requests().find(item => item.action === "rewarded.show");
      equal(request.context.runId, pending.lifecycle.runId, "Captured runId");
      equal(request.context.resultSequence, pending.lifecycle.resultSequence, "Captured resultSequence");
      equal(request.context.lifecyclePhase, "result_pending", "Captured lifecycle phase");
    } finally { closeGame(context); }
  }

  async function scenarioL() {
    const context = await loadGame();
    try {
      const revives = observeRevives(context);
      await beginEligibleResult(context);
      const snapshot = await completeEarnedRevive(context);
      equal(snapshot.lifecycle.rewardedReviveUsed, true, "Earned revive sets used flag");
      equal(revives.length, 1, "Earned success revives once");
    } finally { closeGame(context); }
  }

  async function runNoReviveOutcome(descriptor, expectedPhase) {
    const context = await loadGame();
    try {
      const revives = observeRevives(context);
      await beginEligibleResult(context);
      context.mock.enqueue("rewarded.show", descriptor);
      context.api.requestRewardedRevive();
      await waitFor(() => !context.api.snapshot().rewardedRevive.requestPending, 500, "Outcome did not settle.");
      const snapshot = context.api.snapshot();
      equal(snapshot.lifecycle.lifecyclePhase, expectedPhase || "result_pending", "Failed outcome preserves pending result");
      equal(snapshot.lifecycle.rewardedReviveUsed, false, "Failed outcome cannot use rewarded revive");
      equal(revives.length, 0, "Failed outcome cannot emit revive");
      equal(snapshot.rewardedRevive.retryDisabled, false, "Retry restored after failed outcome");
      equal(snapshot.rewardedRevive.menuDisabled, false, "Menu restored after failed outcome");
    } finally { closeGame(context); }
  }

  function scenarioM() { return runNoReviveOutcome({ outcome: "success", data: { placement: "revive", earned: false } }); }
  function scenarioN() { return runNoReviveOutcome({ outcome: "cancelled" }); }
  function scenarioO() { return runNoReviveOutcome({ outcome: "unavailable" }); }
  function scenarioP() { return runNoReviveOutcome({ outcome: "failed" }); }

  async function scenarioQ() {
    const context = await loadGame();
    try {
      await beginEligibleResult(context);
      context.api.setRewardedReviveTimeout(20);
      context.mock.enqueue("rewarded.show", { outcome: "no_response" });
      context.api.requestRewardedRevive();
      await waitFor(() => !context.api.snapshot().rewardedRevive.requestPending, 300, "Timeout did not settle.");
      const snapshot = context.api.snapshot();
      equal(snapshot.lifecycle.lifecyclePhase, "result_pending", "Timeout preserves pending result");
      equal(snapshot.lifecycle.rewardedReviveUsed, false, "Timeout cannot revive");
      equal(context.mock.pendingCount(), 0, "Timed-out bridge request removed");
    } finally { closeGame(context); }
  }

  function scenarioR() { return runNoReviveOutcome({ outcome: "stale", field: "runId", data: { placement: "revive", earned: true } }); }
  function scenarioS() { return runNoReviveOutcome({ outcome: "stale", field: "resultSequence", data: { placement: "revive", earned: true } }); }

  async function scenarioT() {
    const context = await loadGame();
    try {
      const revives = observeRevives(context);
      await beginEligibleResult(context);
      await completeEarnedRevive(context, { outcome: "duplicate" });
      await wait(25);
      equal(revives.length, 1, "Duplicate response emits one revive");
      equal(context.api.snapshot().lifecycle.rewardedReviveUsed, true, "Duplicate response sets flag once");
    } finally { closeGame(context); }
  }

  async function scenarioU() {
    const context = await loadGame();
    try {
      await beginEligibleResult(context);
      context.mock.enqueue("rewarded.show", { outcome: "cancelled", delayMs: 35 });
      const button = context.gameWindow.document.getElementById("rewardedReviveBtn");
      button.click();
      button.click();
      context.api.requestRewardedRevive();
      await waitFor(() => !context.api.snapshot().rewardedRevive.requestPending, 500, "Rapid-tap request did not settle.");
      equal(context.mock.requests().filter(item => item.action === "rewarded.show").length, 1, "Rapid taps create one request");
    } finally { closeGame(context); }
  }

  async function scenarioV() {
    const context = await loadGame();
    try {
      const finalizations = [];
      context.gameWindow.SqueezeRushLifecycle.on("run_finalized", value => finalizations.push(value));
      await beginEligibleResult(context);
      context.mock.enqueue("rewarded.show", { outcome: "cancelled", delayMs: 40 });
      context.api.requestRewardedRevive();
      await waitFor(() => context.api.snapshot().rewardedRevive.requestPending, 200, "Request never became pending.");
      const locked = context.api.snapshot();
      equal(locked.rewardedRevive.retryDisabled, true, "Retry disabled during ad request");
      equal(locked.rewardedRevive.menuDisabled, true, "Menu disabled during ad request");
      context.api.retryRun();
      context.api.leaveResultForMenu();
      equal(context.api.snapshot().lifecycle.lifecyclePhase, "result_pending", "Conflicting actions cannot change pending result");
      equal(finalizations.length, 0, "Conflicting actions cannot finalize");
      await waitFor(() => !context.api.snapshot().rewardedRevive.requestPending, 500, "Cancelled request did not settle.");
      context.api.retryRun();
      context.api.retryRun();
      equal(finalizations.length, 1, "Result finalizes once after controls restore");
    } finally { closeGame(context); }
  }

  async function scenarioW() {
    const context = await loadGame();
    try {
      const revives = observeRevives(context);
      await beginEligibleResult(context);
      enqueueEarned(context, { delayMs: 50 });
      context.api.requestRewardedRevive();
      await waitFor(() => context.api.snapshot().rewardedRevive.requestPending, 200, "Request never became pending.");
      equal(context.api.changeLifecycleForRewardedReviveTest(), true, "Fixture changes lifecycle");
      await wait(90);
      const snapshot = context.api.snapshot();
      equal(snapshot.lifecycle.lifecyclePhase, "finalized", "Changed lifecycle remains finalized");
      equal(snapshot.lifecycle.rewardedReviveUsed, false, "Late earned response cannot revive");
      equal(revives.length, 0, "Late response emits no revive");
    } finally { closeGame(context); }
  }

  async function scenarioX() {
    const context = await loadGame();
    try {
      const pending = await beginEligibleResult(context);
      const revived = await completeEarnedRevive(context);
      equal(revived.lifecycle.runId, pending.lifecycle.runId, "Rewarded revive preserves runId");
    } finally { closeGame(context); }
  }

  async function scenarioY() {
    const context = await loadGame();
    try {
      const pending = await beginEligibleResult(context);
      const revived = await completeEarnedRevive(context);
      equal(revived.career.totalRuns, pending.career.totalRuns, "Rewarded revive does not add a career run");
      equal(revived.career.totalRuns, 1, "Actual run counted once");
    } finally { closeGame(context); }
  }

  async function scenarioZ() {
    const context = await loadGame();
    try {
      const pending = await beginEligibleResult(context);
      const revived = await completeEarnedRevive(context);
      equal(pending.revives, 0, "Fixture has no token");
      equal(revived.revives, 0, "Rewarded revive does not decrement token inventory");
      equal(revived.lifecycle.tokenRevivesUsed, 0, "Token usage remains zero");
    } finally { closeGame(context); }
  }

  async function scenarioAA() {
    const context = await loadGame();
    try {
      await beginEligibleResult(context);
      const revived = await completeEarnedRevive(context);
      equal(revived.lifecycle.rewardedReviveUsed, true, "Rewarded revive flag set");
      await wait(20);
      equal(context.api.snapshot().lifecycle.rewardedReviveUsed, true, "Flag remains a single boolean claim");
    } finally { closeGame(context); }
  }

  async function scenarioAB() {
    const context = await loadGame();
    try {
      const revives = observeRevives(context);
      await beginEligibleResult(context);
      await completeEarnedRevive(context);
      equal(revives.length, 1, "One revive event");
      equal(revives[0].source, "rewarded", "Rewarded event source");
    } finally { closeGame(context); }
  }

  async function scenarioAC() {
    const context = await loadGame();
    try {
      await beginEligibleResult(context);
      await completeEarnedRevive(context);
      context.api.endRun("smashed");
      const snapshot = context.api.snapshot();
      equal(snapshot.lifecycle.resultSequence, 2, "Second death advances result sequence");
      equal(snapshot.lifecycle.rewardedReviveUsed, true, "Used flag persists in the run");
      equal(snapshot.rewardedRevive.hidden, true, "Second death has no rewarded offer");
      equal(snapshot.lifecycle.lifecyclePhase, "finalized", "Second death finalizes without another revive");
    } finally { closeGame(context); }
  }

  async function scenarioAD() {
    const context = await loadGame();
    try {
      await beginEligibleResult(context, { progress: { score: 75, gatesPassed: 4, perfects: 1 } });
      const before = context.api.snapshot();
      const after = await completeEarnedRevive(context);
      equal(after.runRewardXp, before.runRewardXp, "Ad completion adds no run XP");
      equal(after.runRewardCores, before.runRewardCores, "Ad completion adds no run Cores");
      equal(after.lifecycle.accumulatedXpReward, before.lifecycle.accumulatedXpReward, "Accumulated XP unchanged");
      equal(after.lifecycle.accumulatedCoreReward, before.lifecycle.accumulatedCoreReward, "Accumulated Cores unchanged");
      equal(after.career.xp, before.career.xp, "Career XP unchanged");
      equal(after.career.cores, before.career.cores, "Career Cores unchanged");
    } finally { closeGame(context); }
  }

  async function scenarioAE() {
    const context = await loadGame();
    try {
      const revives = observeRevives(context);
      context.api.startRun("daily");
      const runId = context.api.snapshot().lifecycle.runId;
      context.api.endRun("smashed");
      context.api.reviveRun();
      const snapshot = context.api.snapshot();
      equal(snapshot.lifecycle.runId, runId, "Token revive preserves runId");
      equal(snapshot.revives, 0, "Token revive decrements one token");
      equal(snapshot.lifecycle.tokenRevivesUsed, 1, "Token usage increments");
      equal(snapshot.lifecycle.rewardedReviveUsed, false, "Token path does not claim rewarded revive");
      equal(revives[0].source, "token", "Token source preserved");
    } finally { closeGame(context); }
  }

  async function scenarioAF() {
    const context = await loadGame();
    try {
      context.api.startRun("daily");
      context.api.setRunProgress({ score: 10, gatesPassed: 1 });
      context.api.endRun("smashed");
      equal(context.api.snapshot().runRewardXp, 7, "First snapshot award");
      context.api.reviveRun();
      context.api.setRunProgress({ score: 30, gatesPassed: 3, perfects: 1 });
      context.api.endRun("smashed");
      const snapshot = context.api.snapshot();
      equal(snapshot.runRewardXp, 25, "Snapshot deltas accumulate to original total");
      equal(snapshot.lifecycle.accumulatedXpReward, 25, "Lifecycle total matches snapshot deltas");
      equal(snapshot.awardSnapshot.xp, 25, "Existing awardSnapshot cumulative entitlement preserved");
      equal(snapshot.career.totalGates, 3, "Award deltas do not duplicate gates");
    } finally { closeGame(context); }
  }

  async function scenarioAG() {
    const context = await loadGame();
    try {
      const source = await sourceText();
      equal(context.gameWindow.document.querySelectorAll("#doubleRewardsBtn, [data-action='double_rewards']").length, 0, "No Double Rewards UI");
      assert(!source.includes("placement: \"double_rewards\""), "No Double Rewards gameplay caller");
      equal(context.api.snapshot().lifecycle.rewardDoubleClaimed, false, "Double Rewards remains inactive");
    } finally { closeGame(context); }
  }

  async function scenarioAH() {
    const context = await loadGame();
    try {
      const source = await sourceText();
      assert(!source.includes("INTERSTITIAL_SHOW"), "game.js has no interstitial action caller");
      assert(!source.includes("interstitial.show"), "game.js has no interstitial request");
      context.api.startRun("sprint");
      context.api.endRun("timeup");
      await wait(20);
      equal(context.mock.requests().filter(item => item.action === "interstitial.show").length, 0, "Run ending sends no interstitial request");
    } finally { closeGame(context); }
  }

  const scenarios = [
    ["A", "Rewarded revive hidden while a token revive exists", scenarioA],
    ["B", "Sprint time-up never offers rewarded revive", scenarioB],
    ["C", "Modes that forbid revive stay forbidden", scenarioC],
    ["D", "Used rewarded revive is not offered again", scenarioD],
    ["E", "Unavailable native support hides rewarded revive", scenarioE],
    ["F", "Consent false hides rewarded revive", scenarioF],
    ["G", "Not-ready rewarded ad hides rewarded revive", scenarioG],
    ["H", "Eligible result displays rewarded revive", scenarioH],
    ["I", "Clicking sends exactly one rewarded request", scenarioI],
    ["J", "Rewarded placement is exactly revive", scenarioJ],
    ["K", "Request captures run and result context", scenarioK],
    ["L", "Earned success revives exactly once", scenarioL],
    ["M", "Success without earned reward cannot revive", scenarioM],
    ["N", "Cancelled response cannot revive", scenarioN],
    ["O", "Unavailable response cannot revive", scenarioO],
    ["P", "Failed response cannot revive", scenarioP],
    ["Q", "Timeout cannot revive and clears pending state", scenarioQ],
    ["R", "Stale runId response cannot revive", scenarioR],
    ["S", "Stale resultSequence response cannot revive", scenarioS],
    ["T", "Duplicate response cannot revive twice", scenarioT],
    ["U", "Rapid repeated taps create one request", scenarioU],
    ["V", "Retry and Menu cannot race pending rewarded request", scenarioV],
    ["W", "Lifecycle change makes late response inert", scenarioW],
    ["X", "Rewarded revive preserves runId", scenarioX],
    ["Y", "Rewarded revive preserves one career run", scenarioY],
    ["Z", "Rewarded revive consumes no token", scenarioZ],
    ["AA", "Rewarded revive used flag is claimed once", scenarioAA],
    ["AB", "Rewarded revive event source is rewarded", scenarioAB],
    ["AC", "Second death offers no second rewarded revive", scenarioAC],
    ["AD", "Ad completion changes no XP or Core totals", scenarioAD],
    ["AE", "Existing token revive behavior is unchanged", scenarioAE],
    ["AF", "Stage 1 awardSnapshot delta behavior is unchanged", scenarioAF],
    ["AG", "Double Rewards remains disconnected", scenarioAG],
    ["AH", "Interstitial presentation remains disconnected", scenarioAH]
  ];

  async function runAll() {
    runButton.disabled = true;
    resultsList.innerHTML = "";
    const results = [];
    for (const [id, name, scenario] of scenarios) {
      try {
        await scenario();
        results.push({ id, name, status: "PASS" });
      } catch (error) {
        results.push({ id, name, status: "FAIL", error: error && error.message ? error.message : String(error) });
      } finally {
        if (activeFrame) activeFrame.remove();
        activeFrame = null;
      }
    }

    clearGameStorage();
    const passed = results.filter(result => result.status === "PASS").length;
    const failed = results.length - passed;
    summary.textContent = `STAGE 4 REWARDED REVIVE TEST RESULT: ${passed}/${results.length} passed, ${failed} failed`;
    summary.className = failed ? "fail" : "pass";
    summary.dataset.results = JSON.stringify(results);
    resultsList.innerHTML = results.map(result => {
      const detail = result.error ? ` - ${result.error}` : "";
      return `<li class="${result.status === "PASS" ? "pass" : "fail"}">${result.id}. ${result.name}: ${result.status}${detail}</li>`;
    }).join("");
    document.title = failed ? `FAIL (${failed}) - Stage 4 Tests` : "PASS - Stage 4 Tests";
    runButton.disabled = false;
    return results;
  }

  runButton.addEventListener("click", runAll);
  window.stage4RunAllTests = runAll;
  runAll();
})();
