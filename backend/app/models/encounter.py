from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models._common import Timestamps, UTCDateTime, UUIDPk


class Encounter(UUIDPk, Timestamps, Base):
    """Một lần khám. Cột JSON lưu nguyên `model_dump(mode="json")` của ai_core.schemas.

    brief = ClinicalBrief, draft_plan/final_plan = ScreeningPlan.
    """

    __tablename__ = "encounters"

    appointment_id: Mapped[str] = mapped_column(String(36), ForeignKey("appointments.id"), unique=True, nullable=False)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(16), index=True, default="in_progress")  # in_progress | finalized
    brief: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    draft_plan: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    final_plan: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    clinical_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    conclusion: Mapped[str | None] = mapped_column(Text, nullable=True)
    trace_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    finalized_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
