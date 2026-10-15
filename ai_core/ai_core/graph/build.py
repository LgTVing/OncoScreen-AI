"""Lắp ráp LangGraph: collect → red_flag → (END | assess_risk → retrieve → recommend → guardrail) → END."""

from __future__ import annotations

import json
import logging
from time import monotonic

from langgraph.graph import END, StateGraph

from ai_core.graph.nodes import assess_risk, collect, guardrail, recommend, red_flag, retrieve
from ai_core.graph.state import AgentState

logger = logging.getLogger("ai_core.trace")


def _traced(name, fn):
    def run(state: AgentState) -> AgentState:
        start = monotonic()
        try:
            output = fn(state)
        except Exception as exc:
            logger.exception(
                "agent_node_failed trace_id=%s node=%s error_type=%s",
                state.get("trace_id"),
                name,
                type(exc).__name__,
            )
            raise
        event: dict[str, str | int | bool] = {
            "node": name,
            "duration_ms": round((monotonic() - start) * 1000),
            "status": "ok",
        }
        if name == "retrieve":
            event["source_count"] = len(output.get("sources", []))
            event["status"] = output.get("retrieval_status", "ok")
        if name == "assess_risk":
            event["status"] = output.get("risk_status", "ok")
        if name == "recommend":
            event["has_plan"] = output.get("draft_plan") is not None
            event["status"] = output.get("recommendation_status", "ok")
        logger.info(json.dumps({"trace_id": state.get("trace_id"), **event}, ensure_ascii=False))
        return {**output, "trace_events": [*state.get("trace_events", []), event]}

    return run


def _after_red_flag(state: AgentState) -> str:
    rf = state.get("red_flag")
    if rf and rf.detected:
        return END
    missing = state.get("missing_questions", [])
    if missing:
        raise ValueError("missing required questions: " + ", ".join(missing))
    return "assess_risk"


def build_graph():
    g = StateGraph(AgentState)
    g.add_node("collect", _traced("collect", collect.run))
    g.add_node("red_flag", _traced("red_flag", red_flag.run))
    g.add_node("assess_risk", _traced("assess_risk", assess_risk.run))
    g.add_node("retrieve", _traced("retrieve", retrieve.run))
    g.add_node("recommend", _traced("recommend", recommend.run))
    g.add_node("guardrail", _traced("guardrail", guardrail.run))

    g.set_entry_point("collect")
    g.add_edge("collect", "red_flag")
    g.add_conditional_edges("red_flag", _after_red_flag, {END: END, "assess_risk": "assess_risk"})
    g.add_edge("assess_risk", "retrieve")
    g.add_edge("retrieve", "recommend")
    g.add_edge("recommend", "guardrail")
    g.add_edge("guardrail", END)
    return g.compile()
