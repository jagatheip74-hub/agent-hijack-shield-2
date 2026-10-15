import hashlib
import json


def action_binding(tool: str, action: str, arguments: dict[str, object]) -> str:
    canonical = json.dumps(
        {"tool": tool, "action": action, "arguments": arguments},
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
