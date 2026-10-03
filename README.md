# ⚡ BidCraft AI — Upwork Proposal Copilot

A high-converting, Manifest V3 Chrome Extension that analyzes Upwork job postings and generates battle-tested, personalized proposals in seconds using AI.

---

## 🎯 Features

- **Automatic Job Detection:** Detects job title, description, client credentials (spend, rating, country), and required skill badges directly from Upwork.
- **3 Copywriting Frameworks:**
  - 🎯 **The Problem-Solver:** Identifies root obstacles and presents a clear 3-step action plan.
  - 💼 **The Direct Proof:** Opens with relevant metrics and past work experience.
  - ⚡ **The Fast Turnaround:** Punchy, high-urgency execution plan for quick turnaround jobs.
- **Private by design:** Profile and API key are stored only on-device via `chrome.storage.local`. Job details and profile are sent directly to Google Gemini only when you click Generate. No BidCraft servers, no analytics.
- **1-Click Auto-Insert:** Directly inserts the generated proposal into Upwork’s proposal cover letter form.
- **Bring your own key:** Uses your free Google Gemini API key — no subscription.

---

## 🚀 How to Install & Test Locally

1. Open **Google Chrome** and navigate to:
   ```
   chrome://extensions/
   ```
2. In the top-right corner, toggle **Developer mode** to **ON**.
3. Click the **"Load unpacked"** button in the top-left corner.
4. Select the project folder:
   ```
   D:\Projects\BidCraft-AI
   ```
5. The **BidCraft AI** icon will appear in your Chrome extensions toolbar! Pin it for quick access.

---

## 🧪 Testing the Extension

1. Click the **BidCraft AI** icon.
2. Go to the **⚙️ Settings** tab and paste your free **Google Gemini API Key** (get one at [Google AI Studio](https://aistudio.google.com/)).
3. Go to the **👤 My Profile** tab and fill in your name, professional title, skills, and portfolio links.
4. Open any [Upwork Job Posting](https://www.upwork.com/nx/search/jobs/):
   - Open the BidCraft extension popup.
   - You will see the job title and tags automatically detected.
   - Choose a copywriting framework and click **✨ Generate Proposal**.
   - Click **📋 Copy to Clipboard** or **✍️ Insert into Upwork**!

---

## 📁 Project Structure

```
D:\Projects\BidCraft-AI/
├── manifest.json              # Chrome Manifest V3 configuration
├── popup/
│   ├── popup.html             # Sleek dark-mode tabbed interface
│   ├── popup.css              # Custom design system & micro-animations
│   └── popup.js               # State, quota, storage, and event handlers
├── content/
│   └── content.js             # Upwork DOM scraper & form auto-inserter
├── background/
│   └── service-worker.js      # Gemini API client (model fallback) & prompt frameworks
├── assets/
│   ├── icon16.png             # 16x16 extension icon
│   ├── icon48.png             # 48x48 extension icon
│   └── icon128.png            # 128x128 extension icon
└── README.md                  # Documentation & instructions
```

---

## ✅ Automated Tests & Release Build

```powershell
cd test
npm install          # first time only (puppeteer-core, uses your installed Chrome)
node run-tests.js    # unit tests: manifest, prompt builder, Gemini client
node e2e.js          # loads the real extension in Chrome and tests everything end-to-end
node build.js        # -> dist/bidcraft-ai-v<version>.zip + dist/store/*.png
```

## 🛒 Publishing

See [store/STORE_LISTING.md](store/STORE_LISTING.md) for ready-to-paste listing text and privacy answers.
The privacy policy lives in [docs/privacy-policy.html](docs/privacy-policy.html) and must be hosted publicly (e.g. GitHub Pages).
