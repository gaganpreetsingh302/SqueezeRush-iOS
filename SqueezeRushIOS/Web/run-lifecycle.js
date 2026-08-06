(function attachRunLifecycle(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SqueezeRushRunLifecycle = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createRunLifecycleModule() {
  "use strict";

  const PHASES = Object.freeze({
    IDLE: "idle",
    COUNTDOWN: "countdown",
    ACTIVE: "active",
    RESULT_PENDING: "result_pending",
    FINALIZED: "finalized"
  });

  const EVENTS = Object.freeze({
    RUN_STARTED: "run_started",
    RESULT_SHOWN: "result_shown",
    RUN_REVIVED: "run_revived",
    RUN_FINALIZED: "run_finalized",
    REWARD_CHANGED: "reward_changed"
  });

  function createController(state, options) {
    if (!state || typeof state !== "object") {
      throw new TypeError("A mutable game state object is required.");
    }

    const settings = options || {};
    const listeners = new Map(Object.values(EVENTS).map(eventName => [eventName, new Set()]));
    const logger = typeof settings.logger === "function" ? settings.logger : null;
    const idFactory = typeof settings.idFactory === "function" ? settings.idFactory : defaultRunId;
    let generatedRunCount = 0;

    function log(kind, detail) {
      if (!logger) return;
      try {
        logger(kind, detail);
      } catch (error) {
        // Development logging must never affect gameplay.
      }
    }

    function snapshot() {
      return {
        runId: state.runId || "",
        lifecyclePhase: state.lifecyclePhase || PHASES.IDLE,
        resultSequence: Math.max(0, Math.floor(Number(state.resultSequence) || 0)),
        runFinalized: Boolean(state.runFinalized),
        finalizationReason: state.finalizationReason || "",
        accumulatedXpReward: Math.max(0, Math.floor(Number(state.accumulatedXpReward) || 0)),
        accumulatedCoreReward: Math.max(0, Math.floor(Number(state.accumulatedCoreReward) || 0)),
        tokenRevivesUsed: Math.max(0, Math.floor(Number(state.tokenRevivesUsed) || 0)),
        rewardedReviveUsed: Boolean(state.rewardedReviveUsed),
        rewardDoubleClaimed: Boolean(state.rewardDoubleClaimed),
        mode: state.mode || ""
      };
    }

    function transition(nextPhase, detail) {
      const previousPhase = state.lifecyclePhase || PHASES.IDLE;
      state.lifecyclePhase = nextPhase;
      log("transition", {
        runId: state.runId || "",
        resultSequence: state.resultSequence || 0,
        from: previousPhase,
        to: nextPhase,
        detail: detail || null
      });
    }

    function emit(eventName, detail) {
      const eventListeners = listeners.get(eventName);
      if (!eventListeners) return false;

      const payload = Object.freeze(Object.assign({}, snapshot(), detail || {}));
      log(eventName, payload);
      for (const listener of [...eventListeners]) {
        try {
          listener(payload);
        } catch (error) {
          log("listener_error", {
            eventName,
            message: error && error.message ? error.message : String(error)
          });
        }
      }
      return true;
    }

    function on(eventName, listener) {
      const eventListeners = listeners.get(eventName);
      if (!eventListeners || typeof listener !== "function") {
        return function noopUnsubscribe() {};
      }

      eventListeners.add(listener);
      return function unsubscribe() {
        eventListeners.delete(listener);
      };
    }

    function off(eventName, listener) {
      const eventListeners = listeners.get(eventName);
      return eventListeners ? eventListeners.delete(listener) : false;
    }

    function canStartRun() {
      return state.lifecyclePhase !== PHASES.ACTIVE && state.lifecyclePhase !== PHASES.RESULT_PENDING;
    }

    function enterCountdown(detail) {
      if (!canStartRun()) return false;
      transition(PHASES.COUNTDOWN, detail);
      return true;
    }

    function nextRunId() {
      generatedRunCount += 1;
      let candidate = String(idFactory(generatedRunCount) || "").trim();
      if (!candidate) {
        candidate = defaultRunId(generatedRunCount);
      }
      if (candidate === state.runId) {
        candidate = `${candidate}-${generatedRunCount}`;
      }
      return candidate;
    }

    function startRun(detail) {
      if (!canStartRun()) return null;

      state.runId = nextRunId();
      state.resultSequence = 0;
      state.runFinalized = false;
      state.finalizationReason = "";
      state.accumulatedXpReward = 0;
      state.accumulatedCoreReward = 0;
      state.tokenRevivesUsed = 0;
      state.rewardedReviveUsed = false;
      state.rewardDoubleClaimed = false;
      state.resultActionLocked = false;
      transition(PHASES.ACTIVE, detail);
      emit(EVENTS.RUN_STARTED, detail);
      return state.runId;
    }

    function beginResult(reason, canTokenRevive) {
      if (state.lifecyclePhase !== PHASES.ACTIVE || state.runFinalized) return null;

      state.resultSequence = Math.max(0, Math.floor(Number(state.resultSequence) || 0)) + 1;
      state.pendingReason = String(reason || "unknown");
      state.resultActionLocked = false;
      transition(PHASES.RESULT_PENDING, {
        reason: state.pendingReason,
        canTokenRevive: Boolean(canTokenRevive)
      });
      return state.resultSequence;
    }

    function resultShown(expectedResultSequence, detail) {
      if (state.lifecyclePhase !== PHASES.RESULT_PENDING || state.runFinalized) return false;
      if (Number(expectedResultSequence) !== state.resultSequence) return false;
      return emit(EVENTS.RESULT_SHOWN, detail);
    }

    function recordRewardDelta(xpDelta, coreDelta) {
      const xp = Math.max(0, Math.floor(Number(xpDelta) || 0));
      const cores = Math.max(0, Math.floor(Number(coreDelta) || 0));
      if (xp === 0 && cores === 0) return false;

      state.accumulatedXpReward += xp;
      state.accumulatedCoreReward += cores;
      emit(EVENTS.REWARD_CHANGED, { xpDelta: xp, coreDelta: cores });
      return true;
    }

    function reviveWithToken(expectedResultSequence) {
      if (state.lifecyclePhase !== PHASES.RESULT_PENDING || state.runFinalized || state.resultActionLocked) return false;
      if (Number(expectedResultSequence) !== state.resultSequence) return false;
      if (Math.floor(Number(state.revives) || 0) <= 0) return false;

      const resultReason = state.pendingReason || "";
      state.resultActionLocked = true;
      state.revives -= 1;
      state.tokenRevivesUsed += 1;
      state.pendingReason = "";
      transition(PHASES.ACTIVE, { source: "token", resultReason });
      emit(EVENTS.RUN_REVIVED, {
        source: "token",
        resultReason,
        revivesRemaining: state.revives
      });
      return true;
    }

    function reviveWithRewarded(expectedResultSequence) {
      if (state.lifecyclePhase !== PHASES.RESULT_PENDING || state.runFinalized || state.resultActionLocked) return false;
      if (Number(expectedResultSequence) !== state.resultSequence) return false;
      if (Math.floor(Number(state.revives) || 0) > 0 || state.rewardedReviveUsed) return false;

      const resultReason = state.pendingReason || "";
      state.resultActionLocked = true;
      state.rewardedReviveUsed = true;
      state.pendingReason = "";
      transition(PHASES.ACTIVE, { source: "rewarded", resultReason });
      emit(EVENTS.RUN_REVIVED, {
        source: "rewarded",
        resultReason,
        revivesRemaining: state.revives
      });
      return true;
    }

    function claimResultAction(expectedResultSequence, action) {
      const isResultPhase = state.lifecyclePhase === PHASES.RESULT_PENDING || state.lifecyclePhase === PHASES.FINALIZED;
      if (!isResultPhase || state.resultActionLocked) return false;
      if (Number(expectedResultSequence) !== state.resultSequence || state.resultSequence <= 0) return false;

      state.resultActionLocked = true;
      log("result_action", {
        action: String(action || "unknown"),
        runId: state.runId,
        resultSequence: state.resultSequence
      });
      return true;
    }

    function finalize(reason, expectedResultSequence) {
      if (state.runFinalized || state.lifecyclePhase !== PHASES.RESULT_PENDING) return false;
      if (Number(expectedResultSequence) !== state.resultSequence || state.resultSequence <= 0) return false;

      state.runFinalized = true;
      state.finalizationReason = String(reason || state.pendingReason || "result");
      transition(PHASES.FINALIZED, { reason: state.finalizationReason });
      emit(EVENTS.RUN_FINALIZED, { reason: state.finalizationReason });
      return true;
    }

    return Object.freeze({
      phases: PHASES,
      events: EVENTS,
      on,
      off,
      snapshot,
      canStartRun,
      enterCountdown,
      startRun,
      beginResult,
      resultShown,
      recordRewardDelta,
      reviveWithToken,
      reviveWithRewarded,
      claimResultAction,
      finalize
    });
  }

  function defaultRunId(serial) {
    const cryptoObject = typeof globalThis !== "undefined" ? globalThis.crypto : null;
    if (cryptoObject && typeof cryptoObject.randomUUID === "function") {
      return cryptoObject.randomUUID();
    }

    const timestamp = Date.now().toString(36);
    const random = Math.floor(Math.random() * 0x100000000).toString(36).padStart(7, "0");
    return `run-${timestamp}-${Number(serial || 0).toString(36)}-${random}`;
  }

  return Object.freeze({ PHASES, EVENTS, createController });
});
