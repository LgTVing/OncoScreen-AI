from ai_core.guardrails.disclaimer import DISCLAIMER_VI
from ai_core.schemas import RiskAssessment, ScreeningResult

from app.services import agent_service
from tests.conftest import NORMAL_ANSWERS, register_and_login


def _pending_session(client, patient) -> str:
    s = client.post("/api/v1/sessions", headers=patient).json()
    client.post(f"/api/v1/sessions/{s['id']}/answers", json={"answers": NORMAL_ANSWERS}, headers=patient)
    return s["id"]


def test_doctor_sees_draft_patient_does_not(client, patient, doctor):
    sid = _pending_session(client, patient)
    as_doc = client.get(f"/api/v1/sessions/{sid}", headers=doctor).json()
    as_pat = client.get(f"/api/v1/sessions/{sid}", headers=patient).json()
    assert as_doc["draft_plan"] and as_doc["risk_assessment"]
    assert as_pat["draft_plan"] is None and as_pat["final_plan"] is None and as_pat["risk_assessment"] is None


def test_other_patient_cannot_read(client, patient):
    sid = _pending_session(client, patient)
    other = register_and_login(client, "other@test.vn", "patient")
    assert client.get(f"/api/v1/sessions/{sid}", headers=other).status_code == 404


def test_patient_cannot_review(client, patient):
    sid = _pending_session(client, patient)
    assert client.post(f"/api/v1/sessions/{sid}/review", json={"action": "approve"}, headers=patient).status_code == 403


def test_approve_creates_reminders_and_reveals_final_plan(client, patient, doctor):
    sid = _pending_session(client, patient)
    queue = client.get("/api/v1/doctor/sessions?status=pending_review", headers=doctor).json()
    assert queue["total"] == 1
    r = client.post(f"/api/v1/sessions/{sid}/review", json={"action": "approve"}, headers=doctor)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "approved"
    as_pat = client.get(f"/api/v1/sessions/{sid}", headers=patient).json()
    assert as_pat["final_plan"]["items"] and as_pat["draft_plan"] is None
    assert len(as_pat["reminders"]) == len(as_pat["final_plan"]["items"])
    assert client.get("/api/v1/reminders", headers=patient).json()


def test_completed_reminder_schedules_next_cycle_once(client, patient, doctor):
    sid = _pending_session(client, patient)
    client.post(f"/api/v1/sessions/{sid}/review", json={"action": "approve"}, headers=doctor)
    original = client.get("/api/v1/reminders", headers=patient).json()[0]
    path = f"/api/v1/reminders/{original['id']}/complete"
    done = client.post(path, json={}, headers=patient)
    assert done.status_code == 200 and done.json()["status"] == "done"
    reminders = client.get("/api/v1/reminders", headers=patient).json()
    same_method = [item for item in reminders if item["method"] == original["method"]]
    assert len(same_method) == 2
    assert any(item["status"] == "scheduled" and item["due_date"] > original["due_date"] for item in same_method)
    client.post(path, json={}, headers=patient)
    after_repeat = client.get("/api/v1/reminders", headers=patient).json()
    assert len(after_repeat) == len(reminders)


def test_reject_requires_note_and_review_twice_is_409(client, patient, doctor):
    sid = _pending_session(client, patient)
    assert client.post(f"/api/v1/sessions/{sid}/review", json={"action": "reject"}, headers=doctor).status_code == 400
    ok = client.post(
        f"/api/v1/sessions/{sid}/review", json={"action": "reject", "note": "cần khám thêm"}, headers=doctor
    )
    assert ok.json()["status"] == "rejected"
    again = client.post(f"/api/v1/sessions/{sid}/review", json={"action": "approve"}, headers=doctor)
    assert again.status_code == 409


def test_no_evidence_still_reaches_doctor_and_requires_note(client, patient, doctor, monkeypatch):
    async def no_evidence(_ctx):
        return ScreeningResult(
            status="pending_review",
            risk_assessment=RiskAssessment(overall_summary="Chưa đủ tài liệu phù hợp."),
            disclaimer=DISCLAIMER_VI,
            trace_id="test-no-evidence",
            trace_events=[{"node": "retrieve", "status": "ok", "duration_ms": 1, "source_count": 0}],
        )

    monkeypatch.setattr(agent_service, "run_screening", no_evidence)
    sid = _pending_session(client, patient)
    doctor_view = client.get(f"/api/v1/sessions/{sid}", headers=doctor).json()
    patient_view = client.get(f"/api/v1/sessions/{sid}", headers=patient).json()
    assert doctor_view["status"] == "pending_review" and doctor_view["draft_plan"] is None
    assert doctor_view["trace_events"][0]["source_count"] == 0
    assert patient_view["risk_assessment"] is None and patient_view["trace_events"] == []
    metrics = client.get("/api/v1/doctor/metrics", headers=doctor)
    assert metrics.status_code == 200 and metrics.json()["pending_without_plan"] == 1
    assert client.get("/api/v1/doctor/metrics", headers=patient).status_code == 403
    assert client.post(f"/api/v1/sessions/{sid}/review", json={"action": "approve"}, headers=doctor).status_code == 400
    approved = client.post(
        f"/api/v1/sessions/{sid}/review",
        json={"action": "approve", "note": "Cần bổ sung tài liệu và trao đổi trực tiếp."},
        headers=doctor,
    )
    assert approved.status_code == 200
    final = client.get(f"/api/v1/sessions/{sid}", headers=patient).json()
    assert final["status"] == "approved" and final["final_plan"] is None and final["reminders"] == []
    assert final["doctor_note"]
    answer = client.post(
        f"/api/v1/sessions/{sid}/questions", json={"question": "Tôi nên làm gì?"}, headers=patient
    )
    assert answer.status_code == 200 and answer.json()["insufficient_evidence"]
    assert client.get("/api/v1/doctor/metrics", headers=doctor).json()["questions_asked"] == 1


def test_patient_qa_requires_approved_own_session(client, patient, doctor):
    sid = _pending_session(client, patient)
    path = f"/api/v1/sessions/{sid}/questions"
    assert client.post(path, json={"question": "Kế hoạch nêu gì?"}, headers=patient).status_code == 409
    client.post(f"/api/v1/sessions/{sid}/review", json={"action": "approve"}, headers=doctor)
    result = client.post(path, json={"question": "Kế hoạch nêu gì?"}, headers=patient)
    assert result.status_code == 200 and result.json()["sources"]
    other = register_and_login(client, "other-qa@test.vn", "patient")
    assert client.post(path, json={"question": "Kế hoạch nêu gì?"}, headers=other).status_code == 404
