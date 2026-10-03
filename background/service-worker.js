/**
 * BidCraft AI - Background Service Worker
 * Dispatches Google Gemini API calls and enforces high-converting copywriting frameworks.
 */

// Models are tried in order; if one is retired/unavailable (404) the next one is used.
const GEMINI_MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash"];
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const FRAMEWORKS = {
  problem_solver: `
FRAMEWORK: The Problem-Solver Hook
- First 2 lines: Immediately identify the client's core technical or business obstacle and explain WHY it is happening.
- Middle: Outline your exact 3-step action plan to solve it.
- Proof: Mention 1 highly relevant past project from the freelancer's background.
- Call to Action: Ask a thoughtful, low-friction qualifying question to start a conversation.`,

  direct_proof: `
FRAMEWORK: The Direct Proof
- First 2 lines: Open directly with evidence of having solved this exact problem before ("I recently built/fixed [similar system] which resulted in [outcome]...").
- Middle: Detail the specific tools and architectural approach you will use for their job.
- Portfolio: Seamlessly reference the freelancer's portfolio links.
- Call to Action: Suggest a brief 10-minute discovery chat.`,

  fast_turnaround: `
FRAMEWORK: The Fast Turnaround & Execution
- First 2 lines: State your immediate availability and guaranteed delivery timeframe for the first milestone.
- Middle: Bullet points of what will be delivered on Day 1 and Day 2.
- Call to Action: Offer to start working as soon as today.`
};

const SYSTEM_INSTRUCTION = `You are an elite, top-rated freelance strategist specializing in winning high-ticket contracts on Upwork.
CRITICAL UPWORK RULES:
1. NEVER start with "Dear Hiring Manager", "I hope this proposal finds you well", or "I was excited to see your job". Clients see only the first 2 lines in their preview list—make those lines grab attention immediately.
2. Keep the proposal between 150 and 220 words. Clients skim; long walls of text get rejected.
3. Be confident, professional, and conversational—never sound desperate or robotic.
4. Naturally weave in the freelancer's background, relevant skills, and portfolio without dumping an entire resume.
5. End with a specific, low-commitment question about their project.
6. Never invent facts, metrics, or clients that are not present in the freelancer profile.`;

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GENERATE_PROPOSAL") {
      handleGenerateProposal(request)
        .then((proposal) => sendResponse({ success: true, proposal }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // Keep channel open for async response
    }
  });
}

function buildPrompt({ jobData = {}, framework, instructions, profile = {} }) {
  const frameworkGuidance =
    FRAMEWORKS[framework] || "Write a concise, personalized, high-converting proposal.";
  const tags = Array.isArray(jobData.tags) && jobData.tags.length ? jobData.tags.join(", ") : "None specified";

  return `
Generate a winning Upwork proposal based on the following details:

--- FREELANCER PROFILE ---
Name: ${profile.name || "Freelance Specialist"}
Role: ${profile.role || "Professional Freelancer"}
Core Skills: ${profile.skills || "Not specified"}
Portfolio Links: ${profile.links || "Available upon request"}
Bio / Background: ${profile.bio || "Experienced specialist with a track record of delivering clean, reliable work."}

--- UPWORK JOB DETAILS ---
Job Title: ${jobData.title || "Freelance Project"}
Job Description:
${jobData.description || "No description provided."}
Required Skills / Tags: ${tags}
Client Details: ${jobData.clientInfo || "Not specified"}

--- COPYWRITING INSTRUCTIONS ---
${frameworkGuidance}
${instructions ? `User Special Instructions: ${instructions}` : ""}

Output ONLY the proposal text. Do not include subject lines, placeholders in brackets like [Your Name] (use the actual name provided), or preamble.`;
}

function buildPayload(userPrompt) {
  return {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
  };
}

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .filter((p) => typeof p.text === "string" && !p.thought)
    .map((p) => p.text)
    .join("")
    .trim();
}

async function callGemini(apiKey, payload, fetchImpl = fetch) {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    const response = await fetchImpl(`${GEMINI_BASE_URL}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const text = extractText(await response.json());
      if (!text) throw new Error("No response generated from the AI model. Please try again.");
      return text;
    }

    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `API error (${response.status})`;
    lastError = new Error(`Gemini API: ${message}`);

    // Only fall through to the next model when this one is not available.
    if (response.status !== 404) break;
  }

  if (/API key not valid|API_KEY_INVALID/i.test(lastError?.message || "")) {
    throw new Error("Your Gemini API key is invalid. Please check it in the Settings tab.");
  }
  throw lastError || new Error("Gemini API request failed.");
}

async function handleGenerateProposal(request) {
  const { geminiApiKey } = await chrome.storage.local.get("geminiApiKey");
  if (!geminiApiKey) {
    throw new Error("Missing Gemini API Key. Please add it in the Settings tab.");
  }

  const text = await callGemini(geminiApiKey, buildPayload(buildPrompt(request)));

  const { totalGenerations = 0 } = await chrome.storage.local.get("totalGenerations");
  await chrome.storage.local.set({ totalGenerations: totalGenerations + 1 });

  return text;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { GEMINI_MODELS, buildPrompt, buildPayload, extractText, callGemini };
}
