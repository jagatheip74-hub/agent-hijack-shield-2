from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ActionRequest(BaseModel):
    tool: str = Field(min_length=1, max_length=80)
    action: str = Field(min_length=1, max_length=80)
    arguments: dict[str, Any] = Field(default_factory=dict)
    actor: str = Field(default="local-demo", min_length=1, max_length=120)
    approval_id: int | None = None
    request_id: str | None = Field(default=None, max_length=80)


class ScanRequest(BaseModel):
    tool: str = Field(min_length=1, max_length=80)
    action: str = Field(min_length=1, max_length=80)
    arguments: dict[str, Any] = Field(default_factory=dict)


class PolicyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    tool: str = Field(min_length=1, max_length=80)
    action: str = Field(min_length=1, max_length=80)
    allowed: bool = False
    requires_approval: bool = False
    active: bool = True


class PolicyUpdate(BaseModel):
    active: bool | None = None
    enabled: bool | None = None

    def selected_active(self) -> bool:
        value = self.active if self.active is not None else self.enabled
        if value is None:
            raise ValueError("active or enabled must be supplied")
        return value


class PolicyRead(PolicyCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class ApprovalCreate(BaseModel):
    tool: str = Field(min_length=1, max_length=80)
    action: str = Field(min_length=1, max_length=80)
    arguments: dict[str, Any] = Field(default_factory=dict)
    requested_by: str = Field(min_length=1, max_length=120)
    ttl_seconds: int = Field(default=300, ge=30, le=3600)


class ApprovalAuthorize(BaseModel):
    authorized_by: str = Field(min_length=1, max_length=120)


class ApprovalRead(BaseModel):
    id: int
    tool: str
    action: str
    requested_by: str
    authorized_by: str | None
    status: str
    expires_at: datetime
    created_at: datetime


class ScanResponse(BaseModel):
    risk_level: Literal["low", "medium", "high"]
    flagged: bool
    findings: list[str]
    safe_arguments: dict[str, Any]


class ActionResponse(BaseModel):
    allowed: bool
    outcome: str
    result: Any | None = None
    reason: str
    risk_level: str


class EvaluationSample(BaseModel):
    tool: str = Field(min_length=1, max_length=80)
    action: str = Field(min_length=1, max_length=80)
    arguments: dict[str, Any] = Field(default_factory=dict)
    expected_blocked: bool


class EvaluationRequest(BaseModel):
    samples: list[EvaluationSample] = Field(min_length=1, max_length=500)


class EvaluationResponse(BaseModel):
    id: int
    samples: int
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int
    accuracy: float
    precision: float
    recall: float
    results: list[dict[str, Any]]
    created_at: datetime


class TextScanRequest(BaseModel):
    content: str = Field(min_length=1, max_length=12000)
    source_type: str = Field(default="user_input", max_length=40)


class DocumentScanRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content_base64: str = Field(min_length=1, max_length=7_000_000)
    source_type: str = Field(default="document_upload", max_length=40)


class ChatGPTUploadRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1, max_length=12000)
    actor: str = Field(default="chatgpt-browser-extension", min_length=1, max_length=120)


class TextScanResponse(BaseModel):
    risk_score: int
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    matched_indicators: list[str]
    explanation: str
    request_id: str


class AgentRunRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=12000)
    tool_name: str = Field(min_length=1, max_length=80)
    action: str | None = Field(default=None, max_length=80)
    arguments: dict[str, Any] = Field(default_factory=dict)
    actor: str = Field(default="local-demo", min_length=1, max_length=120)
    approval_id: int | None = None


class OpenAIAgentRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=12000)
    actor: str = Field(default="local-demo", min_length=1, max_length=120)


class ToolAuthorizeRequest(BaseModel):
    tool_name: str = Field(min_length=1, max_length=80)
    action: str | None = Field(default=None, max_length=80)
    arguments: dict[str, Any] = Field(default_factory=dict)
    actor: str = Field(default="local-demo", min_length=1, max_length=120)
    prompt: str = Field(default="", max_length=12000)


class ApprovalResolveRequest(BaseModel):
    decision: Literal["approve", "reject"]
    reviewer: str = Field(default="demo-admin", min_length=1, max_length=120)


class EvaluationRunRequest(BaseModel):
    pass
