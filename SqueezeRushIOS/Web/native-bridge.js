(function attachSqueezeRushNativeBridge(root) {
  "use strict";

  const PROTOCOL_VERSION = 1;
  const MESSAGE_HANDLER_NAME = "squeezeRushBridge";
  const DEFAULT_TIMEOUT_MS = 15000;
  const MIN_TIMEOUT_MS = 1;
  const MAX_TIMEOUT_MS = 120000;
  const MAX_REQUEST_ID_LENGTH = 128;
  const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

  const ACTIONS = Object.freeze({
    CAPABILITIES: "bridge.capabilities",
    HAPTIC_PERFORM: "haptic.perform",
    SHARE_PRESENT: "share.present",
    REWARDED_SHOW: "rewarded.show",
    INTERSTITIAL_SHOW: "interstitial.show",
    PURCHASE_BUY: "purchase.buy",
    PURCHASE_RESTORE: "purchase.restore",
    ENTITLEMENTS_REFRESH: "entitlements.refresh",
    REVIEW_REQUEST: "review.request",
    MORE_GAMES_OPEN: "moreGames.open",
    ANALYTICS_TRACK: "analytics.track",
    CONSENT_STATUS: "consent.status"
  });
  const ACTION_NAMES = Object.freeze(Object.values(ACTIONS));
  const ACTION_SET = new Set(ACTION_NAMES);

  const STATUSES = Object.freeze({
    SUCCESS: "success",
    UNAVAILABLE: "unavailable",
    CANCELLED: "cancelled",
    FAILED: "failed",
    INVALID_REQUEST: "invalid_request",
    STALE: "stale",
    TIMEOUT: "timeout"
  });
  const STATUS_SET = new Set(Object.values(STATUSES));
  const HAPTIC_STYLES = Object.freeze(["light", "medium", "heavy", "success", "error"]);
  const HAPTIC_STYLE_SET = new Set(HAPTIC_STYLES);
  const LIFECYCLE_SCOPED_ACTIONS = new Set([ACTIONS.REWARDED_SHOW, ACTIONS.INTERSTITIAL_SHOW]);

  const LOCAL_CAPABILITIES = deepFreeze({
    nativeBridge: false,
    protocolVersion: PROTOCOL_VERSION,
    platform: "browser",
    share: false,
    haptics: false,
    rewardedAds: false,
    interstitialAds: false,
    purchases: false,
    restorePurchases: false,
    entitlements: false,
    reviewRequest: false,
    moreGames: false,
    analytics: false,
    consent: false
  });

  const MOCK_NATIVE_CAPABILITIES = deepFreeze(Object.assign({}, LOCAL_CAPABILITIES, {
    nativeBridge: true,
    platform: "ios",
    share: true,
    haptics: true
  }));

  const pendingRequests = new Map();
  const issuedRequestIds = new Set();
  let requestSerial = 0;
  let capabilityCache = null;
  let mockTransport = null;

  function isPlainObject(value) {
    if (!value || typeof value !== "object" || Object.prototype.toString.call(value) !== "[object Object]") return false;
    const prototype = Object.getPrototypeOf(value);
    if (prototype === null) return true;
    const constructor = Object.prototype.hasOwnProperty.call(prototype, "constructor") && prototype.constructor;
    return typeof constructor === "function"
      && Function.prototype.toString.call(constructor) === Function.prototype.toString.call(Object);
  }

  function deepFreeze(value, seen) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    const visited = seen || new Set();
    if (visited.has(value)) return value;
    visited.add(value);
    for (const key of Object.keys(value)) deepFreeze(value[key], visited);
    return Object.freeze(value);
  }

  function copyPlainObject(value) {
    return Object.assign({}, value || {});
  }

  function hasOnlyKeys(value, allowedKeys) {
    return Object.keys(value).every(key => allowedKeys.includes(key));
  }

  function validateActionPayload(action, payload) {
    if (!isPlainObject(payload)) {
      throw new TypeError("payload must be an object.");
    }

    if (action === ACTIONS.HAPTIC_PERFORM) {
      if (!hasOnlyKeys(payload, ["style"]) || !HAPTIC_STYLE_SET.has(payload.style)) {
        throw new TypeError("haptic.perform requires one supported style.");
      }
      return { style: payload.style };
    }

    if (action === ACTIONS.SHARE_PRESENT) {
      if (!hasOnlyKeys(payload, ["text"]) || typeof payload.text !== "string") {
        throw new TypeError("share.present requires a text string.");
      }
      const text = payload.text;
      if (!text.trim() || text.length > 1000) {
        throw new TypeError("share.present text must contain 1 to 1,000 characters.");
      }
      return { text };
    }

    if (Object.keys(payload).length !== 0) {
      throw new TypeError(`${action} does not accept payload fields in protocol version 1 Stage 2.`);
    }
    return {};
  }

  function validateOptions(options) {
    if (options === undefined) return { timeoutMs: DEFAULT_TIMEOUT_MS, lifecycleScoped: false };
    if (!isPlainObject(options) || !hasOnlyKeys(options, ["timeoutMs", "lifecycleScoped"])) {
      throw new TypeError("options may contain only timeoutMs and lifecycleScoped.");
    }

    let timeoutMs = DEFAULT_TIMEOUT_MS;
    if (options.timeoutMs !== undefined) {
      const value = Number(options.timeoutMs);
      if (!Number.isFinite(value) || !Number.isInteger(value) || value < MIN_TIMEOUT_MS || value > MAX_TIMEOUT_MS) {
        throw new TypeError(`timeoutMs must be an integer from ${MIN_TIMEOUT_MS} to ${MAX_TIMEOUT_MS}.`);
      }
      timeoutMs = value;
    }

    if (options.lifecycleScoped !== undefined && typeof options.lifecycleScoped !== "boolean") {
      throw new TypeError("lifecycleScoped must be boolean when supplied.");
    }
    return { timeoutMs, lifecycleScoped: options.lifecycleScoped === true };
  }

  function captureLifecycleContext() {
    let snapshot = null;
    try {
      snapshot = root.SqueezeRushLifecycle && typeof root.SqueezeRushLifecycle.snapshot === "function"
        ? root.SqueezeRushLifecycle.snapshot()
        : null;
    } catch (error) {
      snapshot = null;
    }

    const runId = snapshot && typeof snapshot.runId === "string" && snapshot.runId ? snapshot.runId : null;
    const resultSequence = snapshot && Number.isInteger(snapshot.resultSequence) && snapshot.resultSequence >= 0
      ? snapshot.resultSequence
      : null;
    const lifecyclePhase = snapshot && typeof snapshot.lifecyclePhase === "string" && snapshot.lifecyclePhase
      ? snapshot.lifecyclePhase
      : null;
    return Object.freeze({ runId, resultSequence, lifecyclePhase });
  }

  function isValidContext(context) {
    if (!isPlainObject(context) || !hasOnlyKeys(context, ["runId", "resultSequence", "lifecyclePhase"])) return false;
    if (context.runId !== null && (typeof context.runId !== "string" || !context.runId || context.runId.length > 128)) return false;
    if (context.resultSequence !== null && (!Number.isInteger(context.resultSequence) || context.resultSequence < 0)) return false;
    if (context.lifecyclePhase !== null && (typeof context.lifecyclePhase !== "string" || !context.lifecyclePhase)) return false;
    return true;
  }

  function nextRequestId() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      requestSerial += 1;
      const cryptoObject = root.crypto;
      const randomPart = cryptoObject && typeof cryptoObject.randomUUID === "function"
        ? cryptoObject.randomUUID()
        : `${Date.now().toString(36)}-${Math.floor(Math.random() * 0x100000000).toString(36).padStart(7, "0")}`;
      const candidate = `sr-${requestSerial.toString(36)}-${randomPart}`;
      if (candidate.length <= MAX_REQUEST_ID_LENGTH && REQUEST_ID_PATTERN.test(candidate) && !issuedRequestIds.has(candidate)) {
        issuedRequestIds.add(candidate);
        return candidate;
      }
    }
    throw new Error("Unable to generate a unique native bridge requestId.");
  }

  function createError(code, message) {
    return Object.freeze({ code: String(code), message: String(message) });
  }

  function createResponse(requestId, action, status, context, data, error) {
    return deepFreeze({
      protocolVersion: PROTOCOL_VERSION,
      requestId,
      action,
      status,
      context: copyPlainObject(context),
      data: copyPlainObject(data),
      error: error ? { code: error.code, message: error.message } : null
    });
  }

  function nativeMessageHandler() {
    try {
      const handlers = root.webkit && root.webkit.messageHandlers;
      const handler = handlers && handlers[MESSAGE_HANDLER_NAME];
      return handler && typeof handler.postMessage === "function" ? handler : null;
    } catch (error) {
      return null;
    }
  }

  function isNativeAvailable() {
    return Boolean(mockTransport || nativeMessageHandler());
  }

  function settleRequest(entry, response) {
    if (!entry || !pendingRequests.has(entry.requestId)) return false;
    pendingRequests.delete(entry.requestId);
    root.clearTimeout(entry.timeoutId);
    entry.resolve(response);
    return true;
  }

  function contextsAreStale(entry, responseContext) {
    if (!entry.lifecycleScoped) return false;
    const requestContext = entry.context;
    const currentContext = captureLifecycleContext();

    if (requestContext.runId !== responseContext.runId || requestContext.resultSequence !== responseContext.resultSequence) {
      return true;
    }
    if (requestContext.runId !== null && currentContext.runId !== requestContext.runId) return true;
    if (requestContext.resultSequence !== null && currentContext.resultSequence !== requestContext.resultSequence) return true;
    return false;
  }

  function validateErrorValue(status, error) {
    if (status === STATUSES.SUCCESS) return error === null;
    return isPlainObject(error)
      && hasOnlyKeys(error, ["code", "message"])
      && typeof error.code === "string"
      && Boolean(error.code)
      && typeof error.message === "string"
      && Boolean(error.message);
  }

  function receiveNativeResponse(response) {
    try {
      if (!isPlainObject(response)) return false;
      if (response.protocolVersion !== PROTOCOL_VERSION) return false;
      if (typeof response.requestId !== "string" || !response.requestId || response.requestId.length > MAX_REQUEST_ID_LENGTH) return false;
      if (!REQUEST_ID_PATTERN.test(response.requestId)) return false;

      const entry = pendingRequests.get(response.requestId);
      if (!entry) return false;
      if (typeof response.action !== "string" || !ACTION_SET.has(response.action) || response.action !== entry.action) return false;
      if (typeof response.status !== "string" || !STATUS_SET.has(response.status)) return false;
      if (!isValidContext(response.context)) return false;
      if (!isPlainObject(response.data)) return false;
      if (!validateErrorValue(response.status, response.error)) return false;

      if (contextsAreStale(entry, response.context)) {
        const staleResponse = createResponse(
          entry.requestId,
          entry.action,
          STATUSES.STALE,
          entry.context,
          {},
          createError("stale_lifecycle_context", "The run or result changed before the native response arrived.")
        );
        return settleRequest(entry, staleResponse);
      }

      return settleRequest(entry, createResponse(
        response.requestId,
        response.action,
        response.status,
        response.context,
        response.data,
        response.error
      ));
    } catch (error) {
      return false;
    }
  }

  function request(action, payload, options) {
    let prepared;
    try {
      if (typeof action !== "string" || !ACTION_SET.has(action)) {
        throw new TypeError("action must be one of the protocol version 1 allowlisted actions.");
      }
      const cleanPayload = validateActionPayload(action, payload === undefined ? {} : payload);
      const cleanOptions = validateOptions(options);
      const context = captureLifecycleContext();
      const requestId = nextRequestId();
      const lifecycleScoped = cleanOptions.lifecycleScoped || LIFECYCLE_SCOPED_ACTIONS.has(action);
      prepared = {
        requestId,
        action,
        context,
        payload: cleanPayload,
        timeoutMs: cleanOptions.timeoutMs,
        lifecycleScoped
      };
    } catch (error) {
      return Promise.reject(error);
    }

    const envelope = deepFreeze({
      protocolVersion: PROTOCOL_VERSION,
      requestId: prepared.requestId,
      action: prepared.action,
      context: copyPlainObject(prepared.context),
      payload: copyPlainObject(prepared.payload)
    });

    if (!isNativeAvailable()) {
      if (prepared.action === ACTIONS.CAPABILITIES) {
        return Promise.resolve(createResponse(
          prepared.requestId,
          prepared.action,
          STATUSES.SUCCESS,
          prepared.context,
          LOCAL_CAPABILITIES,
          null
        ));
      }
      return Promise.resolve(createResponse(
        prepared.requestId,
        prepared.action,
        STATUSES.UNAVAILABLE,
        prepared.context,
        {},
        createError("native_handler_unavailable", "The native bridge is not available in this environment.")
      ));
    }

    return new Promise(resolve => {
      const entry = {
        requestId: prepared.requestId,
        action: prepared.action,
        context: prepared.context,
        lifecycleScoped: prepared.lifecycleScoped,
        resolve,
        timeoutId: 0
      };
      entry.timeoutId = root.setTimeout(() => {
        settleRequest(entry, createResponse(
          entry.requestId,
          entry.action,
          STATUSES.TIMEOUT,
          entry.context,
          {},
          createError("request_timeout", "The native bridge request timed out.")
        ));
      }, prepared.timeoutMs);
      pendingRequests.set(entry.requestId, entry);

      try {
        if (mockTransport) {
          mockTransport.postMessage(envelope);
        } else {
          const handler = nativeMessageHandler();
          if (!handler) throw new Error("Native message handler disappeared before dispatch.");
          handler.postMessage(envelope);
        }
      } catch (error) {
        settleRequest(entry, createResponse(
          entry.requestId,
          entry.action,
          STATUSES.UNAVAILABLE,
          entry.context,
          {},
          createError("transport_unavailable", "The native bridge request could not be dispatched.")
        ));
      }
    });
  }

  function getCapabilities(options) {
    let refresh = false;
    let timeoutMs;
    try {
      if (options !== undefined) {
        if (!isPlainObject(options) || !hasOnlyKeys(options, ["refresh", "timeoutMs"])) {
          throw new TypeError("getCapabilities options may contain only refresh and timeoutMs.");
        }
        if (options.refresh !== undefined && typeof options.refresh !== "boolean") {
          throw new TypeError("refresh must be boolean when supplied.");
        }
        refresh = options.refresh === true;
        timeoutMs = options.timeoutMs;
      }
    } catch (error) {
      return Promise.reject(error);
    }

    if (!refresh && capabilityCache) return Promise.resolve(capabilityCache);
    const requestOptions = timeoutMs === undefined ? undefined : { timeoutMs };
    return request(ACTIONS.CAPABILITIES, {}, requestOptions).then(response => {
      if (response.status === STATUSES.SUCCESS) capabilityCache = response;
      return response;
    });
  }

  function cancelPending(reason) {
    const message = typeof reason === "string" && reason.trim()
      ? reason.trim().slice(0, 200)
      : "The page is being unloaded.";
    const entries = [...pendingRequests.values()];
    for (const entry of entries) {
      settleRequest(entry, createResponse(
        entry.requestId,
        entry.action,
        STATUSES.CANCELLED,
        entry.context,
        {},
        createError("request_cancelled", message)
      ));
    }
    return entries.length;
  }

  function canActivateMockFor(value) {
    try {
      const url = value instanceof URL ? value : new URL(String(value));
      const localHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      return localHost && url.searchParams.get("nativeBridgeMock") === "1";
    } catch (error) {
      return false;
    }
  }

  function createMockTransport() {
    let queuedResponses = [];
    let requestLog = [];

    function copyDescriptor(descriptor) {
      if (!isPlainObject(descriptor)) throw new TypeError("Mock descriptor must be an object.");
      const copy = Object.assign({}, descriptor);
      if (copy.data !== undefined) {
        if (!isPlainObject(copy.data)) throw new TypeError("Mock data must be an object.");
        copy.data = copyPlainObject(copy.data);
      }
      if (copy.error !== undefined && copy.error !== null) {
        if (!isPlainObject(copy.error)) throw new TypeError("Mock error must be an object or null.");
        copy.error = copyPlainObject(copy.error);
      }
      return copy;
    }

    function enqueue(action, descriptor) {
      if (!ACTION_SET.has(action)) throw new TypeError("Mock action must be allowlisted.");
      queuedResponses.push({ action, descriptor: copyDescriptor(descriptor) });
    }

    function reset() {
      queuedResponses = [];
      requestLog = [];
      capabilityCache = null;
    }

    function takeDescriptor(action) {
      const index = queuedResponses.findIndex(item => item.action === action);
      if (index >= 0) return queuedResponses.splice(index, 1)[0].descriptor;
      if (action === ACTIONS.CAPABILITIES) return { outcome: "success", data: MOCK_NATIVE_CAPABILITIES };
      if (action === ACTIONS.HAPTIC_PERFORM || action === ACTIONS.SHARE_PRESENT) return { outcome: "success", data: {} };
      return {
        outcome: "unavailable",
        error: { code: "not_implemented_stage2", message: "This action is reserved but unavailable during Stage 2." }
      };
    }

    function responseFor(envelope, descriptor) {
      const outcome = descriptor.outcome || "success";
      let status = STATUSES.SUCCESS;
      let data = descriptor.data || {};
      let error = null;

      if (outcome === "unavailable") {
        status = STATUSES.UNAVAILABLE;
        error = descriptor.error || { code: "mock_unavailable", message: "The mock action is unavailable." };
      } else if (outcome === "cancelled") {
        status = STATUSES.CANCELLED;
        error = descriptor.error || { code: "mock_cancelled", message: "The mock action was cancelled." };
      } else if (outcome === "failed") {
        status = STATUSES.FAILED;
        error = descriptor.error || { code: "mock_failed", message: "The mock action failed." };
      }

      const response = {
        protocolVersion: PROTOCOL_VERSION,
        requestId: envelope.requestId,
        action: envelope.action,
        status,
        context: copyPlainObject(envelope.context),
        data: copyPlainObject(data),
        error: error ? copyPlainObject(error) : null
      };

      if (outcome === "mismatched_action") {
        response.action = envelope.action === ACTIONS.HAPTIC_PERFORM ? ACTIONS.SHARE_PRESENT : ACTIONS.HAPTIC_PERFORM;
      } else if (outcome === "stale") {
        if (descriptor.field === "resultSequence") {
          response.context.resultSequence = (response.context.resultSequence === null ? 0 : response.context.resultSequence) + 1;
        } else {
          response.context.runId = response.context.runId ? `${response.context.runId}-stale` : "stale-run";
        }
      } else if (outcome === "malformed") {
        switch (descriptor.kind) {
        case "protocol_version": response.protocolVersion = PROTOCOL_VERSION + 1; break;
        case "missing_request_id": delete response.requestId; break;
        case "context": response.context = { runId: null, resultSequence: -1, lifecyclePhase: null }; break;
        case "status": response.status = "not-a-status"; break;
        case "error": response.error = "not-an-error-object"; break;
        default: response.data = "not-a-data-object"; break;
        }
      }
      return response;
    }

    function postMessage(envelope) {
      requestLog.push(deepFreeze({
        protocolVersion: envelope.protocolVersion,
        requestId: envelope.requestId,
        action: envelope.action,
        context: copyPlainObject(envelope.context),
        payload: copyPlainObject(envelope.payload)
      }));
      const descriptor = takeDescriptor(envelope.action);
      const outcome = descriptor.outcome || "success";
      if (outcome === "no_response" || outcome === "timeout") return;
      const response = responseFor(envelope, descriptor);
      const delayMs = Number.isFinite(Number(descriptor.delayMs))
        ? Math.max(0, Math.floor(Number(descriptor.delayMs)))
        : (outcome === "delayed" ? 25 : 0);
      root.setTimeout(() => {
        receiveNativeResponse(response);
        if (outcome === "duplicate") receiveNativeResponse(response);
      }, delayMs);
    }

    const configuration = Object.freeze({
      enqueue,
      reset,
      requests() { return Object.freeze(requestLog.slice()); },
      pendingCount() { return pendingRequests.size; },
      deliver(response) { return receiveNativeResponse(response); },
      canActivateFor: canActivateMockFor,
      capabilities: MOCK_NATIVE_CAPABILITIES
    });
    return { postMessage, configuration };
  }

  const mockActive = canActivateMockFor(root.location && root.location.href ? root.location.href : "");
  if (mockActive) {
    const mock = createMockTransport();
    mockTransport = mock;
    Object.defineProperty(root, "__SQUEEZE_RUSH_NATIVE_BRIDGE_MOCK__", {
      configurable: false,
      enumerable: false,
      writable: false,
      value: mock.configuration
    });
  }

  const api = Object.freeze({
    protocolVersion: PROTOCOL_VERSION,
    actions: ACTIONS,
    statuses: STATUSES,
    hapticStyles: HAPTIC_STYLES,
    isNativeAvailable,
    request,
    getCapabilities,
    cancelPending,
    __receive: receiveNativeResponse
  });

  Object.defineProperty(root, "SqueezeRushNative", {
    configurable: false,
    enumerable: true,
    writable: false,
    value: api
  });

  root.addEventListener("pagehide", () => cancelPending("The page is being hidden."));
  root.addEventListener("beforeunload", () => cancelPending("The page is unloading."));
})(window);
