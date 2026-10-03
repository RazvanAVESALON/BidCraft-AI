/**
 * BidCraft AI - Upwork Content Script
 * Handles DOM scraping of job postings and auto-insertion of proposals.
 */

(() => {
  // Listen for messages from the extension popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_UPWORK_JOB_DATA") {
      const jobData = scrapeUpworkJob();
      sendResponse({ success: !!jobData, data: jobData });
      return true;
    }

    if (request.action === "INSERT_PROPOSAL") {
      const inserted = insertProposalIntoForm(request.text);
      sendResponse({ success: inserted });
      return true;
    }
  });

  /**
   * Scrapes job details from various Upwork page layouts (details modal, job page, proposal page).
   */
  function scrapeUpworkJob() {
    try {
      // 1. Title
      let title = "";
      const titleElem =
        document.querySelector('[data-test="job-title"]') ||
        document.querySelector("header h1") ||
        document.querySelector("header h2") ||
        document.querySelector(".job-details-header h2") ||
        document.querySelector("h4.air3-card-title") ||
        document.querySelector("main h1, main h2, main h3, main h4") ||
        document.querySelector("h1, h2, h3, h4");
      if (titleElem) title = titleElem.innerText.trim();
      if (!title && document.title) {
        title = document.title.replace(/\s*[-|]\s*Upwork.*$/i, "").trim();
      }

      // 2. Description
      let description = "";
      const descElem =
        document.querySelector('[data-test="job-description"]') ||
        document.querySelector(".job-description") ||
        document.querySelector(".air3-line-clamp") ||
        document.querySelector('[data-test="Description"]');
      if (descElem) description = descElem.innerText.trim();

      // 3. Skills / Tags
      const tags = [];
      const tagElements = document.querySelectorAll(
        '[data-test="attr-item"] a, .air3-token-multi-select span, .air3-token, [data-test="skill"]'
      );
      tagElements.forEach((el) => {
        const text = el.innerText.trim();
        if (text && !tags.includes(text)) tags.push(text);
      });

      // 4. Client Info (Spend, Rating, Country)
      let clientInfo = "";
      const spendElem = document.querySelector('[data-test="client-spend"]') || document.querySelector('[data-qa="client-spend"]');
      const ratingElem = document.querySelector('[data-test="client-rating"]') || document.querySelector(".air3-rating-value");
      const locationElem = document.querySelector('[data-test="client-country"]') || document.querySelector('[data-qa="client-location"]');

      if (spendElem) clientInfo += `Spend: ${spendElem.innerText.trim()} | `;
      if (ratingElem) clientInfo += `Rating: ${ratingElem.innerText.trim()} | `;
      if (locationElem) clientInfo += `Location: ${locationElem.innerText.trim()}`;

      // Return null if neither title nor description could be found
      if (!title && !description) {
        return null;
      }

      return {
        title: title || "Upwork Project",
        description: description || "No description found.",
        tags: tags,
        clientInfo: clientInfo.trim()
      };
    } catch (err) {
      console.error("[BidCraft AI] Error scraping Upwork page:", err);
      return null;
    }
  }

  /**
   * Finds the cover letter field on Upwork's proposal page and inserts text.
   */
  function insertProposalIntoForm(text) {
    try {
      const coverLetterArea =
        document.querySelector('textarea[aria-labelledby*="cover_letter"]') ||
        document.querySelector("textarea#coverLetter") ||
        document.querySelector('textarea[name="coverLetter"]') ||
        document.querySelector("textarea.air3-textarea") ||
        document.querySelector("textarea");

      if (!coverLetterArea) {
        return false;
      }

      // Focus, set value via the native setter (so React/Vue state picks it up), then notify
      coverLetterArea.focus();
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      if (nativeSetter) {
        nativeSetter.call(coverLetterArea, text);
      } else {
        coverLetterArea.value = text;
      }
      coverLetterArea.dispatchEvent(new Event("input", { bubbles: true }));
      coverLetterArea.dispatchEvent(new Event("change", { bubbles: true }));

      return true;
    } catch (err) {
      console.error("[BidCraft AI] Error inserting proposal:", err);
      return false;
    }
  }
})();
