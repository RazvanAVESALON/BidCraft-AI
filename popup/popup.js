/**
 * BidCraft AI - Popup Controller Script
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  // Job detection elements
  const jobStatus = document.getElementById("jobStatus");
  const jobStatusText = document.getElementById("jobStatusText");
  const jobPreview = document.getElementById("jobPreview");
  const detectedJobTitle = document.getElementById("detectedJobTitle");
  const detectedJobTags = document.getElementById("detectedJobTags");
  const refreshJobBtn = document.getElementById("refreshJobBtn");
  const demoJobBtn = document.getElementById("demoJobBtn");
  const toggleManualBtn = document.getElementById("toggleManualBtn");
  const manualInputSection = document.getElementById("manualInputSection");
  const manualJobTitle = document.getElementById("manualJobTitle");
  const manualJobDesc = document.getElementById("manualJobDesc");

  // Generation elements
  const frameworkSelect = document.getElementById("frameworkSelect");
  const customInstructions = document.getElementById("customInstructions");
  const generateBtn = document.getElementById("generateBtn");
  const generateBtnText = document.getElementById("generateBtnText");
  const outputSection = document.getElementById("outputSection");
  const proposalOutput = document.getElementById("proposalOutput");
  const wordCount = document.getElementById("wordCount");
  const copyBtn = document.getElementById("copyBtn");
  const autoInsertBtn = document.getElementById("autoInsertBtn");
  const copyNotice = document.getElementById("copyNotice");
  const quotaText = document.getElementById("quotaText");

  // Profile elements
  const profileName = document.getElementById("profileName");
  const profileRole = document.getElementById("profileRole");
  const profileSkills = document.getElementById("profileSkills");
  const profileLinks = document.getElementById("profileLinks");
  const profileBio = document.getElementById("profileBio");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const profileSavedNotice = document.getElementById("profileSavedNotice");

  // Settings elements
  const apiKeyInput = document.getElementById("apiKeyInput");
  const saveApiKeyBtn = document.getElementById("saveApiKeyBtn");
  const apiKeySavedNotice = document.getElementById("apiKeySavedNotice");
  const clearDataBtn = document.getElementById("clearDataBtn");
  const clearDataNotice = document.getElementById("clearDataNotice");
  const quotaBadge = document.getElementById("quotaBadge");

  let currentJobData = null;

  // --------------------------------------------------------------------------
  // 1. Tab Switching
  // --------------------------------------------------------------------------
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      const targetTab = document.getElementById(btn.dataset.tab);
      if (targetTab) targetTab.classList.add("active");
    });
  });

  // --------------------------------------------------------------------------
  // 2. Load Stored Data (Profile, Settings)
  // --------------------------------------------------------------------------
  const updateKeyBadge = (hasKey) => {
    quotaText.textContent = hasKey ? "Gemini Ready" : "Add API Key";
    quotaBadge.classList.toggle("missing", !hasKey);
  };

  quotaBadge.addEventListener("click", () => {
    if (quotaBadge.classList.contains("missing")) {
      document.querySelector('[data-tab="settingsTab"]').click();
    }
  });

  const loadStoredData = async () => {
    const data = await chrome.storage.local.get(["profile", "geminiApiKey"]);

    profileName.value = data.profile?.name || "";
    profileRole.value = data.profile?.role || "";
    profileSkills.value = data.profile?.skills || "";
    profileLinks.value = data.profile?.links || "";
    profileBio.value = data.profile?.bio || "";

    apiKeyInput.value = data.geminiApiKey || "";
    updateKeyBadge(!!data.geminiApiKey);
  };

  await loadStoredData();

  // --------------------------------------------------------------------------
  // 3. Detect Upwork Job from Active Tab
  // --------------------------------------------------------------------------
  const scanActiveTab = async () => {
    jobStatusText.textContent = "Scanning active tab...";
    jobPreview.classList.add("hidden");
    jobStatus.querySelector(".status-indicator").classList.remove("ready");

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        jobStatusText.textContent = "Unable to inspect tab.";
        return;
      }

      if (!tab.url || !tab.url.includes("upwork.com")) {
        jobStatusText.textContent = "Open an Upwork job page to auto-detect.";
        return;
      }

      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { action: "GET_UPWORK_JOB_DATA" }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          jobStatusText.textContent = "No job found. Open a job post (or reload the page) and click Refresh.";
          return;
        }

        currentJobData = response.data;
        jobStatusText.textContent = "Upwork Job Detected!";
        jobStatus.querySelector(".status-indicator").classList.add("ready");

        detectedJobTitle.textContent = currentJobData.title || "Untitled Job";
        detectedJobTags.innerHTML = "";

        if (currentJobData.tags && currentJobData.tags.length > 0) {
          currentJobData.tags.slice(0, 6).forEach((tag) => {
            const span = document.createElement("span");
            span.className = "job-tag";
            span.textContent = tag;
            detectedJobTags.appendChild(span);
          });
        }

        jobPreview.classList.remove("hidden");
      });
    } catch (err) {
      console.error("Tab scan error:", err);
      jobStatusText.textContent = "Error scanning tab.";
    }
  };

  refreshJobBtn.addEventListener("click", scanActiveTab);
  await scanActiveTab();

  // Demo Job loader for testing without active Upwork tab
  demoJobBtn.addEventListener("click", () => {
    currentJobData = {
      title: "Senior Python & FastAPI Developer to Build Scalable AI Micro-SaaS",
      description: "Looking for an experienced Python / AI Engineer to build the backend and API integrations for a document intelligence micro-SaaS using FastAPI, Google Gemini / OpenAI, Docker, and Stripe.",
      tags: ["Python", "FastAPI", "LLM Integration", "Pydantic", "Docker", "Stripe API"],
      clientInfo: "Spend: $45k+ total spent | Rating: 4.95 of 5 stars | Location: United States"
    };

    jobStatusText.textContent = "Demo Job Loaded (Ready to test!)";
    jobStatus.querySelector(".status-indicator").classList.add("ready");
    detectedJobTitle.textContent = currentJobData.title;
    detectedJobTags.innerHTML = "";

    currentJobData.tags.forEach((tag) => {
      const span = document.createElement("span");
      span.className = "job-tag";
      span.textContent = tag;
      detectedJobTags.appendChild(span);
    });

    jobPreview.classList.remove("hidden");
    manualInputSection.classList.add("hidden");
  });

  // Toggle manual job input
  toggleManualBtn.addEventListener("click", () => {
    const isHidden = manualInputSection.classList.contains("hidden");
    if (isHidden) {
      manualInputSection.classList.remove("hidden");
      toggleManualBtn.textContent = "✖️ Hide manual input";
    } else {
      manualInputSection.classList.add("hidden");
      toggleManualBtn.textContent = "✏️ Or paste job manually";
    }
  });

  // --------------------------------------------------------------------------
  // 4. Save Profile
  // --------------------------------------------------------------------------
  saveProfileBtn.addEventListener("click", async () => {
    const profile = {
      name: profileName.value.trim(),
      role: profileRole.value.trim(),
      skills: profileSkills.value.trim(),
      links: profileLinks.value.trim(),
      bio: profileBio.value.trim()
    };

    await chrome.storage.local.set({ profile });
    showToast(profileSavedNotice);
  });

  // --------------------------------------------------------------------------
  // 5. Save API Key
  // --------------------------------------------------------------------------
  saveApiKeyBtn.addEventListener("click", async () => {
    const key = apiKeyInput.value.trim();
    if (!key) return;

    await chrome.storage.local.set({ geminiApiKey: key });
    updateKeyBadge(true);
    showToast(apiKeySavedNotice);
  });

  clearDataBtn.addEventListener("click", async () => {
    if (!confirm("Delete your profile and API key from this browser?")) return;
    await chrome.storage.local.clear();
    await loadStoredData();
    showToast(clearDataNotice);
  });

  // --------------------------------------------------------------------------
  // 6. Generate Proposal
  // --------------------------------------------------------------------------
  generateBtn.addEventListener("click", async () => {
    // Check API Key
    const { geminiApiKey } = await chrome.storage.local.get("geminiApiKey");
    if (!geminiApiKey) {
      alert("Please enter your Gemini API Key in the Settings tab first.");
      document.querySelector('[data-tab="settingsTab"]').click();
      return;
    }

    // Determine Job Data: Manual input takes precedence if filled, then detected/demo job
    let jobDataToUse = currentJobData;
    if (manualJobTitle.value.trim() || manualJobDesc.value.trim()) {
      jobDataToUse = {
        title: manualJobTitle.value.trim() || "Freelance Project",
        description: manualJobDesc.value.trim() || "Custom project description.",
        tags: [],
        clientInfo: "Custom / Manual Input"
      };
    }

    if (!jobDataToUse) {
      alert("Please open an Upwork job page, click 'Demo Job', or paste job details manually.");
      return;
    }

    // Set Loading State
    generateBtn.disabled = true;
    generateBtnText.textContent = "Crafting Proposal...";

    const { profile } = await chrome.storage.local.get("profile");

    const payload = {
      action: "GENERATE_PROPOSAL",
      jobData: jobDataToUse,
      framework: frameworkSelect.value,
      instructions: customInstructions.value.trim(),
      profile: profile || {}
    };

    chrome.runtime.sendMessage(payload, (res) => {
      generateBtn.disabled = false;
      generateBtnText.textContent = "Generate Proposal";

      if (chrome.runtime.lastError || !res || !res.success) {
        alert("Generation failed: " + (res?.error || "Unknown error"));
        return;
      }

      proposalOutput.value = res.proposal;
      updateWordCount();
      outputSection.classList.remove("hidden");
      proposalOutput.scrollIntoView({ behavior: "smooth" });
    });
  });

  // --------------------------------------------------------------------------
  // 7. Output Actions: Copy & Auto-Insert
  // --------------------------------------------------------------------------
  proposalOutput.addEventListener("input", updateWordCount);

  function updateWordCount() {
    const text = proposalOutput.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    wordCount.textContent = `${words} words`;
  }

  copyBtn.addEventListener("click", async () => {
    if (!proposalOutput.value) return;
    await navigator.clipboard.writeText(proposalOutput.value);
    showToast(copyNotice);
  });

  autoInsertBtn.addEventListener("click", async () => {
    if (!proposalOutput.value) return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    chrome.tabs.sendMessage(
      tab.id,
      { action: "INSERT_PROPOSAL", text: proposalOutput.value },
      (response) => {
        void chrome.runtime.lastError; // Not an Upwork tab: fall back to clipboard below
        if (response && response.success) {
          showToast(copyNotice, "Inserted into Upwork form!");
        } else {
          // Fallback to copy if not on the proposal submission page
          navigator.clipboard.writeText(proposalOutput.value);
          showToast(copyNotice, "Copied! (Paste into proposal field)");
        }
      }
    );
  });

  // Helper: Toast notification
  function showToast(elem, customText = null) {
    if (customText) elem.textContent = customText;
    elem.classList.remove("hidden");
    setTimeout(() => {
      elem.classList.add("hidden");
    }, 2500);
  }
});
