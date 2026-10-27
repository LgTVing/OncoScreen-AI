from __future__ import annotations

from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models._common import Timestamps, UUIDPk


class Appointment(UUIDPk, Timestamps, Base):
    __tablename__ = "appointments"

    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    consultation_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("consultations.id"), nullable=True)
    doctor_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    service_code: Mapped[str] = mapped_column(String(64), nullable=False)
    preferred_date: Mapped[date] = mapped_column(Date, nullable=False)
    scheduled_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(16), default="routine")  # routine | urgent
    status: Mapped[str] = mapped_column(
        String(16), index=True, default="requested"
    )  # requested|confirmed|completed|cancelled
