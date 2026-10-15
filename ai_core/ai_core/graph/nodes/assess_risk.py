"""Đánh giá sơ bộ từ câu trả lời; kết luận chỉ đưa ra sau khi đối chiếu nguồn."""

from __future__ import annotations

import json
import logging

from langchain_core.messages import HumanMessage, SystemMessage

from ai_core.graph.state import AgentState
from ai_core.llm import get_chat_model
from ai_core.prompts import ASSESS_RISK_PROMPT, SYSTEM_PROMPT
from ai_core.schemas import RiskAssessment

logger = logging.getLogger(__name__)


def run(state: AgentState) -> AgentState:
    ctx = state["ctx"]
    prompt = ASSESS_RISK_PROMPT.format(
        profile=json.dumps(ctx.profile.model_dump(mode="json"), ensure_ascii=False),
        answers=json.dumps([a.model_dump(mode="json") for a in ctx.answers], ensure_ascii=False),
    )
    try:
        model = get_chat_model().with_structured_output(RiskAssessment)
        response = model.invoke([SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=prompt)])
        risk = RiskAssessment.model_validate(response)
    except Exception as exc:  # noqa: BLE001 — giữ phiên chờ bác sĩ, không suy đoán mức nguy cơ
        logger.warning(
            "risk_assessment_unavailable trace_id=%s error_type=%s http_status=%s",
            state.get("trace_id"),
            type(exc).__name__,
            getattr(exc, "status_code", None),
        )
        risk = RiskAssessment(overall_summary="Chưa đủ thông tin để đánh giá nguy cơ tự động; cần bác sĩ xem xét.")
        return {"risk_assessment": risk, "risk_status": "unavailable"}
    return {"risk_assessment": risk, "risk_status": "ok"}
