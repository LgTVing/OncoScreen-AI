# 01 — Kiến trúc hệ thống

## Sơ đồ khối

```
┌──────────────────────────────── Frontend (Next.js :3000) ─────────────────────────────────┐
│  /  (Navigator công khai)   /register /login   /patient/*  (đặt lịch, hồ sơ, kết quả)       │
│  /doctor/*  (hàng chờ, lần khám + Copilot, hồ sơ bệnh nhân, quan sát AI)                    │
└──────────────────────────────────────────┬────────────────────────────────────────────────┘
                                           │ REST JSON (docs/protocols/API_CONTRACT.md)
┌──────────────────────────────────────────▼────────────────────────────────────────────────┐
│                           Backend (FastAPI :8000)  /api/v1                                 │
│  api/v1: navigator · auth · patients · appointments · encounters · doctor · reminders      │
│  services: navigator · appointment · encounter (HITL) · record (hồ sơ xuyên suốt)          │
│            agent_service (cầu nối AI + agent_runs) · metrics · scheduler · auth            │
│  models ─► consultations · appointments · encounters · record_events · reminders           │
│            agent_runs · audit_logs · users · patient_profiles  ──► PostgreSQL / SQLite     │
└──────────────────────────────────────────┬────────────────────────────────────────────────┘
                                           │ Python import (docs/protocols/AI_CORE_CONTRACT.md)
┌──────────────────────────────────────────▼────────────────────────────────────────────────┐
│                               AI Core (package `ai_core`)                                  │
│  api.py ─ Agent / MockAgent: navigate · build_brief · ask_copilot · answer_question        │
│  agents/navigator.py  (LangGraph)      agents/copilot.py  (LangGraph)                      │
│  tools/: intake · red_flag_detector · eligibility · triage · questionnaire · patient_qa    │
│  rag/: corpus (chunking) · lexical (BM25) · retriever (hybrid + RRF) · ingest (Chroma)     │
│  guardrails/: safety (input/output) · disclaimer        observability.py (trace)           │
│  data/: guidelines/*.md · screening_rules.json · red_flags.json · services.json · eval/    │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Ranh giới giữa các khối

| Ranh giới | Cơ chế | Chủ sở hữu định nghĩa | Nguồn sự thật |
|---|---|---|---|
| Frontend ↔ Backend | HTTP REST JSON; JWT Bearer; `X-Consult-Token` cho phiên ẩn danh | Backend | `API_CONTRACT.md`, mirror `frontend/src/types/api.ts` |
| Backend ↔ AI Core | Gọi hàm Python (`ai_core.api`, `ai_core.schemas`) trong threadpool; `AgentError` → 502 | AI Core | `AI_CORE_CONTRACT.md`, `ai_core/schemas.py` |
| AI Core ↔ Kho tri thức | Markdown + frontmatter → BM25 trong bộ nhớ + Chroma (tuỳ chọn) | AI Core | `ai_core/data/guidelines/` |
| Backend ↔ DB | SQLAlchemy ORM, Alembic | Backend | `DB_SCHEMA.md`, `backend/app/models/` |

Backend gọi AI Core bằng import (ADR-0002): chạy local một process, ít lỗi ghép nối. Muốn tách service chỉ cần bọc `ai_core.api` bằng FastAPI riêng.

## Ba loại dữ liệu "lịch sử" tách biệt có chủ đích
| Bảng | Trả lời câu hỏi | Ai đọc |
|---|---|---|
| `record_events` | Hành trình y tế của bệnh nhân (tư vấn, cảnh báo, lịch hẹn, kết luận, tầm soát đã làm) | Bệnh nhân (mốc `visibility=all`), bác sĩ, Copilot |
| `audit_logs` | Ai đã làm gì, sửa gì (before/after) | Kiểm toán |
| `agent_runs` | AI đã chạy thế nào (trace node, độ trễ, fallback, cờ an toàn) — không chứa nội dung hội thoại | Bác sĩ/vận hành, dashboard |

## Trạng thái

```
Consultation:  ẩn danh (patient_id NULL) ──register/claim──► linked
               next_action: continue_chat | suggest_booking | urgent_care (red-flag: không quay lại)

Appointment:   requested ──confirm──► confirmed ──start──► (encounter) ──finalize──► completed
                    └────────────── cancel ──────────────► cancelled

Encounter:     in_progress (brief + draft_plan, chỉ bác sĩ) ──finalize (HITL)──► finalized (bệnh nhân thấy kết luận + kế hoạch)

Reminder:      scheduled ──tới hạn──► due ──bệnh nhân xác nhận──► done (+ chu kỳ kế tiếp)
```

## Chiến lược làm song song (mock)
```
Frontend ──► NEXT_PUBLIC_USE_MOCK_API=true ──► src/mocks/*        (không cần backend)
Backend  ──► USE_MOCK_AGENT=true           ──► ai_core.mock.MockAgent (pipeline thật, không LLM)
AI Core  ──► pytest + python -m ai_core.cli demo|eval
```

## Thư mục chính
```
ai_core/ai_core/
├── api.py              # ★ entry point: Agent, MockAgent (qua mock.py), helpers cho backend
├── schemas.py          # ★ contract Pydantic
├── agents/             # navigator.py, copilot.py (LangGraph)
├── tools/              # intake, red_flag_detector, eligibility, triage, questionnaire, patient_qa, education, booking, recall_reminder
├── rag/                # corpus, lexical, retriever, embeddings, ingest
├── guardrails/         # safety, disclaimer
├── observability.py    # trace_id, node events, sinks
├── evaluation.py       # golden-set eval
└── prompts.py
backend/app/
├── api/v1/             # navigator, auth, patients, appointments, encounters, doctor, reminders, health
├── services/           # navigator, appointment, encounter, record, agent, metrics, scheduler, auth
└── models/             # consultation, appointment, encounter, record_event, agent_run, reminder, audit_log, user, patient_profile
frontend/src/
├── app/                # / (Navigator), login, register, patient/*, doctor/*
├── components/ lib/api.ts types/api.ts mocks/
```
