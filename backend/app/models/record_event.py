from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models._common import UTCDateTime, UUIDPk, utcnow


class RecordEvent(UUIDPk, Base):
    """Mốc trong hồ sơ xuyên suốt của bệnh nhân (timeline). Khác audit_logs (ai làm gì) và agent_runs (quan sát AI)."""

    __tablename__ = "record_events"

    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    kind: Mapped[str] = mapped_column(String(64), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    ref_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    ref_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    actor_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    visibility: Mapped[str] = mapped_column(String(16), default="all")  # all | doctor
    occurred_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, index=True)
