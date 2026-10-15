import { useState } from "react";
import { api } from "../api";

interface OpenAIAgentResult {
  status: "completed" | "blocked" | "approval_required";
  request_id: string;
  model: string;
  risk_level: string;
  message: string;
  tool_calls: Array<{
    tool: string;
    decision: string;
    execution_status: string;
    reason: string;
    approval_id?: number | null;
  }>;
}

export function OpenAIAgent() {
  const [prompt, setPrompt] = useState("Summarize the public quarterly report.");
  const [result, setResult] = useState<OpenAIAgentResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function runAgent() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await api<OpenAIAgentResult>("/agent/openai", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "OpenAI agent request failed.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel openai-agent-panel">
    <div className="panel-heading">
      <div><h2>Connect to OpenAI</h2><p>Run a real model request with the local firewall mediating every tool call.</p></div>
      <span className="input-tag">API INTEGRATION</span>
    </div>
    <div className="notice notice-warning openai-privacy">
      Prompts are sent to OpenAI. Tool calls are checked by local policy and can only use synthetic demo tools. No email is sent.
    </div>
    <label className="openai-prompt-label" htmlFor="openai-agent-prompt">PROMPT</label>
    <textarea
      id="openai-agent-prompt"
      className="attack-textarea openai-prompt"
      value={prompt}
      onChange={event => setPrompt(event.target.value)}
      maxLength={12000}
      placeholder="Ask the OpenAI agent to summarize public demo information…"
    />
    <div className="sim-actions">
      <button className="button-primary" onClick={runAgent} disabled={busy || !prompt.trim()}>
        {busy ? "Waiting for OpenAI…" : "Run OpenAI agent"}
      </button>
      <span className="scan-note">Model tool calls are never allowed without backend policy.</span>
    </div>
    {error && <div className="notice notice-error">{error}</div>}
    {result && <div className="openai-result">
      <div className="openai-result-header">
        <strong>{result.status.replace(/_/g, " ").toUpperCase()}</strong>
        <span>{result.model} · {result.risk_level} risk</span>
      </div>
      <p>{result.message || "No assistant response was returned."}</p>
      {result.tool_calls.length > 0 && <div className="openai-tool-list">
        {result.tool_calls.map((call, index) => <div className="openai-tool-row" key={`${call.tool}-${index}`}>
          <code>{call.tool}</code>
          <span>{call.decision.replace(/_/g, " ")}</span>
          <small>{call.reason}{call.approval_id ? ` (approval #${call.approval_id})` : ""}</small>
        </div>)}
      </div>}
      <div className="request-id">REQUEST ID <code>{result.request_id}</code></div>
    </div>}
  </section>;
}
