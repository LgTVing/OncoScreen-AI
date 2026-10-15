"""Node recommend: gọi tools.screening_recommender → ScreeningPlan (draft)."""

from __future__ import annotations

import logging

from ai_core.graph.state import AgentState
from ai_core.schemas import RiskAssessment
from ai_core.tools.screening_recommender import recommend

logger = logging.getLogger(__name__)

NO_EVIDENCE = "Chưa đủ tài liệu tham khảo phù hợp để kết luận hoặc lập kế hoạch tầm soát. Cần bác sĩ xem xét."


def run(state: AgentState) -> AgentState:
    ctx = state["ctx"]
    risk = state.get("risk_assessment")
    if risk is None:
        raise RuntimeError("assess_risk must run before recommend")
    sources = state.get("sources", [])
    if not sources or state.get("risk_status") == "unavailable":
        return {
            "draft_plan": None,
            "risk_assessment": RiskAssessment(overall_summary=NO_EVIDENCE),
            "recommendation_status": "insufficient_evidence",
        }
    try:
        plan = recommend(ctx.profile, risk, sources)
    except Exception as exc:  # noqa: BLE001 — lỗi LLM không được biến thành khuyến nghị thiếu nguồn
        logger.warning(
            "recommendation_unavailable trace_id=%s error_type=%s http_status=%s",
            state.get("trace_id"),
            type(exc).__name__,
            getattr(exc, "status_code", None),
        )
        plan = None
    if plan is None:
        return {
            "draft_plan": None,
            "risk_assessment": RiskAssessment(overall_summary=NO_EVIDENCE),
            "recommendation_status": "insufficient_evidence",
        }
    return {"draft_plan": plan, "recommendation_status": "ok"}
