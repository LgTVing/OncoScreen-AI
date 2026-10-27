from __future__ import annotations

from sqlalchemy import JSON, Boolean, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models._common import Timestamps, UUIDPk


class AgentRun(UUIDPk, Timestamps, Base):
    """Observability: mỗi lần gọi agent một dòng — trace node-level, độ trễ, cờ an toàn.

    Không lưu nội dung hội thoại hay hồ sơ (PHI).
    """

    __tablename__ = "agent_runs"

    agent: Mapped[str] = mapped_column(
        String(32), index=True, nullable=False
    )  # navigator|copilot|copilot_qa|patient_qa
    trace_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    patient_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    consultation_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    encounter_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    generator: Mapped[str | None] = mapped_column(String(32), nullable=True)
    red_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    next_action: Mapped[str | None] = mapped_column(String(32), nullable=True)
    insufficient_evidence: Mapped[bool] = mapped_column(Boolean, default=False)
    guard_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    events: Mapped[list] = mapped_column(JSON, default=list)
