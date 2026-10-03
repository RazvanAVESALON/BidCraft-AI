# Chrome Web Store – Listing (copy & paste)

## Store listing tab

**Name:** BidCraft AI - Upwork Proposal Assistant

**Summary (≤132 chars):**
Generate personalized, high-converting Upwork proposals in one click with Google Gemini AI.

**Category:** Productivity → Tools (or "Workflow & Planning")
**Language:** English

**Description:**
```
Stop staring at a blank cover letter. BidCraft AI reads the Upwork job you're viewing and writes a personalized, high-converting proposal in seconds.

HOW IT WORKS
1. Add your free Google Gemini API key (takes 30 seconds at aistudio.google.com)
2. Fill in your freelancer profile once: title, skills, portfolio, bio
3. Open any Upwork job post and click Generate
4. Insert the proposal straight into Upwork's cover letter field, or copy it

FEATURES
✓ Auto-detects job title, description, required skills and client details
✓ 3 proven copywriting frameworks:
   • The Problem-Solver – names the client's real problem and gives a 3-step plan
   • The Direct Proof – opens with your most relevant past work
   • The Fast Turnaround – short, punchy, availability-first
✓ Strong first two lines (what clients see in the preview list)
✓ 150–220 words, no "Dear Hiring Manager" fluff
✓ Extra instructions for each proposal ("mention my Shopify work")
✓ Paste a job manually if needed
✓ 1-click insert into the Upwork form

PRIVATE BY DESIGN
• No account, no subscription, no BidCraft servers
• Your profile and API key are stored only in your browser
• Job details are sent directly to Google Gemini only when you click Generate
• No analytics or tracking. Delete everything with one click.

BidCraft AI is not affiliated with or endorsed by Upwork Inc.
```

**Images** (from `dist/store/`):
- Screenshot: `screenshot-1280x800.png`
- Small promo tile: `promo-tile-440x280.png`
- Store icon: `assets/icon128.png`

---

## Privacy practices tab

**Single purpose:**
Helps freelancers write proposals for Upwork job posts by reading the open job and generating a cover letter with Google Gemini.

**Permission justifications:**
| Permission | Justification |
|---|---|
| `storage` | Saves the user's freelancer profile and Gemini API key locally so they don't re-enter them. |
| Host `*://*.upwork.com/*` | Reads the job details on the Upwork job page the user is viewing, and inserts the generated proposal into the cover letter field when the user clicks "Insert". |
| Host `generativelanguage.googleapis.com` | Sends the generation request to the Google Gemini API using the user's own API key. |

**Remote code:** No, I am not using remote code.

**Data usage – check these boxes:**
- ☑ Personally identifiable information (name in profile)
- ☑ Website content (Upwork job text)
- ☑ Authentication information (user's Gemini API key, stored locally)

**Certify all three:**
- ☑ I do not sell or transfer user data to third parties, outside of the approved use cases
- ☑ I do not use or transfer user data for purposes unrelated to my item's single purpose
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** `https://razvanavesalon.github.io/BidCraft-AI/privacy-policy.html`

---

## Distribution tab
- Payments: Free
- Visibility: Public (or Unlisted for a soft launch)
- Regions: All regions
