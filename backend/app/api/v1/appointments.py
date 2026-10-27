from fastapi import APIRouter, status

from app.api.deps import DB, Patient
from app.schemas.appointment import AppointmentIn, AppointmentOut
from app.services import appointment_service

router = APIRouter()


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create(body: AppointmentIn, user: Patient, db: DB):
    return appointment_service.create(db, user, body)


@router.get("", response_model=list[AppointmentOut])
def mine(user: Patient, db: DB):
    return appointment_service.list_mine(db, user)


@router.post("/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel(appointment_id: str, user: Patient, db: DB):
    return appointment_service.cancel(db, user, appointment_id)
