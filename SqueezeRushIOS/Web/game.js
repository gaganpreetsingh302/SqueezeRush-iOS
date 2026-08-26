(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const queryParams = new URLSearchParams(window.location.search);
  const debugMode = queryParams.has("debug");
  const debugScenario = queryParams.get("scenario") || "";
  const requestedDebugPressure = Number(queryParams.get("pressure"));
  const debugPressureOverride = debugMode && queryParams.has("pressure") && Number.isFinite(requestedDebugPressure)
    ? Math.max(0, Math.min(1, requestedDebugPressure))
    : null;
  const trailerCapture = queryParams.has("trailer");
  const autoRecordTrailer = trailerCapture && queryParams.has("record");
  const requestedTrailerDuration = Number(queryParams.get("duration"));
  const trailerDurationSeconds = Number.isFinite(requestedTrailerDuration)
    ? Math.max(8, Math.min(30, requestedTrailerDuration))
    : 18;
  const trailerUploadPath = queryParams.get("upload") || "/capture";
  const trailerWidth = 1080;
  const trailerHeight = 1920;
  const crawlerSpriteAtlas = new Image();
  crawlerSpriteAtlas.decoding = "async";
  crawlerSpriteAtlas.src = "assets/crawlers/goblin-front-running.png?v=craftpix-v1";
  const crawlerSpriteFrameSize = 480;
  const crawlerSpriteFrameCount = 12;

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
  const campaignLabel = document.getElementById("campaignLabel");
  const campaignMap = document.getElementById("campaignMap");
  const campaignMapScroll = document.getElementById("campaignMapScroll");
  const campaignMapBackBtn = document.getElementById("campaignMapBackBtn");
  const campaignStartBtn = document.getElementById("campaignStartBtn");
  const campaignLadder = document.getElementById("campaignLadder");
  const campaignSummit = document.getElementById("campaignSummit");
  const campaignMenuStars = document.getElementById("campaignMenuStars");
  const campaignStarTotal = document.getElementById("campaignStarTotal");
  let campaignStarRows = [...document.querySelectorAll("[data-star-level]")];
  let campaignProgressRows = [...document.querySelectorAll("[data-progress-level]")];
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
  const squeezeMeter = document.getElementById("squeezeMeter");
  const squeezeFill = document.getElementById("squeezeFill");
  const squeezeStatus = document.getElementById("squeezeStatus");
  const squeezeScreenGlow = document.getElementById("squeezeScreenGlow");
  const levelObjectiveHud = document.getElementById("levelObjectiveHud");
  const levelObjectiveBadge = document.getElementById("levelObjectiveBadge");
  const levelObjectiveTitle = document.getElementById("levelObjectiveTitle");
  const levelObjectiveProgress = document.getElementById("levelObjectiveProgress");
  const levelObjectiveFill = document.getElementById("levelObjectiveFill");
  const levelObjectiveValue = document.getElementById("levelObjectiveValue");
  const levelVictory = document.getElementById("levelVictory");
  const victoryEyebrow = document.getElementById("victoryEyebrow");
  const victoryTitle = document.getElementById("victoryTitle");
  const victoryMission = document.getElementById("victoryMission");
  const victoryStars = document.getElementById("victoryStars");
  const victoryTarget = document.getElementById("victoryTarget");
  const victoryTime = document.getElementById("victoryTime");
  const victoryScore = document.getElementById("victoryScore");
  const victoryCombo = document.getElementById("victoryCombo");
  const victoryUnlock = document.getElementById("victoryUnlock");
  const nextLevelBtn = document.getElementById("nextLevelBtn");
  const replayLevelBtn = document.getElementById("replayLevelBtn");
  const victoryMapBtn = document.getElementById("victoryMapBtn");

  const modeButtons = [...document.querySelectorAll("[data-mode]")];
  const modeBestBadges = [...document.querySelectorAll("[data-best-mode]")];
  const closeGameBtn = document.getElementById("closeGameBtn");
  const instructionOkBtn = document.getElementById("instructionOkBtn");
  const instructionBackBtn = document.getElementById("instructionBackBtn");
  const reviveBtn = document.getElementById("reviveBtn");
  const rewardedReviveBtn = document.getElementById("rewardedReviveBtn");
  const retryBtn = document.getElementById("retryBtn");
  const shareBtn = document.getElementById("shareBtn");
  const menuBtn = document.getElementById("menuBtn");
  const soundToggleBtn = document.getElementById("soundToggleBtn");
  const monetizationActions = document.getElementById("monetizationActions");
  const removeAdsBtn = document.getElementById("removeAdsBtn");
  const restorePurchasesBtn = document.getElementById("restorePurchasesBtn");
  const privacyOptionsBtn = document.getElementById("privacyOptionsBtn");
  const purchaseStatus = document.getElementById("purchaseStatus");

  const palette = ["#ff5a5f", "#2ee6a6", "#ffd166", "#4cc9f0", "#f77f00"];
  const campaignLevelNames = [
    "First Steps", "Crawler Alley", "Unstable Works", "Shadow Surge", "Gatehouse",
    "Neon Foundry", "Wind Tunnels", "Minecart Mile", "Crusher Yard", "Goblin Enforcer",
    "Cloudworks", "Ember Docks", "Frosted Forge", "Power Junction", "Iron Maze",
    "Reactor Run", "Phantom Factory", "Voltage Vault", "Titan Approach", "Iron Colossus",
    "Skyline Siege", "Turbo Foundry", "Royal Passage", "Throneworks", "Crawler King"
  ];
  const campaignLevelScores = [
    0, 40, 100, 190, 320, 470, 630, 800, 980, 1170,
    1370, 1580, 1800, 2030, 2270, 2520, 2780, 3050, 3330, 3620,
    3920, 4230, 4550, 4880, 5220
  ];
  const campaignFinalScore = 5600;
  const campaignAccents = ["#4cc9f0", "#2ee6a6", "#ffd166", "#ff5a5f", "#f77f00", "#b98cff"];
  const levels = campaignLevelNames.map((name, index) => {
    const progress = index / (campaignLevelNames.length - 1);
    const levelNumber = index + 1;
    return {
      name,
      score: campaignLevelScores[index],
      speed: Number((0.28 + progress * 0.18).toFixed(3)),
      gapMin: Number((0.56 - progress * 0.27).toFixed(3)),
      gapMax: Number((0.69 - progress * 0.27).toFixed(3)),
      spawn: Number((1.45 - progress * 0.45).toFixed(3)),
      driftChance: Number((0.02 + progress * 0.5).toFixed(3)),
      drift: Math.round(16 + progress * 36),
      crawlerChance: Number((0.08 + progress * 0.34).toFixed(3)),
      hazardChance: Number((0.03 + progress * 0.23).toFixed(3)),
      accent: campaignAccents[index % campaignAccents.length],
      bossType: levelNumber % 25 === 0 ? "boss" : (levelNumber % 10 === 0 ? "subboss" : "")
    };
  });
  const campaignStarScores = levels.map((level, index) => {
    const completionScore = levels[index + 1]?.score || campaignFinalScore;
    const scoreRange = completionScore - level.score;
    return [
      Math.round(level.score + scoreRange * 0.34),
      Math.round(level.score + scoreRange * 0.67),
      completionScore
    ];
  });
  const campaignChallenges = [
    { title: "Gate Basics", metric: "gates", target: 4, unit: "gates", spawn: "standardGate", par: 26, description: "Clear 4 steel training gates.", tip: "Steer your center onto a glowing +2 marker, then squeeze at the gate." },
    { title: "Alley Sweep", metric: "crawlers", target: 3, unit: "crawlers", spawn: "crawler", par: 34, description: "Outplay 3 blue crawlers.", tip: "Dodge around them or counter them with a power." },
    { title: "Hazard Sampler", metric: "hazards", target: 3, unit: "hazards", spawn: "hazardMix", par: 38, description: "Clear 3 different factory hazards.", tip: "Read the wind, heat, and mine warning shapes." },
    { title: "Shadow Steps", metric: "nearMisses", target: 2, unit: "close calls", spawn: "crawler", par: 34, description: "Land 2 close-call dodges.", tip: "Pass close to a crawler or gate without touching it." },
    { title: "Gatehouse Precision", metric: "perfects", target: 3, unit: "perfects", spawn: "precisionGate", par: 42, description: "Perform 3 perfect squeezes.", tip: "Follow the dotted line until the Flow prompt turns green." },
    { title: "Power Grab", metric: "pickups", target: 3, unit: "powers", spawn: "pickup", par: 34, description: "Collect 3 powerups.", tip: "Steer through the glowing power icons after each gate." },
    { title: "Ride the Wind", metric: "windClears", target: 3, unit: "wind tunnels", spawn: "wind", par: 38, description: "Survive 3 crosswind tunnels.", tip: "Counter-steer before the gust carries you off line." },
    { title: "Minecart Escape", metric: "minefieldClears", target: 3, unit: "minefields", spawn: "minefield", par: 40, description: "Thread through 3 minefields.", tip: "Commit early to the marked safe lane." },
    { title: "Crusher Flow", metric: "bestCombo", target: 6, unit: "Flow", spawn: "flowGate", par: 42, description: "Reach Flow x6 without losing rhythm.", tip: "Follow the dotted line to a +2 marker and wait for PERFECT +2." },
    { title: "Goblin Enforcer", metric: "bossClears", target: 1, unit: "sub-boss", spawn: "boss", par: 25, description: "Defeat the giant Goblin Enforcer.", tip: "Dodge the large crawler or use a defensive power." },
    { title: "Cloud Gate Marathon", metric: "standardGates", target: 8, unit: "steel gates", spawn: "standardGate", par: 48, description: "Clear 8 steel gates in one run.", tip: "Pulse your squeeze to keep pressure under control." },
    { title: "Ember Control", metric: "heatClears", target: 4, unit: "heat vents", spawn: "heat", par: 46, description: "Cross 4 live heat vents.", tip: "Release early whenever the vent raises your pressure." },
    { title: "Cold Circuit", metric: "coolCycles", target: 3, unit: "cooldowns", spawn: "cooling", par: 44, description: "Heat up and cool down safely 3 times.", tip: "Reach Warning, then fully release until the bar is cool." },
    { title: "Power Junction", metric: "overdrives", target: 1, unit: "Overdrive", spawn: "flowGate", par: 48, description: "Charge and trigger Overdrive once.", tip: "Chain perfects and close calls to fill the gold meter." },
    { title: "Iron Maze", metric: "pulseGates", target: 4, unit: "pulse gates", spawn: "pulseGate", par: 44, description: "Clear 4 moving pulse gates.", tip: "Watch the opening breathe before committing." },
    { title: "Reactor Timing", metric: "perfects", target: 5, unit: "perfects", spawn: "precisionGate", par: 54, description: "String together 5 perfect squeezes.", tip: "Stay on a +2 marker and cool down whenever the prompt turns red." },
    { title: "Phantom Hunt", metric: "hunterClears", target: 4, unit: "hunters", spawn: "hunter", par: 48, description: "Outplay 4 tracking hunters.", tip: "Move after a hunter locks onto your last position." },
    { title: "Voltage Choice", metric: "choicePickups", target: 4, unit: "choices", spawn: "choice", par: 46, description: "Choose 4 forked power rewards.", tip: "Only one power survives each fork, so choose quickly." },
    { title: "Titan Trial", metric: "bruiserClears", target: 4, unit: "bruisers", spawn: "bruiser", par: 50, description: "Outplay 4 heavy bruiser crawlers.", tip: "Their size closes lanes; move decisively around them." },
    { title: "Iron Colossus", metric: "bossClears", target: 1, unit: "sub-boss", spawn: "boss", par: 28, description: "Defeat the massive Iron Colossus.", tip: "Respect its wider body and slower, deceptive drift." },
    { title: "Skyline Endurance", metric: "survival", target: 35, unit: "seconds", spawn: "mixed", par: 42, description: "Survive the skyline siege for 35 seconds.", tip: "The timer only advances while you remain alive." },
    { title: "Turbo Gatebreak", metric: "bossGates", target: 3, unit: "crusher gates", spawn: "bossGate", par: 44, description: "Break through 3 giant crusher gates.", tip: "Use the widest part of each opening and release immediately." },
    { title: "Royal Flow", metric: "bestCombo", target: 10, unit: "Flow", spawn: "flowGate", par: 58, description: "Reach Flow x10 in the royal passage.", tip: "Chain the glowing +2 targets; one loose gate lowers Flow." },
    { title: "Throne Trial", metric: "encounters", target: 15, unit: "encounters", spawn: "mixed", par: 62, description: "Clear 15 mixed encounters.", tip: "Expect gates, crawlers, hazards, and power forks together." },
    { title: "Crawler King", metric: "bossClears", target: 1, unit: "main boss", spawn: "boss", par: 32, description: "Defeat the Crawler King and finish Campaign.", tip: "Survive the giant final crawler to claim the summit." }
  ];
  const pickupTypes = [
    { type: "shield", label: "Shield", short: "S", color: "#4cc9f0" },
    { type: "slow", label: "Slow-Mo", short: "T", color: "#ffd166" },
    { type: "coolant", label: "Coolant", short: "C", color: "#2ee6a6" },
    { type: "revive", label: "Revive", short: "R", color: "#ff5a5f" },
    { type: "phase", label: "Phase", short: "PH", color: "#b98cff" },
    { type: "magnet", label: "Magnet", short: "M", color: "#ff8bd1" },
    { type: "pulse", label: "Repulsor", short: "P", color: "#ff9f43" },
    { type: "double", label: "Double Score", short: "2X", color: "#d8ff5f" }
  ];
  const storageKey = "squeezeRush.best.v1";
  const modeBestStorageKey = "squeezeRush.modeBest.v1";
  const campaignProgressStorageKey = "squeezeRush.campaignProgress.v1";
  const careerStorageKey = "squeezeRush.career.v2";
  const settingsStorageKey = "squeezeRush.settings.v2";
  const rankNames = ["Rookie", "Gap Scout", "Flow Rider", "Pulse Ace", "Rush Elite", "Squeeze Legend"];
  const contractTemplates = [
    { id: "gates", label: "Gate Runner", detail: "Clear 8 gates", target: 8, reward: 3, color: "#4cc9f0" },
    { id: "crawlers", label: "Shadow Step", detail: "Outplay 3 crawlers", target: 3, reward: 4, color: "#b98cff" },
    { id: "perfect", label: "Precision Artist", detail: "Land 3 perfect squeezes", target: 3, reward: 4, color: "#ffd166" },
    { id: "pickups", label: "Power Hunter", detail: "Collect 2 powers", target: 2, reward: 3, color: "#2ee6a6" }
  ];
  const runDate = new Date();
  const contractDateCode = `${runDate.getFullYear()}-${String(runDate.getMonth() + 1).padStart(2, "0")}-${String(runDate.getDate()).padStart(2, "0")}`;
  const campaignSeedValue = hashString("squeeze-rush-campaign-v1");
  const modeConfigs = {
    campaign: {
      label: "Campaign",
      short: "Campaign",
      goal: "Reach Level 25",
      seed: () => campaignSeedValue,
      revives: 1,
      startLevel: 0,
      timeLimit: 0,
      scoreMultiplier: 1,
      speedScale: 0.94,
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
      speedScale: 0.94,
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
      startLevel: 4,
      timeLimit: 60,
      scoreMultiplier: 2,
      speedScale: 1.02,
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
      speedScale: 0.72,
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
      startLevel: 14,
      timeLimit: 0,
      scoreMultiplier: 3,
      speedScale: 1.08,
      gapScale: 0.84,
      spawnScale: 0.72,
      pressure: true,
      pickupEvery: 5,
      allowRevivePickups: false
    }
  };
  const modeInstructions = {
    campaign: {
      title: "Campaign",
      eyebrow: "Main journey",
      art: "campaign",
      badge: "GO",
      modeLine: "Advance through 25 increasingly dangerous levels.",
      goalLine: "Unlock every rung and defeat the Crawler King at the top.",
      points: [
        "Complete a level to unlock the next rung on the campaign ladder.",
        "Large sub-boss crawlers wait at Levels 10 and 20.",
        "Reach Level 25 and face the main boss: the Crawler King."
      ]
    },
    arcade: {
      title: "Arcade",
      eyebrow: "Endless run",
      art: "arcade",
      badge: "RUN",
      modeLine: "An endless mixed route of gates, crawlers, hazards, and power forks.",
      goalLine: "Build Flow by adapting instead of repeating the same gate rhythm.",
      points: [
        "Hold and drag to squeeze and steer; release whenever you need to cool.",
        "Purple Phase and orange Repulsor powers counter dangerous encounters.",
        "Close crawler dodges and perfect gate squeezes build Flow fastest."
      ]
    },
    sprint: {
      title: "60s Sprint",
      eyebrow: "Fast score burst",
      art: "sprint",
      badge: "60S",
      modeLine: "Score as much as possible before the timer ends.",
      goalLine: "This mode is brisker, starts harder, and has no revive pickups.",
      points: [
        "You have 60 seconds, so take clean risks for quick points.",
        "Scores are doubled, but mixed encounters arrive closer together.",
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
      modeLine: "Dense mixed encounters, tight gaps, no revives.",
      goalLine: "Crawlers, hazards, and gates combine for high-multiplier risk.",
      points: [
        "You start deep into the curve with advanced encounter combinations.",
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
  let rewardedReviveOfferSerial = 0;
  let rewardedReviveOfferContext = null;
  let activeRewardedReviveRequest = null;
  let rewardedReviveRequestSerial = 0;
  let rewardedReviveTimeoutMs = 120000;
  let monetizationBusy = false;
  let monetizationCapabilities = null;
  let monetizationRefreshTimer = 0;
  let monetizationRefreshAttempt = 0;
  const monetizationRefreshDelaysMs = [400, 900, 1800, 3600, 7200];
  let finalizedRunsSinceInterstitial = 0;
  let resultTransitionBusy = false;
  const modeBests = readModeBests();
  const campaignProgress = readCampaignProgress();
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
    mode: "campaign",
    seed: campaignSeedValue,
    rng: mulberry32(campaignSeedValue),
    score: 0,
    combo: 1,
    bestCombo: 1,
    overdrive: 0,
    overdriveTime: 0,
    perfects: 0,
    nearMisses: 0,
    pickupsCollected: 0,
    bossGates: 0,
    encountersCleared: 0,
    crawlersDodged: 0,
    crawlersBanished: 0,
    crawlerTypeClears: { scout: 0, hunter: 0, bruiser: 0, subboss: 0, boss: 0 },
    hazardsCleared: 0,
    hazardTypeClears: { wind: 0, heat: 0, minefield: 0 },
    gateTypeClears: { standard: 0, pulse: 0, boss: 0 },
    choicePickups: 0,
    coolCycles: 0,
    pressureWasHot: false,
    overdriveActivations: 0,
    bossClears: 0,
    revivesUsed: 0,
    levelVictory: false,
    runRewardXp: 0,
    runRewardCores: 0,
    runAwarded: false,
    awardSnapshot: { xp: 0, scoreCores: 0, gates: 0, nearMisses: 0, pickups: 0 },
    contractProgress: { gates: 0, crawlers: 0, perfect: 0, pickups: 0 },
    best: modeBests.campaign || 0,
    elapsed: 0,
    timeLeft: 0,
    spawnTimer: 0,
    shake: 0,
    flash: 0,
    levelIndex: 0,
    gatesPassed: 0,
    spawnedGates: 0,
    spawnedEncounters: 0,
    pickupChoiceId: 0,
    revives: 1,
    shieldCharges: 0,
    pulseCharges: 0,
    effects: {
      slow: 0,
      coolant: 0,
      phase: 0,
      magnet: 0,
      double: 0
    },
    gates: [],
    crawlers: [],
    hazards: [],
    pickups: [],
    particles: [],
    pulseWaves: [],
    trail: [],
    bossLevelsSpawned: new Set(),
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
    campaignStartLevel: 0,
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

  const lifecycleDebugEnabled = queryParams.has("lifecycleDebug")
    || window.__SQUEEZE_RUSH_LIFECYCLE_DEBUG__ === true;
  const runLifecycle = window.SqueezeRushRunLifecycle.createController(state, {
    logger(kind, detail) {
      if (lifecycleDebugEnabled && window.console?.debug) {
        window.console.debug(`[Squeeze Rush lifecycle] ${kind}`, detail);
      }
    }
  });

  window.SqueezeRushLifecycle = Object.freeze({
    phases: runLifecycle.phases,
    events: runLifecycle.events,
    on: runLifecycle.on,
    off: runLifecycle.off,
    snapshot: runLifecycle.snapshot
  });

  setup();

  function setup() {
    const requestedMode = queryParams.get("autoplay");
    const afterStartup = () => {
      if (queryParams.has("autoplay")) {
        showInstructions(requestedMode === "random" ? "arcade" : requestedMode || "campaign");
        return;
      }

      showMenu();
    };

    // Arm the splash exit before initializing the optional HUD and canvas effects.
    // That keeps a recoverable rendering problem from trapping players here.
    if (!trailerCapture) {
      showStartupSplash(afterStartup);
    }

    campaignLabel.textContent = `${levels.length}-stage campaign`;
    if (trailerCapture) {
      document.documentElement.classList.add("trailer-capture");
      document.body.classList.add("trailer-capture");
    }
    fitCanvas();
    renderCampaignLadder();
    bindInput();
    updateModeBestBadges();
    renderCareer();
    renderContracts();
    updateSoundButton();
    updateHud();
    draw(0);
    loop(0);

    if (debugMode) {
      window.__squeezeRushDebug = {
        state,
        player,
        input,
        levels,
        pickupTypes,
        start: mode => startRun(mode || "arcade"),
        startCampaignLevel: levelNumber => {
          state.campaignStartLevel = clamp(Math.floor(Number(levelNumber) || 1) - 1, 0, levels.length - 1);
          startRun("campaign");
        },
        finishCampaignLevel: () => completeCampaignLevel(),
        checkCampaignObjective,
        continueCampaign,
        spawnCrawler: type => spawnCrawler(currentLevel(), type || "scout"),
        spawnHazard: type => spawnHazard(currentLevel(), type || "wind"),
        spawnChoice: () => spawnPickupChoice(currentLevel(), width * 0.5),
        grant: type => collectPickup({ x: player.x, y: player.y, color: "#f7f4ea", type, choiceId: 0 }),
        snapshot: () => ({
          running: state.running,
          score: state.score,
          encounters: state.encountersCleared,
          gates: state.gates.length,
          crawlers: state.crawlers.map(item => item.type),
          level: state.levelIndex + 1,
          campaignStartLevel: state.campaignStartLevel + 1,
          levelVictory: state.levelVictory,
          objective: campaignObjectiveSnapshot(),
          hazards: state.hazards.map(item => item.type),
          pickups: state.pickups.map(item => item.type),
          speed: worldSpeed(),
          effects: { ...state.effects },
          pulseCharges: state.pulseCharges
        })
      };
    }

    if (trailerCapture) {
      state.splashing = false;
      menu.classList.remove("visible");
      instructions.classList.remove("visible");
      gameOver.classList.remove("visible");
      countdownOverlay.classList.remove("visible");
      brandSplash.classList.remove("is-visible");
      brandSplash.setAttribute("aria-hidden", "true");
      startRun("campaign");
      if (autoRecordTrailer) {
        window.setTimeout(startTrailerRecording, 350);
      }
      return;
    }

  }

  function startTrailerRecording() {
    if (!canvas.captureStream || typeof MediaRecorder === "undefined") {
      document.body.dataset.captureState = "unsupported";
      return;
    }

    const stream = canvas.captureStream(60);
    const mimeCandidates = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm"
    ];
    const mimeType = mimeCandidates.find(type => MediaRecorder.isTypeSupported(type)) || "";
    const options = { videoBitsPerSecond: 30000000 };
    if (mimeType) {
      options.mimeType = mimeType;
    }

    const chunks = [];
    const recorder = new MediaRecorder(stream, options);
    window.__squeezeRushCapture = { recorder, stream, state: "recording" };
    document.body.dataset.captureState = "recording";

    recorder.addEventListener("dataavailable", event => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    });

    recorder.addEventListener("error", () => {
      window.__squeezeRushCapture.state = "error";
      document.body.dataset.captureState = "error";
    });

    recorder.addEventListener("stop", async () => {
      const blob = new Blob(chunks, { type: mimeType || "video/webm" });
      window.__squeezeRushCapture.state = "uploading";
      document.body.dataset.captureState = "uploading";
      try {
        const response = await fetch(trailerUploadPath, {
          method: "POST",
          headers: {
            "Content-Type": blob.type || "video/webm",
            "X-Squeeze-Rush-Width": String(canvas.width),
            "X-Squeeze-Rush-Height": String(canvas.height),
            "X-Squeeze-Rush-Fps": "60"
          },
          body: blob
        });
        if (!response.ok) {
          throw new Error(`Capture upload failed: ${response.status}`);
        }
        window.__squeezeRushCapture.state = "complete";
        window.__squeezeRushCapture.bytes = blob.size;
        document.body.dataset.captureState = "complete";
      } catch (error) {
        window.__squeezeRushCapture.state = "error";
        window.__squeezeRushCapture.error = String(error);
        document.body.dataset.captureState = "error";
      } finally {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
    });

    recorder.start(500);
    window.setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop();
      }
    }, trailerDurationSeconds * 1000);
  }

  function bindInput() {
    window.addEventListener("resize", fitCanvas, { passive: true });
    window.visualViewport?.addEventListener("resize", fitCanvas, { passive: true });

    for (const button of modeButtons) {
      button.addEventListener("click", () => {
        const mode = button.dataset.mode || "campaign";
        if (mode === "campaign") {
          showCampaignMap();
          return;
        }
        showInstructions(mode);
      });
    }
    campaignMapBackBtn?.addEventListener("click", showMenu);
    campaignStartBtn?.addEventListener("click", () => showInstructions("campaign"));
    nextLevelBtn?.addEventListener("click", continueCampaign);
    replayLevelBtn?.addEventListener("click", replayCampaignLevel);
    victoryMapBtn?.addEventListener("click", leaveVictoryForMap);
    campaignLadder?.addEventListener("click", event => {
      const card = event.target?.closest?.("[data-campaign-level]");
      if (!card || card.classList.contains("locked")) return;
      selectCampaignLevel(Number(card.dataset.campaignLevel) - 1);
    });
    campaignLadder?.addEventListener("keydown", event => {
      if (event.code !== "Enter" && event.code !== "Space") return;
      const card = event.target?.closest?.("[data-campaign-level]");
      if (!card || card.classList.contains("locked")) return;
      event.preventDefault();
      selectCampaignLevel(Number(card.dataset.campaignLevel) - 1);
    });
    reviveBtn.addEventListener("click", reviveRun);
    rewardedReviveBtn.addEventListener("click", requestRewardedRevive);
    retryBtn.addEventListener("click", retryRun);
    menuBtn.addEventListener("click", leaveResultForMenu);
    shareBtn.addEventListener("click", shareScore);
    closeGameBtn.addEventListener("click", closeGame);
    instructionOkBtn.addEventListener("click", () => beginCountdown(state.mode));
    instructionBackBtn.addEventListener("click", showMenu);
    soundToggleBtn.addEventListener("click", toggleSound);
    removeAdsBtn.addEventListener("click", purchaseRemoveAds);
    restorePurchasesBtn.addEventListener("click", restorePurchases);
    privacyOptionsBtn.addEventListener("click", presentPrivacyOptions);

    document.addEventListener("pointerdown", unlockAudio, { passive: true });

    const blockBrowserGesture = event => {
      event.preventDefault();
    };

    const blockAppTouchMove = event => {
      if (event.target?.closest?.("[data-scrollable]")) {
        return;
      }
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
      if (!state.running && !state.splashing && !state.instructing && !state.countingDown && !state.levelVictory && !menu.classList.contains("visible") && !gameOver.classList.contains("visible")) {
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
      if (event.code === "Escape" && campaignMap?.classList.contains("visible")) {
        event.preventDefault();
        showMenu();
        return;
      }

      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        input.keyboard = true;
      }

      if (event.code === "Enter" && state.instructing) {
        beginCountdown(state.mode);
        return;
      }

      if (event.code === "Enter" && !state.running && !state.splashing && !state.countingDown && !state.levelVictory) {
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
    width = trailerCapture ? trailerWidth : Math.max(320, Math.floor(window.innerWidth));
    height = trailerCapture ? trailerHeight : Math.max(520, Math.floor(window.visualViewport?.height || window.innerHeight));
    dpr = trailerCapture ? 1 : Math.min(2.5, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = trailerCapture ? "100vw" : `${width}px`;
    canvas.style.height = trailerCapture ? "100vh" : `${height}px`;
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
    campaignMap?.classList.remove("visible");
    campaignMap?.setAttribute("aria-hidden", "true");
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

  function showCampaignMap() {
    if (state.splashing || state.countingDown) {
      return;
    }

    if (!campaignMap) {
      showInstructions("campaign");
      return;
    }

    clearSplashTimers();
    clearCountdownTimers();
    state.mode = "campaign";
    state.best = bestForMode("campaign");
    state.running = false;
    state.over = false;
    state.levelVictory = false;
    state.instructing = false;
    state.countingDown = false;
    input.active = false;
    input.keyboard = false;
    input.pointerId = null;
    menu.classList.remove("visible");
    instructions.classList.remove("visible");
    gameOver.classList.remove("visible");
    levelVictory?.classList.remove("visible");
    levelVictory?.setAttribute("aria-hidden", "true");
    countdownOverlay.classList.remove("visible");
    countdownOverlay.setAttribute("aria-hidden", "true");
    brandSplash.classList.remove("is-visible");
    brandSplash.setAttribute("aria-hidden", "true");
    campaignMap.classList.add("visible");
    campaignMap.setAttribute("aria-hidden", "false");
    updateCampaignStars();
    selectCampaignLevel(highestUnlockedCampaignLevel());
    if (campaignMapScroll) {
      campaignMapScroll.focus();
      campaignMapScroll.scrollTop = 0;
    }
    updateHud();
  }

  function renderCampaignLadder() {
    if (!campaignLadder || campaignLadder.dataset.rendered === "true") {
      return;
    }

    const sceneClasses = ["first-steps", "crawler-alley", "unstable-works", "shadow-surge", "the-gauntlet"];
    const shortDescriptions = [
      "Wide gates · Gentle speed",
      "Blue hunters · Moving lanes",
      "Heat bursts · Crosswinds",
      "Crawler packs · Minefields",
      "Layered gates · Rising pressure"
    ];

    for (let index = 5; index < levels.length; index += 1) {
      const level = levels[index];
      const challenge = campaignChallenges[index];
      const levelNumber = index + 1;
      const sceneClass = level.bossType ? "shadow-surge" : sceneClasses[index % sceneClasses.length];
      const article = document.createElement("article");
      article.className = `campaign-rung ${sceneClass}${level.bossType ? ` boss-rung ${level.bossType}` : ""}`;
      article.dataset.campaignLevel = String(levelNumber);
      article.style.setProperty("--level-accent", level.accent);
      article.style.setProperty("--level-glow", hexToRgba(level.accent, 0.34));
      const bossLabel = level.bossType === "boss" ? "Main Boss" : (level.bossType === "subboss" ? "Sub Boss" : "");
      const description = challenge?.description || (level.bossType === "boss"
        ? "Giant boss · Final showdown"
        : (level.bossType === "subboss" ? "Large crawler · Boss arena" : shortDescriptions[index % shortDescriptions.length]));
      article.innerHTML = `${campaignSceneMarkup(sceneClass, level.bossType, level.name)}
        <div class="campaign-rung-copy">
          <span class="campaign-level-tag">Level ${levelNumber}${bossLabel ? ` · ${bossLabel}` : ""}</span>
          <h3>${level.name}</h3>
          <p>${description}</p>
          <div class="campaign-star-row" data-star-level="${index}"><span>★</span><span>★</span><span>★</span><em>Next</em></div>
          <div class="campaign-level-progress" data-progress-level="${index}" role="progressbar" aria-label="${level.name} completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span>0%</span></div>
        </div>`;
      campaignLadder.insertBefore(article, campaignSummit || null);
    }

    for (const card of campaignLadder.querySelectorAll("[data-campaign-level]")) {
      card.setAttribute("role", "button");
      const levelIndex = Number(card.dataset.campaignLevel) - 1;
      const challengeCopy = campaignChallenges[levelIndex];
      const description = card.querySelector(".campaign-rung-copy p");
      if (description && challengeCopy) description.textContent = challengeCopy.description;
      if (card.querySelector(".campaign-lock")) continue;
      const lock = document.createElement("div");
      lock.className = "campaign-lock";
      lock.innerHTML = "<span aria-hidden=\"true\">LOCKED</span><strong></strong>";
      card.appendChild(lock);
    }

    campaignStarRows = [...document.querySelectorAll("[data-star-level]")];
    campaignProgressRows = [...document.querySelectorAll("[data-progress-level]")];
    campaignLadder.dataset.rendered = "true";
  }

  function campaignSceneMarkup(sceneClass, bossType, name) {
    if (bossType) {
      return `<div class="campaign-scene scene-shadow-surge boss-scene ${bossType}" role="img" aria-label="Large ${name} crawler boss">
        <span class="scene-warning-ring ring-one"></span><span class="scene-warning-ring ring-two"></span>
        <span class="scene-crawler-sprite crawler-main boss-preview"></span><span class="scene-runner"></span></div>`;
    }
    if (sceneClass === "crawler-alley") {
      return `<div class="campaign-scene scene-crawler-alley" role="img" aria-label="Blue crawler patrol"><span class="scene-grid"></span><span class="scene-crawler-sprite crawler-main"></span><span class="scene-crawler-sprite crawler-echo"></span><span class="scene-runner"></span></div>`;
    }
    if (sceneClass === "unstable-works") {
      return `<div class="campaign-scene scene-unstable-works" role="img" aria-label="Animated heat vents"><span class="scene-grid"></span><span class="scene-vent vent-one"><i></i></span><span class="scene-vent vent-two"><i></i></span><span class="scene-vent vent-three"><i></i></span><span class="scene-runner"></span></div>`;
    }
    if (sceneClass === "shadow-surge") {
      return `<div class="campaign-scene scene-shadow-surge" role="img" aria-label="Crawler warning zone"><span class="scene-warning-ring ring-one"></span><span class="scene-warning-ring ring-two"></span><span class="scene-crawler-sprite crawler-main"></span><span class="scene-crawler-sprite crawler-flank"></span><span class="scene-runner"></span></div>`;
    }
    if (sceneClass === "the-gauntlet") {
      return `<div class="campaign-scene scene-gauntlet" role="img" aria-label="Layered steel gates"><span class="scene-grid"></span><span class="scene-gate gate-left rear"></span><span class="scene-gate gate-right rear"></span><span class="scene-gate gate-left front"></span><span class="scene-gate gate-right front"></span><span class="scene-danger-core"></span><span class="scene-runner"></span></div>`;
    }
    return `<div class="campaign-scene scene-first-steps" role="img" aria-label="Steel gate route"><span class="scene-grid"></span><span class="scene-gate gate-left"></span><span class="scene-gate gate-right"></span><span class="scene-runner"></span></div>`;
  }

  function selectCampaignLevel(levelIndex) {
    const nextIndex = clamp(Math.floor(Number(levelIndex) || 0), 0, levels.length - 1);
    const card = campaignLadder?.querySelector(`[data-campaign-level="${nextIndex + 1}"]`);
    if (card?.classList.contains("locked")) return;
    state.campaignStartLevel = nextIndex;
    for (const item of campaignLadder?.querySelectorAll("[data-campaign-level]") || []) {
      item.classList.toggle("selected", item === card);
    }
    if (campaignStartBtn) campaignStartBtn.textContent = `Play Level ${nextIndex + 1}: ${levels[nextIndex].name}`;
  }

  function showInstructions(mode) {
    const nextMode = modeConfigs[mode] ? mode : "campaign";
    if (state.splashing || state.countingDown) {
      return;
    }

    clearSplashTimers();
    clearCountdownTimers();
    state.instructing = true;
    state.running = false;
    state.over = false;
    state.levelVictory = false;
    state.countingDown = false;
    state.mode = nextMode;
    state.best = bestForMode(nextMode);
    input.active = false;
    input.keyboard = false;
    input.pointerId = null;
    applyInstruction(nextMode);
    menu.classList.remove("visible");
    campaignMap?.classList.remove("visible");
    campaignMap?.setAttribute("aria-hidden", "true");
    gameOver.classList.remove("visible");
    levelVictory?.classList.remove("visible");
    levelVictory?.setAttribute("aria-hidden", "true");
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
    const copy = modeInstructions[mode] || modeInstructions.campaign;
    if (mode === "campaign") {
      const levelIndex = clamp(state.campaignStartLevel, 0, levels.length - 1);
      const level = levels[levelIndex];
      const challenge = campaignChallenges[levelIndex];
      instructionEyebrow.textContent = `Level ${levelIndex + 1} mission`;
      instructionTitle.textContent = level.name;
      instructionModeLine.textContent = challenge.title;
      instructionGoalLine.textContent = challenge.description;
      instructionPointOne.textContent = challenge.tip;
      instructionPointTwo.textContent = "Your target and live progress stay visible during the whole level.";
      instructionPointThree.textContent = level.bossType ? "Clear the boss to win this level and unlock the next rung." : "Finish this mission to earn victory and unlock the next rung.";
      instructionArt.className = "instruction-art campaign";
      instructionArt.querySelector(".guide-arrow").textContent = "TARGET";
      return;
    }
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
    const nextMode = modeConfigs[mode] ? mode : "campaign";
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
    campaignMap?.classList.remove("visible");
    campaignMap?.setAttribute("aria-hidden", "true");
    gameOver.classList.remove("visible");
    levelVictory?.classList.remove("visible");
    levelVictory?.setAttribute("aria-hidden", "true");
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

    invalidateRewardedReviveFlow();
    resultTransitionBusy = false;
    state.mode = modeConfigs[mode] ? mode : "campaign";
    const config = currentMode();
    const campaignStartIndex = state.mode === "campaign"
      ? clamp(state.campaignStartLevel, 0, levels.length - 1)
      : config.startLevel;
    state.seed = config.seed();
    state.rng = mulberry32(state.seed);
    if (trailerCapture) {
      state.seed = hashString("squeeze-rush-premium-trailer-v3");
      state.rng = mulberry32(state.seed);
    }
    state.running = true;
    state.over = false;
    state.levelVictory = false;
    state.instructing = false;
    state.countingDown = false;
    state.score = state.mode === "campaign" ? levels[campaignStartIndex].score : 0;
    state.combo = 1;
    state.bestCombo = 1;
    state.overdrive = 0;
    state.overdriveTime = 0;
    state.perfects = 0;
    state.nearMisses = 0;
    state.pickupsCollected = 0;
    state.bossGates = 0;
    state.encountersCleared = 0;
    state.crawlersDodged = 0;
    state.crawlersBanished = 0;
    state.crawlerTypeClears = { scout: 0, hunter: 0, bruiser: 0, subboss: 0, boss: 0 };
    state.hazardsCleared = 0;
    state.hazardTypeClears = { wind: 0, heat: 0, minefield: 0 };
    state.gateTypeClears = { standard: 0, pulse: 0, boss: 0 };
    state.choicePickups = 0;
    state.coolCycles = 0;
    state.pressureWasHot = false;
    state.overdriveActivations = 0;
    state.bossClears = 0;
    state.revivesUsed = 0;
    state.runRewardXp = 0;
    state.runRewardCores = 0;
    state.runAwarded = false;
    state.awardSnapshot = { xp: 0, scoreCores: 0, gates: 0, nearMisses: 0, pickups: 0 };
    state.contractProgress = { gates: 0, crawlers: 0, perfect: 0, pickups: 0 };
    state.best = bestForMode(state.mode);
    state.elapsed = 0;
    state.timeLeft = config.timeLimit;
    state.spawnTimer = trailerCapture ? 0.18 : 0.62;
    state.shake = 0;
    state.flash = 0;
    state.levelIndex = trailerCapture ? 2 : campaignStartIndex;
    state.gatesPassed = 0;
    state.spawnedGates = 0;
    state.spawnedEncounters = 0;
    state.pickupChoiceId = 0;
    state.revives = config.revives;
    state.shieldCharges = state.mode === "zen" ? 1 : 0;
    state.pulseCharges = 0;
    state.effects.slow = 0;
    state.effects.coolant = 0;
    state.effects.phase = 0;
    state.effects.magnet = 0;
    state.effects.double = 0;
    state.gates.length = 0;
    state.crawlers.length = 0;
    state.hazards.length = 0;
    state.pickups.length = 0;
    state.particles.length = 0;
    state.pulseWaves.length = 0;
    state.trail.length = 0;
    state.bossLevelsSpawned.clear();
    state.lastGateCenter = width * 0.5;
    state.pendingReason = "";
    player.x = width * 0.5;
    player.y = height * 0.72;
    player.squeeze = 0;
    player.pressure = 0;
    player.invulnerable = trailerCapture ? trailerDurationSeconds + 2 : 0.65;
    input.x = player.x;
    runLifecycle.startRun({
      mode: state.mode,
      startingLevel: state.levelIndex,
      startingRevives: state.revives
    });
    spawnLevelBoss(currentLevel());
    if (debugMode && debugScenario) applyDebugScenario(debugScenario);
    menu.classList.remove("visible");
    instructions.classList.remove("visible");
    campaignMap?.classList.remove("visible");
    campaignMap?.setAttribute("aria-hidden", "true");
    gameOver.classList.remove("visible");
    levelVictory?.classList.remove("visible");
    levelVictory?.setAttribute("aria-hidden", "true");
    countdownOverlay.classList.remove("visible");
    countdownOverlay.setAttribute("aria-hidden", "true");
    brandSplash.classList.remove("is-visible");
    brandSplash.setAttribute("aria-hidden", "true");
    reviveBtn.classList.add("hidden");
    rewardedReviveBtn.classList.add("hidden");
    retryBtn.classList.add("primary");
    showToast(config.label);
    playSound("start");
    haptic("light");
    updateHud();
  }

  function applyDebugScenario(scenario) {
    state.spawnTimer = 60;
    player.invulnerable = 120;
    if (scenario === "crawlers") {
      addCrawler("scout", width * 0.24, currentLevel(), height * 0.18);
      addCrawler("hunter", width * 0.5, currentLevel(), height * 0.34);
      addCrawler("bruiser", width * 0.76, currentLevel(), height * 0.5);
    } else if (scenario === "hazards") {
      spawnHazard(currentLevel(), "wind");
      state.hazards[state.hazards.length - 1].y = height * 0.2;
      spawnHazard(currentLevel(), "heat");
      state.hazards[state.hazards.length - 1].y = height * 0.4;
      spawnHazard(currentLevel(), "minefield");
      state.hazards[state.hazards.length - 1].y = height * 0.58;
    } else if (scenario === "powers") {
      spawnPickupChoice(currentLevel(), width * 0.5);
      for (const pickup of state.pickups) pickup.y = height * 0.32;
      state.effects.phase = 30;
      state.effects.magnet = 30;
      state.pulseCharges = 2;
      state.effects.double = 30;
    } else if (scenario === "collect-phase") {
      state.pickups.push({ x: player.x, y: player.y, radius: 19, type: "phase", label: "Phase", short: "PH", color: "#b98cff", spin: 0, choiceId: 0, collected: false });
    } else if (scenario === "repulsor") {
      player.invulnerable = 0;
      state.pulseCharges = 1;
      addCrawler("scout", player.x, currentLevel(), player.y);
    } else if (scenario === "flow-guide") {
      spawnGate(currentLevel(), "standard");
      const guideGate = state.gates[state.gates.length - 1];
      guideGate.y = player.y - height * 0.24;
      guideGate.gapX = width * 0.5;
      guideGate.baseX = guideGate.gapX;
      player.x = guideGate.gapX;
      input.x = player.x;
    }
  }

  function endRun(reason) {
    if (!state.running) {
      return;
    }

    const canTokenRevive = state.revives > 0 && reason !== "timeup";
    const resultSequence = runLifecycle.beginResult(reason, canTokenRevive);
    if (resultSequence === null) {
      return;
    }

    invalidateRewardedReviveFlow();
    state.running = false;
    state.over = true;
    state.levelVictory = false;
    state.pendingReason = reason;
    state.shake = Math.max(state.shake, 16);
    state.flash = 1;
    rumble();
    playSound("crash");

    saveCampaignAttemptProgress();
    saveBestIfNeeded();
    awardRunProgress();

    const modeLabel = currentMode().label;
    state.lastShareText = `I scored ${state.score} and cleared ${state.encountersCleared} mixed encounters in Squeeze Rush ${modeLabel}. Can you outplay me?`;

    finalScore.textContent = String(state.score);
    resultLine.textContent = resultText(reason);
    resultGates.textContent = String(state.encountersCleared);
    resultPerfect.textContent = String(state.perfects);
    resultCombo.textContent = `x${state.bestCombo}`;
    rewardLine.textContent = `+${state.runRewardXp} XP  +${state.runRewardCores} Cores`;
    reviveBtn.classList.toggle("hidden", !canTokenRevive);
    reviveBtn.textContent = `Revive x${state.revives}`;
    rewardedReviveBtn.classList.add("hidden");
    retryBtn.classList.toggle("primary", !canTokenRevive);
    gameOver.classList.add("visible");
    renderCareer();
    renderContracts();
    updateHud();
    runLifecycle.resultShown(resultSequence, {
      reason,
      canTokenRevive,
      score: state.score,
      xpReward: state.accumulatedXpReward,
      coreReward: state.accumulatedCoreReward
    });

    if (canTokenRevive) {
      return;
    }

    if (isRewardedReviveProductEligible(resultSequence) && nativeBridgeAvailable()) {
      refreshRewardedReviveOffer(resultSequence);
      return;
    }

    const finalReason = reason === "timeup" ? "timeup" : `no_revive:${reason}`;
    finalizeCurrentRun(finalReason, resultSequence);
  }

  function reviveRun() {
    const resultSequence = state.resultSequence;
    if (activeRewardedReviveRequest || state.running || !runLifecycle.reviveWithToken(resultSequence)) {
      return;
    }

    state.revivesUsed += 1;
    continueRunAfterRevive();
  }

  function continueRunAfterRevive() {
    invalidateRewardedReviveFlow();
    state.running = true;
    state.over = false;
    state.pendingReason = "";
    state.flash = 0;
    state.shake = 0;
    state.combo = Math.max(1, Math.floor(state.combo * 0.5));
    state.gates = state.gates.filter(gate => gate.y < player.y - height * 0.2 || gate.y > player.y + height * 0.24);
    state.crawlers = state.crawlers.filter(crawler => crawler.y < player.y - height * 0.2 || crawler.y > player.y + height * 0.24);
    state.hazards = state.hazards.filter(hazard => hazard.y < player.y - height * 0.24 || hazard.y > player.y + height * 0.28);
    state.pickups = state.pickups.filter(pickup => pickup.y < player.y - height * 0.18 || pickup.y > player.y + height * 0.22);
    player.pressure = 0;
    player.squeeze = 0;
    player.invulnerable = 2.2;
    input.active = false;
    input.keyboard = false;
    gameOver.classList.remove("visible");
    reviveBtn.classList.add("hidden");
    rewardedReviveBtn.classList.add("hidden");
    retryBtn.classList.add("primary");
    burst(player.x, player.y, "#ff5a5f", 42, 0.9);
    showToast("Revived");
    playSound("revive");
    haptic("medium");
    updateHud();
  }

  function nativeBridgeAvailable() {
    try {
      return Boolean(window.SqueezeRushNative
        && typeof window.SqueezeRushNative.isNativeAvailable === "function"
        && window.SqueezeRushNative.isNativeAvailable());
    } catch (error) {
      return false;
    }
  }

  function modeAllowsRevive() {
    const config = currentMode();
    return config.revives > 0 || config.allowRevivePickups === true;
  }

  function isDeathResult(reason) {
    return ["popped", "smashed", "caught", "mined"].includes(reason);
  }

  function isSamePendingResult(context) {
    const snapshot = runLifecycle.snapshot();
    return Boolean(context
      && snapshot.lifecyclePhase === runLifecycle.phases.RESULT_PENDING
      && !snapshot.runFinalized
      && snapshot.runId === context.runId
      && snapshot.resultSequence === context.resultSequence);
  }

  function isRewardedReviveProductEligible(expectedResultSequence) {
    const snapshot = runLifecycle.snapshot();
    return snapshot.lifecyclePhase === runLifecycle.phases.RESULT_PENDING
      && !snapshot.runFinalized
      && snapshot.resultSequence === Number(expectedResultSequence)
      && isDeathResult(state.pendingReason)
      && modeAllowsRevive()
      && state.revives <= 0
      && !snapshot.rewardedReviveUsed
      && !activeRewardedReviveRequest;
  }

  function setResultControlsDisabled(disabled) {
    const value = Boolean(disabled);
    reviveBtn.disabled = value;
    rewardedReviveBtn.disabled = value;
    retryBtn.disabled = value;
    shareBtn.disabled = value;
    menuBtn.disabled = value;
  }

  function setVictoryControlsDisabled(disabled) {
    const value = Boolean(disabled);
    nextLevelBtn.disabled = value;
    replayLevelBtn.disabled = value;
    victoryMapBtn.disabled = value;
  }

  function resetRewardedReviveButton() {
    rewardedReviveBtn.classList.add("hidden");
    rewardedReviveBtn.disabled = false;
    rewardedReviveBtn.textContent = "Watch Ad to Revive";
  }

  function invalidateRewardedReviveFlow() {
    rewardedReviveOfferSerial += 1;
    rewardedReviveOfferContext = null;
    activeRewardedReviveRequest = null;
    resetRewardedReviveButton();
    setResultControlsDisabled(false);
  }

  async function loadNativeCapabilities(refresh = true) {
    if (!nativeBridgeAvailable()) {
      monetizationCapabilities = null;
      return null;
    }
    try {
      const response = await window.SqueezeRushNative.getCapabilities({ refresh, timeoutMs: 5000 });
      monetizationCapabilities = response.status === "success" ? (response.data || {}) : null;
    } catch (error) {
      monetizationCapabilities = null;
    }
    return monetizationCapabilities;
  }

  async function refreshRewardedReviveOffer(expectedResultSequence) {
    const context = Object.freeze({
      runId: state.runId,
      resultSequence: Number(expectedResultSequence)
    });
    const offerSerial = ++rewardedReviveOfferSerial;
    rewardedReviveOfferContext = null;
    resetRewardedReviveButton();

    const capabilities = await loadNativeCapabilities(true);
    if (offerSerial !== rewardedReviveOfferSerial
      || !isSamePendingResult(context)
      || !isRewardedReviveProductEligible(context.resultSequence)) {
      return;
    }

    const available = Boolean(capabilities
      && capabilities.nativeBridge === true
      && capabilities.rewardedAds === true
      && capabilities.canRequestAds === true
      && capabilities.rewardedAdReady === true);
    if (!available) {
      finalizeCurrentRun(`no_rewarded_revive:${state.pendingReason || "result"}`, context.resultSequence);
      return;
    }

    rewardedReviveOfferContext = context;
    rewardedReviveBtn.textContent = "Watch Ad to Revive";
    rewardedReviveBtn.disabled = false;
    rewardedReviveBtn.classList.remove("hidden");
    retryBtn.classList.remove("primary");
  }

  async function requestRewardedRevive() {
    const offerContext = rewardedReviveOfferContext;
    if (!offerContext
      || activeRewardedReviveRequest
      || !isSamePendingResult(offerContext)
      || !isRewardedReviveProductEligible(offerContext.resultSequence)) {
      return;
    }

    rewardedReviveRequestSerial += 1;
    const request = Object.freeze({
      serial: rewardedReviveRequestSerial,
      runId: offerContext.runId,
      resultSequence: offerContext.resultSequence
    });
    activeRewardedReviveRequest = request;
    rewardedReviveOfferContext = null;
    setResultControlsDisabled(true);
    rewardedReviveBtn.textContent = "Loading Ad...";

    let response = null;
    try {
      response = await window.SqueezeRushNative.request(
        window.SqueezeRushNative.actions.REWARDED_SHOW,
        { placement: "revive" },
        { timeoutMs: rewardedReviveTimeoutMs }
      );
    } catch (error) {
      response = null;
    }

    settleRewardedReviveRequest(request, response);
  }

  function settleRewardedReviveRequest(request, response) {
    if (activeRewardedReviveRequest !== request) {
      return;
    }
    activeRewardedReviveRequest = null;

    if (!isSamePendingResult(request)) {
      resetRewardedReviveButton();
      return;
    }

    const contextMatches = Boolean(response && response.context
      && response.context.runId === request.runId
      && response.context.resultSequence === request.resultSequence
      && response.context.lifecyclePhase === runLifecycle.phases.RESULT_PENDING);
    const verifiedEarnedRevive = Boolean(response
      && response.status === "success"
      && response.data
      && response.data.earned === true
      && response.data.placement === "revive"
      && contextMatches);

    if (verifiedEarnedRevive && runLifecycle.reviveWithRewarded(request.resultSequence)) {
      state.revivesUsed += 1;
      continueRunAfterRevive();
      return;
    }

    rewardedReviveOfferContext = null;
    resetRewardedReviveButton();
    setResultControlsDisabled(false);
    retryBtn.classList.add("primary");
    showToast(rewardedReviveFailureMessage(response));
  }

  function rewardedReviveFailureMessage(response) {
    if (!response) return "Ad unavailable";
    if (response.status === "cancelled") return "Ad closed";
    if (response.status === "timeout") return "Ad timed out";
    if (response.status === "stale") return "Result changed";
    if (response.status === "failed") return "Ad failed";
    if (response.status === "unavailable") return "Ad unavailable";
    if (response.status === "success") return "Reward not earned";
    return "Ad unavailable";
  }

  function finalizeCurrentRun(reason, resultSequence) {
    const finalized = runLifecycle.finalize(reason, resultSequence);
    if (finalized) {
      finalizedRunsSinceInterstitial += 1;
    }
    return finalized;
  }

  function completeResultAction(action) {
    if (activeRewardedReviveRequest || resultTransitionBusy) {
      return false;
    }
    const resultSequence = state.resultSequence;
    const resultReason = state.pendingReason || "result";
    if (!runLifecycle.claimResultAction(resultSequence, action)) {
      return false;
    }
    if (!state.runFinalized) {
      finalizeCurrentRun(`declined_${action}:${resultReason}`, resultSequence);
    }
    invalidateRewardedReviveFlow();
    return true;
  }

  async function maybePresentNaturalBreakInterstitial() {
    if (finalizedRunsSinceInterstitial < 3 || !nativeBridgeAvailable()) {
      return false;
    }

    const capabilities = await loadNativeCapabilities(true);
    const available = Boolean(capabilities
      && capabilities.interstitialAds === true
      && capabilities.canRequestAds === true
      && capabilities.interstitialAdReady === true
      && capabilities.removeAdsEntitled !== true);
    if (!available) {
      return false;
    }

    try {
      const response = await window.SqueezeRushNative.request(
        window.SqueezeRushNative.actions.INTERSTITIAL_SHOW,
        { placement: "run_end" },
        { timeoutMs: 120000 }
      );
      if (response.status === "success") {
        finalizedRunsSinceInterstitial = 0;
        return true;
      }
    } catch (error) {
      // A failed optional ad must never block the next game screen.
    }
    return false;
  }

  async function retryRun() {
    if (!completeResultAction("retry")) {
      return;
    }
    resultTransitionBusy = true;
    setResultControlsDisabled(true);
    await maybePresentNaturalBreakInterstitial();
    resultTransitionBusy = false;
    setResultControlsDisabled(false);
    showInstructions(state.mode);
  }

  async function leaveResultForMenu() {
    if (!completeResultAction("menu")) {
      return;
    }
    resultTransitionBusy = true;
    setResultControlsDisabled(true);
    await maybePresentNaturalBreakInterstitial();
    resultTransitionBusy = false;
    setResultControlsDisabled(false);
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
    levelVictory?.classList.remove("visible");
    levelVictory?.setAttribute("aria-hidden", "true");
    reviveBtn.classList.add("hidden");
    invalidateRewardedReviveFlow();
    campaignMap?.classList.remove("visible");
    campaignMap?.setAttribute("aria-hidden", "true");
    menu.classList.add("visible");
    state.running = false;
    state.levelVictory = false;
    state.splashing = false;
    state.instructing = false;
    state.countingDown = false;
    updateModeBestBadges();
    renderCareer();
    renderContracts();
    refreshMonetization();
  }

  function setMonetizationBusy(value) {
    monetizationBusy = Boolean(value);
    removeAdsBtn.disabled = monetizationBusy || monetizationCapabilities?.purchases !== true;
    restorePurchasesBtn.disabled = monetizationBusy;
    privacyOptionsBtn.disabled = monetizationBusy;
  }

  function cancelMonetizationRefresh(resetAttempts = false) {
    if (monetizationRefreshTimer) {
      clearTimeout(monetizationRefreshTimer);
      monetizationRefreshTimer = 0;
    }
    if (resetAttempts) {
      monetizationRefreshAttempt = 0;
    }
  }

  function scheduleMonetizationRefresh() {
    if (monetizationRefreshTimer
      || monetizationRefreshAttempt >= monetizationRefreshDelaysMs.length) {
      return;
    }

    const delay = monetizationRefreshDelaysMs[monetizationRefreshAttempt];
    monetizationRefreshAttempt += 1;
    monetizationRefreshTimer = window.setTimeout(() => {
      monetizationRefreshTimer = 0;
      refreshMonetization();
    }, delay);
  }

  async function refreshMonetization() {
    const capabilities = await loadNativeCapabilities(true);
    if (!capabilities) {
      monetizationActions.classList.add("hidden");
      cancelMonetizationRefresh(true);
      return;
    }

    const purchaseServiceAvailable = capabilities.restorePurchases === true
      || capabilities.entitlements === true
      || capabilities.purchases === true;
    const productReady = capabilities.purchases === true;
    const removeAdsEntitled = capabilities.removeAdsEntitled === true;
    const visible = purchaseServiceAvailable
      || capabilities.privacyOptionsRequired === true;
    monetizationActions.classList.toggle("hidden", !visible);
    removeAdsBtn.classList.toggle("hidden", !purchaseServiceAvailable || removeAdsEntitled);
    restorePurchasesBtn.classList.toggle("hidden", capabilities.restorePurchases !== true);
    privacyOptionsBtn.classList.toggle("hidden", capabilities.privacyOptionsRequired !== true);
    removeAdsBtn.disabled = monetizationBusy || !productReady;

    if (removeAdsEntitled) {
      removeAdsBtn.textContent = "Remove Ads";
      purchaseStatus.textContent = "Ads removed on this Apple ID. Rewarded revives remain optional.";
      cancelMonetizationRefresh(true);
      return;
    }

    if (productReady) {
      removeAdsBtn.textContent = capabilities.removeAdsPrice
        ? `Remove Ads ${capabilities.removeAdsPrice}`
        : "Remove Ads";
      purchaseStatus.textContent = "Purchases are restored from your store account.";
      cancelMonetizationRefresh(true);
      return;
    }

    const refreshExhausted = monetizationRefreshAttempt >= monetizationRefreshDelaysMs.length;
    removeAdsBtn.textContent = refreshExhausted ? "Remove Ads — Unavailable" : "Remove Ads — Loading…";
    purchaseStatus.textContent = refreshExhausted
      ? "Remove Ads is not available from the App Store yet."
      : "Connecting to the App Store…";
    scheduleMonetizationRefresh();
  }

  async function purchaseRemoveAds() {
    if (monetizationBusy || !nativeBridgeAvailable()) return;
    setMonetizationBusy(true);
    purchaseStatus.textContent = "Opening the App Store...";
    try {
      const response = await window.SqueezeRushNative.request(
        window.SqueezeRushNative.actions.PURCHASE_BUY,
        {},
        { timeoutMs: 120000 }
      );
      purchaseStatus.textContent = response.status === "success" && response.data?.removeAdsEntitled === true
        ? "Purchase complete. Ads removed."
        : response.status === "cancelled" ? "Purchase cancelled." : "Purchase is not available yet.";
    } catch (error) {
      purchaseStatus.textContent = "Purchase is not available yet.";
    } finally {
      setMonetizationBusy(false);
      await refreshMonetization();
    }
  }

  async function restorePurchases() {
    if (monetizationBusy || !nativeBridgeAvailable()) return;
    setMonetizationBusy(true);
    purchaseStatus.textContent = "Restoring purchases...";
    try {
      const response = await window.SqueezeRushNative.request(
        window.SqueezeRushNative.actions.PURCHASE_RESTORE,
        {},
        { timeoutMs: 120000 }
      );
      purchaseStatus.textContent = response.status === "success" && response.data?.removeAdsEntitled === true
        ? "Purchase restored. Ads removed."
        : "No previous Remove Ads purchase was found.";
    } catch (error) {
      purchaseStatus.textContent = "Restore could not be completed.";
    } finally {
      setMonetizationBusy(false);
      await refreshMonetization();
    }
  }

  async function presentPrivacyOptions() {
    if (monetizationBusy || !nativeBridgeAvailable()) return;
    setMonetizationBusy(true);
    try {
      await window.SqueezeRushNative.request(
        window.SqueezeRushNative.actions.CONSENT_STATUS,
        { operation: "presentPrivacyOptions" },
        { timeoutMs: 120000 }
      );
    } finally {
      setMonetizationBusy(false);
      await refreshMonetization();
    }
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
    state.effects.phase = Math.max(0, state.effects.phase - dt);
    state.effects.magnet = Math.max(0, state.effects.magnet - dt);
    state.effects.double = Math.max(0, state.effects.double - dt);
    state.overdriveTime = Math.max(0, state.overdriveTime - dt);
    if (state.overdriveTime > 0) {
      state.flash = Math.max(state.flash, 0.06);
    }

    if (trailerCapture && state.running) {
      updateTrailerDirector();
    }

    player.targetSqueeze = input.active || input.keyboard ? 1 : 0;
    player.squeeze = approach(player.squeeze, player.targetSqueeze, dt * 12);
    const heatRate = state.effects.coolant > 0 ? 0.18 : 0.44;
    const coolRate = state.effects.coolant > 0 ? 1.34 : 0.92;
    player.pressure = clamp(player.pressure + (player.targetSqueeze ? dt * heatRate : -dt * coolRate), 0, 1.04);
    if (state.effects.coolant > 0) {
      player.pressure = Math.min(player.pressure, 0.82);
    }
    if (debugPressureOverride !== null) {
      player.pressure = debugPressureOverride;
    }
    if (state.running && state.mode === "campaign") {
      if (player.pressure >= 0.62) {
        state.pressureWasHot = true;
      } else if (state.pressureWasHot && player.pressure <= 0.18) {
        state.pressureWasHot = false;
        state.coolCycles += 1;
        showToast(`COOLED ${state.coolCycles} TIME${state.coolCycles === 1 ? "" : "S"}`);
      }
    }

    const baseW = trailerCapture ? 172 : Math.min(86, width * 0.21);
    const baseH = trailerCapture ? 108 : Math.min(54, height * 0.08);
    player.width = lerp(baseW, baseW * 0.43, easeOutCubic(player.squeeze));
    player.height = lerp(baseH, baseH * 1.82, easeOutCubic(player.squeeze));

    const targetX = trailerCapture ? input.x : (input.active ? input.x : player.x + Math.sin(state.elapsed * 1.6) * 0.08);
    const followSpeed = trailerCapture ? (input.active ? 3.8 : 2.8) : (input.active ? 11 : 2.2);
    player.x = approach(player.x, clamp(targetX, 36, width - 36), dt * followSpeed);
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
      if (!state.running) return;
      updateCrawlers(dt);
      if (!state.running) return;
      updateHazards(dt);
      if (!state.running) return;
      updatePickups(dt);
      checkCampaignObjective();
      updateHud();
    }

    updateParticles(dt);
    state.trail.unshift({
      x: player.x,
      y: player.y,
      w: player.width,
      h: player.height,
      life: trailerCapture ? 0.72 : 0.42,
      squeeze: player.squeeze
    });

    for (const mark of state.trail) {
      mark.life -= dt;
    }
    state.trail = state.trail.filter(mark => mark.life > 0).slice(0, trailerCapture ? 22 : 10);
  }

  function updateTrailerDirector() {
    let nextGate = null;
    for (const gate of state.gates) {
      if (!gate.passed && (!nextGate || gate.y > nextGate.y)) {
        nextGate = gate;
      }
    }

    if (!nextGate) {
      input.active = false;
      return;
    }

    input.x = nextGate.gapX;
    const entering = nextGate.y > player.y - height * 0.22;
    const leaving = nextGate.y < player.y + player.height * 0.85;
    input.active = entering && leaving;
  }

  function updateGates(dt) {
    const level = currentLevel();
    const speed = worldSpeed();
    state.spawnTimer -= dt;

    if (state.spawnTimer <= 0) {
      const delayScale = spawnEncounter(level);
      state.spawnTimer = trailerCapture
        ? 1.12 + (state.spawnedGates % 5 === 0 ? 0.16 : 0)
        : level.spawn * currentMode().spawnScale * delayScale + randomRange(-0.07, 0.08);
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
          if (state.effects.phase > 0) {
            gate.passed = true;
            scoreGate(gate, true);
            continue;
          }
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
    const trailerSpeed = trailerCapture ? 1.04 : 1;
    const scorePace = Math.min(state.score, 800) * 0.28;
    return (height * level.speed + scorePace) * currentMode().speedScale * slowFactor * rushFactor * trailerSpeed;
  }

  function currentMode() {
    return modeConfigs[state.mode] || modeConfigs.campaign;
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
    if (state.mode === "campaign") {
      return;
    }
    const nextLevel = levelIndexForScore(state.score);
    if (nextLevel > state.levelIndex) {
      state.levelIndex = nextLevel;
      burst(player.x, player.y - player.height, currentLevel().accent, 36, 0.8);
      showToast(`Level ${state.levelIndex + 1}: ${currentLevel().name}`);
      spawnLevelBoss(currentLevel());
    }
  }

  function currentCampaignChallenge() {
    return campaignChallenges[state.levelIndex] || campaignChallenges[0];
  }

  function campaignObjectiveValue(challenge = currentCampaignChallenge()) {
    const values = {
      gates: state.gatesPassed,
      crawlers: state.crawlersDodged + state.crawlersBanished,
      hazards: state.hazardsCleared,
      nearMisses: state.nearMisses,
      perfects: state.perfects,
      pickups: state.pickupsCollected,
      windClears: state.hazardTypeClears.wind,
      minefieldClears: state.hazardTypeClears.minefield,
      bestCombo: state.bestCombo,
      bossClears: state.bossClears,
      standardGates: state.gateTypeClears.standard,
      heatClears: state.hazardTypeClears.heat,
      coolCycles: state.coolCycles,
      overdrives: state.overdriveActivations,
      pulseGates: state.gateTypeClears.pulse,
      hunterClears: state.crawlerTypeClears.hunter,
      choicePickups: state.choicePickups,
      bruiserClears: state.crawlerTypeClears.bruiser,
      survival: state.elapsed,
      bossGates: state.gateTypeClears.boss,
      encounters: state.encountersCleared
    };
    return Math.max(0, Number(values[challenge.metric]) || 0);
  }

  function campaignObjectiveRatio(challenge = currentCampaignChallenge()) {
    return clamp(campaignObjectiveValue(challenge) / Math.max(1, challenge.target), 0, 1);
  }

  function campaignObjectiveLabel(challenge, value = campaignObjectiveValue(challenge)) {
    if (challenge.metric === "bossClears") {
      return value >= challenge.target ? "Boss defeated" : "Boss active";
    }
    if (challenge.metric === "bestCombo") {
      return `Flow x${Math.floor(value)} / x${challenge.target}`;
    }
    if (challenge.metric === "survival") {
      return `${Math.min(challenge.target, Math.floor(value))} / ${challenge.target} seconds`;
    }
    return `${Math.min(challenge.target, Math.floor(value))} / ${challenge.target} ${challenge.unit}`;
  }

  function campaignObjectiveSnapshot() {
    const challenge = currentCampaignChallenge();
    const value = campaignObjectiveValue(challenge);
    return {
      level: state.levelIndex + 1,
      title: challenge.title,
      description: challenge.description,
      value,
      target: challenge.target,
      ratio: campaignObjectiveRatio(challenge),
      label: campaignObjectiveLabel(challenge, value)
    };
  }

  function checkCampaignObjective() {
    if (state.mode !== "campaign" || !state.running || state.levelVictory) return;
    const challenge = currentCampaignChallenge();
    if (campaignObjectiveValue(challenge) >= challenge.target) {
      completeCampaignLevel();
    }
  }

  function saveCampaignAttemptProgress() {
    if (state.mode !== "campaign") return;
    const levelIndex = state.levelIndex;
    const ratio = campaignObjectiveRatio();
    if (ratio > (campaignProgress.bestProgress[levelIndex] || 0)) {
      campaignProgress.bestProgress[levelIndex] = ratio;
      writeCampaignProgress();
    }
  }

  function campaignVictoryStars(challenge) {
    let stars = 1;
    if (state.revivesUsed === 0) stars += 1;
    if (state.elapsed <= challenge.par) stars += 1;
    return clamp(stars, 1, 3);
  }

  function completeCampaignLevel() {
    if (state.mode !== "campaign" || state.levelVictory) return;
    const levelIndex = state.levelIndex;
    const level = levels[levelIndex];
    const challenge = campaignChallenges[levelIndex];
    if (!challenge) return;
    const resultSequence = runLifecycle.beginResult("campaign_complete", false);
    if (resultSequence === null) return;

    state.running = false;
    state.over = false;
    state.levelVictory = true;
    input.active = false;
    input.keyboard = false;
    input.pointerId = null;
    campaignProgress.completed[levelIndex] = true;
    campaignProgress.bestProgress[levelIndex] = 1;
    const earnedStars = campaignVictoryStars(challenge);
    campaignProgress.stars[levelIndex] = Math.max(campaignProgress.stars[levelIndex] || 0, earnedStars);
    const formerTime = Number(campaignProgress.bestTimes[levelIndex]);
    campaignProgress.bestTimes[levelIndex] = Number.isFinite(formerTime) && formerTime > 0
      ? Math.min(formerTime, state.elapsed)
      : state.elapsed;
    writeCampaignProgress();

    const completionScore = campaignStarScores[levelIndex][2];
    if (completionScore > bestForMode("campaign")) {
      modeBests.campaign = completionScore;
      state.best = Math.max(state.best, completionScore);
      writeModeBests();
    }
    awardRunProgress();
    state.lastShareText = `I completed Squeeze Rush Level ${levelIndex + 1}, ${level.name}, with ${earnedStars} stars.`;

    victoryEyebrow.textContent = levelIndex === levels.length - 1 ? "Campaign complete" : `Level ${levelIndex + 1} complete`;
    victoryTitle.textContent = levelIndex === levels.length - 1 ? "Crawler King Defeated!" : "Mission Victory!";
    victoryMission.textContent = `${challenge.title} · ${challenge.description}`;
    victoryTarget.textContent = campaignObjectiveLabel(challenge, challenge.target);
    victoryTime.textContent = `${state.elapsed.toFixed(1)}s`;
    victoryScore.textContent = String(state.score);
    victoryCombo.textContent = `x${state.bestCombo}`;
    const starIcons = [...victoryStars.querySelectorAll("span")];
    starIcons.forEach((star, index) => star.classList.toggle("earned", index < earnedStars));
    victoryStars.setAttribute("aria-label", `${earnedStars} of 3 stars earned`);
    if (levelIndex < levels.length - 1) {
      victoryUnlock.textContent = `Level ${levelIndex + 2}: ${levels[levelIndex + 1].name} unlocked!`;
      nextLevelBtn.textContent = "Next Level";
    } else {
      victoryUnlock.textContent = "All 25 campaign missions complete!";
      nextLevelBtn.textContent = "View Completed Ladder";
    }
    levelVictory.classList.add("visible");
    levelVictory.setAttribute("aria-hidden", "false");
    updateModeBestBadges();
    renderCareer();
    renderContracts();
    updateHud();
    runLifecycle.resultShown(resultSequence, {
      reason: "campaign_complete",
      canTokenRevive: false,
      score: state.score,
      xpReward: state.accumulatedXpReward,
      coreReward: state.accumulatedCoreReward
    });
    finalizeCurrentRun("campaign_complete", resultSequence);
    burst(player.x, player.y, level.accent, levelIndex === levels.length - 1 ? 100 : 64, 1.2);
    playSound("perfect");
    haptic("success");
  }

  async function continueCampaign() {
    if (!completeResultAction("next_level")) return;
    setVictoryControlsDisabled(true);
    await maybePresentNaturalBreakInterstitial();
    setVictoryControlsDisabled(false);
    const nextIndex = state.levelIndex + 1;
    levelVictory.classList.remove("visible");
    levelVictory.setAttribute("aria-hidden", "true");
    state.levelVictory = false;
    if (nextIndex >= levels.length) {
      showCampaignMap();
      return;
    }
    selectCampaignLevel(nextIndex);
    showInstructions("campaign");
  }

  async function replayCampaignLevel() {
    if (!completeResultAction("replay_level")) return;
    setVictoryControlsDisabled(true);
    await maybePresentNaturalBreakInterstitial();
    setVictoryControlsDisabled(false);
    const levelIndex = state.levelIndex;
    levelVictory.classList.remove("visible");
    levelVictory.setAttribute("aria-hidden", "true");
    state.levelVictory = false;
    selectCampaignLevel(levelIndex);
    showInstructions("campaign");
  }

  async function leaveVictoryForMap() {
    if (!completeResultAction("campaign_map")) return;
    setVictoryControlsDisabled(true);
    await maybePresentNaturalBreakInterstitial();
    setVictoryControlsDisabled(false);
    showCampaignMap();
  }

  function campaignLevelUnlocked(levelIndex) {
    return levelIndex === 0 || Boolean(campaignProgress.completed[levelIndex - 1]);
  }

  function highestUnlockedCampaignLevel() {
    let levelIndex = 0;
    while (levelIndex < levels.length - 1 && campaignProgress.completed[levelIndex]) {
      levelIndex += 1;
    }
    return levelIndex;
  }

  function spawnLevelBoss(level) {
    if (state.mode !== "campaign" || !level.bossType) return;
    const levelNumber = state.levelIndex + 1;
    if (state.bossLevelsSpawned.has(levelNumber)) return;
    state.bossLevelsSpawned.add(levelNumber);
    state.gates.length = 0;
    state.crawlers.length = 0;
    state.hazards.length = 0;
    state.pickups.length = 0;
    state.spawnTimer = level.spawn * 2.4;
    const type = level.bossType;
    addCrawler(type, width * 0.5, level, type === "boss" ? -170 : -138);
    state.flash = Math.max(state.flash, type === "boss" ? 0.75 : 0.45);
    state.shake = Math.max(state.shake, type === "boss" ? 12 : 7);
    showToast(type === "boss" ? "MAIN BOSS: CRAWLER KING" : `SUB-BOSS: ${level.name.toUpperCase()}`);
    haptic(type === "boss" ? "heavy" : "medium");
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

  function spawnEncounter(level) {
    if (trailerCapture) {
      spawnGate(level);
      return 1;
    }

    state.spawnedEncounters += 1;
    const encounterNumber = state.spawnedEncounters;
    const roll = state.rng();
    let rewardLane = { center: width * 0.5, gapW: width * 0.58 };
    let delayScale = 1;
    const guidedEncounter = state.mode === "campaign"
      ? spawnCampaignChallengeEncounter(level, currentCampaignChallenge(), encounterNumber)
      : null;

    if (guidedEncounter) {
      rewardLane = guidedEncounter.rewardLane;
      delayScale = guidedEncounter.delayScale;
    } else if (encounterNumber <= 3 || encounterNumber % 6 === 0) {
      rewardLane = spawnGate(level);
    } else if (encounterNumber % 7 === 0 || roll < level.crawlerChance) {
      rewardLane = spawnCrawler(level, encounterNumber % 14 === 0 ? "pack" : "");
      delayScale = 1.14;
    } else if (encounterNumber >= 5 && (encounterNumber % 11 === 0 || roll < level.crawlerChance + level.hazardChance)) {
      rewardLane = spawnHazard(level);
      delayScale = 1.18;
    } else {
      rewardLane = spawnGate(level);
    }

    if (!guidedEncounter?.pickupHandled && encounterNumber > 2 && encounterNumber % currentMode().pickupEvery === 0) {
      if (encounterNumber % (currentMode().pickupEvery * 2) === 0) {
        spawnPickupChoice(level, rewardLane.center);
      } else {
        spawnPickup(rewardLane.center, rewardLane.gapW, level);
      }
    }

    return delayScale;
  }

  function spawnCampaignChallengeEncounter(level, challenge, encounterNumber) {
    if (!challenge || challenge.spawn === "mixed") return null;
    const gateLane = forcedType => spawnGate(level, forcedType);
    const guided = (rewardLane, delayScale = 1, pickupHandled = false) => ({ rewardLane, delayScale, pickupHandled });

    if (challenge.spawn === "boss") {
      return guided({ center: width * 0.5, gapW: width * 0.72 }, 1.55, true);
    }
    if (challenge.spawn === "standardGate" || challenge.spawn === "precisionGate" || challenge.spawn === "cooling") {
      return guided(gateLane("standard"), 0.96);
    }
    if (challenge.spawn === "pulseGate") {
      return guided(gateLane("pulse"), 1.02);
    }
    if (challenge.spawn === "bossGate") {
      return guided(gateLane("boss"), 1.12);
    }
    if (challenge.spawn === "flowGate") {
      return guided(gateLane(encounterNumber % 3 === 0 ? "pulse" : "standard"), 0.9);
    }
    if (challenge.spawn === "pickup") {
      const rewardLane = gateLane("standard");
      spawnPickup(rewardLane.center, rewardLane.gapW, level);
      return guided(rewardLane, 1.03, true);
    }
    if (challenge.spawn === "choice") {
      const rewardLane = gateLane("standard");
      spawnPickupChoice(level, rewardLane.center);
      return guided(rewardLane, 1.08, true);
    }
    if (challenge.spawn === "crawler" || challenge.spawn === "hunter" || challenge.spawn === "bruiser") {
      if (encounterNumber % 3 === 0) return guided(gateLane("standard"), 0.94);
      const forcedType = challenge.spawn === "crawler" ? "" : challenge.spawn;
      return guided(spawnCrawler(level, forcedType), 1.08);
    }
    if (["wind", "heat", "minefield", "hazardMix"].includes(challenge.spawn)) {
      if (encounterNumber % 2 === 0) return guided(gateLane("standard"), 0.92);
      const hazardTypes = ["wind", "heat", "minefield"];
      const forcedType = challenge.spawn === "hazardMix"
        ? hazardTypes[Math.floor(encounterNumber / 2) % hazardTypes.length]
        : challenge.spawn;
      return guided(spawnHazard(level, forcedType), 1.12);
    }
    return null;
  }

  function spawnCrawler(level, forcedType = "") {
    if (forcedType === "pack") {
      addCrawler("scout", width * 0.31, level, -62);
      addCrawler("scout", width * 0.69, level, -82);
      return { center: width * 0.5, gapW: width * 0.34 };
    }

    let type = forcedType;
    if (!type) {
      const roll = state.rng();
      type = state.levelIndex >= 2 && roll > 0.76 ? "bruiser" : (state.levelIndex >= 1 && roll > 0.43 ? "hunter" : "scout");
    }
    const edge = type === "bruiser" ? 54 : 46;
    const x = randomRange(edge, width - edge);
    addCrawler(type, x, level, -68);
    return { center: x, gapW: width * (type === "bruiser" ? 0.46 : 0.58) };
  }

  function addCrawler(type, x, level, y) {
    const sizes = {
      scout: { w: 42, h: 54, speed: 0.88, color: "#8c5bff" },
      hunter: { w: 48, h: 60, speed: 0.82, color: "#ff6b6b" },
      bruiser: { w: 58, h: 68, speed: 0.72, color: "#ff9f43" },
      subboss: { w: 102, h: 120, speed: 0.56, color: "#9b6cff" },
      boss: { w: 136, h: 158, speed: 0.48, color: "#ff5470" }
    };
    const profile = sizes[type] || sizes.scout;
    state.crawlers.push({
      type,
      x,
      baseX: x,
      y,
      width: profile.w,
      height: profile.h,
      speedScale: profile.speed,
      color: profile.color || level.accent,
      phase: randomRange(0, Math.PI * 2),
      amp: type === "scout" ? randomRange(24, Math.min(56, width * 0.16)) : (type === "boss" || type === "subboss" ? randomRange(5, 11) : randomRange(8, 18)),
      locked: false,
      warned: false,
      passed: false,
      defeated: false
    });
  }

  function updateCrawlers(dt) {
    const speed = worldSpeed();
    for (const crawler of state.crawlers) {
      crawler.phase += dt;
      crawler.y += speed * crawler.speedScale * dt;
      if (crawler.defeated) continue;

      if (crawler.type === "scout") {
        crawler.x = clamp(crawler.baseX + Math.sin(crawler.phase * 2.35) * crawler.amp, 30, width - 30);
      } else if (crawler.type === "hunter") {
        if (!crawler.locked && crawler.y < height * 0.48) {
          crawler.x = approach(crawler.x, player.x, dt * 0.78);
          crawler.baseX = crawler.x;
        } else {
          if (!crawler.locked) {
            crawler.locked = true;
            showToast("HUNTER LOCKED — MOVE");
          }
          crawler.x = crawler.baseX + Math.sin(crawler.phase * 5.4) * 4;
        }
      } else {
        crawler.x = clamp(crawler.baseX + Math.sin(crawler.phase * 1.4) * crawler.amp, 34, width - 34);
      }

      if (!crawler.warned && crawler.y > 34) {
        crawler.warned = true;
        showToast(crawler.type === "boss" ? "CRAWLER KING DESCENDING" : (crawler.type === "subboss" ? "SUB-BOSS APPROACHING" : (crawler.type === "bruiser" ? "BRUISER APPROACHING" : (crawler.type === "hunter" ? "HUNTER TRACKING" : "CRAWLER AHEAD"))));
      }

      if (!crawler.passed && crawler.y > player.y + crawler.height * 0.58) {
        crawler.passed = true;
        scoreCrawler(crawler, false, "dodge");
        continue;
      }

      if (!crawler.passed && player.invulnerable <= 0 && overlapsCrawler(crawler)) {
        const method = neutralizeThreat(crawler, "Crawler", crawler.color);
        if (method) {
          scoreCrawler(crawler, true, method);
          continue;
        }
        burst(player.x, player.y, "#ff5a5f", 38, 1.15);
        endRun("caught");
        return;
      }
    }
    state.crawlers = state.crawlers.filter(crawler => crawler.y < height + 110 && !crawler.defeated);
  }

  function overlapsCrawler(crawler) {
    const dx = Math.abs(crawler.x - player.x);
    const dy = Math.abs(crawler.y - player.y);
    return dx < crawler.width * 0.42 + player.width * 0.43 && dy < crawler.height * 0.4 + player.height * 0.42;
  }

  function neutralizeThreat(threat, label, color) {
    let method = "";
    if (state.effects.phase > 0) {
      method = "phase";
    } else if (state.pulseCharges > 0) {
      state.pulseCharges -= 1;
      method = "pulse";
    } else if (state.shieldCharges > 0) {
      state.shieldCharges -= 1;
      state.combo = Math.max(1, state.combo - 1);
      method = "shield";
    }
    if (!method) return "";

    threat.defeated = true;
    threat.passed = true;
    player.invulnerable = 0.42;
    state.shake = Math.max(state.shake, method === "pulse" ? 8 : 5);
    if (method === "pulse") {
      state.pulseWaves.push({
        x: threat.x || player.x,
        y: threat.y || player.y,
        life: 0.72,
        maxLife: 0.72
      });
    }
    burst(threat.x || player.x, threat.y || player.y, color, method === "pulse" ? 48 : 30, 0.92);
    showToast(method === "phase" ? `PHASED THROUGH ${label.toUpperCase()}` : (method === "pulse" ? `REPULSOR BLAST: ${label.toUpperCase()}` : `SHIELD BLOCKED ${label.toUpperCase()}`));
    playSound(method === "pulse" ? "pulse" : "shield");
    haptic(method === "pulse" ? "success" : "heavy");
    updateHud();
    return method;
  }

  function scoreCrawler(crawler, banished, method) {
    if (crawler.counted) return;
    crawler.counted = true;
    const clearance = Math.abs(crawler.x - player.x) - (crawler.width + player.width) * 0.5;
    const closeDodge = !banished && clearance < 22;
    const bossBonus = crawler.type === "boss" ? 40 : (crawler.type === "subboss" ? 20 : 0);
    state.encountersCleared += 1;
    state.contractProgress.crawlers += 1;
    state.crawlerTypeClears[crawler.type] = (state.crawlerTypeClears[crawler.type] || 0) + 1;
    if (crawler.type === "boss" || crawler.type === "subboss") {
      state.bossClears += 1;
    }
    if (banished) {
      state.crawlersBanished += 1;
      state.combo = Math.min(12, state.combo + (method === "pulse" ? 2 : 1));
      chargeOverdrive(method === "pulse" ? 22 : 14);
      addScore((method === "pulse" ? 6 : 4) + bossBonus);
    } else {
      state.crawlersDodged += 1;
      state.combo = Math.min(12, state.combo + (closeDodge ? 2 : 1));
      chargeOverdrive(closeDodge ? 24 : 10);
      addScore(3 + (crawler.type === "hunter" ? 2 : 0) + bossBonus + (closeDodge ? state.combo : 0));
      if (closeDodge) {
        state.nearMisses += 1;
        showToast("SHADOW STEP");
        playSound("near");
        haptic("light");
      }
    }
    if (crawler.type === "boss" || crawler.type === "subboss") {
      showToast(crawler.type === "boss" ? "MAIN BOSS CLEARED!" : "SUB-BOSS CLEARED!");
      burst(crawler.x, crawler.y, crawler.color, crawler.type === "boss" ? 72 : 52, 1.2);
    }
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    updateHud();
  }

  function spawnHazard(level, forcedType = "") {
    const choices = state.levelIndex < 1 ? ["wind"] : (state.levelIndex < 2 ? ["wind", "heat"] : ["wind", "heat", "minefield"]);
    const type = forcedType || choices[Math.floor(state.rng() * choices.length)];
    const hazard = {
      type,
      y: -92,
      x: width * 0.5,
      h: type === "wind" ? 96 : 76,
      radius: clamp(width * 0.12, 32, 48),
      direction: state.rng() > 0.5 ? 1 : -1,
      phase: randomRange(0, Math.PI * 2),
      warned: false,
      triggered: false,
      passed: false,
      defeated: false,
      color: type === "wind" ? "#4cc9f0" : (type === "heat" ? "#ff9f43" : "#ff5a8a"),
      mines: []
    };

    if (type === "heat") {
      hazard.x = randomRange(54, width - 54);
    } else if (type === "minefield") {
      const safeX = randomRange(width * 0.3, width * 0.7);
      const safeW = clamp(width * 0.32, 92, 142);
      const leftMine = safeX - safeW * 0.5 - 28;
      const rightMine = safeX + safeW * 0.5 + 28;
      if (leftMine > 24) hazard.mines.push({ x: leftMine, radius: 23, dead: false });
      if (rightMine < width - 24) hazard.mines.push({ x: rightMine, radius: 23, dead: false });
      hazard.x = safeX;
      hazard.safeW = safeW;
    }
    state.hazards.push(hazard);
    return { center: hazard.x, gapW: type === "minefield" ? hazard.safeW : width * 0.56 };
  }

  function updateHazards(dt) {
    const speed = worldSpeed();
    for (const hazard of state.hazards) {
      hazard.phase += dt;
      hazard.y += speed * (hazard.type === "wind" ? 0.76 : 0.86) * dt;
      const touchingBand = Math.abs(hazard.y - player.y) < hazard.h * 0.5 + player.height * 0.42;

      if (!hazard.warned && hazard.y > 38) {
        hazard.warned = true;
        showToast(hazard.type === "wind" ? "CROSSWIND — COUNTERSTEER" : (hazard.type === "heat" ? "HEAT VENT — KEEP CLEAR" : "MINEFIELD — FIND THE LANE"));
      }

      if (!hazard.passed && touchingBand) {
        if (hazard.type === "wind") {
          player.x = clamp(player.x + hazard.direction * dt * 92, 34, width - 34);
          if (!hazard.triggered) {
            hazard.triggered = true;
            haptic("light");
          }
        } else if (hazard.type === "heat" && player.invulnerable <= 0 && state.effects.phase <= 0 && circleHitsPlayer(hazard.x, hazard.y, hazard.radius)) {
          player.pressure = clamp(player.pressure + dt * 0.7, 0, 1.04);
          state.flash = Math.max(state.flash, 0.08);
          if (!hazard.triggered) {
            hazard.triggered = true;
            showToast("PRESSURE RISING");
            haptic("medium");
          }
        } else if (hazard.type === "minefield") {
          if (player.invulnerable > 0) continue;
          for (const mine of hazard.mines) {
            if (mine.dead || !circleHitsPlayer(mine.x, hazard.y, mine.radius)) continue;
            const threat = { x: mine.x, y: hazard.y, passed: false, defeated: false };
            const method = neutralizeThreat(threat, "Mine", hazard.color);
            if (method) {
              mine.dead = true;
              addScore(2);
              continue;
            }
            burst(player.x, player.y, hazard.color, 42, 1.1);
            endRun("mined");
            return;
          }
        }
      }

      if (!hazard.passed && hazard.y > player.y + hazard.h * 0.6) {
        hazard.passed = true;
        scoreHazard(hazard);
      }
    }
    state.hazards = state.hazards.filter(hazard => hazard.y < height + 120);
  }

  function circleHitsPlayer(x, y, radius) {
    const nearestX = clamp(x, player.x - player.width * 0.42, player.x + player.width * 0.42);
    const nearestY = clamp(y, player.y - player.height * 0.42, player.y + player.height * 0.42);
    const dx = x - nearestX;
    const dy = y - nearestY;
    return dx * dx + dy * dy < radius * radius;
  }

  function scoreHazard(hazard) {
    if (hazard.counted) return;
    hazard.counted = true;
    state.hazardsCleared += 1;
    state.hazardTypeClears[hazard.type] = (state.hazardTypeClears[hazard.type] || 0) + 1;
    state.encountersCleared += 1;
    state.combo = Math.min(12, state.combo + 1);
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    chargeOverdrive(hazard.type === "minefield" ? 14 : 9);
    addScore(hazard.type === "minefield" ? 5 : 3);
    playSound("gate");
    updateHud();
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
      choiceId: 0,
      collected: false
    });
  }

  function spawnPickupChoice(level, center) {
    const config = currentMode();
    const choices = pickupTypes.filter(item => item.type !== "revive" || config.allowRevivePickups);
    const first = choices[Math.floor(state.rng() * choices.length)];
    let second = choices[Math.floor(state.rng() * choices.length)];
    while (second.type === first.type && choices.length > 1) {
      second = choices[Math.floor(state.rng() * choices.length)];
    }
    state.pickupChoiceId += 1;
    const choiceId = state.pickupChoiceId;
    const spread = clamp(width * 0.19, 54, 82);
    for (const [index, type] of [first, second].entries()) {
      state.pickups.push({
        x: clamp(center + (index === 0 ? -spread : spread), 34, width - 34),
        y: -82,
        radius: 19,
        type: type.type,
        label: type.label,
        short: type.short,
        color: type.color || level.accent,
        spin: randomRange(0, Math.PI * 2),
        choiceId,
        collected: false
      });
    }

  }

  function updatePickups(dt) {
    const speed = worldSpeed();
    for (const pickup of state.pickups) {
      pickup.y += speed * dt;
      pickup.spin += dt * 4.6;

      if (!pickup.collected && state.effects.magnet > 0) {
        const dx = player.x - pickup.x;
        const dy = player.y - pickup.y;
        const distance = Math.hypot(dx, dy);
        if (distance < Math.min(240, height * 0.3)) {
          pickup.x += dx * dt * 2.7;
          pickup.y += dy * dt * 1.25;
        }
      }

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
    if (pickup.choiceId) {
      for (const alternative of state.pickups) {
        if (alternative !== pickup && alternative.choiceId === pickup.choiceId) alternative.collected = true;
      }
    }
    burst(pickup.x, pickup.y, pickup.color, 24, 0.72);
    state.combo = Math.min(9, state.combo + 1);
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.pickupsCollected += 1;
    if (pickup.choiceId) state.choicePickups += 1;
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
    } else if (pickup.type === "phase") {
      state.effects.phase = 5.5;
      showToast("Phase veil: pass through danger");
    } else if (pickup.type === "magnet") {
      state.effects.magnet = 8;
      showToast("Power magnet active");
    } else if (pickup.type === "pulse") {
      state.pulseCharges = Math.min(3, state.pulseCharges + 1);
      showToast("Repulsor charged");
    } else if (pickup.type === "double") {
      state.effects.double = 7;
      showToast("Double score active");
    }

    addScore(2);
    playSound("pickup");
    haptic("medium");
    updateHud();
  }

  function addScore(points) {
    const overdriveMultiplier = state.overdriveTime > 0 ? 2 : 1;
    const powerMultiplier = state.effects.double > 0 ? 2 : 1;
    state.score += Math.max(1, Math.round(points * currentMode().scoreMultiplier * overdriveMultiplier * powerMultiplier));
    updateLevel();
  }

  function spawnGate(level, forcedType = "") {
    if (trailerCapture) {
      return spawnTrailerGate(level);
    }

    const gapScale = currentMode().gapScale;
    const minGap = width * level.gapMin * gapScale;
    const maxGap = width * level.gapMax * gapScale;
    state.spawnedGates += 1;
    const type = forcedType || (state.spawnedGates % 10 === 0 ? "boss" : (state.spawnedGates > 5 && state.rng() < 0.24 ? "pulse" : "standard"));
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

    return { center, gapW };
  }

  function spawnTrailerGate(level) {
    const centers = [0.50, 0.34, 0.67, 0.43, 0.73, 0.31, 0.61, 0.46, 0.70, 0.36, 0.58, 0.49, 0.66, 0.38, 0.55];
    const gaps = [98, 92, 104, 88, 100, 90, 106, 88, 98, 90, 104, 92, 100, 88, 98];
    const index = state.spawnedGates;
    const sequenceIndex = index % centers.length;
    const center = width * centers[sequenceIndex];
    const gateNumber = index + 1;
    const type = gateNumber % 8 === 0 ? "boss" : (gateNumber % 4 === 0 ? "pulse" : "standard");
    const gapW = gaps[sequenceIndex];
    const color = type === "boss" ? "#ff5a5f" : (type === "pulse" ? "#ffd166" : "#20d9ff");

    state.spawnedGates = gateNumber;
    state.lastGateCenter = center;
    state.gates.push({
      y: -72,
      h: type === "boss" ? 156 : 118,
      type,
      gapX: center,
      baseX: center,
      gapW,
      currentGapW: gapW,
      drift: type === "pulse" ? 10 : 0,
      driftSpeed: type === "pulse" ? 1.35 : 0,
      phase: sequenceIndex * 0.73,
      pulse: 0,
      passed: false,
      color
    });

    if (gateNumber > 2 && gateNumber % 4 === 0) {
      spawnPickup(center, gapW, level);
    }
    return { center, gapW };
  }

  function scoreGate(gate, phased = false) {
    const left = player.x - player.width / 2;
    const right = player.x + player.width / 2;
    const clearance = Math.min(left - gapLeft(gate), gapRight(gate) - right);
    const perfect = !phased && clearance >= 0 && clearance <= 7 && player.squeeze >= 0.7 && player.pressure < 0.9;
    const nearMiss = !phased && clearance >= 0 && clearance <= 12;
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
    } else if (phased) {
      state.combo = Math.min(12, state.combo + 1);
      burst(player.x, gate.y, "#b98cff", 22, 0.68);
      chargeOverdrive(10);
      showToast("PHASE GATE");
      playSound("phase");
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
    state.gateTypeClears[gate.type] = (state.gateTypeClears[gate.type] || 0) + 1;
    state.encountersCleared += 1;
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
    for (const wave of state.pulseWaves) wave.life -= dt;
    state.pulseWaves = state.pulseWaves.filter(wave => wave.life > 0);
  }

  function draw(time) {
    const shakeX = state.shake ? randomRange(-state.shake, state.shake) : 0;
    const shakeY = state.shake ? randomRange(-state.shake, state.shake) : 0;

    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.translate(shakeX, shakeY);
    drawBackground(time);
    drawHazards(time);
    drawGates(time);
    drawCrawlers(time);
    drawPickups(time);
    drawFlowGuide(time);
    drawPulseWaves();
    drawTrail();
    drawPlayer(time);
    drawParticles();
    ctx.restore();

    if (trailerCapture) {
      drawTrailerLens(time);
    }

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 90, 95, ${state.flash * 0.24})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function drawBackground(time) {
    if (trailerCapture) {
      drawTrailerBackground(time);
      return;
    }

    const level = currentLevel();
    const levelSkies = [
      ["#75d9ff", "#dff8ff", "#fff0b8"],
      ["#75e6d0", "#dffcf4", "#e7f3ff"],
      ["#ffca68", "#fff0bd", "#dff5ff"],
      ["#ff8dad", "#f8d9ff", "#bdeaff"],
      ["#ff985f", "#ffe0a8", "#c7e7ff"]
    ];
    const skyColors = levelSkies[state.levelIndex % levelSkies.length];
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, state.overdriveTime > 0 ? "#a889ff" : skyColors[0]);
    sky.addColorStop(0.52, skyColors[1]);
    sky.addColorStop(1, skyColors[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const levelGlow = ctx.createRadialGradient(width * 0.5, height * 0.35, 20, width * 0.5, height * 0.35, height * 0.72);
    levelGlow.addColorStop(0, hexToRgba(level.accent, 0.22));
    levelGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = levelGlow;
    ctx.fillRect(0, 0, width, height);

    if (state.overdriveTime > 0) {
      const rushGlow = ctx.createRadialGradient(player.x, player.y, 12, player.x, player.y, height * 0.62);
      rushGlow.addColorStop(0, "rgba(255, 209, 102, 0.24)");
      rushGlow.addColorStop(0.45, "rgba(247, 127, 0, 0.08)");
      rushGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = rushGlow;
      ctx.fillRect(0, 0, width, height);
    }

    const grid = 34;
    const offset = (time * 80) % grid;
    ctx.strokeStyle = "rgba(46, 70, 140, 0.085)";
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

  function drawTrailerBackground(time) {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#01040e");
    sky.addColorStop(0.42, state.overdriveTime > 0 ? "#071c31" : "#06152a");
    sky.addColorStop(0.76, "#031020");
    sky.addColorStop(1, "#01030a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const cyanGlow = ctx.createRadialGradient(width * 0.5, height * 0.38, 20, width * 0.5, height * 0.38, height * 0.72);
    cyanGlow.addColorStop(0, "rgba(0, 226, 255, 0.18)");
    cyanGlow.addColorStop(0.38, "rgba(0, 116, 204, 0.09)");
    cyanGlow.addColorStop(1, "rgba(0, 10, 32, 0)");
    ctx.fillStyle = cyanGlow;
    ctx.fillRect(0, 0, width, height);

    const goldGlow = ctx.createRadialGradient(player.x, player.y, 16, player.x, player.y, height * 0.54);
    goldGlow.addColorStop(0, `rgba(255, 195, 0, ${0.11 + player.squeeze * 0.12})`);
    goldGlow.addColorStop(0.34, "rgba(255, 137, 0, 0.045)");
    goldGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = goldGlow;
    ctx.fillRect(0, 0, width, height);

    const vanishingX = width * 0.5;
    const vanishingY = height * 0.27;
    ctx.save();
    ctx.strokeStyle = "rgba(24, 116, 205, 0.15)";
    ctx.lineWidth = 2;
    for (let i = -10; i <= 10; i += 1) {
      ctx.beginPath();
      ctx.moveTo(vanishingX, vanishingY);
      ctx.lineTo(vanishingX + i * width * 0.13, height);
      ctx.stroke();
    }

    const gridPhase = (time * 0.34) % 1;
    for (let i = 0; i < 18; i += 1) {
      const t = ((i / 18) + gridPhase / 18) % 1;
      const eased = t * t;
      const y = vanishingY + eased * (height - vanishingY);
      ctx.globalAlpha = 0.18 + eased * 0.34;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < 38; i += 1) {
      const phase = (time * (0.22 + (i % 5) * 0.018) + i * 0.0713) % 1;
      const xSeed = (Math.sin(i * 91.773) + 1) * 0.5;
      const x = xSeed * width;
      const y = phase * height;
      const length = 34 + (i % 7) * 18;
      const outward = (x - vanishingX) * 0.045;
      ctx.strokeStyle = i % 6 === 0 ? "rgba(255, 195, 0, 0.58)" : "rgba(0, 255, 211, 0.42)";
      ctx.lineWidth = 2 + (i % 3);
      ctx.shadowColor = i % 6 === 0 ? "#ffc300" : "#00ffd5";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + outward, y + length);
      ctx.stroke();
    }
    ctx.restore();

    drawRunway(time);
  }

  function drawTrailerLens(time) {
    if (player.squeeze > 0.55) {
      const flareAlpha = (player.squeeze - 0.55) * (0.12 + Math.sin(time * 11) * 0.025);
      const beam = ctx.createLinearGradient(0, 0, width, 0);
      beam.addColorStop(0, "rgba(255, 185, 0, 0)");
      beam.addColorStop(0.34, `rgba(255, 185, 0, ${flareAlpha})`);
      beam.addColorStop(0.5, `rgba(255, 236, 132, ${flareAlpha * 1.7})`);
      beam.addColorStop(0.66, `rgba(255, 185, 0, ${flareAlpha})`);
      beam.addColorStop(1, "rgba(255, 185, 0, 0)");
      ctx.fillStyle = beam;
      ctx.fillRect(0, player.y - 3, width, 6);
    }

    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.49, height * 0.18, width * 0.5, height * 0.49, height * 0.78);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(0.68, "rgba(0, 4, 14, 0.08)");
    vignette.addColorStop(1, "rgba(0, 0, 8, 0.58)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  function drawRunway(time) {
    const level = currentLevel();
    const laneW = Math.min(220, width * 0.58);
    const left = width / 2 - laneW / 2;
    const right = width / 2 + laneW / 2;
    const gradient = ctx.createLinearGradient(left, 0, right, 0);
    gradient.addColorStop(0, "rgba(76, 201, 240, 0)");
    gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.34)");
    gradient.addColorStop(1, "rgba(46, 230, 166, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(left, 0, laneW, height);

    ctx.strokeStyle = hexToRgba(level.accent, 0.42);
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

  function drawHazards(time) {
    for (const hazard of state.hazards) {
      ctx.save();
      if (hazard.type === "wind") {
        const direction = hazard.direction;
        const alpha = 0.24 + Math.sin(time * 6 + hazard.phase) * 0.06;
        ctx.strokeStyle = `rgba(76, 201, 240, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.setLineDash([18, 12]);
        ctx.lineDashOffset = -time * 90 * direction;
        for (let row = -1; row <= 1; row += 1) {
          const y = hazard.y + row * 26;
          ctx.beginPath();
          ctx.moveTo(direction > 0 ? 10 : width - 10, y);
          ctx.bezierCurveTo(width * 0.32, y - 12, width * 0.68, y + 12, direction > 0 ? width - 10 : 10, y);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        const arrowX = direction > 0 ? width * 0.78 : width * 0.22;
        ctx.fillStyle = "#8eeeff";
        ctx.font = "900 18px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(direction > 0 ? "→" : "←", arrowX, hazard.y + 6);
      } else if (hazard.type === "heat") {
        const pulse = 1 + Math.sin(time * 8 + hazard.phase) * 0.1;
        const gradient = ctx.createRadialGradient(hazard.x, hazard.y, 4, hazard.x, hazard.y, hazard.radius * 1.75 * pulse);
        gradient.addColorStop(0, "rgba(255, 225, 124, 0.82)");
        gradient.addColorStop(0.38, "rgba(255, 112, 46, 0.42)");
        gradient.addColorStop(1, "rgba(255, 90, 95, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(hazard.x - hazard.radius * 2, hazard.y - hazard.radius * 2, hazard.radius * 4, hazard.radius * 4);
        ctx.strokeStyle = "rgba(255, 209, 102, 0.78)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(hazard.x, hazard.y, hazard.radius * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#ffd166";
        ctx.font = "950 9px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("HEAT", hazard.x, hazard.y + 3);
      } else {
        for (const mine of hazard.mines) {
          if (mine.dead) continue;
          const pulse = 1 + Math.sin(time * 9 + hazard.phase + mine.x) * 0.08;
          ctx.shadowColor = hazard.color;
          ctx.shadowBlur = 16;
          ctx.fillStyle = "#251323";
          ctx.beginPath();
          ctx.arc(mine.x, hazard.y, mine.radius * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = hazard.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(mine.x, hazard.y, mine.radius * pulse, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = hazard.color;
          ctx.beginPath();
          ctx.arc(mine.x, hazard.y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = "rgba(46, 230, 166, 0.4)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 9]);
        ctx.strokeRect(hazard.x - hazard.safeW * 0.5, hazard.y - 34, hazard.safeW, 68);
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
  }

  function drawSpriteCrawler(crawler, time, x, y, w, h, gait) {
    if (!crawlerSpriteAtlas.complete || crawlerSpriteAtlas.naturalWidth < crawlerSpriteFrameSize) {
      return false;
    }

    const frameRate = crawler.type === "boss" ? 5.8 : (crawler.type === "subboss" ? 6.8 : (crawler.type === "hunter" ? 11 : (crawler.type === "scout" ? 9.5 : 8)));
    const frame = Math.floor(time * frameRate + crawler.phase * 1.8) % crawlerSpriteFrameCount;
    const sourceX = (frame % 4) * crawlerSpriteFrameSize;
    const sourceY = Math.floor(frame / 4) * crawlerSpriteFrameSize;
    const spriteW = w * 1.62;
    const spriteH = h * 1.54;
    const spriteX = -spriteW * 0.5;
    const spriteY = h * 0.51 - spriteH * 0.76;
    const pulse = 0.9 + Math.sin(time * 4.3 + crawler.phase) * 0.1;
    const glow = crawler.type === "boss" ? "#ff5470" : (crawler.type === "subboss" ? "#b98cff" : (crawler.type === "bruiser" ? "#73e6ff" : (crawler.type === "hunter" ? "#1fc5ff" : "#48dcff")));

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(gait * 0.016);

    const aura = ctx.createRadialGradient(0, 0, w * 0.05, 0, 0, w * 0.9);
    aura.addColorStop(0, `rgba(52, 210, 255, ${0.13 * pulse})`);
    aura.addColorStop(0.52, `rgba(21, 139, 232, ${0.06 * pulse})`);
    aura.addColorStop(1, "rgba(0, 75, 160, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.92, h * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(0, 0, 0, 0.46)";
    ctx.beginPath();
    ctx.ellipse(0, h * 0.48, w * 0.48, h * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(41, 197, 255, ${0.1 * pulse})`;
    ctx.beginPath();
    ctx.ellipse(0, h * 0.47, w * 0.34, h * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.filter = crawler.type === "boss"
      ? "grayscale(1) sepia(1) saturate(6.4) hue-rotate(304deg) brightness(0.82) contrast(1.16)"
      : (crawler.type === "subboss"
        ? "grayscale(1) sepia(1) saturate(5.8) hue-rotate(214deg) brightness(0.78) contrast(1.14)"
        : "grayscale(1) sepia(1) saturate(5.2) hue-rotate(158deg) brightness(0.68) contrast(1.14)");
    ctx.shadowColor = glow;
    ctx.shadowBlur = (crawler.type === "boss" ? 28 : (crawler.type === "subboss" ? 22 : (crawler.type === "hunter" && !crawler.locked ? 17 : 11))) * pulse;
    ctx.drawImage(
      crawlerSpriteAtlas,
      sourceX,
      sourceY,
      crawlerSpriteFrameSize,
      crawlerSpriteFrameSize,
      spriteX,
      spriteY,
      spriteW,
      spriteH
    );
    ctx.filter = "none";
    ctx.shadowBlur = 0;

    // A single chest light carries the blue theme without obscuring the source art.
    ctx.strokeStyle = `rgba(151, 244, 255, ${0.76 + pulse * 0.18})`;
    ctx.lineWidth = crawler.type === "boss" ? 2.4 : (crawler.type === "subboss" ? 2 : (crawler.type === "bruiser" ? 1.7 : 1.25));
    ctx.shadowColor = glow;
    ctx.shadowBlur = 7 * pulse;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.14);
    ctx.lineTo(-w * 0.07, h * 0.22);
    ctx.lineTo(0, h * 0.3);
    ctx.lineTo(w * 0.07, h * 0.22);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (crawler.type === "hunter" && !crawler.locked) {
      ctx.strokeStyle = "rgba(42, 211, 255, 0.36)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 8]);
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(player.x - x, player.y - y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
    return true;
  }

  function drawCrawlers(time) {
    for (const crawler of state.crawlers) {
      if (crawler.defeated) continue;
      const isBoss = crawler.type === "boss" || crawler.type === "subboss";
      const gait = Math.sin(time * (isBoss ? 4.6 : 7.2) + crawler.phase);
      const bob = Math.abs(gait) * 1.6 - 0.8;
      const x = crawler.x;
      const y = crawler.y + bob;
      const w = crawler.width;
      const h = crawler.height;
      const reach = isBoss ? 0.54 : (crawler.type === "bruiser" ? 0.57 : 0.66);
      const bulk = crawler.type === "boss" ? 1.24 : (crawler.type === "subboss" ? 1.18 : (crawler.type === "bruiser" ? 1.12 : (crawler.type === "hunter" ? 0.96 : 0.88)));
      const rim = crawler.type === "boss" ? "#ff6f87" : (crawler.type === "subboss" ? "#c69cff" : (crawler.type === "hunter" ? "#10bfff" : (crawler.type === "bruiser" ? "#70dcff" : "#36d9ff")));
      const bluePulse = 0.9 + Math.sin(time * 4.4 + crawler.phase) * 0.1;

      if (drawSpriteCrawler(crawler, time, x, y, w, h, gait)) {
        continue;
      }

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(gait * 0.018);

      // Bioluminescent aura: wide enough to read on mobile without hiding anatomy.
      const aura = ctx.createRadialGradient(0, -h * 0.06, w * 0.08, 0, -h * 0.06, w * 0.92);
      aura.addColorStop(0, `rgba(45, 205, 255, ${0.12 * bluePulse})`);
      aura.addColorStop(0.46, `rgba(24, 151, 255, ${0.055 * bluePulse})`);
      aura.addColorStop(1, "rgba(0, 91, 180, 0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.03, w * 1.02, h * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();

      // A soft contact shadow makes the painted creature feel planted on the lane.
      ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
      ctx.beginPath();
      ctx.ellipse(0, h * 0.52, w * 0.64, h * 0.105, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(34, 194, 255, ${0.09 * bluePulse})`;
      ctx.beginPath();
      ctx.ellipse(0, h * 0.49, w * 0.47, h * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();

      const limbDark = "#070d14";
      const limbMid = crawler.type === "bruiser" ? "#263744" : "#1a2935";
      const armSwing = gait * h * 0.045;
      const legSwing = gait * w * 0.035;

      // Two weight-bearing legs, with knees and flattened feet.
      drawCrawlerLimb(-w * 0.14, h * 0.19, -w * 0.23 - legSwing, h * 0.36, -w * 0.28 - legSwing, h * 0.49, w * 0.18 * bulk, limbDark, limbMid, rim);
      drawCrawlerLimb(w * 0.14, h * 0.19, w * 0.23 + legSwing, h * 0.36, w * 0.28 + legSwing, h * 0.49, w * 0.18 * bulk, limbDark, limbMid, rim);
      drawCrawlerFoot(-w * 0.28 - legSwing, h * 0.49, -1, w, limbDark, limbMid);
      drawCrawlerFoot(w * 0.28 + legSwing, h * 0.49, 1, w, limbDark, limbMid);

      // Long forearms define the crawler without adding insect-like anatomy.
      drawCrawlerLimb(-w * 0.24, -h * 0.01, -w * reach, h * 0.14 + armSwing, -w * 0.53, h * 0.43 + armSwing, w * 0.17 * bulk, limbDark, limbMid, rim);
      drawCrawlerLimb(w * 0.24, -h * 0.01, w * reach, h * 0.14 - armSwing, w * 0.53, h * 0.43 - armSwing, w * 0.17 * bulk, limbDark, limbMid, rim);
      drawCrawlerHand(-w * 0.53, h * 0.43 + armSwing, -1, w, limbDark, limbMid);
      drawCrawlerHand(w * 0.53, h * 0.43 - armSwing, 1, w, limbDark, limbMid);

      const body = ctx.createLinearGradient(-w * 0.32, -h * 0.28, w * 0.36, h * 0.42);
      body.addColorStop(0, crawler.type === "bruiser" ? "#41515c" : "#344550");
      body.addColorStop(0.34, "#202f3b");
      body.addColorStop(0.72, "#111b24");
      body.addColorStop(1, "#070c12");
      ctx.shadowColor = "rgba(0, 0, 0, 0.72)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(-w * 0.21 * bulk, -h * 0.09);
      ctx.bezierCurveTo(-w * 0.36 * bulk, h * 0.01, -w * 0.39 * bulk, h * 0.28, -w * 0.25 * bulk, h * 0.34);
      ctx.bezierCurveTo(-w * 0.11, h * 0.41, w * 0.11, h * 0.41, w * 0.25 * bulk, h * 0.34);
      ctx.bezierCurveTo(w * 0.39 * bulk, h * 0.28, w * 0.36 * bulk, h * 0.01, w * 0.21 * bulk, -h * 0.09);
      ctx.bezierCurveTo(w * 0.1, -h * 0.14, -w * 0.1, -h * 0.14, -w * 0.21 * bulk, -h * 0.09);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(86, 210, 239, ${0.18 * bluePulse})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Rib and belly forms break up the silhouette like a hand-painted sprite.
      const belly = ctx.createRadialGradient(-w * 0.08, h * 0.08, 1, 0, h * 0.1, w * 0.38);
      belly.addColorStop(0, "rgba(84, 130, 151, 0.34)");
      belly.addColorStop(0.48, "rgba(31, 62, 77, 0.2)");
      belly.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = belly;
      ctx.beginPath();
      ctx.ellipse(0, h * 0.11, w * 0.31 * bulk, h * 0.27, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(93, 210, 244, ${0.08 + bluePulse * 0.05})`;
      ctx.lineWidth = 1;
      for (let rib = 0; rib < 2; rib += 1) {
        const ribY = h * (0.035 + rib * 0.09);
        ctx.beginPath();
        ctx.moveTo(-w * (0.23 + rib * 0.018), ribY);
        ctx.quadraticCurveTo(0, ribY + h * 0.075, w * (0.23 + rib * 0.018), ribY);
        ctx.stroke();
      }

      // Oversized smooth cranium, cheek planes, jaw, brow, nose, and mouth.
      const head = ctx.createRadialGradient(-w * 0.13, -h * 0.35, 1, 0, -h * 0.25, w * 0.5);
      head.addColorStop(0, crawler.type === "bruiser" ? "#526875" : "#405966");
      head.addColorStop(0.42, "#263743");
      head.addColorStop(0.82, "#131f28");
      head.addColorStop(1, "#070c12");
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.moveTo(-w * 0.38, -h * 0.2);
      ctx.bezierCurveTo(-w * 0.49, -h * 0.34, -w * 0.35, -h * 0.49, 0, -h * 0.51);
      ctx.bezierCurveTo(w * 0.35, -h * 0.49, w * 0.49, -h * 0.34, w * 0.38, -h * 0.2);
      ctx.bezierCurveTo(w * 0.29, -h * 0.1, w * 0.16, -h * 0.07, 0, -h * 0.08);
      ctx.bezierCurveTo(-w * 0.16, -h * 0.07, -w * 0.29, -h * 0.1, -w * 0.38, -h * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(104, 214, 239, ${0.2 * bluePulse})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "rgba(3, 3, 5, 0.42)";
      ctx.beginPath();
      ctx.ellipse(-w * 0.15, -h * 0.28, w * 0.13, h * 0.075, -0.18, 0, Math.PI * 2);
      ctx.ellipse(w * 0.15, -h * 0.28, w * 0.13, h * 0.075, 0.18, 0, Math.PI * 2);
      ctx.fill();

      const eyeColor = crawler.type === "hunter" ? "#58e9ff" : "#20cfff";
      ctx.fillStyle = eyeColor;
      ctx.shadowColor = eyeColor;
      ctx.shadowBlur = (crawler.type === "hunter" && !crawler.locked ? 17 : 12) * bluePulse;
      const eyeGap = w * 0.145;
      ctx.beginPath();
      ctx.ellipse(-eyeGap, -h * 0.285, w * 0.055, h * 0.035, -0.13, 0, Math.PI * 2);
      ctx.ellipse(eyeGap, -h * 0.285, w * 0.055, h * 0.035, 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#eaffff";
      ctx.shadowBlur = 2;
      ctx.beginPath();
      ctx.arc(-eyeGap - 1, -h * 0.292, 1.1, 0, Math.PI * 2);
      ctx.arc(eyeGap - 1, -h * 0.292, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = "rgba(4, 3, 6, 0.82)";
      ctx.lineWidth = Math.max(1.2, w * 0.035);
      ctx.beginPath();
      ctx.moveTo(-w * 0.06, -h * 0.24);
      ctx.quadraticCurveTo(0, -h * 0.2, w * 0.05, -h * 0.235);
      ctx.moveTo(-w * 0.15, -h * 0.14);
      ctx.quadraticCurveTo(0, -h * 0.09, w * 0.16, -h * 0.145);
      ctx.stroke();
      ctx.fillStyle = "rgba(185, 164, 175, 0.22)";
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.19, w * 0.045, h * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();

      // One compact chest sigil keeps the blue energy controlled and readable.
      ctx.save();
      ctx.strokeStyle = `rgba(79, 226, 255, ${0.64 + bluePulse * 0.2})`;
      ctx.lineWidth = crawler.type === "bruiser" ? 1.65 : 1.25;
      ctx.lineCap = "round";
      ctx.shadowColor = "#19c9ff";
      ctx.shadowBlur = 7 * bluePulse;
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.025);
      ctx.lineTo(-w * 0.085, h * 0.075);
      ctx.lineTo(0, h * 0.17);
      ctx.lineTo(w * 0.085, h * 0.075);
      ctx.closePath();
      ctx.moveTo(0, h * 0.17);
      ctx.lineTo(0, h * 0.27);
      ctx.stroke();
      ctx.fillStyle = `rgba(171, 246, 255, ${0.72 + bluePulse * 0.2})`;
      ctx.beginPath();
      ctx.arc(0, h * 0.075, 1.8 + bluePulse * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Stable, deterministic skin grain: it will not shimmer from frame to frame.
      ctx.fillStyle = "rgba(145, 210, 225, 0.1)";
      for (let speck = 0; speck < 6; speck += 1) {
        const seed = crawler.phase * 17 + speck * 9.73;
        const sx = Math.sin(seed) * w * 0.3;
        const sy = -h * 0.42 + Math.abs(Math.cos(seed * 1.7)) * h * 0.56;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.65 + (speck % 3) * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }

      if (crawler.type === "hunter" && !crawler.locked) {
        ctx.strokeStyle = "rgba(42, 211, 255, 0.42)";
        ctx.setLineDash([5, 8]);
        ctx.beginPath();
        ctx.moveTo(0, h * 0.5);
        ctx.lineTo(player.x - x, player.y - y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
  }

  function drawCrawlerLimb(x1, y1, jointX, jointY, x2, y2, thickness, dark, mid, rim) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = dark;
    ctx.lineWidth = thickness + 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(jointX, jointY);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = mid;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(jointX, jointY);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = rim;
    ctx.globalAlpha = 0.32;
    ctx.lineWidth = Math.max(0.8, thickness * 0.14);
    ctx.shadowColor = rim;
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.moveTo(x1 - 1, y1 - 1);
    ctx.lineTo(jointX - 1, jointY - 1);
    ctx.lineTo(x2 - 1, y2 - 1);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.arc(jointX, jointY, thickness * 0.56, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCrawlerFoot(x, y, direction, scale, dark, mid) {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(x + direction * scale * 0.035, y + 1, scale * 0.15, scale * 0.075, direction * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.ellipse(x + direction * scale * 0.055, y, scale * 0.105, scale * 0.047, direction * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCrawlerHand(x, y, direction, scale, dark, mid) {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(x, y, scale * 0.115, scale * 0.085, direction * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.ellipse(x + direction * scale * 0.015, y - scale * 0.006, scale * 0.075, scale * 0.048, direction * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(133, 173, 190, 0.24)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - scale * 0.04, y + scale * 0.014);
    ctx.lineTo(x + scale * 0.045, y + scale * 0.014);
    ctx.stroke();
  }

  function drawGates(time) {
    if (trailerCapture) {
      drawTrailerGates(time);
      return;
    }

    for (const gate of state.gates) {
      const y = gate.y;
      const leftEnd = gapLeft(gate);
      const rightStart = gapRight(gate);
      const glow = Math.sin(time * 8 + gate.phase) * 0.08 + 0.22;

      drawGateBlock(0, y - gate.h / 2, Math.max(0, leftEnd), gate.h, gate.color, glow, "right", gate.type);
      drawGateBlock(rightStart, y - gate.h / 2, Math.max(0, width - rightStart), gate.h, gate.color, glow, "left", gate.type);

      if (gate.type !== "standard") {
        ctx.fillStyle = gate.type === "boss" ? "#101114" : "rgba(16, 17, 20, 0.82)";
        ctx.font = "950 10px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(gate.type === "boss" ? "BOSS" : "PULSE", gate.gapX, y);
      }
    }
  }

  function nearestFlowGuideGate() {
    let nearest = null;
    for (const gate of state.gates) {
      if (gate.passed) continue;
      const distance = player.y - gate.y;
      if (distance < -player.height * 0.55 || distance > height * 0.46) continue;
      if (!nearest || gate.y > nearest.y) nearest = gate;
    }
    return nearest;
  }

  function drawFlowGuide(time) {
    if (!state.running || state.effects.phase > 0) return;
    const gate = nearestFlowGuideGate();
    if (!gate) return;

    const leftEdge = gapLeft(gate);
    const rightEdge = gapRight(gate);
    const playerHalfWidth = player.width * 0.5;
    const perfectOffset = playerHalfWidth + 3.5;
    const targetXs = [leftEdge + perfectOffset, rightEdge - perfectOffset]
      .filter((targetX, index, list) => targetX >= leftEdge && targetX <= rightEdge && (index === 0 || Math.abs(targetX - list[0]) > 12));
    if (!targetXs.length) return;

    const gateDistance = Math.max(0, player.y - gate.y);
    const approach = clamp(1 - gateDistance / (height * 0.46), 0, 1);
    const alpha = 0.3 + approach * 0.7;
    const closestTarget = targetXs.reduce((closest, targetX) => (
      Math.abs(targetX - player.x) < Math.abs(closest - player.x) ? targetX : closest
    ), targetXs[0]);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.setLineDash([5, 7]);
    ctx.strokeStyle = "rgba(76, 201, 240, 0.68)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(closestTarget, gate.y + gate.h * 0.5 + 10);
    ctx.lineTo(player.x, player.y - player.height * 0.7);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const targetX of targetXs) {
      const active = Math.abs(player.x - targetX) <= 11;
      const pulse = 1 + Math.sin(time * 8 + targetX * 0.02) * 0.12;
      ctx.strokeStyle = active ? "#2ee6a6" : "#4cc9f0";
      ctx.fillStyle = active ? "#2ee6a6" : "#ffffff";
      ctx.lineWidth = active ? 4 : 2.5;
      ctx.shadowColor = active ? "#2ee6a6" : "#4cc9f0";
      ctx.shadowBlur = active ? 18 : 11;
      ctx.beginPath();
      ctx.moveTo(targetX, gate.y - gate.h * 0.5 - 12);
      ctx.lineTo(targetX, gate.y + gate.h * 0.5 + 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(targetX, gate.y, 4.5 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = active ? "#123f38" : "#33406f";
      ctx.font = "950 7px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+2", targetX, gate.y + 0.5);
    }

    const leftClearance = player.x - playerHalfWidth - leftEdge;
    const rightClearance = rightEdge - (player.x + playerHalfWidth);
    const clearance = Math.min(leftClearance, rightClearance);
    const insideGap = leftClearance >= 0 && rightClearance >= 0;
    let guideText = "FLOW: MOVE TO GLOW";
    let guideColor = "#4cc9f0";
    if (!insideGap) {
      guideText = "FLOW: CENTER IN GAP";
      guideColor = "#ff6b7f";
    } else if (clearance <= 7) {
      if (player.pressure >= 0.9) {
        guideText = "FLOW: COOL DOWN";
        guideColor = "#ff6b7f";
      } else if (player.squeeze < 0.7) {
        guideText = "FLOW: SQUEEZE MORE";
        guideColor = "#ffd166";
      } else {
        guideText = "FLOW: PERFECT +2";
        guideColor = "#2ee6a6";
      }
    } else if (clearance <= 12) {
      guideText = "FLOW: NEAR +1";
      guideColor = "#ffd166";
    }

    ctx.font = "950 9px system-ui, sans-serif";
    const labelWidth = Math.ceil(ctx.measureText(guideText).width) + 18;
    const labelX = clamp(player.x, labelWidth * 0.5 + 8, width - labelWidth * 0.5 - 8);
    const labelY = player.y - player.height * 0.5 - 30;
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
    ctx.strokeStyle = guideColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(51, 64, 111, 0.2)";
    ctx.shadowBlur = 8;
    roundRect(ctx, labelX - labelWidth * 0.5, labelY - 11, labelWidth, 22, 9);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#33406f";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(guideText, labelX, labelY + 0.5);
    ctx.restore();
  }

  function drawGateBlock(x, y, w, h, color, glow, gapEdge, gateType) {
    if (w <= 0) {
      return;
    }

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.72)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    const shell = ctx.createLinearGradient(x, y, x, y + h);
    shell.addColorStop(0, "#11171c");
    shell.addColorStop(0.12, "#66727b");
    shell.addColorStop(0.27, "#303941");
    shell.addColorStop(0.7, "#1a2228");
    shell.addColorStop(0.88, "#45515a");
    shell.addColorStop(1, "#0c1115");
    ctx.fillStyle = shell;
    roundRect(ctx, x, y, w, h, 5);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Recessed steel plate inset, framed by welded top and bottom rails.
    const inset = 6;
    if (w > inset * 2 && h > inset * 2) {
      const plate = ctx.createLinearGradient(x, y, x + w, y);
      plate.addColorStop(0, "#171e24");
      plate.addColorStop(0.48, "#46515a");
      plate.addColorStop(0.56, "#242d34");
      plate.addColorStop(1, "#11181d");
      ctx.fillStyle = plate;
      roundRect(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, 3);
      ctx.fill();
      ctx.strokeStyle = "rgba(4, 8, 10, 0.86)";
      ctx.lineWidth = 2;
      roundRect(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, 3);
      ctx.stroke();
    }

    const railHeight = Math.max(5, Math.min(9, h * 0.16));
    const rail = ctx.createLinearGradient(x, y, x, y + railHeight);
    rail.addColorStop(0, "#9aa5ab");
    rail.addColorStop(0.28, "#4e5961");
    rail.addColorStop(1, "#151c21");
    ctx.fillStyle = rail;
    ctx.fillRect(x, y, w, railHeight);
    ctx.save();
    ctx.translate(0, y * 2 + h);
    ctx.scale(1, -1);
    ctx.fillRect(x, y, w, railHeight);
    ctx.restore();

    // Individual fabricated panels, welding seams, bolts, and subtle scratches.
    const panelWidth = 86;
    for (let seam = x + panelWidth; seam < x + w - 10; seam += panelWidth) {
      ctx.strokeStyle = "rgba(5, 8, 11, 0.76)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(seam, y + railHeight + 2);
      ctx.lineTo(seam, y + h - railHeight - 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(154, 168, 176, 0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(seam + 2, y + railHeight + 3);
      ctx.lineTo(seam + 2, y + h - railHeight - 3);
      ctx.stroke();
    }

    const boltY = [y + railHeight * 0.52, y + h - railHeight * 0.52];
    for (let boltX = x + 15; boltX < x + w - 7; boltX += 44) {
      for (const by of boltY) {
        const bolt = ctx.createRadialGradient(boltX - 1, by - 1, 0.4, boltX, by, 3.2);
        bolt.addColorStop(0, "#d5dadd");
        bolt.addColorStop(0.48, "#707a81");
        bolt.addColorStop(1, "#151a1e");
        ctx.fillStyle = bolt;
        ctx.beginPath();
        ctx.arc(boltX, by, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = "rgba(205, 215, 220, 0.12)";
    ctx.lineWidth = 1;
    for (let scratch = 0; scratch < 4; scratch += 1) {
      const sy = y + railHeight + 7 + ((scratch * 13 + x * 0.03) % Math.max(8, h - railHeight * 2 - 12));
      const sx = x + 12 + ((scratch * 47 + h) % Math.max(12, w - 34));
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(Math.min(x + w - 9, sx + 18 + scratch * 4), sy - 2);
      ctx.stroke();
    }

    // The inward jamb is reinforced and carries the gate's small warning lights.
    const jambW = Math.min(15, Math.max(9, w * 0.16));
    const jambX = gapEdge === "right" ? x + w - jambW : x;
    const jamb = ctx.createLinearGradient(jambX, y, jambX + jambW, y);
    if (gapEdge === "right") {
      jamb.addColorStop(0, "#202830");
      jamb.addColorStop(0.62, "#77838b");
      jamb.addColorStop(1, "#14191d");
    } else {
      jamb.addColorStop(0, "#14191d");
      jamb.addColorStop(0.38, "#77838b");
      jamb.addColorStop(1, "#202830");
    }
    ctx.fillStyle = jamb;
    ctx.fillRect(jambX, y - 4, jambW, h + 8);
    ctx.strokeStyle = "rgba(210, 220, 224, 0.5)";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(jambX + 1, y - 3, Math.max(1, jambW - 2), h + 6);

    const edgeX = gapEdge === "right" ? x + w - 2 : x + 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = gateType === "boss" ? 4 : 2.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = gateType === "boss" ? 13 : 8;
    ctx.beginPath();
    ctx.moveTo(edgeX, y + 4);
    ctx.lineTo(edgeX, y + h - 4);
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (let lampY = y + 14; lampY < y + h - 8; lampY += 22) {
      ctx.fillStyle = hexToRgba(color, 0.55 + glow);
      ctx.beginPath();
      ctx.arc(jambX + jambW * 0.5, lampY, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTrailerGates(time) {
    for (const gate of state.gates) {
      const y = gate.y;
      const leftEnd = gapLeft(gate);
      const rightStart = gapRight(gate);
      const glow = 0.72 + Math.sin(time * 7.5 + gate.phase) * 0.16;

      drawPremiumGateBlock(0, y - gate.h / 2, Math.max(0, leftEnd), gate.h, gate.color, glow, "right");
      drawPremiumGateBlock(rightStart, y - gate.h / 2, Math.max(0, width - rightStart), gate.h, gate.color, glow, "left");

      const edgeColor = gate.type === "boss" ? "#ffefc2" : "#ffe36e";
      ctx.save();
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = gate.type === "boss" ? 7 : 4;
      ctx.shadowColor = "#ffc300";
      ctx.shadowBlur = gate.type === "boss" ? 28 : 18;
      ctx.beginPath();
      ctx.moveTo(leftEnd, y - gate.h * 0.48);
      ctx.lineTo(leftEnd, y + gate.h * 0.48);
      ctx.moveTo(rightStart, y - gate.h * 0.48);
      ctx.lineTo(rightStart, y + gate.h * 0.48);
      ctx.stroke();
      ctx.restore();

      if (gate.type !== "standard") {
        ctx.save();
        ctx.strokeStyle = gate.type === "boss" ? "rgba(255, 90, 95, 0.92)" : "rgba(255, 209, 102, 0.88)";
        ctx.lineWidth = 3;
        ctx.shadowColor = gate.color;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.ellipse(gate.gapX, y, gate.currentGapW * 0.88, gate.h * 0.66, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawPremiumGateBlock(x, y, w, h, color, glow, gapEdge) {
    if (w <= 0) {
      return;
    }

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 28;
    const shell = ctx.createLinearGradient(x, y, x, y + h);
    shell.addColorStop(0, "#0e5f91");
    shell.addColorStop(0.18, "#092f56");
    shell.addColorStop(0.72, "#031a36");
    shell.addColorStop(1, "#0a4774");
    ctx.fillStyle = shell;
    roundRect(ctx, x, y, w, h, 17);
    ctx.fill();
    ctx.shadowBlur = 0;

    const inset = 8;
    if (w > inset * 2) {
      const core = ctx.createLinearGradient(x, y, x + w, y);
      if (gapEdge === "right") {
        core.addColorStop(0, "rgba(3, 20, 47, 0.92)");
        core.addColorStop(0.72, "rgba(0, 129, 190, 0.82)");
        core.addColorStop(1, hexToRgba(color, 0.96));
      } else {
        core.addColorStop(0, hexToRgba(color, 0.96));
        core.addColorStop(0.28, "rgba(0, 129, 190, 0.82)");
        core.addColorStop(1, "rgba(3, 20, 47, 0.92)");
      }
      ctx.fillStyle = core;
      roundRect(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, 11);
      ctx.fill();
    }

    ctx.strokeStyle = `rgba(122, 244, 255, ${0.5 + glow * 0.32})`;
    ctx.lineWidth = 3;
    roundRect(ctx, x + 2, y + 2, Math.max(0, w - 4), h - 4, 15);
    ctx.stroke();

    ctx.fillStyle = "rgba(153, 250, 255, 0.34)";
    roundRect(ctx, x + 12, y + 10, Math.max(0, w - 24), 7, 4);
    ctx.fill();

    for (let seam = x + 118; seam < x + w - 34; seam += 176) {
      ctx.strokeStyle = "rgba(0, 8, 28, 0.72)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(seam, y + 12);
      ctx.lineTo(seam - 20, y + h - 12);
      ctx.stroke();
      ctx.fillStyle = "rgba(0, 255, 221, 0.58)";
      ctx.beginPath();
      ctx.arc(seam - 8, y + h * 0.5, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPickups(time) {
    const choiceGroups = new Map();
    for (const pickup of state.pickups) {
      if (!pickup.choiceId || pickup.collected) continue;
      const group = choiceGroups.get(pickup.choiceId) || [];
      group.push(pickup);
      choiceGroups.set(pickup.choiceId, group);
    }
    for (const group of choiceGroups.values()) {
      if (group.length !== 2) continue;
      ctx.save();
      ctx.strokeStyle = "rgba(247, 244, 234, 0.22)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 7]);
      ctx.beginPath();
      ctx.moveTo(group[0].x, group[0].y);
      ctx.lineTo(group[1].x, group[1].y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(247, 244, 234, 0.78)";
      ctx.font = "900 8px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CHOOSE ONE", (group[0].x + group[1].x) * 0.5, group[0].y - 28);
      ctx.restore();
    }

    for (const pickup of state.pickups) {
      const pulse = 1 + Math.sin(time * 7 + pickup.spin) * 0.08;
      const r = pickup.radius * pulse;
      ctx.save();
      ctx.translate(pickup.x, pickup.y);

      if (pickup.type === "pulse") {
        for (let ringIndex = 0; ringIndex < 2; ringIndex += 1) {
          const phase = (time * 1.25 + ringIndex * 0.5 + pickup.spin * 0.08) % 1;
          ctx.globalAlpha = (1 - phase) * 0.7;
          ctx.strokeStyle = ringIndex ? "#ffffff" : "#4cc9f0";
          ctx.lineWidth = ringIndex ? 1.5 : 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, r + 7 + phase * 13, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      ctx.shadowColor = pickup.color;
      ctx.shadowBlur = pickup.type === "pulse" ? 18 : 10;
      ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
      ctx.beginPath();
      ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(75, 93, 161, 0.72)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = pickup.color;
      ctx.beginPath();
      ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = pickup.type === "slow" || pickup.type === "double" ? "#33406f" : "#ffffff";
      ctx.font = "950 8px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pickup.short.length <= 2 ? pickup.short : pickup.short.slice(0, 2), 0, 1);
      ctx.restore();
    }
  }

  function drawPulseWaves() {
    for (const wave of state.pulseWaves) {
      const progress = 1 - wave.life / wave.maxLife;
      const radius = 48 + progress * 120;
      const alpha = clamp(wave.life / wave.maxLife, 0, 1);
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = alpha * 0.28;
      ctx.fillStyle = "#4cc9f0";
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, radius * 0.56, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#4cc9f0";
      ctx.lineWidth = 5 - progress * 2.5;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.9;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, radius - 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawTrail() {
    if (trailerCapture) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let i = state.trail.length - 1; i >= 0; i -= 1) {
        const mark = state.trail[i];
        const alpha = clamp(mark.life / 0.72, 0, 1);
        const ageScale = 0.72 + alpha * 0.28;
        const trailColor = i % 4 === 0 ? `rgba(255, 195, 0, ${alpha * 0.18})` : `rgba(255, 74, 85, ${alpha * 0.31})`;
        ctx.fillStyle = trailColor;
        ctx.shadowColor = i % 4 === 0 ? "#ffc300" : "#ff4a55";
        ctx.shadowBlur = 12 + alpha * 24;
        roundRect(
          ctx,
          mark.x - (mark.w * ageScale) / 2,
          mark.y - (mark.h * ageScale) / 2,
          mark.w * ageScale,
          mark.h * ageScale,
          Math.min(mark.w * 0.5, 22)
        );
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    for (let i = state.trail.length - 1; i >= 0; i -= 1) {
      const mark = state.trail[i];
      const alpha = clamp(mark.life / 0.42, 0, 1) * (state.overdriveTime > 0 ? 0.31 : 0.16);
      ctx.fillStyle = state.overdriveTime > 0 ? `rgba(255, 209, 102, ${alpha})` : `rgba(255, 90, 95, ${alpha})`;
      roundRect(ctx, mark.x - mark.w / 2, mark.y - mark.h / 2, mark.w, mark.h, 8);
      ctx.fill();
    }
  }

  function drawPlayer(time) {
    if (trailerCapture) {
      drawTrailerPlayer(time);
      return;
    }

    const wobble = Math.sin(time * 18) * (input.active ? 1.8 : 0.8);
    const x = player.x;
    const y = player.y + wobble;
    const w = player.width;
    const h = player.height;

    if (state.effects.phase > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(185, 140, 255, ${0.46 + Math.sin(time * 9) * 0.14})`;
      ctx.lineWidth = 5;
      ctx.shadowColor = "#b98cff";
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.92, h * 0.82, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (state.effects.magnet > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 139, 209, 0.3)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 8]);
      ctx.lineDashOffset = -time * 32;
      ctx.beginPath();
      ctx.arc(x, y, Math.min(92, width * 0.23), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

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

  }

  function drawTrailerPlayer(time) {
    const wobble = Math.sin(time * 17) * (input.active ? 1.6 : 0.65);
    const x = player.x;
    const y = player.y + wobble;
    const w = player.width;
    const h = player.height;
    const radius = Math.min(w * 0.5, h * 0.5, 30);

    ctx.save();
    if (player.squeeze > 0.62) {
      const ringPulse = 1 + Math.sin(time * 12) * 0.08;
      ctx.strokeStyle = `rgba(255, 204, 20, ${0.30 + player.squeeze * 0.34})`;
      ctx.lineWidth = 4;
      ctx.shadowColor = "#ffc300";
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.ellipse(x, y, Math.max(42, w * 1.18) * ringPulse, Math.max(60, h * 0.76) * ringPulse, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    const aura = ctx.createRadialGradient(x, y, 4, x, y, Math.max(90, h * 1.2));
    aura.addColorStop(0, "rgba(255, 98, 84, 0.30)");
    aura.addColorStop(0.46, "rgba(255, 44, 66, 0.10)");
    aura.addColorStop(1, "rgba(255, 44, 66, 0)");
    ctx.fillStyle = aura;
    ctx.fillRect(x - 150, y - 180, 300, 360);

    ctx.shadowColor = state.overdriveTime > 0 ? "#ffd166" : "#ff3f50";
    ctx.shadowBlur = state.overdriveTime > 0 ? 54 : 40;
    const body = ctx.createLinearGradient(x - w * 0.45, y - h * 0.5, x + w * 0.38, y + h * 0.5);
    body.addColorStop(0, "#ff8b72");
    body.addColorStop(0.32, "#ff5b52");
    body.addColorStop(0.72, "#ff3f50");
    body.addColorStop(1, "#a91839");
    ctx.fillStyle = body;
    ctx.strokeStyle = "rgba(255, 232, 216, 0.94)";
    ctx.lineWidth = 3.5;
    roundRect(ctx, x - w / 2, y - h / 2, w, h, radius);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    const highlight = ctx.createLinearGradient(x - w * 0.35, y - h * 0.4, x + w * 0.08, y + h * 0.1);
    highlight.addColorStop(0, "rgba(255, 255, 255, 0.72)");
    highlight.addColorStop(0.36, "rgba(255, 255, 255, 0.19)");
    highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = highlight;
    roundRect(ctx, x - w * 0.31, y - h * 0.39, Math.max(7, w * 0.28), Math.max(12, h * 0.34), Math.min(9, w * 0.12));
    ctx.fill();

    const eyeGap = Math.max(5.5, w * 0.18);
    const eyeRx = clamp(w * 0.115, 3.7, 8.5);
    const eyeRy = clamp(h * 0.105, 5.2, 10.5);
    const eyeY = y - h * 0.075;
    ctx.fillStyle = "#fff9eb";
    ctx.beginPath();
    ctx.ellipse(x - eyeGap, eyeY, eyeRx, eyeRy, -0.13, 0, Math.PI * 2);
    ctx.ellipse(x + eyeGap, eyeY, eyeRx, eyeRy, 0.13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#00aebc";
    ctx.beginPath();
    ctx.arc(x - eyeGap + 1, eyeY + 1, Math.max(2.3, eyeRx * 0.56), 0, Math.PI * 2);
    ctx.arc(x + eyeGap - 1, eyeY + 1, Math.max(2.3, eyeRx * 0.56), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#06101d";
    ctx.beginPath();
    ctx.arc(x - eyeGap + 1, eyeY + 1, Math.max(1.4, eyeRx * 0.31), 0, Math.PI * 2);
    ctx.arc(x + eyeGap - 1, eyeY + 1, Math.max(1.4, eyeRx * 0.31), 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#551427";
    ctx.lineWidth = Math.max(2, w * 0.04);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - eyeGap - eyeRx * 0.65, eyeY - eyeRy * 0.78);
    ctx.lineTo(x - eyeGap + eyeRx * 0.72, eyeY - eyeRy * 1.02);
    ctx.moveTo(x + eyeGap - eyeRx * 0.72, eyeY - eyeRy * 1.02);
    ctx.lineTo(x + eyeGap + eyeRx * 0.65, eyeY - eyeRy * 0.78);
    ctx.stroke();

    ctx.strokeStyle = "rgba(74, 8, 25, 0.90)";
    ctx.lineWidth = Math.max(2, w * 0.038);
    ctx.beginPath();
    ctx.arc(x, y + h * 0.12, Math.max(4.5, w * 0.12), 0.16 * Math.PI, 0.84 * Math.PI);
    ctx.stroke();
    ctx.restore();

  }

  function drawParticles() {
    for (const p of state.particles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      if (trailerCapture) {
        ctx.save();
        ctx.strokeStyle = hexToRgba(p.color, alpha);
        ctx.lineWidth = Math.max(1.2, p.size * 0.72);
        ctx.lineCap = "round";
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = hexToRgba(p.color, alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function burst(x, y, color, count, force) {
    const particleCount = trailerCapture ? Math.round(count * 1.65) : count;
    for (let i = 0; i < particleCount; i += 1) {
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
    levelValue.textContent = `${state.levelIndex + 1}/${levels.length}`;
    comboValue.textContent = `Flow x${state.combo}`;
    const rushActive = state.overdriveTime > 0;
    overdriveLabel.textContent = rushActive ? `OVERDRIVE ${state.overdriveTime.toFixed(1)}s` : "Overdrive";
    overdriveFill.style.width = `${rushActive ? 100 : clamp(state.overdrive, 0, 100)}%`;
    document.body.classList.toggle("overdrive-active", rushActive);
    document.body.classList.toggle("campaign-running", state.mode === "campaign" && state.running && !state.levelVictory);
    updateSqueezeHud();
    updateCampaignObjectiveHud();
    renderPowerIcons();
    modeNameValue.textContent = mode.short;
    goalValue.textContent = goalLabel();
  }

  function updateCampaignObjectiveHud() {
    if (!levelObjectiveHud) return;
    const visible = state.mode === "campaign" && state.running && !state.levelVictory;
    levelObjectiveHud.classList.toggle("visible", visible);
    levelObjectiveHud.setAttribute("aria-hidden", String(!visible));
    if (state.mode !== "campaign") return;

    const challenge = currentCampaignChallenge();
    const value = campaignObjectiveValue(challenge);
    const ratio = campaignObjectiveRatio(challenge);
    const percent = Math.round(ratio * 100);
    levelObjectiveBadge.textContent = `Level ${state.levelIndex + 1} mission`;
    levelObjectiveTitle.textContent = challenge.title;
    levelObjectiveFill.style.width = `${percent}%`;
    levelObjectiveValue.textContent = campaignObjectiveLabel(challenge, value);
    levelObjectiveProgress.setAttribute("aria-valuenow", String(percent));
    levelObjectiveProgress.setAttribute("aria-label", `${challenge.title}: ${campaignObjectiveLabel(challenge, value)}`);
    levelObjectiveProgress.classList.toggle("complete", percent >= 100);
  }

  function updateSqueezeHud() {
    // The HTML and JavaScript can briefly be on different cached versions in an
    // installed/mobile web app. The squeeze display is optional during that
    // transition and must never stop the game's startup sequence.
    if (!squeezeMeter || !squeezeFill || !squeezeStatus || !squeezeScreenGlow) {
      return;
    }

    const pressure = state.running ? clamp(player.pressure, 0, 1) : 0;
    const percent = Math.round(pressure * 100);
    const redMix = clamp((pressure - 0.55) / 0.45, 0, 1);
    const green = Math.round(159 - redMix * 112);
    const blue = Math.round(55 - redMix * 29);
    const warningColor = `rgb(255, ${green}, ${blue})`;
    const glowStrength = clamp((pressure - 0.12) / 0.78, 0, 1);

    squeezeFill.style.width = `${percent}%`;
    squeezeMeter.style.setProperty("--squeeze-color", warningColor);
    squeezeMeter.setAttribute("aria-valuenow", String(percent));
    squeezeMeter.classList.toggle("is-hot", pressure >= 0.58);
    squeezeMeter.classList.toggle("is-critical", pressure >= 0.84);

    if (pressure >= 0.84) {
      squeezeStatus.textContent = "Release!";
    } else if (pressure >= 0.62) {
      squeezeStatus.textContent = "Warning";
    } else if (pressure >= 0.24) {
      squeezeStatus.textContent = "Building";
    } else {
      squeezeStatus.textContent = "Cool";
    }

    squeezeScreenGlow.style.setProperty("--squeeze-glow", `rgba(255, ${green}, ${blue}, 0.38)`);
    squeezeScreenGlow.style.setProperty("--squeeze-edge", `rgba(255, ${Math.max(34, green - 30)}, ${Math.max(12, blue - 18)}, 0.58)`);
    squeezeScreenGlow.style.setProperty("--squeeze-glow-opacity", (glowStrength * 0.94).toFixed(3));
    squeezeScreenGlow.classList.toggle("is-critical", pressure >= 0.84);
  }

  function saveBestIfNeeded() {
    if (state.mode === "campaign") {
      return false;
    }
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
    updateCampaignStars();
  }

  function updateCampaignStars() {
    let total = 0;

    for (const row of campaignStarRows) {
      const levelIndex = Number(row.dataset.starLevel);
      const level = levels[levelIndex];
      if (!level) continue;

      const earned = clamp(Math.floor(Number(campaignProgress.stars[levelIndex]) || 0), 0, 3);
      total += earned;
      const stars = [...row.querySelectorAll("span")];
      stars.forEach((star, index) => star.classList.toggle("earned", index < earned));
      const nextLabel = row.querySelector("em");
      if (nextLabel) {
        const bestPercent = Math.round(clamp(campaignProgress.bestProgress[levelIndex] || 0, 0, 1) * 100);
        nextLabel.textContent = campaignProgress.completed[levelIndex] ? "Complete" : (bestPercent > 0 ? `Best ${bestPercent}%` : "Not cleared");
      }
      row.setAttribute("aria-label", `${earned} of 3 stars earned for ${levels[levelIndex].name}`);
    }

    const totalLabel = `${total} / ${campaignStarScores.length * 3}`;
    if (campaignStarTotal) campaignStarTotal.textContent = totalLabel;
    if (campaignMenuStars) campaignMenuStars.textContent = `${totalLabel} Stars`;

    for (const progressBar of campaignProgressRows) {
      const levelIndex = Number(progressBar.dataset.progressLevel);
      const level = levels[levelIndex];
      if (!level) continue;

      const progress = campaignProgress.completed[levelIndex]
        ? 1
        : clamp(campaignProgress.bestProgress[levelIndex] || 0, 0, 1);
      const percent = Math.round(progress * 100);
      progressBar.style.setProperty("--level-progress", `${percent}%`);
      progressBar.setAttribute("aria-valuenow", String(percent));
      progressBar.classList.toggle("complete", percent >= 100);
      const label = progressBar.querySelector("span");
      if (label) label.textContent = percent >= 100 ? "Complete" : `${percent}%`;
    }

    if (campaignLadder) {
      for (const card of campaignLadder.querySelectorAll("[data-campaign-level]")) {
        const levelIndex = Number(card.dataset.campaignLevel) - 1;
        if (!levels[levelIndex]) continue;
        const unlocked = campaignLevelUnlocked(levelIndex);
        const completed = Boolean(campaignProgress.completed[levelIndex]);
        card.classList.toggle("locked", !unlocked);
        card.classList.toggle("complete", completed);
        card.classList.toggle("current", unlocked && !completed);
        card.setAttribute("aria-disabled", String(!unlocked));
        card.tabIndex = unlocked ? 0 : -1;
        card.setAttribute(
          "aria-label",
          `Level ${levelIndex + 1}: ${levels[levelIndex].name}. ${completed ? "Complete" : (unlocked ? "Unlocked" : `Locked. Complete Level ${levelIndex} first`)}`
        );
        const lockLabel = card.querySelector(".campaign-lock strong");
        if (lockLabel) lockLabel.textContent = `Complete Level ${levelIndex}`;
      }
    }
  }

  function renderPowerIcons() {
    const powers = currentPowers();
    powerIcons.replaceChildren();
    powerIcons.setAttribute("aria-label", powers.length ? powers.map(power => power.label).join(", ") : "No active powers");

    if (!powers.length) {
      const empty = document.createElement("span");
      empty.className = "power-empty";
      empty.textContent = "Ready";
      powerIcons.appendChild(empty);
      return;
    }

    const visiblePowers = powers.slice(0, 3);
    for (const power of visiblePowers) {
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

    if (powers.length > visiblePowers.length) {
      const more = document.createElement("span");
      more.className = "power-more";
      more.textContent = `+${powers.length - visiblePowers.length}`;
      more.title = powers.slice(visiblePowers.length).map(power => power.label).join(", ");
      powerIcons.appendChild(more);
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

    if (state.effects.phase > 0) {
      const seconds = Math.ceil(state.effects.phase);
      powers.push({ type: "phase", symbol: "PH", count: seconds, label: `Phase ${seconds}s` });
    }

    if (state.effects.magnet > 0) {
      const seconds = Math.ceil(state.effects.magnet);
      powers.push({ type: "magnet", symbol: "M", count: seconds, label: `Magnet ${seconds}s` });
    }

    if (state.pulseCharges > 0) {
      powers.push({ type: "pulse", symbol: "P", count: state.pulseCharges, label: `${state.pulseCharges} repulsor charge${state.pulseCharges === 1 ? "" : "s"}` });
    }

    if (state.effects.double > 0) {
      const seconds = Math.ceil(state.effects.double);
      powers.push({ type: "double", symbol: "2X", count: seconds, label: `Double score ${seconds}s` });
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
    if (state.mode === "campaign" && state.running) {
      return currentCampaignChallenge().title;
    }
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
    if (reason === "caught") {
      return "A shadow crawler caught your line.";
    }
    if (reason === "mined") {
      return "The minefield closed the route.";
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
    state.overdriveActivations += 1;
    burst(player.x, player.y, "#ffd166", 64, 1.15);
    showToast("OVERDRIVE x2");
    playSound("overdrive");
    haptic("success");
  }

  function awardRunProgress() {
    if (debugMode) return;
    const xp = Math.max(5, Math.round(state.score * 0.4 + state.encountersCleared * 2 + state.crawlersDodged * 3 + state.crawlersBanished * 4 + state.perfects * 5 + state.bossGates * 6));
    const scoreCores = Math.floor(state.score / 80);
    const xpDelta = Math.max(0, xp - state.awardSnapshot.xp);
    let coreDelta = Math.max(0, scoreCores - state.awardSnapshot.scoreCores);
    const claimed = career.completedContracts || {};
    for (const contract of contractTemplates) {
      const key = `${contractDateCode}:${contract.id}`;
      const progress = Math.min(contract.target, state.contractProgress[contract.id] || 0);
      if (progress >= contract.target && !claimed[key]) {
        claimed[key] = true;
        coreDelta += contract.reward;
      }
    }

    state.runRewardXp += xpDelta;
    state.runRewardCores += coreDelta;
    runLifecycle.recordRewardDelta(xpDelta, coreDelta);
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
      const key = `${contractDateCode}:${contract.id}`;
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
      pickup: [720, 0.1, "sine"], overdrive: [180, 0.28, "sawtooth"], crash: [90, 0.24, "square"], shield: [250, 0.16, "square"], revive: [520, 0.22, "sine"], pulse: [190, 0.18, "sawtooth"], phase: [580, 0.12, "sine"]
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

  function readCampaignProgress() {
    const progress = {
      completed: Array(levels.length).fill(false),
      stars: Array(levels.length).fill(0),
      bestProgress: Array(levels.length).fill(0),
      bestTimes: Array(levels.length).fill(null)
    };
    try {
      const saved = JSON.parse(localStorage.getItem(campaignProgressStorageKey) || "{}");
      if (Array.isArray(saved.completed) && Array.isArray(saved.stars) && Array.isArray(saved.bestProgress)) {
        for (let levelIndex = 0; levelIndex < levels.length; levelIndex += 1) {
          progress.completed[levelIndex] = Boolean(saved.completed[levelIndex]);
          progress.stars[levelIndex] = clamp(Math.floor(Number(saved.stars[levelIndex]) || 0), 0, 3);
          progress.bestProgress[levelIndex] = clamp(Number(saved.bestProgress[levelIndex]) || 0, 0, 1);
          const savedTime = Number(saved.bestTimes?.[levelIndex]);
          if (Number.isFinite(savedTime) && savedTime > 0) progress.bestTimes[levelIndex] = savedTime;
          if (progress.completed[levelIndex]) {
            progress.bestProgress[levelIndex] = 1;
            progress.stars[levelIndex] = Math.max(1, progress.stars[levelIndex]);
          }
        }
        return progress;
      }
    } catch (error) {
      // Fall through to the legacy score migration if the mission record is corrupt.
    }

    const legacyScore = Math.max(0, Math.floor(Number(modeBests.campaign) || 0));
    for (let levelIndex = 0; levelIndex < levels.length; levelIndex += 1) {
      const level = levels[levelIndex];
      const completionScore = campaignStarScores[levelIndex][2];
      const scoreRange = Math.max(1, completionScore - level.score);
      progress.bestProgress[levelIndex] = clamp((legacyScore - level.score) / scoreRange, 0, 1);
      progress.completed[levelIndex] = legacyScore >= completionScore;
      progress.stars[levelIndex] = campaignStarScores[levelIndex].filter(target => legacyScore >= target).length;
    }
    return progress;
  }

  function writeCampaignProgress() {
    localStorage.setItem(campaignProgressStorageKey, JSON.stringify({ version: 1, ...campaignProgress }));
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
      const formerDailyBest = Number(parsed.daily);
      if (bests.campaign === 0 && Number.isFinite(formerDailyBest) && formerDailyBest > 0) {
        bests.campaign = Math.floor(formerDailyBest);
      }
    } catch (error) {
      // Ignore corrupt local storage and rebuild mode bests from this run onward.
    }

    const legacyBest = readLegacyBest();
    if (legacyBest > 0 && Object.values(bests).every(value => value === 0)) {
      bests.campaign = legacyBest;
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

  function monetizationTestSnapshot() {
    return {
      lifecycle: runLifecycle.snapshot(),
      running: state.running,
      over: state.over,
      score: state.score,
      revives: state.revives,
      runRewardXp: state.runRewardXp,
      runRewardCores: state.runRewardCores,
      rewardedRevive: {
        offerAvailable: Boolean(rewardedReviveOfferContext),
        requestPending: Boolean(activeRewardedReviveRequest),
        hidden: rewardedReviveBtn.classList.contains("hidden"),
        disabled: rewardedReviveBtn.disabled,
        label: rewardedReviveBtn.textContent,
        retryDisabled: retryBtn.disabled,
        menuDisabled: menuBtn.disabled,
        tokenReviveDisabled: reviveBtn.disabled
      },
      monetization: {
        hidden: monetizationActions.classList.contains("hidden"),
        removeAdsHidden: removeAdsBtn.classList.contains("hidden"),
        removeAdsDisabled: removeAdsBtn.disabled,
        removeAdsLabel: removeAdsBtn.textContent,
        restoreHidden: restorePurchasesBtn.classList.contains("hidden"),
        privacyHidden: privacyOptionsBtn.classList.contains("hidden"),
        status: purchaseStatus.textContent,
        refreshAttempt: monetizationRefreshAttempt,
        finalizedRunsSinceInterstitial
      }
    };
  }

  function setMonetizationTestRunProgress(values) {
    if (!values || typeof values !== "object") return;
    const numericFields = [
      "score", "gatesPassed", "encountersCleared", "perfects", "nearMisses",
      "pickupsCollected", "bossGates", "bestCombo", "combo", "revives"
    ];
    for (const key of numericFields) {
      const value = Number(values[key]);
      if (Number.isFinite(value) && value >= 0) {
        state[key] = Math.floor(value);
      }
    }
    if (typeof values.rewardedReviveUsed === "boolean") {
      state.rewardedReviveUsed = values.rewardedReviveUsed;
    }
  }

  const monetizationTestEnabled = window.__SQUEEZE_RUSH_MONETIZATION_TEST__ === true
    || ((window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost")
      && queryParams.has("monetizationTest"));

  if (monetizationTestEnabled) {
    window.__SqueezeRushMonetizationTest = Object.freeze({
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
      requestRewardedRevive,
      refreshMonetization,
      maybePresentNaturalBreakInterstitial,
      setInterstitialCadence(value) {
        const count = Number(value);
        if (Number.isFinite(count) && count >= 0) {
          finalizedRunsSinceInterstitial = Math.floor(count);
        }
      },
      setRewardedReviveTimeout(value) {
        const timeout = Number(value);
        if (Number.isFinite(timeout) && timeout >= 10 && timeout <= 120000) {
          rewardedReviveTimeoutMs = Math.floor(timeout);
        }
      },
      setRunProgress: setMonetizationTestRunProgress,
      snapshot: monetizationTestSnapshot
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
