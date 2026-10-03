/**
 * BidCraft AI - Release builder
 * 1. Renders store images (store/*.html -> dist/store/*.png)
 * 2. Packages ONLY the extension files into dist/bidcraft-ai-v<version>.zip
 * Run: cd test && node build.js   (run e2e.js first so popup screenshots exist)
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const puppeteer = require("puppeteer-core");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const INCLUDE = ["manifest.json", "popup", "content", "background", "assets"];

(async () => {
  const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf-8"));
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(path.join(DIST, "store"), { recursive: true });

  // 1. Store images (rendered at exact required sizes, no alpha)
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  for (const [file, w, h] of [["screenshot", 1280, 800], ["promo-tile", 440, 280]]) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto("file:///" + path.join(ROOT, "store", `${file}.html`).replace(/\\/g, "/"), { waitUntil: "networkidle0" });
    const out = path.join(DIST, "store", `${file}-${w}x${h}.png`);
    await page.screenshot({ path: out, omitBackground: false });
    console.log("🖼️  " + path.relative(ROOT, out));
  }
  await browser.close();

  // 2. Zip (manifest.json must be at the zip root)
  const zip = path.join(DIST, `bidcraft-ai-v${version}.zip`);
  execFileSync("tar", ["-a", "-c", "-f", zip, ...INCLUDE], { cwd: ROOT, stdio: "inherit" });
  console.log(`📦 ${path.relative(ROOT, zip)} (${(fs.statSync(zip).size / 1024).toFixed(1)} KB)`);
})();
