import { useEffect, useState } from "react";
import { api, asList } from "../api";

interface Policy { id: number | string; name?: string; rule_type?: string; description?: string; enabled?: boolean; rule_configuration?: unknown; [key: string]: unknown }
export function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    api<unknown>("/policies").then(data => setPolicies(asList<Policy>(data, ["items", "policies"]))).catch(e => setError(e.message));
  }, [refresh]);
  async function toggle(policy: Policy) {
    setBusyId(policy.id); setError("");
    try {
      await api(`/policies/${encodeURIComponent(String(policy.id))}`, { method: "PATCH", body: JSON.stringify({ enabled: !policy.enabled }) });
      setRefresh(n => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Policy update failed."); }
    finally { setBusyId(null); }
  }
  return <>
    <div className="page-heading"><div><div className="eyebrow">BACKEND-ENFORCED GUARDRAILS</div><h1>Policy management</h1><p>Demo policy changes are enforced by the API. This local interface is not an authenticated admin console.</p></div><div className="policy-summary">{policies.filter(p => p.enabled).length} ACTIVE POLICIES</div></div>
    {error && <div className="notice notice-error">{error}</div>}
    <div className="notice notice-warning"><strong>Demo admin controls:</strong> These endpoints have no production authentication. Do not expose them outside your local hackathon environment.</div>
    <div className="policy-list">{policies.length ? policies.map(policy => <section className={`panel policy-card ${policy.enabled ? "" : "policy-disabled"}`} key={policy.id}><div className="policy-icon">☷</div><div className="policy-info"><div className="policy-title-row"><h2>{policy.name ?? `Policy ${policy.id}`}</h2><span className={`policy-state ${policy.enabled ? "enabled" : "disabled"}`}><i />{policy.enabled ? "ENABLED" : "DISABLED"}</span></div><div className="policy-rule">{policy.rule_type ?? "Security rule"}</div><p>{policy.description ?? "Policy enforced by the backend authorization engine."}</p></div><button className={`toggle ${policy.enabled ? "on" : ""}`} aria-label={`${policy.enabled ? "Disable" : "Enable"} ${policy.name ?? "policy"}`} aria-pressed={Boolean(policy.enabled)} disabled={busyId === policy.id} onClick={() => toggle(policy)}><span /></button></section>) : <div className="panel empty-state"><span>☷</span><h3>{error ? "Could not load policies" : "Loading policies…"}</h3><p>{error || "Policy rules are provided by the local API."}</p></div>}</div>
  </>;
}
