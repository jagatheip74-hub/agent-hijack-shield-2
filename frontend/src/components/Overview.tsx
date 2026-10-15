import { useEffect, useState } from "react";
import { api, asList } from "../api";

interface Stats {
  total_scans?: number;
  threats_detected?: number;
  unauthorized_actions_blocked?: number;
  actions_awaiting_approval?: number;
  pending_approvals?: number;
  recent_events?: Record<string, unknown>[];
  threat_distribution?: Record<string, unknown>[];
  decision_distribution?: Record<string, unknown>[];
  [key: string]: unknown;
}

export function Overview() {
  const [stats, setStats] = useState<Stats>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<Stats>("/dashboard/stats").then(setStats).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);
  const events = asList<Record<string, unknown>>(stats.recent_events);
  const severity = asList<Record<string, unknown>>(stats.threat_distribution);
  const decisions = asList<Record<string, unknown>>(stats.decision_distribution);
  const metric = (keys: string[], fallback = 0) => {
    for (const key of keys) if (typeof stats[key] === "number") return stats[key] as number;
    return fallback;
  };

  return <>
    <div className="page-heading">
      <div><div className="eyebrow">SECURITY OVERVIEW</div><h1>Agent security posture</h1><p>Monitor threat activity and enforce zero-trust controls across your agent tools.</p></div>
      <div className="live-pill"><i /> LIVE MONITORING</div>
    </div>
    {error && <div className="notice notice-error">Could not load dashboard: {error}. Confirm the API is running, then refresh.</div>}
    {loading && <div className="notice">Connecting to local security API…</div>}
    <div className="metric-grid">
      <Metric title="Total scans" value={metric(["total_scans", "scans"])} icon="⌕" trend="All-time" />
      <Metric title="Threats detected" value={metric(["threats_detected", "threat_count"])} icon="⚠" tint="red" trend="Flagged content" />
      <Metric title="Unauthorized blocked" value={metric(["unauthorized_actions_blocked", "blocked_actions"])} icon="⊘" tint="orange" trend="Policy enforcement" />
      <Metric title="Awaiting approval" value={metric(["actions_awaiting_approval", "pending_approvals"])} icon="◷" tint="blue" trend="Human review" />
    </div>
    <div className="overview-grid">
      <section className="panel chart-panel">
        <div className="panel-heading"><div><h2>Threat distribution</h2><p>Detected risk levels across all scans</p></div><span className="panel-icon">⌁</span></div>
        {severity.length ? <div className="bars">{severity.map((item, i) => <Bar key={String(item.risk_level ?? item.label ?? i)} label={String(item.risk_level ?? item.label ?? "Unknown")} value={Number(item.count ?? item.value ?? 0)} max={Math.max(1, ...severity.map(d => Number(d.count ?? d.value ?? 0)))} color={["#4d9eff", "#f4bd50", "#ff805d", "#ed5e70"][i % 4]} />)}</div> : <EmptyChart text="Threat activity will appear after scans are run." />}
      </section>
      <section className="panel chart-panel">
        <div className="panel-heading"><div><h2>Firewall decisions</h2><p>Authorization decisions from the policy engine</p></div><span className="panel-icon">⬡</span></div>
        {decisions.length ? <div className="decision-list">{decisions.map((item, i) => <div className="decision-row" key={String(item.decision ?? item.label ?? i)}><span className={`decision-swatch swatch-${i % 3}`} /> <span>{String(item.decision ?? item.label ?? "Unknown")}</span><strong>{Number(item.count ?? item.value ?? 0)}</strong></div>)}</div> : <EmptyChart text="No tool decisions recorded yet." />}
        <div className="chart-legend"><span><i className="legend-allowed" /> Allowed</span><span><i className="legend-blocked" /> Blocked</span><span><i className="legend-pending" /> Pending</span></div>
      </section>
    </div>
    <section className="panel events-panel">
      <div className="panel-heading"><div><h2>Recent security events</h2><p>Latest scans and tool authorization decisions</p></div><span className="muted-count">{events.length} EVENTS</span></div>
      <div className="table-scroll"><table><thead><tr><th>EVENT</th><th>ACTION</th><th>RISK</th><th>DECISION</th><th>TIME</th></tr></thead>
        <tbody>{events.length ? events.slice(0, 6).map((event, i) => <tr key={String(event.id ?? event.request_id ?? i)}>
          <td><span className="event-type"><i className="event-bullet" />{String(event.event_type ?? event.type ?? "Security event")}</span></td>
          <td>{String(event.action ?? event.tool_name ?? "—")}</td><td><RiskBadge level={String(event.risk_level ?? "LOW")} /></td>
          <td><DecisionBadge decision={String(event.decision ?? "—")} /></td><td className="time-cell">{formatDate(event.timestamp ?? event.created_at)}</td>
        </tr>) : <tr><td colSpan={5} className="empty-row">No events yet. Use the attack simulator to generate sample activity.</td></tr>}</tbody></table></div>
    </section>
    <div className="trust-callout"><span className="callout-icon">⛨</span><div><strong>Scanner and firewall work independently</strong><p>Prompt scanning provides risk signals; backend policy authorization independently gates every tool call.</p></div><span className="callout-tag">DEFAULT DENY</span></div>
  </>;
}

function Metric({ title, value, icon, tint = "cyan", trend }: { title: string; value: number; icon: string; tint?: string; trend: string }) {
  return <div className="metric-card"><div className="metric-top"><span>{title}</span><span className={`metric-icon ${tint}`}>{icon}</span></div><div className="metric-value">{value.toLocaleString()}</div><div className="metric-trend"><span className="trend-indicator">↗</span>{trend}</div></div>;
}
function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return <div className="bar-item"><div className="bar-label"><span>{label}</span><b>{value}</b></div><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(value > 0 ? 4 : 0, value / max * 100)}%`, background: color }} /></div></div>;
}
function EmptyChart({ text }: { text: string }) { return <div className="empty-chart"><span>◌</span><p>{text}</p></div>; }
export function RiskBadge({ level }: { level: string }) { return <span className={`badge risk-${level.toLowerCase()}`}>{level.toUpperCase()}</span>; }
export function DecisionBadge({ decision }: { decision: string }) {
  const normalized = decision.toLowerCase();
  const cls = normalized.includes("allow") || normalized.includes("approv") ? "decision-allow" : normalized.includes("pend") ? "decision-pending" : normalized.includes("block") || normalized.includes("reject") || normalized.includes("deny") ? "decision-block" : "decision-neutral";
  return <span className={`badge ${cls}`}>{decision.replace(/_/g, " ")}</span>;
}
export function formatDate(value: unknown) {
  if (typeof value !== "string") return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
