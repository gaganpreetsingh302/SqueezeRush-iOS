(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });

  const scoreValue = document.getElementById("scoreValue");
  const bestValue = document.getElementById("bestValue");
  const levelValue = document.getElementById("levelValue");
  const powerIcons = document.getElementById("powerIcons");
  const modeNameValue = document.getElementById("modeNameValue");
  const goalValue = document.getElementById("goalValue");
  const menu = document.getElementById("menu");
  const instructions = document.getElementById("instructions");
  const gameOver = document.getElementById("gameOver");
  const brandSplash = document.getElementById("brandSplash");
  const countdownOverlay = document.getElementById("countdownOverlay");
  const countdownValue = document.getElementById("countdownValue");
  const instructionEyebrow = document.getElementById("instructionEyebrow");
  const instructionTitle = document.getElementById("instructionTitle");
  const instructionArt = document.getElementById("instructionArt");
  const instructionModeLine = document.getElementById("instructionModeLine");
  const instructionGoalLine = document.getElementById("instructionGoalLine");
  const instructionPointOne = document.getElementById("instructionPointOne");
  const instructionPointTwo = document.getElementById("instructionPointTwo");
  const instructionPointThree = document.getElementById("instructionPointThree");
  const finalScore = document.getElementById("finalScore");
  const resultLine = document.getElementById("resultLine");
  const dailyLabel = document.getElementById("dailyLabel");
  const toast = document.getElementById("toast");
  const comboValue = document.getElementById("comboValue");
  const overdriveLabel = document.getElementById("overdriveLabel");
  const overdriveFill = document.getElementById("overdriveFill");
  const rankBadge = document.getElementById("rankBadge");
  const rankName = document.getElementById("rankName");
  const xpLabel = document.getElementById("xpLabel");
  const xpFill = document.getElementById("xpFill");
  const coreLabel = document.getElementById("coreLabel");
  const contractList = document.getElementById("contractList");
  const resultGates = document.getElementById("resultGates");
  const resultPerfect = document.getElementById("resultPerfect");
  const resultCombo = document.getElementById("resultCombo");
  const rewardLine = document.getElementById("rewardLine");

  const modeButtons = [...document.querySelectorAll("[data-mode]")];
  const modeBestBadges = [...document.querySelectorAll("[data-best-mode]")];
  const closeGameBtn = document.getElementById("closeGameBtn");
  const instructionOkBtn = document.getElementById("instructionOkBtn");
  const instructionBackBtn = document.getElementById("instructionBackBtn");
  const reviveBtn = document.getElementById("reviveBtn");
  const retryBtn = document.getElementById("retryBtn");
  const shareBtn = document.getElementById("shareBtn");
  const menuBtn = document.getElementById("menuBtn");
  const soundToggleBtn = document.getElementById("soundToggleBtn");

  const palette = ["#ff5a5f", "#2ee6a6", "#ffd166", "#4cc9f0", "#f77f00"];
  const levels = [
    { name: "Warmup", score: 0, speed: 0.42, gapMin: 0.52, gapMax: 0.66, spawn: 1.04, driftChance: 0.03, drift: 18, accent: "#4cc9f0" },
    { name: "Drift", score: 18, speed: 0.5, gapMin: 0.44, gapMax: 0.58, spawn: 0.94, driftChance: 0.24, drift: 28, accent: "#2ee6a6" },
    { name: "Pinch", score: 42, speed: 0.58, gapMin: 0.36, gapMax: 0.5, spawn: 0.84, driftChance: 0.34, drift: 38, accent: "#ffd166" },
    { name: "Surge", score: 76, speed: 0.67, gapMin: 0.3, gapMax: 0.44, spawn: 0.75, driftChance: 0.48, drift: 48, accent: "#ff5a5f" },
    { name: "Chaos", score: 120, speed: 0.76, gapMin: 0.25, gapMax: 0.38, spawn: 0.66, driftChance: 0.62, drift: 58, accent: "#f77f00" }
  ];
  const pickupTypes = [
    { type: "shield", label: "Shield", short: "SHLD", color: "#4cc9f0" },
    { type: "slow", label: "Slow-Mo", short: "SLOW", color: "#ffd166" },
    { type: "coolant", label: "Coolant", short: "COOL", color: "#2ee6a6" },
    { type: "revive", label: "Revive", short: "REV", color: "#ff5a5f" }
  ];
  const storageKey = "squeezeRush.best.v1";
  const modeBestStorageKey = "squeezeRush.modeBest.v1";
  const careerStorageKey = "squeezeRush.career.v2";
  const settingsStorageKey = "squeezeRush.settings.v2";
  const rankNames = ["Rookie", "Gap Scout", "Flow Rider", "Pulse Ace", "Rush Elite", "Squeeze Legend"];
  const contractTemplates = [
    { id: "gates", label: "Gate Runner", detail: "Clear 8 gates", target: 8, reward: 3, color: "#4cc9f0" },
    { id: "perfect", label: "Precision Artist", detail: "Land 3 perfect squeezes", target: 3, reward: 4, color: "#ffd166" },
    { id: "pickups", label: "Power Hunter", detail: "Collect 2 powers", target: 2, reward: 3, color: "#2ee6a6" }
  ];
  const runDate = new Date();
  const dailyCode = `${runDate.getFullYear()}-${String(runDate.getMonth() + 1).padStart(2, "0")}-${String(runDate.getDate()).padStart(2, "0")}`;
  const dailySeedValue = hashString(`squeeze-rush-${dailyCode}`);
  const dailyTitle = runDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const modeConfigs = {
    daily: {
      label: "Daily Run",
      short: "Daily",
      goal: "Shared seed",
      seed: () => dailySeedValue,
      revives: 1,
      startLevel: 0,
      timeLimit: 0,
      scoreMultiplier: 1,
      speedScale: 1,
      gapScale: 1,
      spawnScale: 1,
      pressure: true,
      pickupEvery: 4,
      allowRevivePickups: true
    },
    arcade: {
      label: "Arcade",
      short: "Arcade",
      goal: "Endless",
      seed: randomSeed,
      revives: 1,
      startLevel: 0,
      timeLimit: 0,
      scoreMultiplier: 1,
      speedScale: 1,
      gapScale: 1,
      spawnScale: 1,
      pressure: true,
      pickupEvery: 4,
      allowRevivePickups: true
    },
    sprint: {
      label: "60s Sprint",
      short: "Sprint",
      goal: "60 seconds",
      seed: randomSeed,
      revives: 0,
      startLevel: 1,
      timeLimit: 60,
      scoreMultiplier: 2,
      speedScale: 1.08,
      gapScale: 0.96,
      spawnScale: 0.82,
      pressure: true,
      pickupEvery: 3,
      allowRevivePickups: false
    },
    zen: {
      label: "Zen",
      short: "Zen",
      goal: "Practice",
      seed: randomSeed,
      revives: 3,
      startLevel: 0,
      timeLimit: 0,
      scoreMultiplier: 0.75,
      speedScale: 0.82,
      gapScale: 1.18,
      spawnScale: 1.18,
      pressure: false,
      pickupEvery: 3,
      allowRevivePickups: true
    },
    chaos: {
      label: "Chaos",
      short: "Chaos",
      goal: "No revives",
      seed: randomSeed,
      revives: 0,
      startLevel: 3,
      timeLimit: 0,
      scoreMultiplier: 3,
      speedScale: 1.2,
      gapScale: 0.84,
      spawnScale: 0.72,
      pressure: true,
      pickupEvery: 5,
      allowRevivePickups: false
    }
  };
  const modeInstructions = {
    daily: {
      title: "Daily Run",
      eyebrow: "Today's challenge",
      art: "daily",
      badge: "DAILY",
      modeLine: "Same squeeze course for everyone today.",
      goalLine: "Hold to get narrow, release to cool down, and chase the daily best.",
      points: [
        "The seed is fixed for today, so every player gets the same challenge.",
        "Collect S Shield, T Slow-Mo, C Coolant, and R Revive powers.",
        "Survive levels and beat the Daily best shown on the menu."
      ]
    },
    arcade: {
      title: "Arcade",
      eyebrow: "Endless run",
      art: "arcade",
      badge: "RUN",
      modeLine: "Endless score chase with regular powers.",
      goalLine: "Keep squeezing through tighter gates as levels ramp up.",
      points: [
        "Hold the screen to squeeze through narrow gaps.",
        "Release between gates so the pressure meter cools down.",
        "Grab powers and use revives to stretch the run."
      ]
    },
    sprint: {
      title: "60s Sprint",
      eyebrow: "Fast score burst",
      art: "sprint",
      badge: "60S",
      modeLine: "Score as much as possible before the timer ends.",
      goalLine: "This mode is faster, starts harder, and has no revive pickups.",
      points: [
        "You have 60 seconds, so take clean risks for quick points.",
        "Scores are doubled, but gates move faster.",
        "No revive pickups: one bad collision can end the sprint."
      ]
    },
    zen: {
      title: "Zen",
      eyebrow: "Practice mode",
      art: "zen",
      badge: "SAFE",
      modeLine: "Practice the squeeze rhythm with extra safety.",
      goalLine: "Zen is slower, wider, and starts with more revives.",
      points: [
        "Use this mode to learn the timing without heavy pressure.",
        "You start with a shield and three revives.",
        "Scores are softer, but your Zen best is still saved."
      ]
    },
    chaos: {
      title: "Chaos",
      eyebrow: "Hard mode",
      art: "chaos",
      badge: "HARD",
      modeLine: "Fast gates, tight gaps, no revives.",
      goalLine: "This is the clip-worthy mode: high multiplier, high risk.",
      points: [
        "You start deep into the level curve with faster gates.",
        "No revives and no revive pickups: stay precise.",
        "Scores are tripled when you survive the chaos."
      ]
    }
  };

  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = 0;
  let lastTime = 0;
  let toastTimer = 0;
  let splashTimers = [];
  let countdownTimers = [];
  const modeBests = readModeBests();
  const career = readCareer();
  const settings = readSettings();
  let audioContext = null;

  const input = {
    active: false,
    keyboard: false,
    x: 0,
    pointerId: null
  };

  const state = {
    running: false,
    over: false,
    mode: "daily",
    seed: dailySeedValue,
    rng: mulberry32(dailySeedValue),
    score: 0,
    combo: 1,
    bestCombo: 1,
    overdrive: 0,
    overdriveTime: 0,
    perfects: 0,
    nearMisses: 0,
    pickupsCollected: 0,
    bossGates: 0,
    runRewardXp: 0,
    runRewardCores: 0,
    runAwarded: false,
    awardSnapshot: { xp: 0, scoreCores: 0, gates: 0, nearMisses: 0, pickups: 0 },
    contractProgress: { gates: 0, perfect: 0, pickups: 0 },
    best: modeBests.daily || 0,
    elapsed: 0,
    timeLeft: 0,
    spawnTimer: 0,
    shake: 0,
    flash: 0,
    levelIndex: 0,
    gatesPassed: 0,
    spawnedGates: 0,
    revives: 1,
    shieldCharges: 0,
    effects: {
      slow: 0,
      coolant: 0
    },
    gates: [],
    pickups: [],
    particles: [],
    trail: [],
    lastGateCenter: 0,
    lastShareText: "",
    pendingReason: "",
    runId: "",
    lifecyclePhase: "idle",
    resultSequence: 0,
    runFinalized: false,
    finalizationReason: "",
    accumulatedXpReward: 0,
    accumulatedCoreReward: 0,
    tokenRevivesUsed: 0,
    rewardedReviveUsed: false,
    rewardDoubleClaimed: false,
    resultActionLocked: false,
    splashing: true,
    instructing: false,
    countingDown: false
  };

  const player = {
    x: 0,
    y: 0,
    width: 78,
    height: 50,
    squeeze: 0,
    targetSqueeze: 0,
    pressure: 0,
    invulnerable: 0
  };

  const lifecycleDebugEnabled = new URLSearchParams(window.location.search).has("lifecycleDebug")
    || window.__SQUEEZE_RUSH_LIFECYCLE_DEBUG__ === true;
  const runLifecycle = window.SqueezeRushRunLifecycle.createController(state, {
    logger(kind, detail) {
      if (lifecycleDebugEnabled && window.console?.debug) {
        window.console.debug(`[Squeeze Rush lifecycle] ${kind}`, detail);
      }
    }
  });

  // Stage 1 extension surface. Future integrations can subscribe safely without
  // receiving mutation access to the lifecycle controller.
  window.SqueezeRushLifecycle = Object.freeze({
    phases: runLifecycle.phases,
    events: runLifecycle.events,
    on: runLifecycle.on,
    off: runLifecycle.off,
    snapshot: runLifecycle.snapshot
  });

  setup();

  function setup() {
    dailyLabel.textContent = `${dailyTitle} Daily Run`;
    fitCanvas();
    bindInput();
    updateModeBestBadges();
    renderCareer();
    renderContracts();
    updateSoundButton();
    updateHud();
    draw(0);
    loop(0);

    const query = new URLSearchParams(window.location.search);
    const requestedMode = query.get("autoplay");
    const afterStartup = () => {
      if (query.has("autoplay")) {
        showInstructions(requestedMode === "random" ? "arcade" : requestedMode || "daily");
        return;
      }

      showMenu();
    };
    showStartupSplash(afterStartup);
  }

  function bindInput() {
    window.addEventListener("resize", fitCanvas, { passive: true });
    window.visualViewport?.addEventListener("resize", fitCanvas, { passive: true });

    for (const button of modeButtons) {
      button.addEventListener("click", () => showInstructions(button.dataset.mode || "daily"));
    }
    reviveBtn.addEventListener("click", reviveRun);
    retryBtn.addEventListener("click", retryRun);
    menuBtn.addEventListener("click", leaveResultForMenu);
    shareBtn.addEventListener("click", shareScore);
    closeGameBtn.addEventListener("click", closeGame);
    instructionOkBtn.addEventListener("click", () => beginCountdown(state.mode));
    instructionBackBtn.addEventListener("click", showMenu);
    soundToggleBtn.addEventListener("click", toggleSound);

    document.addEventListener("pointerdown", unlockAudio, { passive: true });

    const blockBrowserGesture = event => {
      event.preventDefault();
    };

    const blockAppTouchMove = event => {
      if (event.target?.closest?.("#app")) {
        event.preventDefault();
      }
    };

    document.addEventListener("selectstart", blockBrowserGesture);
    document.addEventListener("dragstart", blockBrowserGesture);
    document.addEventListener("contextmenu", blockBrowserGesture);
    document.addEventListener("touchmove", blockAppTouchMove, { passive: false });
    document.addEventListener("gesturestart", blockBrowserGesture);

    canvas.addEventListener("pointerdown", event => {
      event.preventDefault();
      unlockAudio();
      input.active = true;
      input.pointerId = event.pointerId;
      input.x = event.clientX;
      canvas.setPointerCapture?.(event.pointerId);
      if (!state.running && !state.splashing && !state.instructing && !state.countingDown && !menu.classList.contains("visible") && !gameOver.classList.contains("visible")) {
        showInstructions(state.mode);
      }
    }, { passive: false });

    canvas.addEventListener("pointermove", event => {
      event.preventDefault();
      if (input.pointerId === null || input.pointerId === event.pointerId) {
        input.x = event.clientX;
      }
    }, { passive: false });

    const stopPointer = event => {
      event.preventDefault();
      if (input.pointerId === event.pointerId || input.pointerId === null) {
        input.active = false;
        input.pointerId = null;
        input.x = event.clientX;
      }
    };

    canvas.addEventListener("pointerup", stopPointer, { passive: false });
    canvas.addEventListener("pointercancel", stopPointer, { passive: false });
    canvas.addEventListener("lostpointercapture", () => {
      input.active = false;
      input.pointerId = null;
    });

    window.addEventListener("keydown", event => {
      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        input.keyboard = true;
      }

      if (event.code === "Enter" && state.instructing) {
        beginCountdown(state.mode);
        return;
      }

      if (event.code === "Enter" && gameOver.classList.contains("visible")) {
        retryRun();
        return;
      }

      if (event.code === "Enter" && !state.running && !state.splashing && !state.countingDown) {
        showInstructions(state.mode);
      }
    });

    window.addEventListener("keyup", event => {
      if (event.code === "Space" || event.code === "ArrowUp") {
        input.keyboard = false;
      }
    });
  }

  function fitCanvas() {
    width = Math.max(320, Math.floor(window.innerWidth));
    height = Math.max(520, Math.floor(window.visualViewport?.height || window.innerHeight));
    dpr = Math.min(2.5, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    player.x = player.x || width * 0.5;
    player.y = height * 0.72;
    state.lastGateCenter = state.lastGateCenter || width * 0.5;
  }

  function showStartupSplash(done) {
    clearSplashTimers();
    state.splashing = true;
    menu.classList.remove("visible");
    gameOver.classList.remove("visible");
    instructions.classList.remove("visible");
    countdownOverlay.classList.remove("visible");
    brandSplash.setAttribute("aria-hidden", "false");
    brandSplash.classList.add("is-visible");

    splashTimers.push(window.setTimeout(() => brandSplash.classList.remove("is-visible"), 1420));
    splashTimers.push(window.setTimeout(() => {
      brandSplash.setAttribute("aria-hidden", "true");
      state.splashing = false;
      clearSplashTimers();
      done();
    }, 1840));
  }

  function showInstructions(mode) {
    const nextMode = modeConfigs[mode] ? mode : "daily";
    if (state.splashing || state.countingDown) {
      return;
    }
    if (state.lifecyclePhase === runLifecycle.phases.RESULT_PENDING && !completeResultAction("retry")) {
      return;
    }

    clearSplashTimers();
    clearCountdownTimers();
    state.instructing = true;
    state.running = false;
    state.over = false;
    state.countingDown = false;
    state.mode = nextMode;
    state.best = bestForMode(nextMode);
    input.active = false;
    input.keyboard = false;
    input.pointerId = null;
    applyInstruction(nextMode);
    menu.classList.remove("visible");
    gameOver.classList.remove("visible");
    countdownOverlay.classList.remove("visible");
    countdownOverlay.setAttribute("aria-hidden", "true");
    brandSplash.classList.remove("is-visible");
    brandSplash.setAttribute("aria-hidden", "true");
    instructions.classList.add("visible");
    reviveBtn.classList.add("hidden");
    retryBtn.classList.add("primary");
    updateHud();
  }

  function clearSplashTimers() {
    for (const timer of splashTimers) {
      clearTimeout(timer);
    }
    splashTimers = [];
  }

  function applyInstruction(mode) {
    const copy = modeInstructions[mode] || modeInstructions.daily;
    instructionEyebrow.textContent = copy.eyebrow;
    instructionTitle.textContent = copy.title;
    instructionModeLine.textContent = copy.modeLine;
    instructionGoalLine.textContent = copy.goalLine;
    instructionPointOne.textContent = copy.points[0];
    instructionPointTwo.textContent = copy.points[1];
    instructionPointThree.textContent = copy.points[2];
    instructionArt.className = `instruction-art ${copy.art}`;
    instructionArt.querySelector(".guide-arrow").textContent = copy.badge;
  }

  function beginCountdown(mode) {
    const nextMode = modeConfigs[mode] ? mode : "daily";
    if (!runLifecycle.enterCountdown({ mode: nextMode })) {
      return;
    }
    clearCountdownTimers();
    state.instructing = false;
    state.countingDown = true;
    state.running = false;
    state.mode = nextMode;
    input.active = false;
    input.keyboard = false;
    input.pointerId = null;
    instructions.classList.remove("visible");
    menu.classList.remove("visible");
    gameOver.classList.remove("visible");
    countdownOverlay.classList.add("visible");
    countdownOverlay.setAttribute("aria-hidden", "false");
    countdownValue.textContent = "3";

    countdownTimers.push(window.setTimeout(() => {
      countdownValue.textContent = "2";
    }, 1000));
    countdownTimers.push(window.setTimeout(() => {
      countdownValue.textContent = "1";
    }, 2000));
    countdownTimers.push(window.setTimeout(() => {
      clearCountdownTimers();
      countdownOverlay.classList.remove("visible");
      countdownOverlay.setAttribute("aria-hidden", "true");
      state.countingDown = false;
      startRun(nextMode);
    }, 3000));
  }

  function clearCountdownTimers() {
    for (const timer of countdownTimers) {
      clearTimeout(timer);
    }
    countdownTimers = [];
  }

  function startRun(mode) {
    if (!runLifecycle.canStartRun()) {
      return;
    }

    state.mode = modeConfigs[mode] ? mode : "daily";
    const config = currentMode();
    state.seed = config.seed();
    state.rng = mulberry32(state.seed);
    state.running = true;
    state.over = false;
    state.instructing = false;
    state.countingDown = false;
    state.score = 0;
    state.combo = 1;
    state.bestCombo = 1;
    state.overdrive = 0;
    state.overdriveTime = 0;
    state.perfects = 0;
    state.nearMisses = 0;
    state.pickupsCollected = 0;
    state.bossGates = 0;
    state.runRewardXp = 0;
    state.runRewardCores = 0;
    state.runAwarded = false;
    state.awardSnapshot = { xp: 0, scoreCores: 0, gates: 0, nearMisses: 0, pickups: 0 };
    state.contractProgress = { gates: 0, perfect: 0, pickups: 0 };
    state.best = bestForMode(state.mode);
    state.elapsed = 0;
    state.timeLeft = config.timeLimit;
    state.spawnTimer = 0.34;
    state.shake = 0;
    state.flash = 0;
    state.levelIndex = config.startLevel;
    state.gatesPassed = 0;
    state.spawnedGates = 0;
    state.revives = config.revives;
    state.shieldCharges = state.mode === "zen" ? 1 : 0;
    state.effects.slow = 0;
    state.effects.coolant = 0;
    state.gates.length = 0;
    state.pickups.length = 0;
    state.particles.length = 0;
    state.trail.length = 0;
    state.lastGateCenter = width * 0.5;
    state.pendingReason = "";
    player.x = width * 0.5;
    player.y = height * 0.72;
    player.squeeze = 0;
    player.pressure = 0;
    player.invulnerable = 0.65;
    input.x = player.x;
    runLifecycle.startRun({
      mode: state.mode,
      startingLevel: state.levelIndex,
      startingRevives: state.revives
    });
    menu.classList.remove("visible");
    instructions.classList.remove("visible");
    gameOver.classList.remove("visible");
    countdownOverlay.classList.remove("visible");
    countdownOverlay.setAttribute("aria-hidden", "true");
    brandSplash.classList.remove("is-visible");
    brandSplash.setAttribute("aria-hidden", "true");
    reviveBtn.classList.add("hidden");
    retryBtn.classList.add("primary");
    showToast(config.label);
    playSound("start");
    haptic("light");
    updateHud();
  }

  function endRun(reason) {
    if (!state.running) {
      return;
    }

    const canRevive = state.revives > 0 && reason !== "timeup";
    const resultSequence = runLifecycle.beginResult(reason, canRevive);
    if (resultSequence === null) {
      return;
    }

    state.running = false;
    state.over = true;
    state.pendingReason = reason;
    state.shake = Math.max(state.shake, 16);
    state.flash = 1;
    rumble();
    playSound("crash");

    saveBestIfNeeded();
    awardRunProgress();

    const modeLabel = state.mode === "daily" ? `${dailyTitle} Daily` : currentMode().label;
    state.lastShareText = `I scored ${state.score} in Squeeze Rush ${modeLabel}. Level ${state.levelIndex + 1}. Can you squeeze past me?`;

    finalScore.textContent = String(state.score);
    resultLine.textContent = resultText(reason);
    resultGates.textContent = String(state.gatesPassed);
    resultPerfect.textContent = String(state.perfects);
    resultCombo.textContent = `x${state.bestCombo}`;
    rewardLine.textContent = `+${state.runRewardXp} XP  +${state.runRewardCores} Cores`;
    reviveBtn.classList.toggle("hidden", !canRevive);
    reviveBtn.textContent = `Revive x${state.revives}`;
    retryBtn.classList.toggle("primary", !canRevive);
    gameOver.classList.add("visible");
    renderCareer();
    renderContracts();
    updateHud();
    runLifecycle.resultShown(resultSequence, {
      reason,
      canTokenRevive: canRevive,
      score: state.score,
      xpReward: state.accumulatedXpReward,
      coreReward: state.accumulatedCoreReward
    });

    if (!canRevive) {
      const finalReason = reason === "timeup" ? "timeup" : `no_revive:${reason}`;
      finalizeCurrentRun(finalReason, resultSequence);
    }
  }

  function reviveRun() {
    const resultSequence = state.resultSequence;
    if (state.running || !runLifecycle.reviveWithToken(resultSequence)) {
      return;
    }

    state.running = true;
    state.over = false;
    state.flash = 0;
    state.shake = 0;
    state.combo = Math.max(1, Math.floor(state.combo * 0.5));
    state.gates = state.gates.filter(gate => gate.y < player.y - height * 0.2 || gate.y > player.y + height * 0.24);
    state.pickups = state.pickups.filter(pickup => pickup.y < player.y - height * 0.18 || pickup.y > player.y + height * 0.22);
    player.pressure = 0;
    player.squeeze = 0;
    player.invulnerable = 2.2;
    input.active = false;
    input.keyboard = false;
    gameOver.classList.remove("visible");
    reviveBtn.classList.add("hidden");
    retryBtn.classList.add("primary");
    burst(player.x, player.y, "#ff5a5f", 42, 0.9);
    showToast("Revived");
    playSound("revive");
    haptic("medium");
    updateHud();
  }

  function finalizeCurrentRun(reason, resultSequence) {
    return runLifecycle.finalize(reason, resultSequence);
  }

  function completeResultAction(action) {
    const resultSequence = state.resultSequence;
    const resultReason = state.pendingReason || "result";
    if (!runLifecycle.claimResultAction(resultSequence, action)) {
      return false;
    }

    if (!state.runFinalized) {
      finalizeCurrentRun(`declined_${action}:${resultReason}`, resultSequence);
    }
    return true;
  }

  function retryRun() {
    if (!completeResultAction("retry")) {
      return;
    }
    showInstructions(state.mode);
  }

  function leaveResultForMenu() {
    if (!completeResultAction("menu")) {
      return;
    }
    showMenu();
  }

  function showMenu() {
    if (state.lifecyclePhase === runLifecycle.phases.RESULT_PENDING && !completeResultAction("menu")) {
      return;
    }
    clearSplashTimers();
    clearCountdownTimers();
    brandSplash.classList.remove("is-visible");
    brandSplash.setAttribute("aria-hidden", "true");
    instructions.classList.remove("visible");
    countdownOverlay.classList.remove("visible");
    countdownOverlay.setAttribute("aria-hidden", "true");
    gameOver.classList.remove("visible");
    reviveBtn.classList.add("hidden");
    menu.classList.add("visible");
    state.running = false;
    state.splashing = false;
    state.instructing = false;
    state.countingDown = false;
    updateModeBestBadges();
    renderCareer();
    renderContracts();
  }

  function loop(time) {
    const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
    lastTime = time;

    update(dt);
    draw(time / 1000);
    rafId = requestAnimationFrame(loop);
  }

  function update(dt) {
    if (!dt) {
      return;
    }

    state.flash = Math.max(0, state.flash - dt * 3.2);
    state.shake = Math.max(0, state.shake - dt * 26);
    state.effects.slow = Math.max(0, state.effects.slow - dt);
    state.effects.coolant = Math.max(0, state.effects.coolant - dt);
    state.overdriveTime = Math.max(0, state.overdriveTime - dt);
    if (state.overdriveTime > 0) {
      state.flash = Math.max(state.flash, 0.06);
    }

    player.targetSqueeze = input.active || input.keyboard ? 1 : 0;
    player.squeeze = approach(player.squeeze, player.targetSqueeze, dt * 12);
    const heatRate = state.effects.coolant > 0 ? 0.18 : 0.44;
    const coolRate = state.effects.coolant > 0 ? 1.34 : 0.92;
    player.pressure = clamp(player.pressure + (player.targetSqueeze ? dt * heatRate : -dt * coolRate), 0, 1.04);
    if (state.effects.coolant > 0) {
      player.pressure = Math.min(player.pressure, 0.82);
    }

    const baseW = Math.min(86, width * 0.21);
    const baseH = Math.min(54, height * 0.08);
    player.width = lerp(baseW, baseW * 0.43, easeOutCubic(player.squeeze));
    player.height = lerp(baseH, baseH * 1.82, easeOutCubic(player.squeeze));

    const targetX = input.active ? input.x : player.x + Math.sin(state.elapsed * 1.6) * 0.08;
    player.x = approach(player.x, clamp(targetX, 36, width - 36), dt * (input.active ? 11 : 2.2));
    player.y = height * 0.72;

    if (state.running) {
      state.elapsed += dt;
      if (currentMode().timeLimit > 0) {
        state.timeLeft = Math.max(0, state.timeLeft - dt);
        if (state.timeLeft <= 0) {
          endRun("timeup");
          return;
        }
      }

      player.invulnerable = Math.max(0, player.invulnerable - dt);

      if (currentMode().pressure && player.pressure >= 1 && player.invulnerable <= 0) {
        burst(player.x, player.y, "#ffd166", 30, 1);
        endRun("popped");
        return;
      }

      updateGates(dt);
      updatePickups(dt);
      updateHud();
    }

    updateParticles(dt);
    state.trail.unshift({
      x: player.x,
      y: player.y,
      w: player.width,
      h: player.height,
      life: 0.42,
      squeeze: player.squeeze
    });

    for (const mark of state.trail) {
      mark.life -= dt;
    }
    state.trail = state.trail.filter(mark => mark.life > 0).slice(0, 10);
  }

  function updateGates(dt) {
    const level = currentLevel();
    const speed = worldSpeed();
    state.spawnTimer -= dt;

    if (state.spawnTimer <= 0) {
      spawnGate(level);
      state.spawnTimer = level.spawn * currentMode().spawnScale + randomRange(-0.06, 0.05);
    }

    for (const gate of state.gates) {
      gate.y += speed * dt;
      gate.pulse += dt;

      if (gate.type === "pulse") {
        gate.currentGapW = gate.gapW * (0.88 + (Math.sin(gate.pulse * 5.2 + gate.phase) + 1) * 0.08);
      } else {
        gate.currentGapW = gate.gapW;
      }

      if (gate.drift) {
        gate.gapX = gate.baseX + Math.sin(gate.pulse * gate.driftSpeed + gate.phase) * gate.drift;
      }

      if (!gate.passed && gate.y > player.y + player.height * 0.55) {
        gate.passed = true;
        scoreGate(gate);
      }

      if (!gate.passed && player.invulnerable <= 0 && overlapsPlayer(gate)) {
        if (hitsGate(gate)) {
          if (absorbHit(gate)) {
            continue;
          }
          endRun("smashed");
          return;
        }
      }
    }

    state.gates = state.gates.filter(gate => gate.y < height + 90);
  }

  function worldSpeed() {
    const level = currentLevel();
    const slowFactor = state.effects.slow > 0 ? 0.55 : 1;
    const rushFactor = state.overdriveTime > 0 ? 1.06 : 1;
    return (height * level.speed + state.score * 3.6) * currentMode().speedScale * slowFactor * rushFactor;
  }

  function currentMode() {
    return modeConfigs[state.mode] || modeConfigs.daily;
  }

  function currentLevel() {
    return levels[state.levelIndex] || levels[0];
  }

  function levelIndexForScore(score) {
    let index = 0;
    for (let i = 0; i < levels.length; i += 1) {
      if (score >= levels[i].score) {
        index = i;
      }
    }
    return index;
  }

  function updateLevel() {
    const nextLevel = levelIndexForScore(state.score);
    if (nextLevel > state.levelIndex) {
      state.levelIndex = nextLevel;
      burst(player.x, player.y - player.height, currentLevel().accent, 36, 0.8);
      showToast(`Level ${state.levelIndex + 1}: ${currentLevel().name}`);
    }
  }

  function absorbHit(gate) {
    if (state.shieldCharges <= 0) {
      burst(player.x, player.y, "#ff5a5f", 34, 1.2);
      return false;
    }

    state.shieldCharges -= 1;
    gate.passed = true;
    state.combo = Math.max(1, state.combo - 1);
    state.shake = Math.max(state.shake, 9);
    player.invulnerable = 0.55;
    burst(player.x, player.y, "#4cc9f0", 46, 1.05);
    showToast("Shield broke");
    playSound("shield");
    haptic("heavy");
    updateHud();
    return true;
  }

  function spawnPickup(center, gapW, level) {
    const config = currentMode();
    const availablePickups = config.allowRevivePickups ? pickupTypes : pickupTypes.filter(item => item.type !== "revive");
    let type = availablePickups[Math.floor(state.rng() * availablePickups.length)];
    if (config.allowRevivePickups && (state.spawnedGates % 12 === 0 || state.revives <= 0) && state.revives < 3) {
      type = pickupTypes.find(item => item.type === "revive") || type;
    }

    const x = clamp(center + randomRange(-gapW * 0.24, gapW * 0.24), 36, width - 36);
    state.pickups.push({
      x,
      y: -78,
      radius: 17,
      type: type.type,
      label: type.label,
      short: type.short,
      color: type.color || level.accent,
      spin: randomRange(0, Math.PI * 2),
      collected: false
    });
  }

  function updatePickups(dt) {
    const speed = worldSpeed();
    for (const pickup of state.pickups) {
      pickup.y += speed * dt;
      pickup.spin += dt * 4.6;

      if (!pickup.collected && overlapsPickup(pickup)) {
        pickup.collected = true;
        collectPickup(pickup);
      }
    }

    state.pickups = state.pickups.filter(pickup => !pickup.collected && pickup.y < height + 60);
  }

  function overlapsPickup(pickup) {
    const dx = Math.abs(pickup.x - player.x);
    const dy = Math.abs(pickup.y - player.y);
    return dx < player.width / 2 + pickup.radius && dy < player.height / 2 + pickup.radius;
  }

  function collectPickup(pickup) {
    burst(pickup.x, pickup.y, pickup.color, 24, 0.72);
    state.combo = Math.min(9, state.combo + 1);
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.pickupsCollected += 1;
    state.contractProgress.pickups += 1;
    chargeOverdrive(12);

    if (pickup.type === "shield") {
      state.shieldCharges = Math.min(2, state.shieldCharges + 1);
      showToast("Shield ready");
    } else if (pickup.type === "slow") {
      state.effects.slow = 5.5;
      showToast("Slow-mo");
    } else if (pickup.type === "coolant") {
      state.effects.coolant = 5;
      player.pressure = Math.max(0, player.pressure - 0.58);
      showToast("Coolant");
    } else if (pickup.type === "revive") {
      state.revives = Math.min(3, state.revives + 1);
      showToast("Revive token");
    }

    addScore(2);
    playSound("pickup");
    haptic("medium");
    updateHud();
  }

  function addScore(points) {
    const overdriveMultiplier = state.overdriveTime > 0 ? 2 : 1;
    state.score += Math.max(1, Math.round(points * currentMode().scoreMultiplier * overdriveMultiplier));
    updateLevel();
  }

  function spawnGate(level) {
    const gapScale = currentMode().gapScale;
    const minGap = width * level.gapMin * gapScale;
    const maxGap = width * level.gapMax * gapScale;
    state.spawnedGates += 1;
    const type = state.spawnedGates % 10 === 0 ? "boss" : (state.spawnedGates > 5 && state.rng() < 0.24 ? "pulse" : "standard");
    const typeGapScale = type === "boss" ? 0.9 : 1;
    const gapW = clamp(randomRange(minGap, maxGap) * typeGapScale, 70, width - 98);
    const maxStep = lerp(width * 0.32, width * 0.48, state.levelIndex / (levels.length - 1));
    const center = clamp(state.lastGateCenter + randomRange(-maxStep, maxStep), 30 + gapW / 2, width - 30 - gapW / 2);
    const drift = state.score > 8 && state.rng() < level.driftChance ? randomRange(18, level.drift) : 0;

    state.lastGateCenter = center;
    state.gates.push({
      y: -34,
      h: type === "boss" ? 40 : 24,
      type,
      gapX: center,
      baseX: center,
      gapW,
      currentGapW: gapW,
      drift,
      driftSpeed: randomRange(1.2, 2.2),
      phase: randomRange(0, Math.PI * 2),
      pulse: 0,
      passed: false,
      color: type === "boss" ? "#ff5a5f" : (type === "pulse" ? "#ffd166" : (state.rng() > 0.45 ? level.accent : palette[Math.floor(state.rng() * palette.length)]))
    });

    if (state.spawnedGates > 2 && state.spawnedGates % currentMode().pickupEvery === 0) {
      spawnPickup(center, gapW, level);
    }
  }

  function scoreGate(gate) {
    const left = player.x - player.width / 2;
    const right = player.x + player.width / 2;
    const clearance = Math.min(left - gapLeft(gate), gapRight(gate) - right);
    const perfect = clearance >= 0 && clearance <= 7 && player.squeeze >= 0.7 && player.pressure < 0.9;
    const nearMiss = clearance <= 12;
    const squeezeBonus = player.squeeze > 0.72 ? 1 : 0;
    const coolBonus = player.pressure < 0.72 ? 1 : 0;

    if (perfect) {
      state.combo = Math.min(12, state.combo + 2);
      state.perfects += 1;
      state.nearMisses += 1;
      state.contractProgress.perfect += 1;
      chargeOverdrive(30);
      state.shake = Math.max(state.shake, 6);
      burst(player.x, gate.y, "#ffd166", 30, 0.9);
      showToast("PERFECT SQUEEZE");
      playSound("perfect");
      haptic("success");
    } else if (nearMiss) {
      state.combo = Math.min(9, state.combo + 1);
      state.nearMisses += 1;
      chargeOverdrive(16);
      state.shake = Math.max(state.shake, 4);
      burst(player.x, gate.y, "#ffd166", 18, 0.72);
      playSound("near");
      haptic("light");
    } else {
      state.combo = Math.max(1, state.combo - 1);
      burst(player.x, gate.y, "#2ee6a6", 9, 0.55);
      chargeOverdrive(5);
      playSound("gate");
    }

    const gateBonus = gate.type === "boss" ? 8 : (gate.type === "pulse" ? 2 : 0);
    if (gate.type === "boss") {
      state.bossGates += 1;
      showToast(perfect ? "BOSS PERFECT" : "BOSS GATE CLEARED");
    }
    addScore(1 + squeezeBonus + coolBonus + gateBonus + (nearMiss ? state.combo : 0));
    state.gatesPassed += 1;
    state.contractProgress.gates += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    updateHud();
  }

  function overlapsPlayer(gate) {
    const gateTop = gate.y - gate.h / 2;
    const gateBottom = gate.y + gate.h / 2;
    const playerTop = player.y - player.height / 2;
    const playerBottom = player.y + player.height / 2;
    return gateBottom > playerTop && gateTop < playerBottom;
  }

  function hitsGate(gate) {
    const left = player.x - player.width / 2 + 4;
    const right = player.x + player.width / 2 - 4;
    return left < gapLeft(gate) || right > gapRight(gate);
  }

  function gapLeft(gate) {
    return gate.gapX - (gate.currentGapW || gate.gapW) / 2;
  }

  function gapRight(gate) {
    return gate.gapX + (gate.currentGapW || gate.gapW) / 2;
  }

  function updateParticles(dt) {
    for (const p of state.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      p.size *= 0.986;
    }

    state.particles = state.particles.filter(p => p.life > 0 && p.size > 0.5);
  }

  function draw(time) {
    const shakeX = state.shake ? randomRange(-state.shake, state.shake) : 0;
    const shakeY = state.shake ? randomRange(-state.shake, state.shake) : 0;

    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.translate(shakeX, shakeY);
    drawBackground(time);
    drawGates(time);
    drawPickups(time);
    drawTrail();
    drawPlayer(time);
    drawParticles();
    ctx.restore();

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 90, 95, ${state.flash * 0.24})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function drawBackground(time) {
    const level = currentLevel();
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, state.overdriveTime > 0 ? "#17112a" : "#141316");
    sky.addColorStop(0.52, "#101114");
    sky.addColorStop(1, "#17110f");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const levelGlow = ctx.createRadialGradient(width * 0.5, height * 0.35, 20, width * 0.5, height * 0.35, height * 0.72);
    levelGlow.addColorStop(0, hexToRgba(level.accent, 0.12));
    levelGlow.addColorStop(1, "rgba(16, 17, 20, 0)");
    ctx.fillStyle = levelGlow;
    ctx.fillRect(0, 0, width, height);

    if (state.overdriveTime > 0) {
      const rushGlow = ctx.createRadialGradient(player.x, player.y, 12, player.x, player.y, height * 0.62);
      rushGlow.addColorStop(0, "rgba(255, 209, 102, 0.24)");
      rushGlow.addColorStop(0.45, "rgba(247, 127, 0, 0.08)");
      rushGlow.addColorStop(1, "rgba(16, 17, 20, 0)");
      ctx.fillStyle = rushGlow;
      ctx.fillRect(0, 0, width, height);
    }

    const grid = 34;
    const offset = (time * 80) % grid;
    ctx.strokeStyle = "rgba(247, 244, 234, 0.055)";
    ctx.lineWidth = 1;

    for (let x = (width % grid) / 2; x < width; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = -grid + offset; y < height; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    drawRunway(time);
  }

  function drawRunway(time) {
    const level = currentLevel();
    const laneW = Math.min(220, width * 0.58);
    const left = width / 2 - laneW / 2;
    const right = width / 2 + laneW / 2;
    const gradient = ctx.createLinearGradient(left, 0, right, 0);
    gradient.addColorStop(0, "rgba(76, 201, 240, 0)");
    gradient.addColorStop(0.5, "rgba(247, 244, 234, 0.035)");
    gradient.addColorStop(1, "rgba(46, 230, 166, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(left, 0, laneW, height);

    ctx.strokeStyle = hexToRgba(level.accent, 0.24);
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 16]);
    ctx.lineDashOffset = -time * 90;
    ctx.beginPath();
    ctx.moveTo(left, 0);
    ctx.lineTo(left, height);
    ctx.moveTo(right, 0);
    ctx.lineTo(right, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawGates(time) {
    for (const gate of state.gates) {
      const y = gate.y;
      const leftEnd = gapLeft(gate);
      const rightStart = gapRight(gate);
      const glow = Math.sin(time * 8 + gate.phase) * 0.08 + 0.22;

      ctx.shadowColor = gate.color;
      ctx.shadowBlur = gate.type === "boss" ? 30 : 18;
      drawGateBlock(0, y - gate.h / 2, Math.max(0, leftEnd), gate.h, gate.color, glow);
      drawGateBlock(rightStart, y - gate.h / 2, Math.max(0, width - rightStart), gate.h, gate.color, glow);
      ctx.shadowBlur = 0;

      ctx.fillStyle = "rgba(247, 244, 234, 0.34)";
      ctx.fillRect(leftEnd - 2, y - gate.h / 2 - 6, 3, gate.h + 12);
      ctx.fillRect(rightStart - 1, y - gate.h / 2 - 6, 3, gate.h + 12);

      if (gate.type !== "standard") {
        ctx.fillStyle = gate.type === "boss" ? "#101114" : "rgba(16, 17, 20, 0.82)";
        ctx.font = "950 10px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(gate.type === "boss" ? "BOSS" : "PULSE", gate.gapX, y);
      }
    }
  }

  function drawGateBlock(x, y, w, h, color, glow) {
    if (w <= 0) {
      return;
    }

    const fill = ctx.createLinearGradient(x, y, x, y + h);
    fill.addColorStop(0, color);
    fill.addColorStop(1, shadeColor(color, -28));
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 255, ${glow})`;
    ctx.fillRect(x, y, w, 3);
  }

  function drawPickups(time) {
    for (const pickup of state.pickups) {
      const pulse = 1 + Math.sin(time * 7 + pickup.spin) * 0.08;
      const r = pickup.radius * pulse;
      ctx.save();
      ctx.translate(pickup.x, pickup.y);
      ctx.rotate(pickup.spin * 0.24);
      ctx.shadowColor = pickup.color;
      ctx.shadowBlur = 20;
      ctx.fillStyle = "rgba(16, 17, 20, 0.76)";
      ctx.beginPath();
      ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pickup.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#101114";
      ctx.font = "900 8px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pickup.short.slice(0, 2), 0, 1);
      ctx.restore();
    }
  }

  function drawTrail() {
    for (let i = state.trail.length - 1; i >= 0; i -= 1) {
      const mark = state.trail[i];
      const alpha = clamp(mark.life / 0.42, 0, 1) * (state.overdriveTime > 0 ? 0.31 : 0.16);
      ctx.fillStyle = state.overdriveTime > 0 ? `rgba(255, 209, 102, ${alpha})` : `rgba(255, 90, 95, ${alpha})`;
      roundRect(ctx, mark.x - mark.w / 2, mark.y - mark.h / 2, mark.w, mark.h, 8);
      ctx.fill();
    }
  }

  function drawPlayer(time) {
    const wobble = Math.sin(time * 18) * (input.active ? 1.8 : 0.8);
    const x = player.x;
    const y = player.y + wobble;
    const w = player.width;
    const h = player.height;

    if (state.shieldCharges > 0 || player.invulnerable > 0.08) {
      ctx.strokeStyle = state.shieldCharges > 0 ? "rgba(76, 201, 240, 0.78)" : "rgba(247, 244, 234, 0.28)";
      ctx.lineWidth = state.shieldCharges > 0 ? 4 : 2;
      ctx.shadowColor = "#4cc9f0";
      ctx.shadowBlur = state.shieldCharges > 0 ? 20 : 8;
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.78, h * 0.72, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.shadowColor = state.overdriveTime > 0 ? "#ffd166" : "#ff5a5f";
    ctx.shadowBlur = state.overdriveTime > 0 ? 46 : 30;
    const body = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
    body.addColorStop(0, "#ff7b64");
    body.addColorStop(0.48, "#ff5a5f");
    body.addColorStop(1, "#c83d55");
    ctx.fillStyle = body;
    roundRect(ctx, x - w / 2, y - h / 2, w, h, Math.min(8, w / 2));
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    roundRect(ctx, x - w * 0.28, y - h * 0.38, w * 0.36, h * 0.12, 4);
    ctx.fill();

    const eyeY = y - h * 0.08;
    const eyeGap = Math.max(6, w * 0.18);
    ctx.fillStyle = "#101114";
    ctx.beginPath();
    ctx.arc(x - eyeGap, eyeY, Math.max(2.6, w * 0.045), 0, Math.PI * 2);
    ctx.arc(x + eyeGap, eyeY, Math.max(2.6, w * 0.045), 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(16, 17, 20, 0.72)";
    ctx.lineWidth = Math.max(2, w * 0.035);
    ctx.beginPath();
    ctx.arc(x, y + h * 0.13, Math.max(5, w * 0.12), 0.18 * Math.PI, 0.82 * Math.PI);
    ctx.stroke();

    drawPressureMeter(x, y, w, h);
  }

  function drawPressureMeter(x, y, w, h) {
    if (player.pressure <= 0.03 && state.running) {
      return;
    }

    const meterW = Math.max(38, w * 1.1);
    const meterH = 6;
    const meterX = x - meterW / 2;
    const meterY = y + h / 2 + 12;
    const hot = player.pressure > 0.78;

    ctx.fillStyle = "rgba(247, 244, 234, 0.16)";
    roundRect(ctx, meterX, meterY, meterW, meterH, 3);
    ctx.fill();
    ctx.fillStyle = hot ? "#ffd166" : "#2ee6a6";
    roundRect(ctx, meterX, meterY, meterW * clamp(player.pressure, 0, 1), meterH, 3);
    ctx.fill();
  }

  function drawParticles() {
    for (const p of state.particles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = hexToRgba(p.color, alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function burst(x, y, color, count, force) {
    for (let i = 0; i < count; i += 1) {
      const angle = state.rng() * Math.PI * 2;
      const speed = randomRange(80, 240) * force;
      const life = randomRange(0.35, 0.85);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        size: randomRange(2, 5.8),
        color,
        life,
        maxLife: life
      });
    }
  }

  function updateHud() {
    const mode = currentMode();
    saveBestIfNeeded();
    scoreValue.textContent = String(state.score);
    bestValue.textContent = String(state.best);
    levelValue.textContent = `${state.levelIndex + 1}`;
    comboValue.textContent = `Flow x${state.combo}`;
    const rushActive = state.overdriveTime > 0;
    overdriveLabel.textContent = rushActive ? `OVERDRIVE ${state.overdriveTime.toFixed(1)}s` : "Overdrive";
    overdriveFill.style.width = `${rushActive ? 100 : clamp(state.overdrive, 0, 100)}%`;
    document.body.classList.toggle("overdrive-active", rushActive);
    renderPowerIcons();
    modeNameValue.textContent = mode.short;
    goalValue.textContent = goalLabel();
  }

  function saveBestIfNeeded() {
    if (state.score > state.best) {
      state.best = state.score;
      modeBests[state.mode] = state.score;
      writeModeBests();
      updateModeBestBadges();
      return true;
    }

    return false;
  }

  function bestForMode(mode) {
    return Math.max(0, Math.floor(Number(modeBests[mode]) || 0));
  }

  function updateModeBestBadges() {
    for (const badge of modeBestBadges) {
      const mode = badge.dataset.bestMode;
      badge.textContent = `Best ${bestForMode(mode)}`;
    }
  }

  function renderPowerIcons() {
    const powers = currentPowers();
    powerIcons.replaceChildren();
    powerIcons.setAttribute("aria-label", powers.length ? powers.map(power => power.label).join(", ") : "No active powers");

    if (!powers.length) {
      const empty = document.createElement("span");
      empty.className = "power-empty";
      empty.textContent = "None";
      powerIcons.appendChild(empty);
      return;
    }

    for (const power of powers) {
      const icon = document.createElement("span");
      icon.className = `power-icon ${power.type}`;
      icon.dataset.symbol = power.symbol;
      icon.title = power.label;
      if (power.count) {
        const count = document.createElement("span");
        count.className = "power-count";
        count.textContent = power.count;
        icon.appendChild(count);
      }
      powerIcons.appendChild(icon);
    }
  }

  function currentPowers() {
    const powers = [];

    if (state.shieldCharges > 0) {
      powers.push({
        type: "shield",
        symbol: "S",
        count: state.shieldCharges,
        label: `${state.shieldCharges} shield${state.shieldCharges === 1 ? "" : "s"}`
      });
    }

    if (state.effects.slow > 0) {
      const seconds = Math.ceil(state.effects.slow);
      powers.push({
        type: "slow",
        symbol: "T",
        count: seconds,
        label: `Slow-mo ${seconds}s`
      });
    }

    if (state.effects.coolant > 0) {
      const seconds = Math.ceil(state.effects.coolant);
      powers.push({
        type: "coolant",
        symbol: "C",
        count: seconds,
        label: `Coolant ${seconds}s`
      });
    }

    if (state.revives > 0) {
      powers.push({
        type: "revive",
        symbol: "R",
        count: state.revives,
        label: `${state.revives} revive${state.revives === 1 ? "" : "s"}`
      });
    }

    return powers;
  }

  function goalLabel() {
    const mode = currentMode();
    if (mode.timeLimit > 0) {
      return `${Math.ceil(state.timeLeft || mode.timeLimit)}s`;
    }
    if (state.running) {
      return mode.goal;
    }
    return `Best ${Math.max(state.best, state.score)}`;
  }

  function resultText(reason) {
    if (reason === "timeup") {
      return "Time up. Sprint score locked.";
    }
    if (state.revives > 0) {
      return "Spend a revive token and keep the run.";
    }
    if (state.score >= state.best && state.score > 0) {
      return "New personal best.";
    }
    if (state.score > 80) {
      return "That run is clip-worthy.";
    }
    if (state.score > 35) {
      return "Clean squeeze under pressure.";
    }
    if (reason === "smashed") {
      return "The gap won this round.";
    }
    if (reason === "popped") {
      return "Too much pressure.";
    }
    return "Score locked.";
  }

  function chargeOverdrive(amount) {
    if (state.overdriveTime > 0) {
      state.overdriveTime = Math.min(9, state.overdriveTime + amount * 0.012);
      return;
    }

    state.overdrive = Math.min(100, state.overdrive + amount);
    if (state.overdrive < 100) {
      return;
    }

    state.overdrive = 0;
    state.overdriveTime = 6;
    burst(player.x, player.y, "#ffd166", 64, 1.15);
    showToast("OVERDRIVE x2");
    playSound("overdrive");
    haptic("success");
  }

  function awardRunProgress() {
    const xp = Math.max(5, Math.round(state.score * 0.45 + state.gatesPassed * 2 + state.perfects * 5 + state.bossGates * 6));
    const scoreCores = Math.floor(state.score / 80);
    const xpDelta = Math.max(0, xp - state.awardSnapshot.xp);
    let coreDelta = Math.max(0, scoreCores - state.awardSnapshot.scoreCores);
    const claimed = career.completedContracts || {};
    for (const contract of contractTemplates) {
      const key = `${dailyCode}:${contract.id}`;
      const progress = Math.min(contract.target, state.contractProgress[contract.id] || 0);
      if (progress >= contract.target && !claimed[key]) {
        claimed[key] = true;
        coreDelta += contract.reward;
      }
    }

    state.runRewardXp += xpDelta;
    state.runRewardCores += coreDelta;
    career.xp += xpDelta;
    career.cores += coreDelta;
    if (!state.runAwarded) {
      career.totalRuns += 1;
      state.runAwarded = true;
    }
    career.totalGates += Math.max(0, state.gatesPassed - state.awardSnapshot.gates);
    career.totalNearMisses += Math.max(0, state.nearMisses - state.awardSnapshot.nearMisses);
    career.totalPickups += Math.max(0, state.pickupsCollected - state.awardSnapshot.pickups);
    career.bestCombo = Math.max(career.bestCombo, state.bestCombo);
    career.completedContracts = claimed;
    state.awardSnapshot = { xp, scoreCores, gates: state.gatesPassed, nearMisses: state.nearMisses, pickups: state.pickupsCollected };
    runLifecycle.recordRewardDelta(xpDelta, coreDelta);
    writeCareer();
  }

  function renderCareer() {
    const rank = careerRank();
    rankBadge.textContent = `R${rank.index + 1}`;
    rankName.textContent = rank.name;
    xpLabel.textContent = `${rank.current} / ${rank.target} XP`;
    xpFill.style.width = `${clamp(rank.current / rank.target * 100, 0, 100)}%`;
    coreLabel.textContent = `${career.cores} Core${career.cores === 1 ? "" : "s"}`;
  }

  function careerRank() {
    let remaining = Math.max(0, career.xp);
    let index = 0;
    let target = 100;
    while (remaining >= target && index < rankNames.length - 1) {
      remaining -= target;
      index += 1;
      target = 100 + index * 75;
    }
    return { index, name: rankNames[index], current: Math.floor(remaining), target };
  }

  function renderContracts() {
    contractList.replaceChildren();
    const claimed = career.completedContracts || {};
    for (const contract of contractTemplates) {
      const key = `${dailyCode}:${contract.id}`;
      const value = Math.min(contract.target, state.contractProgress[contract.id] || 0);
      const complete = Boolean(claimed[key]);
      const card = document.createElement("article");
      card.className = `contract-card${complete ? " complete" : ""}`;
      card.style.setProperty("--contract-color", contract.color);
      card.innerHTML = `<div><strong>${contract.label}</strong><small>${complete ? "Completed today" : contract.detail}</small></div><span>${complete ? "DONE" : `${value}/${contract.target}`}<em>+${contract.reward}</em></span>`;
      contractList.appendChild(card);
    }
  }

  function readCareer() {
    const fallback = { xp: 0, cores: 0, totalRuns: 0, totalGates: 0, totalNearMisses: 0, totalPickups: 0, bestCombo: 1, completedContracts: {} };
    try {
      const parsed = JSON.parse(localStorage.getItem(careerStorageKey) || "{}");
      for (const key of ["xp", "cores", "totalRuns", "totalGates", "totalNearMisses", "totalPickups", "bestCombo"]) {
        const value = Number(parsed[key]);
        if (Number.isFinite(value) && value >= 0) fallback[key] = Math.floor(value);
      }
      if (parsed.completedContracts && typeof parsed.completedContracts === "object") fallback.completedContracts = parsed.completedContracts;
    } catch (error) {
      // Use a clean career if storage was interrupted.
    }
    return fallback;
  }

  function writeCareer() {
    localStorage.setItem(careerStorageKey, JSON.stringify(career));
  }

  function readSettings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(settingsStorageKey) || "{}");
      return { sound: parsed.sound !== false };
    } catch (error) {
      return { sound: true };
    }
  }

  function toggleSound() {
    settings.sound = !settings.sound;
    localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
    updateSoundButton();
    if (settings.sound) {
      unlockAudio();
      playSound("start");
    }
  }

  function updateSoundButton() {
    soundToggleBtn.textContent = settings.sound ? "Sound On" : "Sound Off";
    soundToggleBtn.setAttribute("aria-pressed", String(settings.sound));
  }

  function unlockAudio() {
    if (!settings.sound) return;
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
    } catch (error) {
      audioContext = null;
    }
  }

  function playSound(kind) {
    if (!settings.sound || !audioContext) return;
    const notes = {
      start: [330, 0.08, "sine"], gate: [440, 0.04, "triangle"], near: [660, 0.07, "triangle"], perfect: [880, 0.12, "sine"],
      pickup: [720, 0.1, "sine"], overdrive: [180, 0.28, "sawtooth"], crash: [90, 0.24, "square"], shield: [250, 0.16, "square"], revive: [520, 0.22, "sine"]
    };
    const [frequency, duration, type] = notes[kind] || notes.gate;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (kind === "overdrive") oscillator.frequency.exponentialRampToValueAtTime(720, now + duration);
    if (kind === "crash") oscillator.frequency.exponentialRampToValueAtTime(45, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  async function shareScore() {
    const text = state.lastShareText || `I scored ${state.score} in Squeeze Rush.`;

    try {
      if (window.SqueezeRushNative?.isNativeAvailable()) {
        const responsePromise = window.SqueezeRushNative.request("share.present", { text }, { timeoutMs: 60000 });
        showToast("Share sheet opened");
        const response = await responsePromise;
        if (!["success", "cancelled"].includes(response.status)) {
          showToast("Score ready to share");
        }
        return;
      }

      if (window.SqueezeRushAndroid?.share) {
        window.SqueezeRushAndroid.share(text);
        showToast("Share sheet opened");
        return;
      }

      if (window.SqueezeRushIOS?.share) {
        window.SqueezeRushIOS.share(text);
        showToast("Share sheet opened");
        return;
      }

      if (navigator.share) {
        await navigator.share({ title: "Squeeze Rush", text });
        showToast("Shared");
        return;
      }

      await navigator.clipboard.writeText(text);
      showToast("Score copied");
    } catch (error) {
      showToast("Score ready to share");
    }
  }

  function closeGame() {
    clearSplashTimers();
    clearCountdownTimers();
    state.running = false;
    state.splashing = false;
    state.instructing = false;
    state.countingDown = false;
    input.active = false;
    input.keyboard = false;

    if (window.SqueezeRushAndroid?.closeGame) {
      window.SqueezeRushAndroid.closeGame();
      return;
    }

    window.close();
    showToast("Use device back to close");
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 1500);
  }

  function readModeBests() {
    const bests = {};
    for (const mode of Object.keys(modeConfigs)) {
      bests[mode] = 0;
    }

    try {
      const parsed = JSON.parse(localStorage.getItem(modeBestStorageKey) || "{}");
      for (const mode of Object.keys(bests)) {
        const value = Number(parsed[mode]);
        if (Number.isFinite(value) && value > 0) {
          bests[mode] = Math.floor(value);
        }
      }
    } catch (error) {
      // Ignore corrupt local storage and rebuild mode bests from this run onward.
    }

    const legacyBest = readLegacyBest();
    if (legacyBest > 0 && Object.values(bests).every(value => value === 0)) {
      bests.daily = legacyBest;
    }

    return bests;
  }

  function writeModeBests() {
    const clean = {};
    for (const mode of Object.keys(modeConfigs)) {
      clean[mode] = bestForMode(mode);
    }

    localStorage.setItem(modeBestStorageKey, JSON.stringify(clean));
    localStorage.setItem(storageKey, String(Math.max(...Object.values(clean))));
  }

  function readLegacyBest() {
    const value = Number(localStorage.getItem(storageKey));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }

  function rumble() {
    haptic("error");
  }

  function haptic(style) {
    try {
      if (window.SqueezeRushNative?.isNativeAvailable()) {
        window.SqueezeRushNative.request("haptic.perform", { style }, { timeoutMs: 2500 }).catch(() => {});
        return;
      }
      if (window.SqueezeRushIOS?.haptic) {
        window.SqueezeRushIOS.haptic(style);
        return;
      }
      if (window.SqueezeRushAndroid?.haptic) {
        window.SqueezeRushAndroid.haptic(style);
        return;
      }
      if ("vibrate" in navigator) {
        const patterns = { light: 12, medium: 24, heavy: 38, success: [16, 30, 24], error: [38, 24, 52] };
        navigator.vibrate(patterns[style] || 16);
      }
    } catch (error) {
      // Haptics are optional on browsers and desktop previews.
    }
  }

  function randomSeed() {
    return Math.floor(Math.random() * 0xffffffff);
  }

  function randomRange(min, max) {
    return min + (max - min) * state.rng();
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let t = seed >>> 0;
    return function next() {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function approach(current, target, amount) {
    return current + (target - current) * clamp(amount, 0, 1);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function roundRect(context, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + w, y, x + w, y + h, radius);
    context.arcTo(x + w, y + h, x, y + h, radius);
    context.arcTo(x, y + h, x, y, radius);
    context.arcTo(x, y, x + w, y, radius);
    context.closePath();
  }

  function shadeColor(hex, percent) {
    const value = hex.replace("#", "");
    const num = parseInt(value, 16);
    const amount = Math.round(2.55 * percent);
    const r = clamp((num >> 16) + amount, 0, 255);
    const g = clamp(((num >> 8) & 0x00ff) + amount, 0, 255);
    const b = clamp((num & 0x0000ff) + amount, 0, 255);
    return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
  }

  function hexToRgba(hex, alpha) {
    const value = hex.replace("#", "");
    const num = parseInt(value, 16);
    const r = num >> 16;
    const g = (num >> 8) & 0x00ff;
    const b = num & 0x0000ff;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function stage1TestSnapshot() {
    return {
      lifecycle: runLifecycle.snapshot(),
      running: state.running,
      over: state.over,
      score: state.score,
      gatesPassed: state.gatesPassed,
      perfects: state.perfects,
      nearMisses: state.nearMisses,
      pickupsCollected: state.pickupsCollected,
      bossGates: state.bossGates,
      revives: state.revives,
      runRewardXp: state.runRewardXp,
      runRewardCores: state.runRewardCores,
      awardSnapshot: Object.assign({}, state.awardSnapshot),
      career: JSON.parse(JSON.stringify(career)),
      modeBests: Object.assign({}, modeBests),
      settings: Object.assign({}, settings),
      views: {
        menu: menu.classList.contains("visible"),
        instructions: instructions.classList.contains("visible"),
        gameOver: gameOver.classList.contains("visible")
      },
      storage: {
        best: localStorage.getItem(storageKey),
        modeBests: localStorage.getItem(modeBestStorageKey),
        career: localStorage.getItem(careerStorageKey),
        settings: localStorage.getItem(settingsStorageKey)
      }
    };
  }

  function setStage1RunProgress(values) {
    if (!values || typeof values !== "object") return;
    const numericFields = [
      "score", "gatesPassed", "perfects", "nearMisses", "pickupsCollected",
      "bossGates", "bestCombo", "combo", "revives"
    ];
    for (const key of numericFields) {
      const value = Number(values[key]);
      if (Number.isFinite(value) && value >= 0) {
        state[key] = Math.floor(value);
      }
    }
    if (values.contractProgress && typeof values.contractProgress === "object") {
      for (const key of ["gates", "perfect", "pickups"]) {
        const value = Number(values.contractProgress[key]);
        if (Number.isFinite(value) && value >= 0) {
          state.contractProgress[key] = Math.floor(value);
        }
      }
    }
  }

  const stage1TestEnabled = window.__SQUEEZE_RUSH_STAGE1_TEST__ === true
    || ((window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost")
      && new URLSearchParams(window.location.search).has("stage1Test"));

  if (stage1TestEnabled) {
    window.__SqueezeRushStage1Test = Object.freeze({
      prepare() {
        clearSplashTimers();
        clearCountdownTimers();
        stopAnimationLoop();
        state.splashing = false;
        state.instructing = false;
        state.countingDown = false;
      },
      startRun,
      endRun,
      reviveRun,
      retryRun,
      leaveResultForMenu,
      shareScore,
      setRunProgress: setStage1RunProgress,
      snapshot: stage1TestSnapshot
    });
  }

  function stopAnimationLoop() {
    cancelAnimationFrame(rafId);
    rafId = 0;
    lastTime = 0;
  }

  function ensureAnimationLoop() {
    if (!rafId && !document.hidden) {
      lastTime = 0;
      rafId = requestAnimationFrame(loop);
    }
  }

  document.addEventListener("visibilitychange", () => {
    input.active = false;
    input.keyboard = false;
    input.pointerId = null;
    if (document.hidden) stopAnimationLoop();
    else ensureAnimationLoop();
  });
  window.addEventListener("pagehide", stopAnimationLoop);
  window.addEventListener("pageshow", ensureAnimationLoop);
})();
