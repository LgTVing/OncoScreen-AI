from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class MetricsOut(BaseModel):
    consultations: int
    linked_consultations: int
    red_flag_consultations: int
    booking_suggested: int
    appointments_by_status: dict[str, int]
    encounters_finalized: int
    plans_edited_by_doctor: int
    agent_runs: int
    agent_fallback_rate: float
    agent_insufficient_rate: float
    agent_latency_ms_p50: float
    agent_latency_ms_p95: float


class AgentRunOut(BaseModel):
    id: str
    agent: str
    trace_id: str
    patient_id: str | None
    latency_ms: float
    generator: str | None
    red_flag: bool
    next_action: str | None
    insufficient_evidence: bool
    guard_blocked: bool
    events: list[dict[str, Any]] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}
