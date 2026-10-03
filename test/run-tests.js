/**
 * BidCraft AI - Unit Test Suite
 * Tests the REAL extension source (manifest + service worker logic) with a mocked network.
 * Run: node test/run-tests.js
 */

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const sw = require(path.join(ROOT_DIR, "background", "service-worker.js"));

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function mockResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const okBody = (text) => ({ candidates: [{ content: { parts: [{ text }] } }] });

(async () => {
  // ---------------------------------------------------------------------------
  console.log("▶ SUITE 1: Manifest & store readiness");
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "manifest.json"), "utf-8"));
  assert(manifest.manifest_version === 3, "Manifest V3");
  assert(/^\d+\.\d+\.\d+$/.test(manifest.version), "Valid semantic version");
  assert(manifest.name.length <= 75, "Name within 75 chars (store limit)");
  assert(manifest.description.length <= 132, "Description within 132 chars (store limit)");
  assert(
    JSON.stringify(manifest.permissions) === JSON.stringify(["storage"]),
    "Only the 'storage' permission is requested (no unused permissions)"
  );
  assert(manifest.host_permissions.includes("*://*.upwork.com/*"), "Upwork host permission");
  assert(
    manifest.host_permissions.includes("https://generativelanguage.googleapis.com/*"),
    "Gemini API host permission"
  );

  const referenced = [
    manifest.action.default_popup,
    manifest.background.service_worker,
    ...manifest.content_scripts.flatMap((c) => c.js),
    ...Object.values(manifest.icons)
  ];
  referenced.forEach((file) => assert(fs.existsSync(path.join(ROOT_DIR, file)), `Referenced file exists: ${file}`));

  // PNG dimensions must match the declared icon size
  Object.entries(manifest.icons).forEach(([size, file]) => {
    const buf = fs.readFileSync(path.join(ROOT_DIR, file));
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    assert(w === Number(size) && h === Number(size), `${file} is ${size}x${size} (actual ${w}x${h})`);
  });

  // No remote code (forbidden in MV3)
  const html = fs.readFileSync(path.join(ROOT_DIR, "popup", "popup.html"), "utf-8");
  assert(!/<script[^>]+src=["']https?:/i.test(html), "Popup loads no remote scripts");
  assert(!/upgradeBtn|\$12/.test(html), "No non-functional paid plan in UI");

  // ---------------------------------------------------------------------------
  console.log("\n▶ SUITE 2: Prompt construction (real buildPrompt)");
  const job = {
    title: "Senior Python Developer",
    description: "Build a FastAPI backend.",
    tags: ["Python", "FastAPI"],
    clientInfo: "Spend: $10k+"
  };
  const profile = { name: "Razvan", role: "AI Engineer", skills: "Python", links: "github.com/x", bio: "4 years" };

  const p1 = sw.buildPrompt({ jobData: job, framework: "problem_solver", instructions: "Mention Docker", profile });
  assert(p1.includes("Problem-Solver Hook"), "Problem-Solver framework included");
  assert(p1.includes("Razvan") && p1.includes("AI Engineer"), "Profile mapped");
  assert(p1.includes("Python, FastAPI"), "Tags joined");
  assert(p1.includes("Mention Docker"), "Custom instructions included");
  assert(sw.buildPrompt({ jobData: job, framework: "direct_proof", profile }).includes("The Direct Proof"), "Direct Proof framework");
  assert(sw.buildPrompt({ jobData: job, framework: "fast_turnaround", profile }).includes("Fast Turnaround"), "Fast Turnaround framework");

  const sparse = sw.buildPrompt({ jobData: { title: "Fix bug" }, framework: "x" });
  assert(sparse.includes("None specified") && sparse.includes("Freelance Specialist"), "Sparse job/profile uses safe defaults");

  const payload = sw.buildPayload("hello");
  assert(payload.systemInstruction?.parts?.[0]?.text.includes("UPWORK RULES"), "System instruction sent natively");
  assert(payload.generationConfig.maxOutputTokens >= 2048, "Output token budget leaves room for thinking models");

  // ---------------------------------------------------------------------------
  console.log("\n▶ SUITE 3: Gemini API client (real callGemini, mocked fetch)");
  const calls = [];
  let fetchMock = async (url, opts) => {
    calls.push({ url, opts });
    return mockResponse(200, okBody("  Great proposal  "));
  };
  const text = await sw.callGemini("KEY123", payload, fetchMock);
  assert(text === "Great proposal", "Returns trimmed proposal text");
  assert(!calls[0].url.includes("KEY123"), "API key NOT leaked in URL");
  assert(calls[0].opts.headers["x-goog-api-key"] === "KEY123", "API key sent in header");
  assert(calls[0].url.includes(sw.GEMINI_MODELS[0]), `Uses primary model ${sw.GEMINI_MODELS[0]}`);

  calls.length = 0;
  fetchMock = async (url) => {
    calls.push({ url });
    return calls.length === 1
      ? mockResponse(404, { error: { message: "model not found" } })
      : mockResponse(200, okBody("Fallback works"));
  };
  assert((await sw.callGemini("K", payload, fetchMock)) === "Fallback works", "Falls back to next model on 404");
  assert(calls.length === 2 && calls[1].url.includes(sw.GEMINI_MODELS[1]), "Second model was used");

  calls.length = 0;
  fetchMock = async (url) => {
    calls.push({ url });
    return mockResponse(400, { error: { message: "API key not valid. Please pass a valid API key." } });
  };
  let err = await sw.callGemini("BAD", payload, fetchMock).catch((e) => e);
  assert(err instanceof Error && /invalid/i.test(err.message), "Invalid key gives a friendly error");
  assert(calls.length === 1, "No pointless retries on auth errors");

  fetchMock = async () => mockResponse(429, { error: { message: "Quota exceeded" } });
  err = await sw.callGemini("K", payload, fetchMock).catch((e) => e);
  assert(/Quota exceeded/.test(err.message), "Rate-limit error surfaced to user");

  fetchMock = async () => mockResponse(200, { candidates: [{ content: { parts: [{ text: "thinking...", thought: true }, { text: "Final" }] } }] });
  assert((await sw.callGemini("K", payload, fetchMock)) === "Final", "Thought parts are filtered out");

  fetchMock = async () => mockResponse(200, { candidates: [] });
  err = await sw.callGemini("K", payload, fetchMock).catch((e) => e);
  assert(err instanceof Error, "Empty response raises an error");

  // ---------------------------------------------------------------------------
  console.log("\n================================================================");
  console.log(`📊 UNIT RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================");
  process.exit(failed ? 1 : 0);
})();
