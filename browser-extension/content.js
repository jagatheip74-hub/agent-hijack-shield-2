(() => {
  const supportedExtensions = new Set(["txt", "md", "csv", "json"]);
  const maxFileBytes = 48 * 1024;
  const maxFiles = 5;
  const bypassOnce = new WeakSet();
  const busyInputs = new WeakSet();

  function showStatus(message, blocked = false) {
    let banner = document.getElementById("agent-shield-upload-status");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "agent-shield-upload-status";
      Object.assign(banner.style, {
        position: "fixed",
        top: "12px",
        right: "12px",
        zIndex: "2147483647",
        maxWidth: "360px",
        padding: "12px 16px",
        borderRadius: "6px",
        color: "white",
        font: "14px/1.4 sans-serif",
        boxShadow: "0 2px 12px #0005",
      });
      document.documentElement.appendChild(banner);
    }
    banner.style.background = blocked ? "#a12622" : "#176b45";
    banner.textContent = message;
    if (!blocked) setTimeout(() => banner.remove(), 5000);
  }

  function authorize(payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "authorize-upload", payload }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ allowed: false, reason: chrome.runtime.lastError.message });
          return;
        }
        resolve(response || { allowed: false, reason: "No response from the local shield" });
      });
    });
  }

  function resumeUpload(input, files) {
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    input.files = transfer.files;
    bypassOnce.add(input);
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  document.addEventListener("change", async (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "file") return;
    if (bypassOnce.has(input)) {
      bypassOnce.delete(input);
      return;
    }
    const files = Array.from(input.files || []);
    if (files.length === 0 || busyInputs.has(input)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    busyInputs.add(input);

    try {
      if (files.length > maxFiles) {
        throw new Error(`Select no more than ${maxFiles} files at a time.`);
      }

      for (const file of files) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "";
        if (!supportedExtensions.has(extension)) {
          throw new Error(`${file.name} is unsupported. Use TXT, Markdown, CSV, or JSON.`);
        }
        if (file.size > maxFileBytes) {
          throw new Error(`${file.name} exceeds the 48 KiB limit.`);
        }

        const content = await file.text();
        if (!content || content.length > 12000) {
          throw new Error(`${file.name} must contain 1 to 12,000 characters.`);
        }
        showStatus(`Scanning ${file.name} with the local shield...`);
        const result = await authorize({ filename: file.name, content });
        if (!result.allowed) {
          throw new Error(`${file.name}: ${result.reason || "not authorized"}`);
        }
      }

      showStatus(`All ${files.length} file(s) approved by local policy.`);
      resumeUpload(input, files);
    } catch (error) {
      input.value = "";
      showStatus(`Upload blocked: ${error.message}`, true);
    } finally {
      busyInputs.delete(input);
    }
  }, true);
})();