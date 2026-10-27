"""Hành trình đầy đủ: tư vấn ẩn danh → đăng ký → đặt lịch → bác sĩ khám với Copilot → duyệt kế hoạch → theo dõi."""

from datetime import date, timedelta

from tests.conftest import API, register_and_login, say, start_consultation


def _patient_with_booking(client, message="Tôi là nữ 45 tuổi, mẹ tôi bị ung thư vú", email="lan@test.vn"):
    cid, headers = start_consultation(client)
    say(client, cid, headers, message)
    auth = register_and_login(client, email, consultation_id=cid, consultation_token=headers["X-Consult-Token"])
    r = client.post(
        f"{API}/appointments",
        json={"service_code": "breast_screening", "preferred_date": date.today().isoformat(), "consultation_id": cid},
        headers=auth,
    )
    assert r.status_code == 201, r.text
    return auth, r.json()


def test_full_journey(client, doctor):
    patient, appt = _patient_with_booking(client)
    assert appt["priority"] == "routine" and appt["reason"]

    queue = client.get(f"{API}/doctor/appointments?status=requested", headers=doctor).json()
    assert queue["total"] == 1
    confirmed = client.post(
        f"{API}/doctor/appointments/{appt['id']}/confirm",
        json={"scheduled_date": date.today().isoformat()},
        headers=doctor,
    )
    assert confirmed.json()["status"] == "confirmed"

    enc = client.post(f"{API}/doctor/appointments/{appt['id']}/start", headers=doctor).json()
    brief = enc["brief"]
    assert brief and brief["draft_plan"] and brief["guideline_suggestions"]
    record = client.get(f"{API}/doctor/patients/{enc['patient_id']}/record", headers=doctor).json()
    event_ids = {e["id"] for e in record["timeline"]}
    assert {i for f in brief["key_facts"] for i in f["event_ids"]} <= event_ids
    # start là idempotent
    assert client.post(f"{API}/doctor/appointments/{appt['id']}/start", headers=doctor).json()["id"] == enc["id"]

    # Bệnh nhân chưa thấy gì trước khi bác sĩ kết thúc khám
    as_patient = client.get(f"{API}/encounters/{enc['id']}", headers=patient).json()
    assert as_patient["brief"] is None and as_patient["draft_plan"] is None and as_patient["final_plan"] is None
    assert as_patient["conclusion"] is None and as_patient["clinical_notes"] is None

    qa = client.post(
        f"{API}/doctor/encounters/{enc['id']}/copilot",
        json={"question": "Guideline nhũ ảnh áp dụng cho bệnh nhân này thế nào?", "history": []},
        headers=doctor,
    ).json()
    assert qa["sources"]

    plan = enc["draft_plan"]
    due = (date.today() + timedelta(days=30)).isoformat()
    plan["items"][0]["next_due"] = due
    done = client.post(
        f"{API}/doctor/encounters/{enc['id']}/finalize",
        json={
            "conclusion": "Khám vú chưa ghi nhận bất thường. Hẹn chụp nhũ ảnh.",
            "clinical_notes": "note nội bộ",
            "final_plan": plan,
        },
        headers=doctor,
    )
    assert done.status_code == 200, done.text
    assert done.json()["status"] == "finalized" and len(done.json()["reminders"]) == 1

    as_patient = client.get(f"{API}/encounters/{enc['id']}", headers=patient).json()
    assert as_patient["final_plan"]["items"] and as_patient["conclusion"]
    assert as_patient["brief"] is None and as_patient["clinical_notes"] is None

    record = client.get(f"{API}/patients/me/record", headers=patient).json()
    kinds = [e["kind"] for e in record["timeline"]]
    assert {
        "consult.summary",
        "appointment.requested",
        "appointment.confirmed",
        "encounter.started",
        "encounter.finalized",
    } <= set(kinds)
    assert record["appointments"][0]["status"] == "completed"

    answer = client.post(
        f"{API}/encounters/{enc['id']}/questions", json={"question": "Kế hoạch gồm gì?"}, headers=patient
    )
    assert answer.status_code == 200 and answer.json()["sources"]

    reminder = client.get(f"{API}/reminders", headers=patient).json()[0]
    assert (
        client.post(f"{API}/reminders/{reminder['id']}/complete", json={}, headers=patient).json()["status"] == "done"
    )
    assert len(client.get(f"{API}/reminders", headers=patient).json()) == 2

    metrics = client.get(f"{API}/doctor/metrics", headers=doctor).json()
    assert metrics["consultations"] == 1 and metrics["linked_consultations"] == 1
    assert metrics["encounters_finalized"] == 1 and metrics["plans_edited_by_doctor"] == 1
    runs = client.get(f"{API}/doctor/agent-runs", headers=doctor).json()
    assert {r["agent"] for r in runs["items"]} == {"navigator", "copilot", "copilot_qa", "patient_qa"}
    assert all(r["events"] or r["agent"] == "patient_qa" for r in runs["items"])


def test_red_flag_consultation_books_urgent_and_brief_has_no_plan(client, doctor):
    patient, appt = _patient_with_booking(client, "Tôi nữ 50 tuổi, đi ngoài ra máu 2 tuần nay", "an@test.vn")
    assert appt["priority"] == "urgent"
    _, routine = _patient_with_booking(client, "Tôi là nữ 45 tuổi", "binh@test.vn")
    queue = client.get(f"{API}/doctor/appointments", headers=doctor).json()["items"]
    assert queue[0]["id"] == appt["id"]  # ưu tiên khẩn lên đầu
    enc = client.post(f"{API}/doctor/appointments/{appt['id']}/start", headers=doctor).json()
    assert enc["brief"]["red_flags"] and enc["draft_plan"] is None


def test_finalize_rules(client, doctor):
    patient, appt = _patient_with_booking(client)
    enc = client.post(f"{API}/doctor/appointments/{appt['id']}/start", headers=doctor).json()
    url = f"{API}/doctor/encounters/{enc['id']}/finalize"
    assert client.post(url, json={"conclusion": " "}, headers=doctor).status_code == 422
    bad = enc["draft_plan"]
    bad["items"][0]["rationale"] = "Bạn bị ung thư vú."
    assert client.post(url, json={"conclusion": "ok", "final_plan": bad}, headers=doctor).status_code == 400
    assert client.post(url, json={"conclusion": "ok"}, headers=patient).status_code == 403
    no_plan = client.post(url, json={"conclusion": "Chưa cần tầm soát định kỳ.", "final_plan": None}, headers=doctor)
    assert no_plan.status_code == 200 and no_plan.json()["final_plan"] is None and no_plan.json()["reminders"] == []
    assert client.post(url, json={"conclusion": "lần hai"}, headers=doctor).status_code == 409
    assert client.post(f"{API}/doctor/encounters/{enc['id']}/brief", headers=doctor).status_code == 409


def test_patient_isolation(client, doctor):
    patient, appt = _patient_with_booking(client)
    enc = client.post(f"{API}/doctor/appointments/{appt['id']}/start", headers=doctor).json()
    other = register_and_login(client, "other@test.vn")
    assert client.get(f"{API}/encounters/{enc['id']}", headers=other).status_code == 404
    assert client.post(f"{API}/appointments/{appt['id']}/cancel", headers=other).status_code == 404
    assert client.get(f"{API}/doctor/appointments", headers=patient).status_code == 403
    assert client.get(f"{API}/doctor/patients/{enc['patient_id']}/record", headers=other).status_code == 403
    assert (
        client.post(f"{API}/encounters/{enc['id']}/questions", json={"question": "?"}, headers=patient).status_code
        == 409
    )


def test_booking_validation(client):
    auth = register_and_login(client, "v@test.vn")
    today = date.today()
    bad_service = {"service_code": "nope", "preferred_date": today.isoformat()}
    assert client.post(f"{API}/appointments", json=bad_service, headers=auth).status_code == 400
    past = {"service_code": "general_screening", "preferred_date": (today - timedelta(days=1)).isoformat()}
    assert client.post(f"{API}/appointments", json=past, headers=auth).status_code == 400
    ok = {"service_code": "general_screening", "preferred_date": today.isoformat()}
    ids = [client.post(f"{API}/appointments", json=ok, headers=auth).json()["id"] for _ in range(3)]
    assert client.post(f"{API}/appointments", json=ok, headers=auth).status_code == 409
    assert client.post(f"{API}/appointments/{ids[0]}/cancel", headers=auth).json()["status"] == "cancelled"
    assert client.post(f"{API}/appointments/{ids[0]}/cancel", headers=auth).status_code == 409
