#!/usr/bin/env node
"use strict";

// Exercises the shipped Web bundle. Only native service responses and game state
// are simulated; the test never injects or rewrites CSS or layout markup.
// Run with BASE_URL pointing to a server rooted at this repository (default 8896).
const fs = require("node:fs");
const path = require("node:path");
let playwright;
try { playwright = require("playwright"); }
catch (_) {
  playwright = require(path.join(process.env.USERPROFILE || "C:/Users/g_sin",
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"));
}

const root = path.resolve(__dirname, "..");
const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:8896").replace(/\/$/, "");
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const output = path.resolve(process.env.EVIDENCE_DIR || path.join(root, "AppStore-Review", "Build19-iPad", `layout-regression-${runId}`));
const viewports = [{ width: 320, height: 568 }, { width: 375, height: 667 },
  { width: 430, height: 932 }, { width: 820, height: 1180 }];
const results = [];
const screenshots = [];
const capabilities = {
  nativeBridge: true, protocolVersion: 1, platform: "ios", share: true, haptics: true,
  rewardedAds: true, interstitialAds: true, purchases: true, restorePurchases: true,
  entitlements: true, consent: true, canRequestAds: true, rewardedAdReady: true,
  interstitialAdReady: true, removeAdsEntitled: false, removeAdsPrice: "$2.99",
  removeAdsCurrencyCode: "CAD", purchaseCatalogState: "ready",
  purchaseStorefrontCountryCode: "CAN", purchaseDiagnosticCode: null, privacyOptionsRequired: true
};

function record(viewport, screen, check, passed, detail) {
  results.push({ viewport, screen, check, passed: Boolean(passed), detail });
  if (!passed) console.log(`FAIL ${viewport} ${screen}: ${check} ${JSON.stringify(detail)}`);
}

async function refreshNative(page, overrides = {}) {
  await page.evaluate(async values => {
    const mock = window.__SQUEEZE_RUSH_NATIVE_BRIDGE_MOCK__;
    mock.reset();
    for (let i = 0; i < 8; i++) mock.enqueue("bridge.capabilities", { outcome: "success", data: values });
    await window.__SqueezeRushMonetizationTest.refreshMonetization();
  }, { ...capabilities, ...overrides });
}

async function swipe(page, selector, upward = true) {
  const box = await page.locator(selector).boundingBox();
  const viewport = page.viewportSize();
  const x = Math.round(Math.min(box.x + box.width - 18, viewport.width - 24));
  const low = Math.round(Math.min(box.y + box.height - 42, viewport.height - 42));
  const high = Math.round(Math.max(box.y + 42, low - 260));
  const start = upward ? low : high;
  const end = upward ? high : low;
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: start }] });
    for (let i = 1; i <= 12; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove", touchPoints: [{ x, y: Math.round(start + (end - start) * i / 12) }]
      });
      await new Promise(resolve => setTimeout(resolve, 18));
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(450);
  } finally { await cdp.detach(); }
}

async function inspect(page, viewport, name, panelSelector, scrollSelector = panelSelector) {
  const label = `${viewport.width}x${viewport.height}`;
  await page.locator(panelSelector).waitFor({ state: "visible" });
  await page.waitForFunction(() => !document.querySelector("#toast").classList.contains("visible"));
  await page.waitForTimeout(name === "victory" ? 600 : 120);
  const geometry = await page.evaluate(({ panelSelector, scrollSelector }) => {
    const panel = document.querySelector(panelSelector);
    const scroller = document.querySelector(scrollSelector);
    const overlay = panel.closest(".overlay");
    const rect = panel.getBoundingClientRect();
    const overlayStyle = getComputedStyle(overlay);
    const style = getComputedStyle(scroller);
    const visible = el => getComputedStyle(el).visibility !== "hidden" && el.getClientRects().length > 0;
    const clipRect = el => {
      const initial = el.getBoundingClientRect();
      const clipped = { left: initial.left, right: initial.right, top: initial.top, bottom: initial.bottom };
      for (let ancestor = el.parentElement; ancestor && ancestor !== overlay; ancestor = ancestor.parentElement) {
        const css = getComputedStyle(ancestor), box = ancestor.getBoundingClientRect();
        if (css.overflowY !== "visible") {
          clipped.top = Math.max(clipped.top, box.top);
          clipped.bottom = Math.min(clipped.bottom, box.bottom);
        }
        if (css.overflowX !== "visible") {
          clipped.left = Math.max(clipped.left, box.left);
          clipped.right = Math.min(clipped.right, box.right);
        }
      }
      return clipped;
    };
    const controls = [...overlay.querySelectorAll("button, summary, [role=button]")].filter(visible).map(el => {
      const r = el.getBoundingClientRect();
      return { id: el.id || el.getAttribute("aria-label") || el.textContent.trim().slice(0, 50),
        width: r.width, height: r.height, ...clipRect(el),
        // Campaign article controls deliberately contain clipped decorative art;
        // their readable captions are checked separately below.
        clipped: el.matches("button,summary") && el.scrollWidth > el.clientWidth + 2 };
    });
    const overlaps = [];
    for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
      const a = controls[i], b = controls[j];
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) overlaps.push([a.id, b.id]);
    }
    const textSelectors = ".mode-title,.mode-best,.campaign-route-label,.career-rank strong,.career-progress span,.career-progress em,.contract-card strong,.contract-card small,.campaign-rung-copy h3,.campaign-rung-copy p,.campaign-map-header h2,.victory-target strong,#purchaseStatus";
    const clippedLabels = [...overlay.querySelectorAll(textSelectors)].filter(visible).filter(el => {
      const css = getComputedStyle(el);
      return el.scrollWidth > el.clientWidth + 2 ||
        (["hidden", "clip"].includes(css.overflowY) && el.scrollHeight > el.clientHeight + 2);
    }).map(el => ({ text: el.textContent.trim(), client: [el.clientWidth, el.clientHeight], scroll: [el.scrollWidth, el.scrollHeight] }));
    const touch = new Event("touchmove", { bubbles: true, cancelable: true });
    (scroller.querySelector("h1,h2,h3,p,span") || scroller).dispatchEvent(touch);
    return {
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      usable: { left: parseFloat(overlayStyle.paddingLeft), right: innerWidth - parseFloat(overlayStyle.paddingRight),
        top: parseFloat(overlayStyle.paddingTop), bottom: innerHeight - parseFloat(overlayStyle.paddingBottom) },
      horizontalOverflow: panel.scrollWidth - panel.clientWidth,
      scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight, scrollTop: scroller.scrollTop,
      touchAction: style.touchAction, overflowY: style.overflowY, touchPrevented: touch.defaultPrevented,
      controls, overlaps, clippedLabels
    };
  }, { panelSelector, scrollSelector });
  const r = geometry.rect, u = geometry.usable;
  record(label, name, "panel fits overlay safe area", r.left >= u.left - 1 && r.right <= u.right + 1 &&
    r.top >= u.top - 1 && r.bottom <= u.bottom + 1, { rect: r, usable: u });
  record(label, name, "no horizontal panel overflow", geometry.horizontalOverflow <= 2, geometry.horizontalOverflow);
  record(label, name, "controls meet 44px touch minimum", geometry.controls.every(c => c.width >= 43.5 && c.height >= 43.5),
    geometry.controls.filter(c => c.width < 43.5 || c.height < 43.5));
  record(label, name, "control labels are not clipped", geometry.controls.every(c => !c.clipped), geometry.controls.filter(c => c.clipped));
  record(label, name, "controls do not overlap", geometry.overlaps.length === 0, geometry.overlaps);
  record(label, name, "content labels are not clipped", geometry.clippedLabels.length === 0, geometry.clippedLabels);
  record(label, name, "vertical touch scrolling is enabled", geometry.touchAction.includes("pan-y") &&
    ["auto", "scroll"].includes(geometry.overflowY) && !geometry.touchPrevented,
    { touchAction: geometry.touchAction, overflowY: geometry.overflowY, touchPrevented: geometry.touchPrevented });
  const screenshot = `${label}-${name}-mocked-native.png`;
  await page.screenshot({ path: path.join(output, screenshot) });
  screenshots.push(screenshot);
  if (geometry.scrollHeight > geometry.clientHeight + 4) {
    // Use the system's touch input path; setting scrollTop would miss the original bug.
    const upward = geometry.scrollTop < geometry.scrollHeight - geometry.clientHeight - 4;
    await swipe(page, scrollSelector, upward);
    const after = await page.locator(scrollSelector).evaluate(el => el.scrollTop);
    const meaningfulScroll = Math.min(12, (geometry.scrollHeight - geometry.clientHeight) / 2);
    record(label, name, "real finger swipe scrolls overflowing panel", Math.abs(after - geometry.scrollTop) >= meaningfulScroll,
      { before: geometry.scrollTop, after, scrollHeight: geometry.scrollHeight, clientHeight: geometry.clientHeight });
    const scrolled = `${label}-${name}-scrolled-mocked-native.png`;
    await page.screenshot({ path: path.join(output, scrolled) });
    screenshots.push(scrolled);
  }
}

async function menuTop(page) {
  for (let attempt = 0; attempt < 6; attempt++) {
    if (await page.locator("#menu .panel").evaluate(el => el.scrollTop) <= 1) return;
    await swipe(page, "#menu .panel", false);
  }
}

async function inspectCatalogStates(page, viewport) {
  const label = `${viewport.width}x${viewport.height}`;
  const unavailable = { purchases: false, restorePurchases: false, privacyOptionsRequired: false,
    removeAdsPrice: null, purchaseCatalogState: "loading", purchaseDiagnosticCode: "catalog_loading" };
  await refreshNative(page, unavailable);
  await page.evaluate(() => window.__SqueezeRushMonetizationTest.exhaustMonetizationRefresh());
  await menuTop(page);
  await inspect(page, viewport, "menu-catalog-loading", "#menu .panel");
  record(label, "menu-catalog-loading", "loading purchase remains visible", await page.locator("#removeAdsBtn").isVisible());

  await refreshNative(page, { ...unavailable, purchaseCatalogState: "failed", purchaseDiagnosticCode: "catalog_timeout" });
  await menuTop(page);
  await inspect(page, viewport, "menu-catalog-retry", "#menu .panel");
  const retry = await page.evaluate(() => {
    const button = document.getElementById("removeAdsBtn"), row = document.getElementById("monetizationActions");
    return { label: button.textContent, enabled: !button.disabled,
      width: button.getBoundingClientRect().width, rowWidth: row.getBoundingClientRect().width };
  });
  record(label, "menu-catalog-retry", "lone retry button fills available row", retry.enabled &&
    retry.label.includes("Retry") && retry.width >= retry.rowWidth * 0.95, retry);

  await refreshNative(page, { removeAdsEntitled: true, privacyOptionsRequired: false });
  await menuTop(page);
  await inspect(page, viewport, "menu-ads-removed", "#menu .panel");
  record(label, "menu-ads-removed", "entitlement label is visible", (await page.locator("#removeAdsBtn").textContent()).includes("Ads Removed"));
  await refreshNative(page);
  await menuTop(page);
}

async function runViewport(browser, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => document.documentElement.classList.add("ios-app"), { once: true });
    });
    await page.goto(`${baseUrl}/SqueezeRushIOS/Web/index.html?nativeBridgeMock=1&monetizationTest=1&debug=1`, { waitUntil: "load" });
    await page.locator("#menu.visible").waitFor({ state: "visible" });
    await page.evaluate(() => window.__SqueezeRushMonetizationTest.prepare());
    await refreshNative(page);
    const canvasGesture = await page.evaluate(() => {
      const canvas = document.getElementById("gameCanvas");
      const move = new Event("touchmove", { bubbles: true, cancelable: true });
      canvas.dispatchEvent(move);
      return { touchAction: getComputedStyle(canvas).touchAction, touchPrevented: move.defaultPrevented };
    });
    record(`${viewport.width}x${viewport.height}`, "gameplay", "canvas keeps game gesture suppression",
      canvasGesture.touchAction === "none" && canvasGesture.touchPrevented, canvasGesture);
    await inspect(page, viewport, "menu", "#menu .panel");
    if (viewport.width <= 375) await inspectCatalogStates(page, viewport);

    await page.locator(".contract-board summary").click();
    await inspect(page, viewport, "menu-challenges-expanded", "#menu .panel");
    await page.locator(".contract-board summary").click();
    await page.locator('[data-mode="arcade"]').click();
    await inspect(page, viewport, "instructions", "#instructions .panel");
    await page.locator("#instructionBackBtn").click();

    await page.evaluate(() => {
      const api = window.__SqueezeRushMonetizationTest;
      api.startRun("arcade");
      api.setRunProgress({ revives: 0, score: 120, encountersCleared: 4 });
      api.endRun("smashed");
      api.prepare();
    });
    await page.locator("#rewardedReviveBtn:not(.hidden)").waitFor({ state: "visible" });
    await inspect(page, viewport, "game-over-rewarded", "#gameOver .panel");
    await page.locator("#menuBtn").click();

    await page.locator('[data-mode="campaign"]').click();
    await inspect(page, viewport, "campaign-map", ".campaign-map-panel", "#campaignMapScroll");
    await page.locator("#campaignMapBackBtn").click();

    await page.evaluate(() => {
      window.__squeezeRushDebug.startCampaignLevel(1);
      window.__squeezeRushDebug.finishCampaignLevel();
      window.__SqueezeRushMonetizationTest.prepare();
    });
    await inspect(page, viewport, "victory", "#levelVictory .panel");
    record(`${viewport.width}x${viewport.height}`, "all", "no JavaScript exceptions", errors.length === 0, errors);
  } catch (error) {
    record(`${viewport.width}x${viewport.height}`, "execution", "all requested screens reached", false, error.stack);
  } finally { await context.close(); }
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await playwright.chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
  try { for (const viewport of viewports) await runViewport(browser, viewport); }
  finally { await browser.close(); }
  const passed = results.filter(result => result.passed).length;
  const report = { generatedAt: new Date().toISOString(), baseUrl, output,
    evidenceScope: "Chromium touch emulation of bundled Web UI; native StoreKit and ad responses are mocked. Physical iPad/WKWebView verification remains separate.",
    passed, total: results.length, failed: results.length - passed, results, screenshots };
  fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(`IPAD LAYOUT RESULT: ${passed}/${results.length} passed, ${results.length - passed} failed`);
  console.log(`Evidence: ${output}`);
  process.exitCode = passed === results.length ? 0 : 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
