import { useEffect, useState } from "react";
import { api, asList } from "../api";
import { DecisionBadge, formatDate, RiskBadge } from "./Overview";

interface Event { id: number | string; request_id?: string; event_type?: string; action?: string; decision?: string; reason?: string; risk_level?: string; timestamp?: string; [key: string]: unknown }
export function Audit() {
  const [events, setEvents] = useState<Event[]>([]);
  const [query, setQuery] = useState("");
  const [decision, setDecision] = useState("");
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const params = new URLSearchParams({ limit: "500" });
    if (query.trim()) params.set("search", query.trim());
    if (decision) params.set("decision", decision);
    api<unknown>(`/audit?${params}`).then(data => setEvents(asList<Event>(data, ["items", "events", "logs"]))).catch(e => setError(e.message));
  }, [query, decision, refresh]);
  return <>
    <div className="page-heading"><div><div className="eyebrow">TRACEABLE DECISIONS</div><h1>Audit logs</h1><p>Review recorded scans, authorization decisions, approval outcomes, and security events.</p></div><button className="button-secondary" onClick={() => setRefresh(n => n + 1)}>↻ Refresh events</button></div>
    {error && <div className="notice notice-error">{error}</div>}
    <section className="panel audit-panel">
      <div className="audit-toolbar"><label className="search-box"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search action, reason, request ID…" /></label><select value={decision} onChange={e => setDecision(e.target.value)} aria-label="Filter by decision"><option value="">All decisions</option><option value="allow">Allowed</option><option value="block">Blocked</option><option value="pending">Pending</option><option value="reject">Rejected</option></select><span className="muted-count">SHOWING {events.length} RECORDS · LATEST 500</span></div>
      <div className="table-scroll"><table><thead><tr><th>TIMESTAMP</th><th>REQUEST ID</th><th>ACTION</th><th>RISK</th><th>DECISION</th><th>REASON</th></tr></thead><tbody>
        {events.length ? events.map((event, i) => <tr key={String(event.id ?? i)}><td className="time-cell">{formatDate(event.timestamp ?? event.created_at)}</td><td><code className="request-code">{event.request_id ?? "—"}</code></td><td>{String(event.action ?? event.event_type ?? "—")}</td><td><RiskBadge level={String(event.risk_level ?? "LOW")} /></td><td><DecisionBadge decision={String(event.decision ?? "—")} /></td><td className="reason-cell">{String(event.reason ?? "—")}</td></tr>) : <tr><td colSpan={6} className="empty-row">{error ? "Could not load audit events." : "No audit events match your filters."}</td></tr>}
      </tbody></table></div>
    </section>
  </>;
}
