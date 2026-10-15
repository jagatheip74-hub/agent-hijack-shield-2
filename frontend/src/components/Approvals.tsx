import { useEffect, useState } from "react";
import { api, asList } from "../api";
import { formatDate } from "./Overview";

interface Approval { id: number | string; status?: string; action_summary?: string; action?: string; tool_name?: string; created_at?: string; reason?: string; [key: string]: unknown }
export function Approvals() {
  const [items, setItems] = useState<Approval[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | number | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    api<unknown>("/approvals").then(data => setItems(asList<Approval>(data, ["items", "approvals"]))).catch(e => setError(e.message));
  }, [refresh]);
  async function resolve(item: Approval, decision: "approve" | "reject") {
    setBusy(item.id); setError("");
    try {
      await api(`/approvals/${encodeURIComponent(String(item.id))}/resolve`, { method: "POST", body: JSON.stringify({ decision, reviewer: "demo-admin" }) });
      setRefresh(n => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not resolve approval."); }
    finally { setBusy(null); }
  }
  const pending = items.filter(item => String(item.status ?? "pending").toLowerCase() === "pending");
  return <>
    <div className="page-heading"><div><div className="eyebrow">HUMAN-IN-THE-LOOP</div><h1>Approval center</h1><p>Review sensitive simulated actions. Approval is followed by a fresh backend policy check.</p></div><div className="approval-count">{pending.length} PENDING</div></div>
    {error && <div className="notice notice-error">{error}</div>}
    <div className="notice notice-warning"><strong>Re-authorization required:</strong> An approval records human review; it does not directly execute an action or override current policy.</div>
    {pending.length ? <div className="approval-list">{pending.map(item => <section className="panel approval-card" key={item.id}><div className="approval-indicator">◷</div><div className="approval-details"><div className="approval-title-row"><h2>{String(item.action_summary ?? item.action ?? item.tool_name ?? "Sensitive action")}</h2><span className="pending-label">PENDING REVIEW</span></div><p>{String(item.reason ?? "This simulated action requires human approval.")}</p><div className="approval-meta"><span>REQUEST #{item.id}</span><span>CREATED {formatDate(item.created_at)}</span></div></div><div className="approval-actions"><button className="button-danger-outline" disabled={busy === item.id} onClick={() => resolve(item, "reject")}>Reject</button><button className="button-primary" disabled={busy === item.id} onClick={() => resolve(item, "approve")}>{busy === item.id ? "Saving…" : "Approve & re-check"}</button></div></section>)}</div>
      : <div className="panel empty-state"><div className="empty-state-icon">✓</div><h3>{error ? "Could not load approvals" : "No pending approvals"}</h3><p>{error || "Sensitive actions requiring review will appear here."}</p></div>}
  </>;
}
