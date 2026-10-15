"""AgentState cho LangGraph + hàm chuyển đổi vào/ra contract."""

from __future__ import annotations

import uuid
from typing import TypedDict

from ai_core.guardrails.disclaimer import DISCLAIMER_VI
from ai_core.schemas import (
    PatientContext,
    RedFlagResult,
    RiskAssessment,
    ScreeningPlan,
    ScreeningResult,
    Source,
)


class AgentState(TypedDict, total=False):
    ctx: PatientContext
    trace_id: str
    missing_questions: list[str]
    red_flag: RedFlagResult | None
    risk_assessment: RiskAssessment | None
    sources: list[Source]
    draft_plan: ScreeningPlan | None
    error: str | None
    risk_status: str
    retrieval_status: str
    recommendation_status: str
    trace_events: list[dict[str, str | int | bool]]


def initial_state(ctx: PatientContext) -> AgentState:
    return AgentState(
        ctx=ctx,
        trace_id=f"run-{uuid.uuid4().hex[:12]}",
        trace_events=[],
        sources=[],
        red_flag=None,
        draft_plan=None,
    )


def state_to_result(state: AgentState) -> ScreeningResult:
    rf = state.get("red_flag")
    if rf and rf.detected:
        return ScreeningResult(
            status="red_flag",
            red_flag=rf,
            disclaimer=DISCLAIMER_VI,
            trace_id=state["trace_id"],
            trace_events=state.get("trace_events", []),
        )
    return ScreeningResult(
        status="pending_review",
        risk_assessment=state.get("risk_assessment"),
        draft_plan=state.get("draft_plan"),
        disclaimer=DISCLAIMER_VI,
        trace_id=state["trace_id"],
        trace_events=state.get("trace_events", []),
    )
