"""Tracing nhẹ cho agent: mỗi lượt chạy có trace_id, mỗi bước (node) ghi một event có thời lượng/trạng thái/thuộc tính.

Nguyên tắc: event chỉ chứa metadata (tên node, trạng thái, số nguồn, cờ guardrail…), KHÔNG chứa nội dung hội thoại,
hồ sơ hay API key. Event được ghi log JSON (logger `ai_core.trace`) và đẩy tới các sink đăng ký thêm
(vd. Langfuse/OpenTelemetry exporter) qua `add_sink`.
"""

from __future__ import annotations

import json
import logging
import uuid
from collections.abc import Callable
from time import monotonic
from typing import Any

from ai_core.schemas import TraceEvent

logger = logging.getLogger("ai_core.trace")
Sink = Callable[[str, str, TraceEvent], None]  # (agent, trace_id, event)
_sinks: list[Sink] = []


def add_sink(sink: Sink) -> None:
    _sinks.append(sink)


def new_trace_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def emit(agent: str, trace_id: str, event: TraceEvent) -> None:
    logger.info(json.dumps({"agent": agent, "trace_id": trace_id, **event}, ensure_ascii=False))
    for sink in _sinks:
        try:
            sink(agent, trace_id, event)
        except Exception:  # noqa: BLE001 — sink lỗi không được làm hỏng luồng chính
            logger.exception("trace_sink_failed")


def traced(agent: str, name: str, fn: Callable[[dict], dict]) -> Callable[[dict], dict]:
    """Bọc một node LangGraph. Node có thể trả `trace_attrs` để gắn thuộc tính vào event."""

    def run(state: dict) -> dict:
        start = monotonic()
        try:
            output = fn(state)
        except Exception as exc:
            event: TraceEvent = {
                "node": name,
                "status": "error",
                "error_type": type(exc).__name__,
                "duration_ms": round((monotonic() - start) * 1000),
            }
            emit(agent, state.get("trace_id", "?"), event)
            raise
        attrs: dict[str, Any] = output.pop("trace_attrs", None) or {}
        event = {"node": name, "status": "ok", "duration_ms": round((monotonic() - start) * 1000)}
        event.update({k: v for k, v in attrs.items() if isinstance(v, (str, int, float, bool))})
        emit(agent, state.get("trace_id", "?"), event)
        return {**output, "trace_events": [*state.get("trace_events", []), event]}

    return run
