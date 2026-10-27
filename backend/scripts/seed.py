"""Seed tài khoản demo: python scripts/seed.py (chạy từ thư mục backend)."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from datetime import date, timedelta  # noqa: E402

from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal, init_db  # noqa: E402
from app.models import Appointment, PatientProfile  # noqa: E402
from app.schemas.auth import RegisterIn  # noqa: E402
from app.services import auth_service, record_service  # noqa: E402

DEMO = [
    ("doctor@demo.vn", "BS. Nguyễn Văn A", "doctor", None),
    (
        "lan@demo.vn",
        "Trần Thị Lan",
        "patient",
        dict(age=45, gender="female", genetics_history=["breast_cancer_mother"]),
    ),
    (
        "hung@demo.vn",
        "Lê Văn Hùng",
        "patient",
        dict(age=55, gender="male", lifestyle={"smoking": True, "pack_years": 30}),
    ),
]

if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    init_db()
    db = SessionLocal()
    for email, name, role, profile in DEMO:
        user = auth_service.get_by_email(db, email)
        if not user:
            user = auth_service.create_user(db, RegisterIn(email=email, password="123456", full_name=name, role=role))
            print("created", email)
        if profile and not db.get(PatientProfile, user.id):
            db.add(PatientProfile(user_id=user.id, **profile))
            record_service.add_event(db, user.id, "account.created", "Tài khoản demo được tạo sẵn.")
            db.commit()
    # Một lịch hẹn mẫu để bác sĩ demo Clinical Copilot ngay (luồng đầy đủ bắt đầu từ Navigator ở trang chủ).
    hung = auth_service.get_by_email(db, "hung@demo.vn")
    if hung and not db.scalar(select(Appointment).where(Appointment.patient_id == hung.id)):
        appt = Appointment(
            patient_id=hung.id,
            service_code="lung_screening",
            preferred_date=date.today() + timedelta(days=2),
            reason="Hút thuốc 30 gói-năm, muốn tầm soát ung thư phổi.",
            priority="routine",
            status="requested",
        )
        db.add(appt)
        db.flush()
        record_service.add_event(
            db, hung.id, "appointment.requested", "Đặt lịch Tầm soát ung thư phổi. Lý do: hút thuốc 30 gói-năm.",
            data={"service_code": "lung_screening", "priority": "routine"}, ref_type="appointment", ref_id=appt.id,
        )
        db.commit()
        print("created demo appointment for hung@demo.vn")
    db.close()
    print("Seed xong. Mat khau chung: 123456")

