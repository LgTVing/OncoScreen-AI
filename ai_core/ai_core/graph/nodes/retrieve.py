"""Node retrieve: RAG — lọc metadata (gender, tuổi) rồi similarity search → list[Source]."""

from __future__ import annotations

import logging

from ai_core.graph.state import AgentState
from ai_core.rag.retriever import retrieve_sources

logger = logging.getLogger(__name__)


def run(state: AgentState) -> AgentState:
    ctx = state["ctx"]
    risk = state.get("risk_assessment")
    try:
        return {"sources": retrieve_sources(ctx.profile, risk), "retrieval_status": "ok"}
    except Exception as exc:  # noqa: BLE001 — không có embedding/index vẫn phải tới bước bác sĩ duyệt
        logger.warning("retrieval_unavailable trace_id=%s error_type=%s", state.get("trace_id"), type(exc).__name__)
        return {"sources": [], "retrieval_status": "unavailable"}
