(() => {
  const composerSelector = 'textarea, [contenteditable="true"], [role="textbox"]';
  const sendButtonSelector =
    'button[type="submit"], button[data-testid*="send" i], button[aria-label*="send" i], button[title*="send" i]';
  let scanInProgress = false;
  let bypassButton = null;

  const root = document.createElement("div");
  Object.assign(root.style, {
    position: "fixed",
    right: "16px",
    bottom: "16px",
    zIndex: "2147483647",
    width: "min(390px, calc(100vw - 32px))",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "8px",
    color: "#202124",
    font: "500 13px/1.45 Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  });

  const warning = document.createElement("section");
  warning.setAttribute("role", "alert");
  warning.setAttribute("aria-live", "assertive");
  Object.assign(warning.style, {
    display: "none",
    padding: "13px",
    border: "1px solid #ff493d",
    borderRadius: "15px",
    background: "linear-gradient(145deg, #171015 0%, #0b0d14 72%)",
    color: "#f5f3f4",
    boxShadow: "0 0 24px #ff322b55, 0 8px 28px #0009, inset 0 0 22px #b51d181c",
  });

  const warningHeader = document.createElement("div");
  Object.assign(warningHeader.style, {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    paddingBottom: "10px",
    borderBottom: "1px solid #64211f",
  });
  const shieldIcon = document.createElement("div");
  shieldIcon.textContent = "⬟";
  Object.assign(shieldIcon.style, {
    display: "grid",
    placeItems: "center",
    flex: "0 0 34px",
    height: "34px",
    border: "1px solid #ff493d",
    borderRadius: "10px",
    color: "#ff5148",
    fontSize: "23px",
    textShadow: "0 0 10px #ff493d",
  });
  const brand = document.createElement("div");
  Object.assign(brand.style, { display: "flex", flexDirection: "column", flex: "1", minWidth: "0" });
  const brandName = document.createElement("strong");
  brandName.textContent = "Agent Hijack Shield";
  brandName.style.fontSize = "13px";
  const brandCaption = document.createElement("span");
  brandCaption.textContent = "AI Agent Security Layer";
  brandCaption.style.cssText = "font-size:10px;color:#a7a1a8";
  brand.append(brandName, brandCaption);
  const warningTitle = document.createElement("strong");
  warningTitle.textContent = "HIGH RISK";
  Object.assign(warningTitle.style, {
    padding: "5px 8px",
    border: "1px solid #9e3029",
    borderRadius: "999px",
    background: "#681d1b",
    color: "#ff8b81",
    fontSize: "10px",
    whiteSpace: "nowrap",
  });
  const dismissButton = document.createElement("button");
  dismissButton.type = "button";
  dismissButton.textContent = "×";
  Object.assign(dismissButton.style, {
    border: "0",
    background: "transparent",
    color: "#b9adb2",
    font: "22px/1 Inter, sans-serif",
    cursor: "pointer",
  });
  dismissButton.addEventListener("click", () => {
    warning.style.display = "none";
  });
  warningHeader.append(shieldIcon, brand, warningTitle, dismissButton);

  const warningBody = document.createElement("div");
  Object.assign(warningBody.style, {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 2px",
  });
  const threatOrb = document.createElement("div");
  threatOrb.textContent = "✦";
  Object.assign(threatOrb.style, {
    display: "grid",
    placeItems: "center",
    flex: "0 0 64px",
    height: "64px",
    border: "2px solid #d72f28",
    borderRadius: "50%",
    background: "radial-gradient(circle, #8b211d 0%, #260f14 72%)",
    color: "#ff7065",
    fontSize: "31px",
    boxShadow: "0 0 18px #ff352d66, inset 0 0 14px #ff352d44",
  });
  const threatSummary = document.createElement("div");
  Object.assign(threatSummary.style, { minWidth: "0", flex: "1" });
  const threatTitle = document.createElement("strong");
  threatTitle.textContent = "Suspicious Prompt Blocked";
  Object.assign(threatTitle.style, { display: "block", fontSize: "15px", marginBottom: "6px" });
  const warningReason = document.createElement("div");
  Object.assign(warningReason.style, {
    color: "#d8d1d4",
    fontSize: "11px",
    lineHeight: "1.55",
  });
  threatSummary.append(threatTitle, warningReason);
  warningBody.append(threatOrb, threatSummary);

  const warningMeta = document.createElement("div");
  Object.assign(warningMeta.style, {
    display: "grid",
    gap: "5px",
    padding: "9px 10px",
    border: "1px solid #492326",
    borderRadius: "9px",
    background: "#100d12",
    fontSize: "10px",
  });

  function metaRow(label, value) {
    const row = document.createElement("div");
    Object.assign(row.style, { display: "flex", alignItems: "baseline", gap: "8px" });
    const name = document.createElement("span");
    name.textContent = label;
    Object.assign(name.style, { flex: "0 0 82px", color: "#b8aeb3" });
    const content = document.createElement("span");
    content.textContent = value;
    content.style.color = "#f1e9ec";
    row.append(name, content);
    warningMeta.append(row);
    return content;
  }

  const threatTypeValue = metaRow("Threat Type", "Suspicious activity");
  metaRow("Action Taken", "Blocked before sending");
  const timestampValue = metaRow("Timestamp", "");

  const blockedContent = document.createElement("div");
  Object.assign(blockedContent.style, {
    maxHeight: "60px",
    marginTop: "8px",
    padding: "7px 9px",
    overflow: "auto",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    border: "1px solid #35252b",
    borderRadius: "8px",
    background: "#100d12",
    color: "#c9c1c5",
    fontSize: "10px",
  });
  warning.append(warningHeader, warningBody, warningMeta, blockedContent);

  const historyPanel = document.createElement("section");
  historyPanel.setAttribute("aria-label", "Blocked prompt history");
  Object.assign(historyPanel.style, {
    display: "none",
    maxHeight: "min(55vh, 480px)",
    padding: "12px",
    overflow: "hidden",
    border: "1px solid #d4d7dc",
    borderRadius: "12px",
    background: "#f1f2f4",
    boxShadow: "0 4px 16px #0003",
  });
  const historyHeader = document.createElement("div");
  Object.assign(historyHeader.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    marginBottom: "8px",
  });
  const historyTitle = document.createElement("strong");
  historyTitle.textContent = "Blocked prompt history";
  const historyActions = document.createElement("div");
  Object.assign(historyActions.style, { display: "flex", gap: "8px" });

  function smallButton(label) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    Object.assign(button.style, {
      padding: "4px 7px",
      border: "1px solid #c7cbd1",
      borderRadius: "6px",
      background: "#fff",
      color: "#374151",
      font: "inherit",
      cursor: "pointer",
    });
    return button;
  }

  const clearHistoryButton = smallButton("Clear");
  const closeHistoryButton = smallButton("Close");
  historyActions.append(clearHistoryButton, closeHistoryButton);
  historyHeader.append(historyTitle, historyActions);
  const historyList = document.createElement("div");
  Object.assign(historyList.style, {
    maxHeight: "calc(min(55vh, 480px) - 54px)",
    overflowY: "auto",
  });
  historyPanel.append(historyHeader, historyList);

  const historyButton = document.createElement("button");
  historyButton.type = "button";
  Object.assign(historyButton.style, {
    display: "none",
    alignSelf: "flex-end",
    padding: "8px 12px",
    border: "1px solid #d4d7dc",
    borderRadius: "999px",
    background: "#f1f2f4",
    color: "#202124",
    boxShadow: "0 3px 12px #0003",
    font: "inherit",
    cursor: "pointer",
  });
  root.append(warning, historyPanel, historyButton);
  document.documentElement.append(root);

  function setHistoryButtonCount(count) {
    historyButton.textContent = `Blocked history (${count})`;
    historyButton.style.display = count > 0 ? "block" : "none";
  }

  function renderHistory(history) {
    historyList.replaceChildren();
    if (!Array.isArray(history) || history.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "No blocked prompts recorded.";
      empty.style.color = "#4b5563";
      historyList.append(empty);
      setHistoryButtonCount(0);
      return;
    }

    setHistoryButtonCount(history.length);
    for (const entry of history) {
      const item = document.createElement("article");
      Object.assign(item.style, {
        marginBottom: "8px",
        padding: "9px",
        border: "1px solid #d4d7dc",
        borderRadius: "8px",
        background: "#fff",
      });
      const heading = document.createElement("strong");
      heading.textContent = `Blocked · ${entry.risk_level}`;
      heading.style.color = "#9f2525";
      const time = document.createElement("div");
      time.textContent = new Date(entry.created_at).toLocaleString();
      time.style.cssText = "margin-top:2px;color:#6b7280;font-size:11px";
      const reason = document.createElement("div");
      reason.textContent = `Why blocked: ${entry.reason}`;
      reason.style.marginTop = "6px";
      const prompt = document.createElement("div");
      prompt.textContent = `Sentence: ${entry.content}`;
      Object.assign(prompt.style, {
        maxHeight: "88px",
        marginTop: "6px",
        padding: "7px",
        overflow: "auto",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        borderRadius: "6px",
        background: "#f1f2f4",
      });
      item.append(heading, time, reason, prompt);
      historyList.append(item);
    }
  }

  function requestHistory() {
    chrome.runtime.sendMessage({ type: "AGENT_SHIELD_GET_HISTORY" }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) return;
      renderHistory(response.history);
    });
  }

  historyButton.addEventListener("click", () => {
    const opening = historyPanel.style.display === "none";
    if (!opening) {
      historyPanel.style.display = "none";
      return;
    }
    requestHistory();
    historyPanel.style.display = "block";
  });
  closeHistoryButton.addEventListener("click", () => {
    historyPanel.style.display = "none";
  });
  clearHistoryButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "AGENT_SHIELD_CLEAR_HISTORY" }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) return;
      renderHistory([]);
      historyPanel.style.display = "none";
    });
  });

  function showWarning(level, reason, content) {
    warningTitle.textContent = `${level} RISK`;
    warningTitle.style.borderColor = level === "MEDIUM" ? "#92702b" : "#9e3029";
    warningTitle.style.background = level === "MEDIUM" ? "#594319" : "#681d1b";
    warningTitle.style.color = level === "MEDIUM" ? "#f2d88c" : "#ff8b81";
    warningReason.replaceChildren();
    for (const indicator of reason.split("; ").filter(Boolean)) {
      const line = document.createElement("div");
      line.textContent = `●  ${indicator}`;
      line.style.color = "#e0d9dc";
      warningReason.append(line);
    }
    const lowerReason = reason.toLowerCase();
    const isInjection = lowerReason.includes("instruction") || lowerReason.includes("prompt injection");
    const isSensitive = lowerReason.includes("sensitive") || lowerReason.includes("disclosure");
    const scanFailed = lowerReason.includes("scanner") || lowerReason.includes("unavailable");
    threatTitle.textContent = scanFailed
      ? "Local Scan Failed · Message Blocked"
      : isInjection
        ? "Prompt Injection Blocked"
        : isSensitive
          ? "Sensitive Prompt Blocked"
          : "Suspicious Prompt Blocked";
    threatTypeValue.textContent = isInjection
      ? "Prompt Injection"
      : isSensitive
        ? "Sensitive Data Risk"
        : scanFailed
          ? "Local Scanner Error"
          : "Suspicious Activity";
    timestampValue.textContent = new Date().toLocaleString();
    blockedContent.textContent = `Blocked sentence: ${content}`;
    warning.style.display = "block";
    requestHistory();
  }

  function composerFor(form) {
    return form.querySelector(composerSelector);
  }

  function promptFrom(composer) {
    const value = "value" in composer ? composer.value : composer.innerText;
    return typeof value === "string" ? value.trim() : "";
  }

  function sendButtonFor(form) {
    return form.querySelector(sendButtonSelector);
  }

  function isSendButton(button, form) {
    return button instanceof HTMLButtonElement &&
      button.form === form &&
      button.matches(sendButtonSelector);
  }

  function consumeScanResponse(response, content) {
    if (
      !response?.ok ||
      !response.scan ||
      !["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(response.scan.risk_level) ||
      !Array.isArray(response.scan.matched_indicators) ||
      !response.scan.matched_indicators.every((indicator) => typeof indicator === "string")
    ) {
      throw new Error(response?.error || "The scanner returned an invalid response.");
    }

    const scan = response.scan;
    if (scan.matched_indicators.length > 0 || scan.risk_level !== "LOW") {
      showWarning(
        scan.risk_level,
        scan.matched_indicators.join("; ") || "Suspicious activity detected.",
        content,
      );
      return false;
    }
    return true;
  }

  function scanAndSend(form, button) {
    if (scanInProgress) return;

    const content = promptFrom(composerFor(form));
    if (!content) return;
    if (content.length > 12000) {
      showWarning(
        "HIGH",
        "Message exceeds the scanner's 12,000-character limit.",
        content,
      );
      return;
    }

    scanInProgress = true;
    chrome.runtime.sendMessage(
      { type: "AGENT_SHIELD_SCAN", content },
      (response) => {
        const runtimeError = chrome.runtime.lastError;
        try {
          if (runtimeError) throw new Error(runtimeError.message);
          if (!consumeScanResponse(response, content)) return;

          bypassButton = button;
          button.click();
          window.setTimeout(() => {
            if (bypassButton === button) bypassButton = null;
          }, 1000);
        } catch (error) {
          const detail = error instanceof Error ? error.message : "Local scanner unavailable.";
          showWarning("HIGH", detail, content);
        } finally {
          scanInProgress = false;
        }
      },
    );
  }

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target instanceof Element ? event.target.closest("button") : null;
      if (!button) return;
      if (button === bypassButton) {
        bypassButton = null;
        return;
      }

      const form = button.form;
      if (!form || !composerFor(form) || !isSendButton(button, form)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      scanAndSend(form, button);
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.isComposing ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const composer = event.target.closest(composerSelector);
      const form = composer?.closest("form");
      const button = form && sendButtonFor(form);
      if (!form || !button || button.disabled) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      scanAndSend(form, button);
    },
    true,
  );

  requestHistory();
})();
