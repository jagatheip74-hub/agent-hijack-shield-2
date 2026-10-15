chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "authorize-upload") return undefined;

  fetch("http://127.0.0.1:8000/api/chatgpt/uploads/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message.payload),
    signal: AbortSignal.timeout(10000),
  })
    .then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Shield rejected the request");
      sendResponse(body);
    })
    .catch((error) => sendResponse({ allowed: false, reason: error.message }));

  return true;
});