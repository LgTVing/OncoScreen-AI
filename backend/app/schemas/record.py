from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.appointment import AppointmentOut, ReminderOut
from app.schemas.auth import UserOut
from app.schemas.encounter import EncounterOut
from app.schemas.navigator import ConsultationOut
from app.schemas.patient import PatientProfileOut


class RecordEventOut(BaseModel):
    id: str
    at: datetime
    kind: str
    summary: str
    data: dict[str, Any] = Field(default_factory=dict)


class PatientRecordOut(BaseModel):
    user: UserOut
    profile: PatientProfileOut | None = None
    consultations: list[ConsultationOut] = Field(default_factory=list)
    appointments: list[AppointmentOut] = Field(default_factory=list)
    encounters: list[EncounterOut] = Field(default_factory=list)
    reminders: list[ReminderOut] = Field(default_factory=list)
    timeline: list[RecordEventOut] = Field(default_factory=list)


class PatientListItem(BaseModel):
    user: UserOut
    profile: PatientProfileOut | None = None
    open_appointments: int
    last_activity: datetime | None = None
