/// <reference types="vite/client" />

export type PageName = "Overview" | "Attack simulator" | "Tool firewall" | "Policies" | "Approvals" | "Audit logs" | "Evaluation";

export interface ScanResult {
  risk_score?: number;
  risk_level?: string;
  matched_indicators?: string[];
  indicators?: string[];
  explanation?: string;
  decision?: string;
  request_id?: string;
}

export interface Row {
  id: number | string;
  [key: string]: unknown;
}
