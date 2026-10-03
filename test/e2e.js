/**
 * BidCraft AI - End-to-End Test Suite (real Chrome + real unpacked extension)
 * - Serves the mock Upwork pages under https://www.upwork.com/... (request interception),
 *   so the REAL content script is injected by Chrome exactly like in production.
 * - Drives the REAL popup page and REAL service worker (only Gemini's network call is mocked).
 * - Saves popup screenshots to test/screenshots/.
 * Run: cd test && npm install && node e2e.js
 */

const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer-core");

const ROOT_DIR = path.resolve(__dirname, "..");
const SHOTS = path.join(__dirname, "screenshots");
const CHROME =
  process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

let passed = 0;
let failed = 0;
function assert(condition, message) {
  if (condition) { console.log(`  ✅ PASS: ${message}`); passed++; }
  else { console.error(`  ❌ FAIL: ${message}`); failed++; }
}

const MOCKS = {
  "/jobs/full": "mock-upwork-full.html",
  "/jobs/modal": "mock-upwork-modal.html",
  "/jobs/minimal": "mock-upwork-minimal.html",
  "/ab/proposals/apply": "mock-upwork-apply.html"
};

async function openMockUpwork(browser, route) {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.hostname === "www.upwork.com" && MOCKS[url.pathname]) {
      req.respond({
        status: 200,
        contentType: "text/html",
        body: fs.readFileSync(path.join(__dirname, MOCKS[url.pathname]), "utf-8")
      });
    } else if (url.hostname.endsWith("upwork.com")) {
      req.respond({ status: 204, body: "" });
    } else {
      req.continue();
    }
  });
  await page.goto(`https://www.upwork.com${route}`, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 500)); // content script runs at document_idle
  return page;
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    pipe: true,
    enableExtensions: true,
    args: ["--no-first-run", "--no-default-browser-check"]
  });

  try {
    console.log("▶ SUITE 1: Extension loads in Chrome");
    const extId = await browser.installExtension(ROOT_DIR);
    assert(!!extId, `Extension installed (id ${extId})`);

    const swTarget = await browser.waitForTarget(
      (t) => t.type() === "service_worker" && t.url().startsWith(`chrome-extension://${extId}`),
      { timeout: 10000 }
    );
    const worker = await swTarget.worker();
    assert(!!worker, "Service worker started without errors");

    // Popup page (opened as a tab so we can drive it)
    const popup = await browser.newPage();
    const popupErrors = [];
    popup.on("pageerror", (e) => popupErrors.push(e.message));
    popup.on("dialog", (d) => d.accept());
    await popup.setViewport({ width: 420, height: 700, deviceScaleFactor: 2 });
    await popup.goto(`chrome-extension://${extId}/popup/popup.html`, { waitUntil: "load" });
    await new Promise((r) => setTimeout(r, 400));

    // Helper: send a message from an extension context to an Upwork tab
    const sendToUpwork = (route, message) =>
      popup.evaluate(async (route, message) => {
        const tabs = await chrome.tabs.query({ url: `*://www.upwork.com${route}*` });
        return chrome.tabs.sendMessage(tabs[0].id, message);
      }, route, message);

    // -------------------------------------------------------------------------
    console.log("\n▶ SUITE 2: Content script on Upwork pages (real DOM)");
    const pages = [];
    for (const route of ["/jobs/full", "/jobs/modal", "/jobs/minimal"]) {
      pages.push(await openMockUpwork(browser, route));
      const res = await sendToUpwork(route, { action: "GET_UPWORK_JOB_DATA" });
      assert(res?.success && res.data.title, `${route}: job detected → "${res?.data?.title}"`);
      assert(Array.isArray(res?.data?.tags), `${route}: tags array (${res?.data?.tags?.length || 0} tags)`);
      if (route === "/jobs/minimal") {
        assert(res.data.title === "Fix bug in Python script", `${route}: fallback heading used as title`);
      }
      if (route === "/jobs/full") {
        assert(res.data.description.length > 20, `${route}: description extracted`);
        assert(res.data.clientInfo.length > 0, `${route}: client info → "${res.data.clientInfo}"`);
      }
    }

    const apply = await openMockUpwork(browser, "/ab/proposals/apply");
    const PROPOSAL = "Hi there — I can build this dashboard in 5 days.";
    const ins = await sendToUpwork("/ab/proposals/apply", { action: "INSERT_PROPOSAL", text: PROPOSAL });
    assert(ins?.success, "Insert reported success on proposal page");
    const applyState = await apply.evaluate(() => ({
      value: document.getElementById("coverLetter").value,
      log: document.getElementById("eventStatus").textContent
    }));
    assert(applyState.value === PROPOSAL, "Cover letter textarea contains the proposal");
    assert(/INPUT EVENT/.test(applyState.log) && /CHANGE EVENT/.test(applyState.log), "input + change events fired (React-safe)");

    // -------------------------------------------------------------------------
    console.log("\n▶ SUITE 3: Popup UI");
    await popup.bringToFront();
    assert((await popup.$eval("#quotaText", (e) => e.textContent)) === "Add API Key", "Badge prompts for API key on first run");

    await popup.click('[data-tab="profileTab"]');
    await popup.type("#profileName", "Razvan");
    await popup.type("#profileRole", "AI & Python Engineer");
    await popup.type("#profileSkills", "Python, FastAPI, LLMs, React");
    await popup.type("#profileLinks", "github.com/razvan");
    await popup.type("#profileBio", "4+ years building AI systems and web automation.");
    await popup.click("#saveProfileBtn");
    const stored = await popup.evaluate(() => chrome.storage.local.get("profile"));
    assert(stored.profile?.name === "Razvan", "Profile saved to chrome.storage.local");

    await popup.click('[data-tab="settingsTab"]');
    await popup.type("#apiKeyInput", "TEST-KEY-123");
    await popup.click("#saveApiKeyBtn");
    await popup.screenshot({ path: path.join(SHOTS, "popup-settings.png") });
    assert((await popup.$eval("#quotaText", (e) => e.textContent)) === "Gemini Ready", "Badge shows Gemini Ready after saving key");

    // Reload popup → data persists
    await popup.reload({ waitUntil: "load" });
    await new Promise((r) => setTimeout(r, 400));
    assert((await popup.$eval("#profileName", (e) => e.value)) === "Razvan", "Profile persists after reopening popup");

    // -------------------------------------------------------------------------
    console.log("\n▶ SUITE 4: Generate flow (popup → service worker → mocked Gemini)");
    await worker.evaluate(() => {
      globalThis.__geminiCalls = [];
      globalThis.fetch = async (url, opts) => {
        globalThis.__geminiCalls.push({ url, body: JSON.parse(opts.body), key: opts.headers["x-goog-api-key"] });
        const text =
          "Your dashboard needs real-time data without hammering PostgreSQL — that's usually where these projects stall.\n\n" +
          "Here's how I'd tackle it:\n1. Set up a FastAPI layer with caching\n2. Stream live updates over WebSockets\n3. Add one-click Excel export\n\n" +
          "I recently shipped a similar analytics dashboard for a logistics client (github.com/razvan).\n\n" +
          "Quick question: how many concurrent users do you expect on day one?\n\n— Razvan";
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
      };
    });

    await popup.click('[data-tab="generateTab"]');
    await popup.click("#demoJobBtn");
    await popup.select("#frameworkSelect", "problem_solver");
    await popup.click("#generateBtn");
    await popup.waitForSelector("#outputSection:not(.hidden)", { timeout: 10000 });
    const output = await popup.$eval("#proposalOutput", (e) => e.value);
    assert(output.startsWith("Your dashboard"), "Proposal rendered in popup");
    assert(/\d+ words/.test(await popup.$eval("#wordCount", (e) => e.textContent)), "Word count shown");

    const calls = await worker.evaluate(() => globalThis.__geminiCalls);
    assert(calls.length === 1, "Exactly one Gemini request made");
    assert(calls[0].key === "TEST-KEY-123" && !calls[0].url.includes("TEST-KEY"), "Key sent in header, not URL");
    const sentPrompt = calls[0].body.contents[0].parts[0].text;
    assert(sentPrompt.includes("Razvan") && sentPrompt.includes("Problem-Solver"), "Saved profile + framework reach the prompt");
    await popup.screenshot({ path: path.join(SHOTS, "popup-generated.png") });

    // Error path
    await worker.evaluate(() => {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ error: { message: "API key not valid." } }), { status: 400 });
    });
    let alertMsg = "";
    popup.removeAllListeners("dialog");
    popup.on("dialog", (d) => { alertMsg = d.message(); d.accept(); });
    await popup.click("#generateBtn");
    await popup.waitForFunction(() => !document.getElementById("generateBtn").disabled, { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 200));
    assert(/invalid/i.test(alertMsg), `Invalid key error shown to user ("${alertMsg}")`);

    // Delete data
    await popup.click('[data-tab="settingsTab"]');
    await popup.click("#clearDataBtn");
    await new Promise((r) => setTimeout(r, 300));
    const afterClear = await popup.evaluate(() => chrome.storage.local.get(null));
    assert(Object.keys(afterClear).length === 0, "'Delete all my data' wipes storage");

    assert(popupErrors.length === 0, `No JS errors in popup${popupErrors.length ? ": " + popupErrors.join("; ") : ""}`);
  } catch (e) {
    console.error("  ❌ FAIL: Unexpected error:", e);
    failed++;
  } finally {
    await browser.close();
  }

  console.log("\n================================================================");
  console.log(`📊 E2E RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================");
  process.exit(failed ? 1 : 0);
})();
