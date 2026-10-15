from typing import Any


class ToolError(ValueError):
    pass


def validate_simulated_tool(tool: str, action: str, arguments: dict[str, Any]) -> None:
    """Validate the local demo tool and arguments without performing the action."""
    if tool == "demo":
        if action in {"echo", "uppercase"}:
            if action == "uppercase" and not isinstance(arguments.get("text", ""), str):
                raise ToolError("text must be a string")
            return
        if action == "sum":
            numbers = arguments.get("numbers")
            if not isinstance(numbers, list) or any(
                isinstance(number, bool) or not isinstance(number, (int, float)) for number in numbers
            ):
                raise ToolError("numbers must be a list of numeric values")
            return
        raise ToolError("Unknown simulated action")
    if tool == "public_report_reader" and action == "read_report":
        if arguments.get("report_id") != "quarterly-summary":
            raise ToolError("Only the public quarterly-summary report is available")
        return
    if tool == "demo_database_reader" and action == "read_record":
        if arguments.get("record_id") != "public-sample":
            raise ToolError("Only explicitly permitted synthetic records are available")
        return
    if tool == "demo_email_sender" and action == "send_message":
        if arguments.get("destination") != "demo.invalid":
            raise ToolError("Destination is not on the simulated allow-list")
        if not isinstance(arguments.get("message", ""), str):
            raise ToolError("message must be a string")
        return
    raise ToolError("Unknown tool or action")


def run_simulated_tool(tool: str, action: str, arguments: dict[str, Any]) -> Any:
    """Run local deterministic demos only; this registry never performs I/O."""
    validate_simulated_tool(tool, action, arguments)
    if tool != "demo":
        if tool == "public_report_reader":
            return {"report_id": "quarterly-summary", "summary": "Synthetic public report: quarterly activity was stable."}
        if tool == "demo_database_reader":
            return {"record_id": "public-sample", "label": "Synthetic public sample", "value": "[SYNTHETIC]"}
        if tool == "demo_email_sender":
            return {"status": "simulated", "destination": "demo.invalid"}
    if action == "echo":
        return {"echo": arguments.get("text", "")}
    if action == "uppercase":
        text = arguments.get("text", "")
        return {"text": text.upper()}
    if action == "sum":
        numbers = arguments.get("numbers")
        return {"sum": sum(numbers)}
    raise ToolError("Unknown simulated action")
