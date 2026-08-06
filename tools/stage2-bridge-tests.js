(function runStage2BridgeTests() {
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

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function equal(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
    }
  }

  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === "object") {
      return Object.keys(value).sort().reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
    }
    return value;
  }

  function same(actual, expected, message) {
    const actualText = JSON.stringify(canonicalize(actual));
    const expectedText = JSON.stringify(canonicalize(expected));
    if (actualText !== expectedText) {
      throw new Error(`${message}: expected ${expectedText}, received ${actualText}`);
    }
  }

  function wait(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
  }

  async function waitFor(predicate, timeoutMs, message) {
    const started = performance.now();
    while (performance.now() - started < timeoutMs) {
      if (predicate()) return;
      await wait(10);
    }
    throw new Error(message || "Timed out waiting for a condition.");
  }

  function clearGameStorage() {
    for (const key of storageKeys) localStorage.removeItem(key);
  }

  function loadGame(mockEnabled) {
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
        if (!api || !bridge || (mockEnabled && !mock)) {
          frame.remove();
          reject(new Error("The Stage 1 test surface or Stage 2 bridge fixture was unavailable."));
          return;
        }
        api.prepare();
        if (mock) mock.reset();
        resolve({ frame, gameWindow, api, bridge, mock });
      }, { once: true });

      const query = new URLSearchParams({ stage1Test: String(Date.now()) });
      if (mockEnabled) query.set("nativeBridgeMock", "1");
      frame.src = `../SqueezeRushIOS/Web/index.html?${query}`;
      document.body.appendChild(frame);
    });
  }

  function closeGame(context) {
    if (context && context.bridge) context.bridge.cancelPending("Stage 2 test cleanup.");
    if (context && context.frame) context.frame.remove();
    activeFrame = null;
  }

  function responseEnvelope(request, overrides) {
    return Object.assign({
      protocolVersion: 1,
      requestId: request.requestId,
      action: request.action,
      status: "success",
      context: Object.assign({}, request.context),
      data: {},
      error: null
    }, overrides || {});
  }

  async function scenarioA() {
    const context = await loadGame(false);
    try {
      equal(context.bridge.isNativeAvailable(), false, "Browser native availability");
      equal(Boolean(context.gameWindow.__SQUEEZE_RUSH_NATIVE_BRIDGE_MOCK__), false, "Mock absent without query gate");
      const response = await context.bridge.getCapabilities({ refresh: true, timeoutMs: 100 });
      equal(response.status, "success", "Browser capability status");
      same(response.data, {
        nativeBridge: false, protocolVersion: 1, platform: "browser", share: false, haptics: false,
        rewardedAds: false, interstitialAds: false, purchases: false, restorePurchases: false,
        entitlements: false, reviewRequest: false, moreGames: false, analytics: false, consent: false
      }, "Browser capability flags");
    } finally { closeGame(context); }
  }

  async function scenarioB() {
    const context = await loadGame(true);
    try {
      equal(context.bridge.isNativeAvailable(), true, "Mock native availability");
      const response = await context.bridge.getCapabilities({ refresh: true, timeoutMs: 100 });
      equal(response.status, "success", "Mock capability status");
      same(response.data, {
        nativeBridge: true, protocolVersion: 1, platform: "ios", share: true, haptics: true,
        rewardedAds: false, interstitialAds: false, purchases: false, restorePurchases: false,
        entitlements: false, reviewRequest: false, moreGames: false, analytics: false, consent: false
      }, "Exact Stage 2 native capability flags");
      const cached = await context.bridge.getCapabilities();
      equal(cached.requestId, response.requestId, "Capabilities are returned from cache by default");
      equal(context.mock.requests().filter(item => item.action === "bridge.capabilities").length, 1, "Cached capabilities do not dispatch again");
      await context.bridge.getCapabilities({ refresh: true, timeoutMs: 100 });
      equal(context.mock.requests().filter(item => item.action === "bridge.capabilities").length, 2, "Explicit refresh dispatches a new capability request");
    } finally { closeGame(context); }
  }

  async function scenarioC() {
    const context = await loadGame(true);
    try {
      context.mock.enqueue("haptic.perform", { outcome: "success", data: { marker: "one" } });
      let settlements = 0;
      const response = await context.bridge.request("haptic.perform", { style: "light" }, { timeoutMs: 100 })
        .then(value => { settlements += 1; return value; });
      await wait(10);
      equal(response.status, "success", "Successful request status");
      equal(response.data.marker, "one", "Successful request data");
      equal(settlements, 1, "Successful request settles once");
      let misuseRejected = false;
      try {
        await context.bridge.request("not.allowlisted", {});
      } catch (error) {
        misuseRejected = error instanceof context.gameWindow.TypeError;
      }
      equal(misuseRejected, true, "Direct programmer misuse rejects with TypeError");
    } finally { closeGame(context); }
  }

  async function scenarioD() {
    const context = await loadGame(true);
    try {
      context.api.startRun("daily");
      context.api.endRun("smashed");
      context.mock.enqueue("rewarded.show", {
        outcome: "unavailable",
        error: { code: "not_implemented_stage2", message: "Unavailable in Stage 2." }
      });
      const response = await context.bridge.request("rewarded.show", { placement: "revive" }, { timeoutMs: 100 });
      equal(response.status, "unavailable", "Unavailable status");
      equal(response.error.code, "not_implemented_stage2", "Unavailable error code");
    } finally { closeGame(context); }
  }

  async function scenarioE() {
    const context = await loadGame(true);
    try {
      context.mock.enqueue("share.present", { outcome: "cancelled" });
      const response = await context.bridge.request("share.present", { text: "Share test" }, { timeoutMs: 100 });
      equal(response.status, "cancelled", "Cancelled response status");
      equal(response.error.code, "mock_cancelled", "Cancelled error code");
    } finally { closeGame(context); }
  }

  async function scenarioF() {
    const context = await loadGame(true);
    try {
      context.mock.enqueue("share.present", { outcome: "failed" });
      const response = await context.bridge.request("share.present", { text: "Share test" }, { timeoutMs: 100 });
      equal(response.status, "failed", "Failed response status");
      equal(response.error.code, "mock_failed", "Failed error code");
    } finally { closeGame(context); }
  }

  async function scenarioG() {
    const context = await loadGame(true);
    try {
      context.mock.enqueue("haptic.perform", { outcome: "no_response" });
      const response = await context.bridge.request("haptic.perform", { style: "medium" }, { timeoutMs: 30 });
      equal(response.status, "timeout", "Timeout response status");
      equal(response.error.code, "request_timeout", "Timeout error code");
      equal(context.mock.pendingCount(), 0, "Timed-out request removed from registry");
    } finally { closeGame(context); }
  }

  async function scenarioH() {
    const context = await loadGame(true);
    try {
      context.mock.enqueue("haptic.perform", { outcome: "duplicate", data: { marker: "first" } });
      let settlements = 0;
      const response = await context.bridge.request("haptic.perform", { style: "heavy" }, { timeoutMs: 100 })
        .then(value => { settlements += 1; return value; });
      await wait(15);
      equal(response.status, "success", "First duplicate response status");
      equal(settlements, 1, "Duplicate response ignored after settlement");
      equal(context.mock.pendingCount(), 0, "Duplicate response leaves no pending request");
    } finally { closeGame(context); }
  }

  async function scenarioI() {
    const context = await loadGame(true);
    try {
      context.mock.enqueue("haptic.perform", { outcome: "no_response" });
      const pending = context.bridge.request("haptic.perform", { style: "light" }, { timeoutMs: 40 });
      await waitFor(() => context.mock.requests().length === 1, 100, "Request was not logged.");
      const original = context.mock.requests()[0];
      const accepted = context.mock.deliver(responseEnvelope(original, { requestId: "unknown-bridge-request" }));
      equal(accepted, false, "Unknown requestId response ignored");
      equal(context.mock.pendingCount(), 1, "Unknown response cannot remove real pending request");
      const response = await pending;
      equal(response.status, "timeout", "Original request times out normally");
    } finally { closeGame(context); }
  }

  async function scenarioJ() {
    const context = await loadGame(true);
    try {
      context.mock.enqueue("haptic.perform", { outcome: "mismatched_action" });
      const response = await context.bridge.request("haptic.perform", { style: "light" }, { timeoutMs: 30 });
      equal(response.status, "timeout", "Mismatched action cannot settle success");
    } finally { closeGame(context); }
  }

  async function scenarioK() {
    const context = await loadGame(true);
    try {
      context.mock.enqueue("haptic.perform", { outcome: "malformed", kind: "protocol_version" });
      const response = await context.bridge.request("haptic.perform", { style: "light" }, { timeoutMs: 30 });
      equal(response.status, "timeout", "Invalid protocol response ignored safely");
    } finally { closeGame(context); }
  }

  async function scenarioL() {
    const context = await loadGame(true);
    try {
      context.mock.enqueue("haptic.perform", { outcome: "malformed", kind: "data" });
      const malformed = await context.bridge.request("haptic.perform", { style: "light" }, { timeoutMs: 30 });
      equal(malformed.status, "timeout", "Malformed response ignored safely");
      context.mock.enqueue("haptic.perform", { outcome: "success" });
      const healthy = await context.bridge.request("haptic.perform", { style: "light" }, { timeoutMs: 100 });
      equal(healthy.status, "success", "Bridge remains usable after malformed response");
    } finally { closeGame(context); }
  }

  async function scenarioM() {
    const context = await loadGame(true);
    try {
      context.mock.enqueue("haptic.perform", { outcome: "delayed", delayMs: 35, data: { marker: "haptic" } });
      context.mock.enqueue("share.present", { outcome: "success", delayMs: 5, data: { marker: "share" } });
      const haptic = context.bridge.request("haptic.perform", { style: "success" }, { timeoutMs: 100 });
      const share = context.bridge.request("share.present", { text: "Concurrent share" }, { timeoutMs: 100 });
      const [hapticResult, shareResult] = await Promise.all([haptic, share]);
      equal(hapticResult.status, "success", "Concurrent haptic status");
      equal(shareResult.status, "success", "Concurrent share status");
      equal(hapticResult.data.marker, "haptic", "Concurrent haptic data");
      equal(shareResult.data.marker, "share", "Concurrent share data");
      const requestIds = context.mock.requests().filter(item => ["haptic.perform", "share.present"].includes(item.action)).map(item => item.requestId);
      equal(new Set(requestIds).size, requestIds.length, "Concurrent requests have unique requestIds");
      equal(context.mock.pendingCount(), 0, "Concurrent requests settle independently");
    } finally { closeGame(context); }
  }

  async function scenarioN() {
    const context = await loadGame(true);
    try {
      context.api.startRun("daily");
      context.api.endRun("smashed");
      const before = context.api.snapshot().lifecycle;
      context.mock.enqueue("rewarded.show", { outcome: "success", delayMs: 10, data: { placement: "revive", earned: false } });
      const response = await context.bridge.request("rewarded.show", { placement: "revive" }, { timeoutMs: 100 });
      equal(response.status, "success", "Matching lifecycle response succeeds");
      equal(response.context.runId, before.runId, "Matching lifecycle runId");
      equal(response.context.resultSequence, before.resultSequence, "Matching lifecycle resultSequence");
      equal(context.api.snapshot().lifecycle.rewardedReviveUsed, false, "Bridge success alone grants no reward");
    } finally { closeGame(context); }
  }

  async function scenarioO() {
    const context = await loadGame(true);
    try {
      context.api.startRun("daily");
      const oldRunId = context.api.snapshot().lifecycle.runId;
      context.api.endRun("smashed");
      context.mock.enqueue("rewarded.show", { outcome: "success", delayMs: 60 });
      const pending = context.bridge.request("rewarded.show", { placement: "revive" }, { timeoutMs: 150 });
      context.api.retryRun();
      context.api.startRun("daily");
      assert(context.api.snapshot().lifecycle.runId !== oldRunId, "Fixture must advance to another run");
      const response = await pending;
      equal(response.status, "stale", "Changed runId becomes stale");
      equal(response.error.code, "stale_lifecycle_context", "Stale run error code");
    } finally { closeGame(context); }
  }

  async function scenarioP() {
    const context = await loadGame(true);
    try {
      context.api.startRun("daily");
      context.api.endRun("smashed");
      const firstSequence = context.api.snapshot().lifecycle.resultSequence;
      context.mock.enqueue("rewarded.show", { outcome: "success", delayMs: 60 });
      const pending = context.bridge.request("rewarded.show", { placement: "revive" }, { timeoutMs: 150 });
      context.api.reviveRun();
      context.api.endRun("smashed");
      equal(context.api.snapshot().lifecycle.resultSequence, firstSequence + 1, "Fixture must advance result sequence");
      const response = await pending;
      equal(response.status, "stale", "Changed resultSequence becomes stale");
    } finally { closeGame(context); }
  }

  async function scenarioQ() {
    const context = await loadGame(true);
    try {
      context.mock.enqueue("haptic.perform", { outcome: "no_response" });
      const pending = context.bridge.request("haptic.perform", { style: "light" }, { timeoutMs: 1000 });
      await waitFor(() => context.mock.pendingCount() === 1, 100, "Teardown request was not pending.");
      context.gameWindow.dispatchEvent(new Event("pagehide"));
      const response = await pending;
      equal(response.status, "cancelled", "Page teardown cancels pending request");
      equal(context.mock.pendingCount(), 0, "Page teardown clears pending registry");
    } finally { closeGame(context); }
  }

  async function scenarioR() {
    const context = await loadGame(true);
    try {
      equal(context.mock.canActivateFor("http://localhost/test?nativeBridgeMock=1"), true, "localhost mock gate");
      equal(context.mock.canActivateFor("http://127.0.0.1/test?nativeBridgeMock=1"), true, "127.0.0.1 mock gate");
      equal(context.mock.canActivateFor("file:///game/index.html?nativeBridgeMock=1"), false, "file URL mock rejection");
      equal(context.mock.canActivateFor("https://example.com/?nativeBridgeMock=1"), false, "remote host mock rejection");
      equal(context.mock.canActivateFor("http://localhost/test"), false, "query parameter is mandatory");
      equal(context.mock.canActivateFor("about:blank?nativeBridgeMock=1"), false, "empty hostname mock rejection");
    } finally { closeGame(context); }
  }

  async function scenarioS() {
    const context = await loadGame(true);
    try {
      context.api.startRun("daily");
      context.api.setRunProgress({ score: 25, gatesPassed: 2 });
      context.api.endRun("smashed");
      const before = context.api.snapshot();
      context.mock.enqueue("share.present", { outcome: "success", delayMs: 5 });
      await context.api.shareScore();
      const after = context.api.snapshot();
      same(after.lifecycle, before.lifecycle, "Typed share cannot mutate lifecycle");
      same(after.career, before.career, "Typed share cannot mutate career");
      equal(after.runRewardXp, before.runRewardXp, "Typed share cannot mutate XP");
      equal(after.runRewardCores, before.runRewardCores, "Typed share cannot mutate Cores");
      equal(context.mock.requests().filter(item => item.action === "share.present").length, 1, "Typed share presents once");
    } finally { closeGame(context); }
  }

  async function scenarioT() {
    const context = await loadGame(true);
    try {
      context.mock.enqueue("haptic.perform", { outcome: "no_response" });
      const started = performance.now();
      context.api.startRun("sprint");
      const elapsed = performance.now() - started;
      equal(context.api.snapshot().lifecycle.lifecyclePhase, "active", "Game starts while haptic is pending");
      assert(elapsed < 100, `Haptic call blocked startRun for ${elapsed.toFixed(1)}ms`);
      equal(context.mock.requests().filter(item => item.action === "haptic.perform").length, 1, "One haptic request dispatched");
      equal(context.mock.pendingCount(), 1, "Non-responsive haptic remains asynchronous");
      context.bridge.cancelPending("Haptic non-blocking test complete.");
    } finally { closeGame(context); }
  }

  async function scenarioU() {
    clearGameStorage();
    const frame = document.createElement("iframe");
    activeFrame = frame;
    frame.src = `stage1-lifecycle-tests.html?stage2Verification=${Date.now()}`;
    document.body.appendChild(frame);
    try {
      await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("Stage 1 suite frame failed to load.")), 8000);
        frame.addEventListener("load", () => { window.clearTimeout(timeout); resolve(); }, { once: true });
      });
      await waitFor(() => {
        const value = frame.contentDocument && frame.contentDocument.getElementById("summary");
        return value && value.textContent.includes("STAGE 1 TEST RESULT");
      }, 12000, "Stage 1 suite did not finish.");
      const text = frame.contentDocument.getElementById("summary").textContent;
      equal(text, "STAGE 1 TEST RESULT: 10/10 passed, 0 failed", "Embedded Stage 1 suite result");
    } finally {
      frame.remove();
      activeFrame = null;
      clearGameStorage();
    }
  }

  const scenarios = [
    ["A", "Browser capabilities report nativeBridge false", scenarioA],
    ["B", "Mock capabilities expose exact Stage 2 flags", scenarioB],
    ["C", "Successful request resolves once", scenarioC],
    ["D", "Unavailable response uses the expected error", scenarioD],
    ["E", "Cancelled response resolves operationally", scenarioE],
    ["F", "Failed response resolves operationally", scenarioF],
    ["G", "Timeout removes the pending request", scenarioG],
    ["H", "Duplicate response is ignored", scenarioH],
    ["I", "Unknown response requestId is ignored", scenarioI],
    ["J", "Mismatched action cannot settle success", scenarioJ],
    ["K", "Invalid protocol response is ignored", scenarioK],
    ["L", "Malformed response cannot crash the bridge", scenarioL],
    ["M", "Concurrent requests settle independently", scenarioM],
    ["N", "Matching lifecycle response succeeds", scenarioN],
    ["O", "Stale runId becomes stale", scenarioO],
    ["P", "Stale resultSequence becomes stale", scenarioP],
    ["Q", "Page teardown settles pending requests", scenarioQ],
    ["R", "Mock activation is restricted to explicit localhost", scenarioR],
    ["S", "Typed share preserves lifecycle and rewards", scenarioS],
    ["T", "Haptic requests do not block the game", scenarioT],
    ["U", "Stage 1 lifecycle suite remains 10/10", scenarioU]
  ];

  async function runAll() {
    runButton.disabled = true;
    resultsList.replaceChildren();
    summary.className = "";
    summary.textContent = `Running ${scenarios.length} scenarios...`;
    const results = [];

    for (const [id, name, run] of scenarios) {
      const item = document.createElement("li");
      item.textContent = `${id}. ${name}: RUNNING`;
      resultsList.appendChild(item);
      try {
        await run();
        item.textContent = `${id}. ${name}: PASS`;
        item.className = "pass";
        results.push({ id, name, status: "PASS" });
      } catch (error) {
        if (activeFrame) activeFrame.remove();
        activeFrame = null;
        item.textContent = `${id}. ${name}: FAIL - ${error && error.message ? error.message : String(error)}`;
        item.className = "fail";
        results.push({ id, name, status: "FAIL", error: error && error.message ? error.message : String(error) });
      }
    }

    clearGameStorage();
    const passed = results.filter(result => result.status === "PASS").length;
    const failed = results.length - passed;
    summary.textContent = `STAGE 2 BRIDGE TEST RESULT: ${passed}/${results.length} passed, ${failed} failed`;
    summary.className = failed ? "fail" : "pass";
    summary.dataset.results = JSON.stringify(results);
    document.title = failed ? `FAIL (${failed}) - Stage 2 Bridge Tests` : "PASS - Stage 2 Bridge Tests";
    runButton.disabled = false;
    return results;
  }

  runButton.addEventListener("click", runAll);
  window.stage2RunAllTests = runAll;
  runAll();
})();
