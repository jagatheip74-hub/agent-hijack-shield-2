import { useState } from "react";
import type { PageName } from "./types";
import { Overview } from "./components/Overview";
import { Simulator } from "./components/Simulator";
import { Firewall } from "./components/Firewall";
import { Policies } from "./components/Policies";
import { Approvals } from "./components/Approvals";
import { Audit } from "./components/Audit";
import { Evaluation } from "./components/Evaluation";

const pages: { name: PageName; icon: string; group: string }[] = [
  { name: "Overview", icon: "◫", group: "MONITOR" },
  { name: "Attack simulator", icon: "⌁", group: "TEST" },
  { name: "Tool firewall", icon: "⬡", group: "CONTROL" },
  { name: "Policies", icon: "☷", group: "CONTROL" },
  { name: "Approvals", icon: "◷", group: "CONTROL" },
  { name: "Audit logs", icon: "≡", group: "MONITOR" },
  { name: "Evaluation", icon: "▧", group: "TEST" },
];

export default function App() {
  const [active, setActive] = useState<PageName>("Overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const page = {
    Overview: <Overview />,
    "Attack simulator": <Simulator />,
    "Tool firewall": <Firewall />,
    Policies: <Policies />,
    Approvals: <Approvals />,
    "Audit logs": <Audit />,
    Evaluation: <Evaluation />,
  }[active];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><span>◈</span></div>
          <div><strong>AGENT<span>SHIELD</span></strong><small>ZERO-TRUST FIREWALL</small></div>
        </div>
        <div className="nav-list">
          {["MONITOR", "TEST", "CONTROL"].map(group => (
            <div className="nav-group" key={group}>
              <div className="nav-caption">{group}</div>
              {pages.filter(item => item.group === group).map(item => (
                <button className={`nav-item ${active === item.name ? "active" : ""}`} key={item.name}
                  onClick={() => { setActive(item.name); setMobileNavOpen(false); }}>
                  <span className="nav-icon">{item.icon}</span>{item.name}
                  {item.name === "Approvals" && <span className="nav-ping" />}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="status-dot" /> Demo environment <span className="demo-tag">LOCAL</span>
          <p>Simulated tools only · No external actions</p>
        </div>
      </aside>
      {mobileNavOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(!mobileNavOpen)}>☰</button>
          <div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{active}</strong></div>
          <div className="topbar-right"><span className="connection"><i /> API connection</span><span className="avatar">D</span><span className="user-label">Demo admin</span></div>
        </header>
        <div className="page-body">{page}</div>
        <footer className="app-footer"><span>AGENT HIJACK SHIELD <b>·</b> LOCAL SECURITY DEMO</span><span>Zero trust, every tool call.</span></footer>
      </main>
    </div>
  );
}
