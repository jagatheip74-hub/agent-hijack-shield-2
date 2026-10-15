import { useEffect, useState } from "react";
import { api, asList } from "../api";
import { DecisionBadge } from "./Overview";

interface Tool { name: string; scope: string; status: string; approval_required?: boolean; approval?: string; description: string }
const defaultTools: Tool[] = [
  { name: "public_report_reader", scope: "Public sample reports", status: "Allowed", approval: "No", description: "Reads an explicitly public demo report." },
  { name: "demo_database_reader", scope: "Synthetic records only", status: "Restricted", approval: "No", description: "Access is limited to explicitly permitted synthetic data." },
  { name: "demo_email_sender", scope: "Simulated messages only", status: "Approval required", approval: "Yes", description: "Simulates delivery; never sends real email." },
  { name: "demo_file_writer", scope: "Isolated demo area", status: "Restricted", approval: "Yes", description: "Writes only inside the isolated demo area, if enabled." },
];

interface AuthResult { decision?: string; allowed?: boolean; reason?: string; approval_id?: string; request_id?: string; [key: string]: unknown }
export function Firewall() {
  const [tools, setTools] = useState<Tool[]>(defaultTools);
  const [toolName, setToolName] = useState("demo_database_reader");
  const [args, setArgs] = useState('{"record_id":"protected-sample"}');
  const [result, setResult] = useState<AuthResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    api<unknown>("/tools").then(data => {
      const serverTools = asList<Tool>(data);
      if (serverTools.length) setTools(serverTools);
    }).catch(e => setError(e.message));
  }, []);
  async function authorize() {
    setBusy(true); setError(""); setResult(null);
    try { setResult(await api<AuthResult>("/tools/authorize", { method: "POST", body: JSON.stringify({ tool_name: toolName, arguments: JSON.parse(args) }) })); }
    catch (e) { setError(e instanceof Error ? e.message : "Authorization request failed."); }
    finally { setBusy(false); }
  }
  return <>
    <div className="page-heading"><div><div className="eyebrow">ZERO-TRUST CONTROL</div><h1>Tool firewall</h1><p>Backend authorization is required before every simulated tool invocation.</p></div><div className="default-deny-pill"><span>⊘</span> DEFAULT DENY</div></div>
    {error && <div className="notice notice-error">{error}</div>}
    <div className="tool-grid">{tools.map(tool => <div className="panel tool-card" key={tool.name}><div className="tool-card-head"><span className="tool-glyph">⬡</span><span className={`permission-status status-${tool.status.toLowerCase().replace(/ /g, "-")}`}><i />{tool.status}</span></div><h3>{tool.name}</h3><p>{tool.description}</p><div className="tool-meta"><span>DATA SCOPE <b>{tool.scope}</b></span><span>APPROVAL <b>{tool.approval ?? (tool.approval_required ? "Yes" : "No")}</b></span></div></div>)}</div>
    <section className="panel authorize-panel">
      <div className="panel-heading"><div><h2>Test an authorization request</h2><p>All requests are evaluated by the backend policy engine.</p></div><span className="input-tag">POLICY CHECK</span></div>
      <div className="authorize-form"><label>SIMULATED TOOL<select value={toolName} onChange={e => setToolName(e.target.value)}>{tools.map(tool => <option value={tool.name} key={tool.name}>{tool.name}</option>)}<option value="unknown_demo_tool">unknown_demo_tool (test default deny)</option></select></label><label>ARGUMENTS (JSON)<textarea value={args} onChange={e => setArgs(e.target.value)} rows={3} /></label></div>
      <button className="button-primary" disabled={busy} onClick={authorize}>{busy ? "Checking policy…" : "Authorize tool action"}</button>
      {result && <div className="authorization-result"><div className="auth-result-top"><strong>Authorization decision</strong><DecisionBadge decision={String(result.decision ?? (result.allowed ? "ALLOW" : "BLOCK"))} /></div><p>{String(result.reason ?? "Decision recorded by backend policy engine.")}</p>{result.approval_id && <p>Approval request <code>{result.approval_id}</code> created. Review it in Approval Center.</p>}{result.request_id && <small>Request ID: {result.request_id}</small>}</div>}
    </section>
    <div className="trust-callout"><span className="callout-icon">⛨</span><div><strong>Scanner output is never treated as authorization</strong><p>Unknown tools, out-of-scope data, and unapproved destinations must be rejected server-side.</p></div><span className="callout-tag">BACKEND ENFORCED</span></div>
  </>;
}
