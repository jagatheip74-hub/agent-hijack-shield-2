import { useEffect, useState } from "react";
import { api, asList } from "../api";

interface EvaluationResult { id: number | string; test_name?: string; expected_result?: string; actual_result?: string; passed?: boolean; execution_time_ms?: number; [key: string]: unknown }
interface EvaluationSummary { detection_rate?: number; precision?: number; false_positive_rate?: number; unauthorized_action_prevention_rate?: number; results?: EvaluationResult[]; [key: string]: unknown }
export function Evaluation() {
  const [summary, setSummary] = useState<EvaluationSummary>({});
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    api<unknown>("/evaluation/results").then(data => {
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const response = data as EvaluationSummary;
        setSummary(response);
        setResults(asList<EvaluationResult>(response.results ?? data, ["items", "results"]));
      } else setResults(asList<EvaluationResult>(data));
    }).catch(e => setError(e.message));
  }, [refresh]);
  async function run() {
    setBusy(true); setError(""); setNotice("");
    try { await api("/evaluation/run", { method: "POST", body: JSON.stringify({}) }); setNotice("Evaluation completed. Metrics below reflect measured test results."); setRefresh(n => n + 1); }
    catch (e) { setError(e instanceof Error ? e.message : "Evaluation failed."); }
    finally { setBusy(false); }
  }
  const percent = (value: unknown) => typeof value === "number" ? `${(value <= 1 ? value * 100 : value).toFixed(1)}%` : "—";
  return <>
    <div className="page-heading"><div><div className="eyebrow">MEASURED SECURITY TESTS</div><h1>Security evaluation</h1><p>Run labelled test cases and inspect actual scanner and policy-engine outcomes.</p></div><button className="button-primary" onClick={run} disabled={busy}>{busy ? "Running tests…" : "▶ Run evaluation"}</button></div>
    {error && <div className="notice notice-error">{error}</div>}{notice && <div className="notice notice-success">{notice}</div>}
    <div className="evaluation-metrics">
      <EvaluationMetric label="Detection rate" value={percent(summary.detection_rate)} sub="Malicious scanner cases detected" />
      <EvaluationMetric label="Precision" value={percent(summary.precision)} sub="Flagged cases that were malicious" />
      <EvaluationMetric label="False-positive rate" value={percent(summary.false_positive_rate)} sub="Safe cases incorrectly flagged" />
      <EvaluationMetric label="Unauthorized action prevention" value={percent(summary.unauthorized_action_prevention_rate)} sub="Prohibited tool calls blocked" accent />
    </div>
    <section className="panel evaluation-table-panel"><div className="panel-heading"><div><h2>Labelled test cases</h2><p>Expected and actual outcomes from the latest run</p></div><span className="muted-count">{results.length} CASES</span></div><div className="table-scroll"><table><thead><tr><th>TEST CASE</th><th>EXPECTED</th><th>ACTUAL</th><th>RESULT</th><th>TIME</th></tr></thead><tbody>
      {results.length ? results.map((item, i) => <tr key={String(item.id ?? i)}><td>{String(item.test_name ?? `Test case ${i + 1}`)}</td><td>{String(item.expected_result ?? "—")}</td><td>{String(item.actual_result ?? "—")}</td><td><span className={`test-result ${item.passed ? "pass" : "fail"}`}>{item.passed ? "✓ PASS" : "✕ FAIL"}</span></td><td>{typeof item.execution_time_ms === "number" ? `${item.execution_time_ms.toFixed(1)} ms` : "—"}</td></tr>) : <tr><td colSpan={5} className="empty-row">No evaluation results yet. Run the evaluation to measure actual outcomes.</td></tr>}
    </tbody></table></div></section>
    <p className="evaluation-footnote">Metrics are computed from executed labelled tests only. A baseline prompt scanner is heuristic and is not a security guarantee.</p>
  </>;
}
function EvaluationMetric({ label, value, sub, accent = false }: { label: string; value: string; sub: string; accent?: boolean }) {
  return <div className={`panel evaluation-metric ${accent ? "evaluation-accent" : ""}`}><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>;
}
