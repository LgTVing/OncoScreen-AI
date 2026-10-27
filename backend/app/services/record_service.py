"""Hồ sơ xuyên suốt: ghi mốc timeline và tổng hợp toàn bộ dữ liệu một bệnh nhân (cho người đọc và cho Copilot)."""

from __future__ import annotations

from datetime import datetime

from ai_core.api import CANCER_LABEL_VI as LABEL_VI
from ai_core.api import merge_intake
from ai_core.schemas import Gender, IntakeProfile, NavigatorReply, NextAction, PatientRecord
from ai_core.schemas import PatientProfile as AIProfile
from ai_core.schemas import RecordEvent as AIRecordEvent
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Appointment, Consultation, Encounter, PatientProfile, RecordEvent, Reminder, User
from app.models._common import utcnow
from app.schemas.appointment import ReminderOut
from app.schemas.auth import UserOut
from app.schemas.patient import PatientProfileOut
from app.schemas.record import PatientRecordOut, RecordEventOut

_GENDER_VI = {Gender.female: "nữ", Gender.male: "nam", Gender.other: "giới tính khác"}
_NEXT_VI = {
    NextAction.continue_chat: "tiếp tục tìm hiểu",
    NextAction.suggest_booking: "gợi ý đặt lịch khám tầm soát",
    NextAction.urgent_care: "khuyên khám sớm (dấu hiệu cảnh báo)",
}


def add_event(
    db: Session,
    patient_id: str,
    kind: str,
    summary: str,
    *,
    data: dict | None = None,
    ref_type: str | None = None,
    ref_id: str | None = None,
    actor_id: str | None = None,
    visibility: str = "all",
    at: datetime | None = None,
) -> RecordEvent:
    event = RecordEvent(
        patient_id=patient_id,
        kind=kind,
        summary=summary,
        data=data or {},
        ref_type=ref_type,
        ref_id=ref_id,
        actor_id=actor_id,
        visibility=visibility,
        occurred_at=at or utcnow(),
    )
    db.add(event)
    return event


def upsert_event(db: Session, patient_id: str, kind: str, ref_type: str, ref_id: str, summary: str, data: dict) -> None:
    existing = db.scalar(
        select(RecordEvent).where(
            RecordEvent.patient_id == patient_id,
            RecordEvent.kind == kind,
            RecordEvent.ref_type == ref_type,
            RecordEvent.ref_id == ref_id,
        )
    )
    if existing:
        existing.summary, existing.data = summary, data
    else:
        add_event(db, patient_id, kind, summary, data=data, ref_type=ref_type, ref_id=ref_id)


def consult_summary(intake: IntakeProfile, reply: NavigatorReply | None) -> str:
    parts = ["Tư vấn với Trợ lý tầm soát"]
    demographics = ", ".join(
        x
        for x in [
            _GENDER_VI.get(intake.gender) if intake.gender else None,
            f"{intake.age} tuổi" if intake.age else None,
        ]
        if x
    )
    if demographics:
        parts.append(demographics)
    if intake.family_history:
        parts.append("tiền sử gia đình: " + ", ".join(LABEL_VI[c] for c in intake.family_history))
    if intake.personal_cancer_history:
        parts.append("bản thân đã từng mắc ung thư")
    if intake.smoking:
        parts.append("hút thuốc" + (f" {intake.pack_years:g} gói-năm" if intake.pack_years is not None else ""))
    if intake.hepatitis_b_or_c:
        parts.append("viêm gan B/C mạn")
    if reply and reply.suggestions:
        parts.append("gợi ý tầm soát: " + ", ".join(LABEL_VI[s.cancer_type] for s in reply.suggestions))
    if reply:
        parts.append("điều hướng: " + _NEXT_VI[reply.next_action])
    return "; ".join(parts) + "."


def sync_consultation_events(db: Session, consult: Consultation) -> None:
    """Phiên đã gắn tài khoản → cập nhật mốc consult.summary và red_flag.detected trong hồ sơ."""
    if not consult.patient_id:
        return
    intake = IntakeProfile.model_validate(consult.intake or {})
    reply = NavigatorReply.model_validate(consult.last_reply) if consult.last_reply else None
    upsert_event(
        db,
        consult.patient_id,
        "consult.summary",
        "consultation",
        consult.id,
        consult_summary(intake, reply),
        {"next_action": consult.next_action, "suggestions": [s.rule_id for s in (reply.suggestions if reply else [])]},
    )
    if consult.red_flag and reply and reply.red_flag.detected:
        upsert_event(
            db,
            consult.patient_id,
            "red_flag.detected",
            "consultation",
            consult.id,
            "Ghi nhận dấu hiệu cảnh báo khi tư vấn: "
            + ", ".join(f.symptom.lower() for f in reply.red_flag.flags)
            + ".",
            {"codes": [f.code for f in reply.red_flag.flags]},
        )


def ai_profile(profile: PatientProfile | None) -> AIProfile | None:
    if profile is None:
        return None
    return AIProfile(
        age=profile.age,
        gender=profile.gender,
        genetics_history=profile.genetics_history or [],
        lifestyle=profile.lifestyle or {},
        lifestyle_score=profile.lifestyle_score,
    )


def build_ai_record(db: Session, patient: User, reason: str | None) -> PatientRecord:
    """Toàn bộ hồ sơ (kể cả mốc chỉ bác sĩ thấy) → đầu vào Clinical Copilot."""
    consults = db.scalars(
        select(Consultation).where(Consultation.patient_id == patient.id).order_by(Consultation.updated_at.desc())
    ).all()
    intake: IntakeProfile | None = None
    for consult in consults:
        intake = merge_intake(intake, IntakeProfile.model_validate(consult.intake or {}))
    events = db.scalars(
        select(RecordEvent).where(RecordEvent.patient_id == patient.id).order_by(RecordEvent.occurred_at)
    ).all()
    return PatientRecord(
        patient_id=patient.id,
        full_name=patient.full_name,
        profile=ai_profile(db.get(PatientProfile, patient.id)),
        intake=intake,
        reason_for_visit=reason,
        events=[
            AIRecordEvent(id=e.id, at=e.occurred_at, kind=e.kind, summary=e.summary, data=e.data or {}) for e in events
        ],
    )


def record_out(db: Session, patient: User, viewer: User) -> PatientRecordOut:
    from app.services import appointment_service, encounter_service, navigator_service

    is_doctor = viewer.role == "doctor"
    profile = db.get(PatientProfile, patient.id)
    events_q = select(RecordEvent).where(RecordEvent.patient_id == patient.id)
    if not is_doctor:
        events_q = events_q.where(RecordEvent.visibility == "all")
    events = db.scalars(events_q.order_by(RecordEvent.occurred_at.desc())).all()
    consults = db.scalars(
        select(Consultation).where(Consultation.patient_id == patient.id).order_by(Consultation.created_at.desc())
    ).all()
    appointments = db.scalars(
        select(Appointment).where(Appointment.patient_id == patient.id).order_by(Appointment.created_at.desc())
    ).all()
    encounters = db.scalars(
        select(Encounter).where(Encounter.patient_id == patient.id).order_by(Encounter.created_at.desc())
    ).all()
    if not is_doctor:
        encounters = [e for e in encounters if e.status == "finalized"]
    reminders = db.scalars(select(Reminder).where(Reminder.patient_id == patient.id).order_by(Reminder.due_date)).all()
    return PatientRecordOut(
        user=UserOut.model_validate(patient),
        profile=PatientProfileOut.model_validate(profile) if profile else None,
        consultations=[navigator_service.to_out(c) for c in consults],
        appointments=[appointment_service.to_out(db, a) for a in appointments],
        encounters=[encounter_service.to_out(db, e, viewer) for e in encounters],
        reminders=[ReminderOut.model_validate(r) for r in reminders],
        timeline=[
            RecordEventOut(id=e.id, at=e.occurred_at, kind=e.kind, summary=e.summary, data=e.data or {}) for e in events
        ],
    )
