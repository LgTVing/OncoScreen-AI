# Protocol: REST API Contract (Backend ↔ Frontend)

**Base URL:** `http://localhost:8000/api/v1` · **Auth:** `Authorization: Bearer <JWT>` · **Content-Type:** `application/json`
**Nguồn sự thật:** file này + `frontend/src/types/api.ts` (mirror). Backend `app/schemas/*` phải khớp. Swagger tự sinh tại `/docs`.
**Chủ sở hữu:** Backend. Frontend tiêu thụ. Muốn đổi → PR tag cả team.

## Quy ước chung
- ID: UUID string. Ngày: ISO-8601 (`2026-09-14`, `2026-09-14T08:00:00Z`).
- Lỗi: `{ "detail": string }` với HTTP status chuẩn (400 validation, 401 chưa đăng nhập, 403 sai role, 404, 409 sai trạng thái, 502 lỗi AI).
- Phân trang danh sách: `?page=1&page_size=20` → `{ items: [], total, page, page_size }`.
- Kiểu dữ liệu `ScreeningPlan`, `RiskAssessment`, `RedFlagResult`, `Question`, `EducationContent` **giống hệt** `AI_CORE_CONTRACT.md` (backend truyền qua nguyên vẹn).

## 1. Auth
| Method | Path | Role | Body | Response |
|---|---|---|---|---|
| POST | `/auth/register` | public | `{ email, password, full_name, role: "patient" }` | `201 UserOut`; role `doctor` trả 403 |
| POST | `/auth/login` | public | `{ email, password }` | `{ access_token, token_type:"bearer", user: UserOut }` |
| GET | `/auth/me` | any | — | `UserOut` |

`UserOut = { id, email, full_name, role, created_at }`

## 2. Patient profile
| Method | Path | Role | Body | Response |
|---|---|---|---|---|
| GET | `/patients/me/profile` | patient | — | `PatientProfileOut` (404 nếu chưa có) |
| PUT | `/patients/me/profile` | patient | `PatientProfileIn` | `PatientProfileOut` |

```
PatientProfileIn  = { age:int, gender:"male"|"female"|"other", genetics_history:string[], lifestyle:{ smoking?:bool, pack_years?:number, alcohol?:"none"|"light"|"heavy", bmi?:number, exercise?:"none"|"light"|"regular", ... } }
PatientProfileOut = PatientProfileIn & { user_id, lifestyle_score:number|null, updated_at }
```

## 3. Screening sessions (patient)
| Method | Path | Role | Body | Response |
|---|---|---|---|---|
| POST | `/sessions` | patient | — | `201 SessionOut` (status `collecting`, kèm `questionnaire`) |
| GET | `/sessions` | patient | `?status=` | `Page<SessionSummary>` (chỉ của mình) |
| GET | `/sessions/{id}` | patient/doctor | — | `SessionOut` (xem quy tắc lộ dữ liệu bên dưới) |
| POST | `/sessions/{id}/answers` | patient | `{ answers: [{question_id, value}] }` | `SessionOut` — status có thể chuyển sang `red_flag` hoặc `pending_review` (409 nếu session không ở `collecting`) |
| POST | `/sessions/{id}/questions` | patient sở hữu phiên đã duyệt | `{ question: string }` (1–1000 ký tự) | `QuestionAnswer` |

```
SessionSummary = { id, patient_id, patient_name, status, created_at, updated_at, has_red_flag:boolean }
SessionOut = SessionSummary & {
  questionnaire: Questionnaire | null,     // khi collecting
  answers: Answer[],
  red_flag: RedFlagResult | null,          // khi red_flag
  risk_assessment: RiskAssessment | null,  // doctor: luôn; patient: chỉ khi approved
  draft_plan: ScreeningPlan | null,        // CHỈ doctor thấy
  final_plan: ScreeningPlan | null,        // patient chỉ thấy khi approved
  doctor_note: string | null,
  reviewed_by: UserOut | null,
  reviewed_at: string | null,
  disclaimer: string,                      // luôn có
  reminders: ReminderOut[],                // khi approved
  trace_id: string | null,                 // chỉ doctor
  trace_events: {node:string,status:string,duration_ms?:number,source_count?:number,has_plan?:boolean}[] // chỉ doctor
}
```

**Quy tắc lộ dữ liệu (bắt buộc, test bắt buộc):**
- role=patient: `draft_plan` luôn `null`; `final_plan`/`risk_assessment` chỉ khác `null` khi `status=approved`.
- role=doctor: thấy tất cả.
- Phiên `pending_review` có thể có `draft_plan=null` khi thiếu guideline phù hợp; bệnh nhân chỉ thấy trạng thái chờ. Phiên `approved` có thể có `final_plan=null` kèm ghi chú của bác sĩ.
- `PlanItem.next_due` có thể `null`; lúc đó không tạo reminder.

**Quy tắc gửi answers:**

- `POST /sessions/{id}/answers` là thao tác merge theo `question_id`; gửi lại cùng một
  `question_id` sẽ ghi đè câu trả lời cũ.
- Có thể gửi từng phần. Khi còn câu bắt buộc đang hiển thị, response giữ `status=collecting`.
- Red-flag được kiểm tra trước việc kiểm tra đủ câu và trước khi gọi agent tạo kế hoạch.
- Khi chuyển sang `red_flag` hoặc `pending_review`, session không nhận answers tiếp và trả HTTP 409.

## 4. Doctor — HITL
| Method | Path | Role | Body | Response |
|---|---|---|---|---|
| GET | `/doctor/sessions` | doctor | `?status=pending_review&page=` | `Page<SessionSummary>` (tất cả bệnh nhân) |
| GET | `/doctor/patients/{patient_id}` | doctor | — | `{ user: UserOut, profile: PatientProfileOut|null, sessions: SessionSummary[] }` |
| GET | `/doctor/metrics` | doctor | — | `{ sessions: Record<string,number>, pending_without_plan:number, questions_asked:number }` |
| POST | `/sessions/{id}/review` | doctor | `ReviewIn` | `SessionOut` (409 nếu status ≠ `pending_review`) |

```
ReviewIn = {
  action: "approve" | "reject",
  final_plan?: ScreeningPlan,   // approve: nếu bỏ trống → dùng draft_plan nguyên; nếu gửi → là bản bác sĩ đã sửa
  note?: string                 // reject: bắt buộc
}
```
Approve → backend: `status=approved`, lưu `final_plan` nếu có, `doctor_id`, `reviewed_at`, ghi `audit_logs`, sinh `reminders` chỉ cho item có ngày hẹn.

**Quy tắc ReviewIn:**

- `approve`: `final_plan` có thể bỏ trống để dùng nguyên `draft_plan`; nếu gửi lên thì phải
  đúng schema `ScreeningPlan` và vẫn phải có source cho từng item.
- Nếu cả `draft_plan` và `final_plan` đều rỗng, bác sĩ có thể duyệt kết luận thiếu căn cứ nhưng bắt buộc ghi `note`; không tạo reminder.
- `reject`: bắt buộc `note` không rỗng; không tạo reminder.
- Review lại session không còn `pending_review` trả HTTP 409.

## 5. Reminders
| Method | Path | Role | Body | Response |
|---|---|---|---|---|
| GET | `/reminders` | patient | `?status=` | `ReminderOut[]` (của mình, sort due_date) |
| POST | `/reminders/{id}/complete` | patient | `{ completed_at?: date }` | `ReminderOut` |
| GET | `/doctor/reminders/due` | doctor | — | `ReminderOut[]` (tất cả reminders `due`) |

`ReminderOut = { id, session_id, patient_id, cancer_type, method, due_date, status:"scheduled"|"due"|"done"|"skipped", completed_at, message }`
Khi bệnh nhân hoàn thành một reminder, backend tính ngày của chu kỳ kế tiếp từ `completed_at` và `interval_months` trong kế hoạch đã duyệt, rồi tạo một reminder mới. Gọi hoàn thành lại cùng reminder không tạo trùng.

## 6. Education
| Method | Path | Role | Response |
|---|---|---|---|
| GET | `/education` | any | `{ cancer_type, title }[]` |
| GET | `/education/{cancer_type}` | any | `EducationContent` |

## 6.1 Hỏi đáp bệnh nhân

`POST /sessions/{id}/questions` chỉ cho bệnh nhân sở hữu phiên `approved`. Kết quả gồm `answer`, `sources`, `disclaimer`, `trace_id`, `insufficient_evidence`. Agent giải thích kế hoạch đã duyệt; khi không có căn cứ trả `insufficient_evidence=true`. Câu hỏi và câu trả lời không được lưu trong audit log; log chỉ ghi trace ID, số nguồn và cờ thiếu căn cứ.

`POST /chat` cho bệnh nhân đã đăng nhập, không cần phiên tầm soát. Body: `{ question: string (1–1000 ký tự), cancer_type: CancerType, history: ChatTurn[] (tối đa 8 lượt) }`, trong đó `ChatTurn = { role: "user"|"assistant", content: string (1–1000 ký tự) }`. Response là `QuestionAnswer`. Chat chỉ trả lời kiến thức chung từ guideline đã biên tập; thiếu nguồn hoặc câu hỏi cần bác sĩ đánh giá trả `insufficient_evidence=true`. Lịch sử chat chỉ giữ ở trình duyệt đến khi tải lại trang; backend chỉ lưu metadata vào audit log, không lưu nội dung câu hỏi hoặc câu trả lời.

## 7. Health
| GET | `/health` | public | `{ status:"ok", agent:"mock"|"real", db:"ok" }` |

## Ví dụ luồng FE gọi
```
login → PUT profile → POST /sessions → (lặp) POST /sessions/{id}/answers
  ├─ status=red_flag      → hiển thị RedFlagAlert, dừng
  └─ status=pending_review→ hiển thị "Đang chờ bác sĩ duyệt", poll GET /sessions/{id} mỗi 10s (hoặc nút refresh)
doctor: GET /doctor/sessions?status=pending_review → GET /sessions/{id} → POST /sessions/{id}/review
patient: GET /sessions/{id} (approved) → hiển thị final_plan + disclaimer + reminders
```
Realtime (WebSocket) là **tuỳ chọn** — polling đủ cho MVP.
