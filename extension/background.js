const SCAN_URL = "http://127.0.0.1:8000/api/scan";
const HISTORY_KEY = "blockedPromptHistory";
const MAX_HISTORY_ITEMS = 50;

function readHistory(sendResponse) {
  chrome.storage.local.get({ [HISTORY_KEY]: [] }, (data) => {
    const history = Array.isArray(data[HISTORY_KEY]) ? data[HISTORY_KEY] : [];
    sendResponse({ ok: true, history });
  });
}

function saveBlockedPrompt(content, scan, sendResponse) {
  const entry = {
    content,
    risk_level: scan.risk_level,
    reason: scan.matched_indicators.join("; ") || "Suspicious activity detected.",
    created_at: new Date().toISOString(),
  };

  chrome.storage.local.get({ [HISTORY_KEY]: [] }, (data) => {
    const existing = Array.isArray(data[HISTORY_KEY]) ? data[HISTORY_KEY] : [];
    const history = [entry, ...existing].slice(0, MAX_HISTORY_ITEMS);
    chrome.storage.local.set({ [HISTORY_KEY]: history }, () => {
      sendResponse({ ok: true, scan, history_count: history.length });
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "AGENT_SHIELD_GET_HISTORY") {
    readHistory(sendResponse);
    return true;
  }

  if (message?.type === "AGENT_SHIELD_CLEAR_HISTORY") {
    chrome.storage.local.set({ [HISTORY_KEY]: [] }, () => {
      sendResponse({ ok: true, history: [] });
    });
    return true;
  }

  const scanningDocument = message?.type === "AGENT_SHIELD_SCAN_DOCUMENT";
  if (
    (message?.type !== "AGENT_SHIELD_SCAN" && !scanningDocument) ||
    (scanningDocument
      ? typeof message.filename !== "string" || typeof message.content_base64 !== "string"
      : typeof message.content !== "string")
  ) {
    return false;
  }

  const hostname = new URL(sender.url).hostname;
  const sourceType = hostname === "gemini.google.com"
    ? "gemini_extension"
    : hostname === "claude.ai"
      ? "claude_extension"
      : "chatgpt_extension";

  fetch(scanningDocument ? "http://127.0.0.1:8000/api/scan-document" : SCAN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scanningDocument
      ? {
        filename: message.filename,
        content_base64: message.content_base64,
        source_type: `${sourceType}_document`,
      }
      : {
        content: message.content,
        source_type: sourceType,
      }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorResponse = await response.json().catch(() => null);
        throw new Error(errorResponse?.detail || `Scanner request failed (${response.status}).`);
      }
      const scan = await response.json();
      if (
        !["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(scan.risk_level) ||
        !Array.isArray(scan.matched_indicators) ||
        !scan.matched_indicators.every((indicator) => typeof indicator === "string")
      ) {
        throw new Error("The scanner returned an invalid response.");
      }

      if (scan.risk_level !== "LOW" || scan.matched_indicators.length > 0) {
        saveBlockedPrompt(
          scanningDocument ? `Attachment: ${message.filename}` : message.content,
          scan,
          sendResponse,
        );
      } else {
        sendResponse({ ok: true, scan });
      }
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Could not reach the local scanner.",
      });
    });

  return true;
});
