from fastapi import APIRouter, Query

from app.api.deps import DB, Patient
from app.schemas.appointment import CompleteReminderIn, ReminderOut
from app.services import scheduler

router = APIRouter()


@router.get("", response_model=list[ReminderOut])
def my_reminders(user: Patient, db: DB, status_: str | None = Query(None, alias="status")):
    return scheduler.list_for_patient(db, user.id, status_)


@router.post("/{reminder_id}/complete", response_model=ReminderOut)
def complete(reminder_id: str, body: CompleteReminderIn, user: Patient, db: DB):
    return scheduler.complete(db, reminder_id, user, body.completed_at)
