from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.api.deps import DB, Doctor
from app.models import AuditLog, ScreeningSession
from app.schemas.session import Page, ReminderOut, SessionSummary
from app.services import session_service

router = APIRouter()


@router.get("/metrics")
def metrics(_: Doctor, db: DB) -> dict:
    rows = db.execute(select(ScreeningSession.status, func.count()).group_by(ScreeningSession.status)).all()
    status_counts = {status: count for status, count in rows}
    needs_evidence = db.scalar(
        select(func.count()).select_from(ScreeningSession).where(
            ScreeningSession.status == "pending_review", ScreeningSession.draft_plan.is_(None)
        )
    ) or 0
    qa_count = db.scalar(
        select(func.count()).select_from(AuditLog).where(AuditLog.action.in_(["qa.ask", "chat.ask"]))
    ) or 0
    return {"sessions": status_counts, "pending_without_plan": needs_evidence, "questions_asked": qa_count}


@router.get("/sessions", response_model=Page[SessionSummary])
def list_all_sessions(
    _: Doctor, db: DB, status_: str | None = Query(None, alias="status"), page: int = 1, page_size: int = 20
):
    return session_service.list_sessions(db, patient_id=None, status=status_, page=page, page_size=page_size)


@router.get("/patients/{patient_id}")
def patient_detail(patient_id: str, _: Doctor, db: DB) -> dict:
    return session_service.patient_detail(db, patient_id)


@router.get("/reminders/due", response_model=list[ReminderOut])
def due_reminders(_: Doctor, db: DB):
    from app.services import scheduler

    return scheduler.list_due(db)
