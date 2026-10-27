"""Chỉ số vận hành & quan sát AI cho dashboard bác sĩ."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AgentRun, Appointment, AuditLog, Consultation, Encounter
from app.schemas.common import Page
from app.schemas.metrics import AgentRunOut, MetricsOut


def _percentile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, round(q * (len(ordered) - 1))))
    return round(ordered[index], 1)


def _count(db: Session, model, *where) -> int:
    return db.scalar(select(func.count()).select_from(model).where(*where)) or 0


def metrics(db: Session) -> MetricsOut:
    appointments = dict(db.execute(select(Appointment.status, func.count()).group_by(Appointment.status)).all())
    runs = db.execute(select(AgentRun.latency_ms, AgentRun.guard_blocked, AgentRun.insufficient_evidence)).all()
    latencies = [r[0] for r in runs]
    total_runs = len(runs)
    return MetricsOut(
        consultations=_count(db, Consultation),
        linked_consultations=_count(db, Consultation, Consultation.patient_id.is_not(None)),
        red_flag_consultations=_count(db, Consultation, Consultation.red_flag.is_(True)),
        booking_suggested=_count(db, Consultation, Consultation.next_action.in_(["suggest_booking", "urgent_care"])),
        appointments_by_status=appointments,
        encounters_finalized=_count(db, Encounter, Encounter.status == "finalized"),
        plans_edited_by_doctor=_count(db, AuditLog, AuditLog.action == "plan.edit"),
        agent_runs=total_runs,
        agent_fallback_rate=round(sum(1 for r in runs if r[1]) / total_runs, 3) if total_runs else 0.0,
        agent_insufficient_rate=round(sum(1 for r in runs if r[2]) / total_runs, 3) if total_runs else 0.0,
        agent_latency_ms_p50=_percentile(latencies, 0.5),
        agent_latency_ms_p95=_percentile(latencies, 0.95),
    )


def agent_runs(db: Session, agent: str | None, page: int, page_size: int) -> Page[AgentRunOut]:
    q = select(AgentRun)
    if agent:
        q = q.where(AgentRun.agent == agent)
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    rows = db.scalars(q.order_by(AgentRun.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return Page(items=[AgentRunOut.model_validate(r) for r in rows], total=total, page=page, page_size=page_size)
