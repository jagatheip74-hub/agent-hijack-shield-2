import re
from typing import Any

from .output_guard import redact_arguments


_SIGNALS: tuple[tuple[str, re.Pattern[str], str], ...] = (
    ("prompt_injection", re.compile(r"\b(ignore|bypass|override|disregard)\b.{0,80}\b(previous|all|the|user|system|instructions|policy|safety|guardrails|request)\b", re.I), "Instruction override attempt"),
    ("secret_exfiltration", re.compile(r"\b(reveal|print|send|exfiltrate|disclose|access|read)\b.{0,80}\b(secret|credential|api[_ -]?key|password|token|confidential|protected|private|database|records?)\b", re.I), "Possible sensitive data disclosure"),
    ("unauthorized_destination", re.compile(r"\b(send|email|upload|forward|exfiltrate)\b.{0,80}\b(unapproved|external|attacker|destination|address|url)\b", re.I), "Possible unauthorized data destination"),
    ("destructive_request", re.compile(r"\b(delete|wipe|destroy|exfiltrate)\b", re.I), "Potentially destructive or unsafe request"),
)


def scan_action(tool: str, action: str, arguments: dict[str, Any]) -> dict[str, Any]:
    haystack = f"{tool} {action} {arguments!r}"
    findings = [message for _, pattern, message in _SIGNALS if pattern.search(haystack)]
    risk_level = "high" if findings else "low"
    return {
        "risk_level": risk_level,
        "flagged": bool(findings),
        "findings": findings,
        "safe_arguments": redact_arguments(arguments),
    }
