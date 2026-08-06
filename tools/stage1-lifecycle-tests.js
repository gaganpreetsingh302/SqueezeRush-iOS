(function runStage1LifecycleTests() {
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

  function same(actual, expected, message) {
    const canonicalize = value => {
      if (Array.isArray(value)) return value.map(canonicalize);
      if (value && typeof value === "object") {
        return Object.keys(value).sort().reduce((result, key) => {
          result[key] = canonicalize(value[key]);
          return result;
        }, {});
      }
      return value;
    };
    const actualText = JSON.stringify(canonicalize(actual));
    const expectedText = JSON.stringify(canonicalize(expected));
    if (actualText !== expectedText) {
      throw new Error(`${message}: expected ${expectedText}, received ${actualText}`);
    }
  }

  function clearGameStorage() {
    for (const key of storageKeys) localStorage.removeItem(key);
  }

  function loadGame(seedStorage) {
    clearGameStorage();
    if (typeof seedStorage === "function") seedStorage();

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
        if (!api) {
          frame.remove();
          reject(new Error("The localhost-only Stage 1 test surface was unavailable."));
          return;
        }
        api.prepare();
        resolve({ frame, gameWindow, api });
      }, { once: true });
      frame.src = `../SqueezeRushIOS/Web/index.html?stage1Test=${Date.now()}`;
      document.body.appendChild(frame);
    });
  }

  function closeGame(context) {
    if (context && context.frame) context.frame.remove();
    activeFrame = null;
  }

  function observe(gameWindow) {
    const counts = Object.create(null);
    const payloads = Object.create(null);
    for (const eventName of Object.values(gameWindow.SqueezeRushLifecycle.events)) {
      counts[eventName] = 0;
      payloads[eventName] = [];
      gameWindow.SqueezeRushLifecycle.on(eventName, payload => {
        counts[eventName] += 1;
        payloads[eventName].push(payload);
      });
    }
    return { counts, payloads };
  }

  async function scenarioA() {
    const context = await loadGame();
    try {
      const events = observe(context.gameWindow);
      context.api.startRun("sprint");
      const started = context.api.snapshot();
      assert(started.lifecycle.runId, "A runId must be assigned");
      equal(started.lifecycle.lifecyclePhase, "active", "Run must become active");
      context.api.setRunProgress({ score: 100, gatesPassed: 2, perfects: 1, bossGates: 0 });
      context.api.endRun("smashed");
      const ended = context.api.snapshot();
      equal(ended.career.totalRuns, 1, "Career run count");
      equal(ended.runRewardXp, 54, "Original XP formula");
      equal(ended.runRewardCores, 1, "Original Core formula");
      equal(ended.lifecycle.accumulatedXpReward, 54, "Accumulated XP");
      equal(ended.lifecycle.accumulatedCoreReward, 1, "Accumulated Cores");
      equal(ended.lifecycle.lifecyclePhase, "finalized", "No-revive death phase");
      equal(events.counts.run_finalized, 1, "Finalization event count");
      context.api.endRun("smashed");
      const repeated = context.api.snapshot();
      equal(repeated.career.xp, ended.career.xp, "Repeated end cannot add XP");
      equal(repeated.career.cores, ended.career.cores, "Repeated end cannot add Cores");
      equal(events.counts.run_finalized, 1, "Repeated end cannot finalize again");
    } finally {
      closeGame(context);
    }
  }

  async function scenarioB() {
    const context = await loadGame();
    try {
      const events = observe(context.gameWindow);
      context.api.startRun("daily");
      const runId = context.api.snapshot().lifecycle.runId;
      context.api.endRun("smashed");
      const pending = context.api.snapshot();
      equal(pending.lifecycle.lifecyclePhase, "result_pending", "Revive decision phase");
      equal(pending.lifecycle.runFinalized, false, "Run cannot finalize before revive decision");
      equal(pending.career.totalRuns, 1, "Career run count after first result");
      context.api.reviveRun();
      const revived = context.api.snapshot();
      equal(revived.lifecycle.lifecyclePhase, "active", "Token revive resumes active play");
      equal(revived.lifecycle.runId, runId, "Token revive preserves runId");
      equal(revived.lifecycle.tokenRevivesUsed, 1, "Token revive usage");
      equal(revived.revives, 0, "Token inventory consumed once");
      equal(revived.career.totalRuns, 1, "Token revive cannot create a career run");
      equal(events.counts.run_revived, 1, "Revive event count");
      equal(events.counts.run_finalized, 0, "Revive path remains unfinalized");
    } finally {
      closeGame(context);
    }
  }

  async function scenarioC() {
    const context = await loadGame();
    try {
      const events = observe(context.gameWindow);
      context.api.startRun("daily");
      const runId = context.api.snapshot().lifecycle.runId;
      context.api.setRunProgress({ score: 10, gatesPassed: 1 });
      context.api.endRun("smashed");
      const firstResult = context.api.snapshot();
      equal(firstResult.runRewardXp, 7, "First award delta");
      context.api.reviveRun();
      context.api.setRunProgress({ score: 30, gatesPassed: 3, perfects: 1 });
      context.api.endRun("smashed");
      const secondResult = context.api.snapshot();
      equal(secondResult.lifecycle.runId, runId, "Second result preserves runId");
      equal(secondResult.lifecycle.resultSequence, 2, "Result sequence increments");
      equal(secondResult.career.totalRuns, 1, "Revived run remains one career run");
      equal(secondResult.runRewardXp, 25, "Snapshot award deltas accumulate to final XP");
      equal(secondResult.lifecycle.accumulatedXpReward, 25, "Lifecycle XP total matches award deltas");
      equal(secondResult.awardSnapshot.xp, 25, "Award snapshot retains cumulative entitlement");
      equal(secondResult.career.totalGates, 3, "Gate deltas are not duplicated");
      equal(secondResult.lifecycle.lifecyclePhase, "finalized", "Second death without a token finalizes");
      equal(events.counts.reward_changed, 2, "Two distinct reward deltas");
      equal(events.counts.run_finalized, 1, "Exactly one finalization");
    } finally {
      closeGame(context);
    }
  }

  async function scenarioD() {
    const context = await loadGame();
    try {
      const events = observe(context.gameWindow);
      context.api.startRun("daily");
      const oldRunId = context.api.snapshot().lifecycle.runId;
      context.api.endRun("smashed");
      context.api.retryRun();
      context.api.retryRun();
      const declined = context.api.snapshot();
      equal(declined.lifecycle.runFinalized, true, "Retry finalizes pending run");
      equal(events.counts.run_finalized, 1, "Repeated Retry cannot re-finalize");
      assert(declined.views.instructions, "Retry must navigate to instructions");
      context.api.startRun("daily");
      const next = context.api.snapshot();
      assert(next.lifecycle.runId !== oldRunId, "Retry must start a different runId");
      equal(next.career.totalRuns, 1, "New unended run does not alter prior career count");
      equal(events.counts.run_started, 2, "Exactly two actual run starts");
    } finally {
      closeGame(context);
    }
  }

  async function scenarioE() {
    const context = await loadGame();
    try {
      const events = observe(context.gameWindow);
      context.api.startRun("daily");
      const runId = context.api.snapshot().lifecycle.runId;
      context.api.endRun("smashed");
      context.api.leaveResultForMenu();
      context.api.leaveResultForMenu();
      const ended = context.api.snapshot();
      equal(ended.lifecycle.runId, runId, "Menu cannot create a run");
      equal(ended.lifecycle.runFinalized, true, "Menu finalizes pending run");
      equal(ended.career.totalRuns, 1, "Menu preserves one career run");
      equal(events.counts.run_started, 1, "Menu cannot start a run");
      equal(events.counts.run_finalized, 1, "Repeated Menu cannot re-finalize");
      assert(ended.views.menu, "Menu view must be shown");
    } finally {
      closeGame(context);
    }
  }

  async function scenarioF() {
    const context = await loadGame();
    try {
      const events = observe(context.gameWindow);
      context.api.startRun("sprint");
      context.api.setRunProgress({ score: 12, gatesPassed: 2 });
      context.api.endRun("timeup");
      const ended = context.api.snapshot();
      equal(ended.lifecycle.lifecyclePhase, "finalized", "Sprint time-up is final");
      equal(ended.lifecycle.finalizationReason, "timeup", "Sprint finalization reason");
      equal(ended.revives, 0, "Sprint has no revive token");
      equal(events.payloads.result_shown[0].canTokenRevive, false, "Sprint result is not revive eligible");
      context.api.reviveRun();
      const repeated = context.api.snapshot();
      equal(repeated.lifecycle.lifecyclePhase, "finalized", "Stale revive cannot resume Sprint");
      equal(events.counts.run_revived, 0, "No Sprint revive event");
    } finally {
      closeGame(context);
    }
  }

  async function scenarioG() {
    const context = await loadGame();
    try {
      const events = observe(context.gameWindow);
      context.gameWindow.SqueezeRushLifecycle.on("result_shown", () => {
        throw new Error("Intentional listener failure");
      });
      context.api.startRun("daily");
      const runId = context.api.snapshot().lifecycle.runId;
      context.api.setRunProgress({ score: 20, gatesPassed: 2 });
      context.api.endRun("smashed");
      context.api.reviveRun();
      context.api.reviveRun();
      context.api.retryRun();
      context.api.leaveResultForMenu();
      const resumed = context.api.snapshot();
      equal(resumed.lifecycle.lifecyclePhase, "active", "First rapid revive wins the decision");
      equal(resumed.lifecycle.tokenRevivesUsed, 1, "Rapid revive taps consume one token");
      equal(resumed.lifecycle.runId, runId, "Rapid actions preserve runId");
      context.api.setRunProgress({ score: 40, gatesPassed: 4, perfects: 1 });
      context.api.endRun("smashed");
      const finalReward = context.api.snapshot().career.xp;
      context.api.leaveResultForMenu();
      context.api.leaveResultForMenu();
      context.api.retryRun();
      context.api.reviveRun();
      const ended = context.api.snapshot();
      equal(ended.career.totalRuns, 1, "Rapid actions cannot duplicate career runs");
      equal(ended.career.xp, finalReward, "Rapid actions cannot duplicate awards");
      equal(events.counts.run_revived, 1, "Rapid revive event count");
      equal(events.counts.run_finalized, 1, "Rapid finalization event count");
      equal(events.counts.run_started, 1, "Rapid navigation cannot start another run");
    } finally {
      closeGame(context);
    }
  }

  async function scenarioH() {
    const seededCareer = {
      xp: 120, cores: 7, totalRuns: 3, totalGates: 9, totalNearMisses: 2,
      totalPickups: 1, bestCombo: 4, completedContracts: { "2026-08-02:gates": true }
    };
    const seededBests = { daily: 88, arcade: 41, sprint: 30, zen: 12 };
    const context = await loadGame(() => {
      localStorage.setItem("squeezeRush.best.v1", "88");
      localStorage.setItem("squeezeRush.modeBest.v1", JSON.stringify(seededBests));
      localStorage.setItem("squeezeRush.career.v2", JSON.stringify(seededCareer));
      localStorage.setItem("squeezeRush.settings.v2", JSON.stringify({ sound: false }));
    });
    try {
      const loaded = context.api.snapshot();
      same(loaded.career, seededCareer, "Existing career save loads unchanged");
      same(loaded.modeBests, Object.assign({ chaos: 0 }, seededBests), "Existing mode bests load with safe defaults for absent modes");
      equal(loaded.settings.sound, false, "Existing settings load unchanged");
      context.api.startRun("sprint");
      context.api.endRun("smashed");
      const written = context.api.snapshot();
      const persistedCareer = JSON.parse(written.storage.career);
      equal(persistedCareer.xp, 125, "Existing XP continues from saved value");
      equal(persistedCareer.totalRuns, 4, "Existing totalRuns increments once");
      same(JSON.parse(written.storage.modeBests), seededBests, "Unchanged mode best save format");
      same(JSON.parse(written.storage.settings), { sound: false }, "Unchanged settings save format");
      equal(written.storage.best, "88", "Legacy best key remains intact");
      assert(!Object.prototype.hasOwnProperty.call(persistedCareer, "runId"), "Lifecycle fields must not enter career.v2");
      assert(!Object.prototype.hasOwnProperty.call(persistedCareer, "rewardedReviveUsed"), "Monetization state must not enter career.v2");
    } finally {
      closeGame(context);
    }
  }

  async function scenarioI() {
    const context = await loadGame(() => {
      localStorage.setItem("squeezeRush.best.v1", "not-a-score");
      localStorage.setItem("squeezeRush.modeBest.v1", "{broken");
      localStorage.setItem("squeezeRush.career.v2", "[broken");
      localStorage.setItem("squeezeRush.settings.v2", "{broken");
    });
    try {
      const loaded = context.api.snapshot();
      equal(loaded.career.xp, 0, "Corrupt career falls back to zero XP");
      equal(loaded.career.totalRuns, 0, "Corrupt career falls back to zero runs");
      equal(loaded.settings.sound, true, "Corrupt settings fall back to sound on");
      equal(loaded.modeBests.daily, 0, "Corrupt mode bests fall back safely");
      context.api.startRun("sprint");
      context.api.setRunProgress({ score: 1 });
      context.api.endRun("smashed");
      const written = context.api.snapshot();
      const career = JSON.parse(written.storage.career);
      const bests = JSON.parse(written.storage.modeBests);
      equal(career.totalRuns, 1, "Fallback career remains writable");
      equal(bests.sprint, 1, "Fallback mode best remains writable");
    } finally {
      closeGame(context);
    }
  }

  async function scenarioJ() {
    const context = await loadGame();
    try {
      const events = observe(context.gameWindow);
      let shareCalls = 0;
      context.gameWindow.SqueezeRushIOS = { share() { shareCalls += 1; } };
      context.api.startRun("daily");
      context.api.setRunProgress({ score: 25, gatesPassed: 2 });
      context.api.endRun("smashed");
      const before = context.api.snapshot();
      await context.api.shareScore();
      const after = context.api.snapshot();
      equal(shareCalls, 1, "Share bridge invocation");
      same(after.lifecycle, before.lifecycle, "Share cannot mutate lifecycle");
      same(after.career, before.career, "Share cannot mutate career rewards");
      equal(after.runRewardXp, before.runRewardXp, "Share cannot mutate XP reward");
      equal(after.runRewardCores, before.runRewardCores, "Share cannot mutate Core reward");
      equal(events.counts.run_finalized, 0, "Share cannot finalize a pending result");
      equal(events.counts.run_started, 1, "Share cannot create a run");
    } finally {
      closeGame(context);
    }
  }

  const scenarios = [
    ["A", "Normal run with no revive", scenarioA],
    ["B", "Token revive remains pending and preserves runId", scenarioB],
    ["C", "Revived run awards snapshot deltas and finalizes once", scenarioC],
    ["D", "Decline revive with Retry", scenarioD],
    ["E", "Decline revive with Menu", scenarioE],
    ["F", "Sprint time-up is a final outcome", scenarioF],
    ["G", "Repeated result actions are idempotent", scenarioG],
    ["H", "Existing save compatibility", scenarioH],
    ["I", "Corrupt save fallback", scenarioI],
    ["J", "Share does not mutate lifecycle", scenarioJ]
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
    summary.textContent = `STAGE 1 TEST RESULT: ${passed}/${results.length} passed, ${failed} failed`;
    summary.className = failed ? "fail" : "pass";
    summary.dataset.results = JSON.stringify(results);
    document.title = failed ? `FAIL (${failed}) - Stage 1 Tests` : "PASS - Stage 1 Tests";
    runButton.disabled = false;
    return results;
  }

  runButton.addEventListener("click", runAll);
  window.stage1RunAllTests = runAll;
  runAll();
})();
