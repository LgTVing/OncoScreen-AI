from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from ai_core.schemas import CancerType
from pydantic import BaseModel, Field


class AppointmentIn(BaseModel):
    service_code: str = Field(min_length=1, max_length=64)
    preferred_date: date
    reason: str | None = Field(default=None, max_length=2000)
    consultation_id: str | None = None


class ConfirmAppointmentIn(BaseModel):
    scheduled_date: date


class AppointmentOut(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    consultation_id: str | None
    service_code: str
    service_name: str
    preferred_date: date
    scheduled_date: date | None
    reason: str | None
    priority: Literal["routine", "urgent"]
    status: Literal["requested", "confirmed", "completed", "cancelled"]
    encounter_id: str | None
    created_at: datetime


class ReminderOut(BaseModel):
    id: str
    encounter_id: str
    patient_id: str
    cancer_type: CancerType
    method: str
    due_date: date
    status: Literal["scheduled", "due", "done", "skipped"]
    completed_at: date | None = None
    message: str | None = None

    model_config = {"from_attributes": True}


class CompleteReminderIn(BaseModel):
    completed_at: date | None = None
