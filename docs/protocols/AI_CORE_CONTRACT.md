# Protocol: AI Core ↔ Backend Contract

**Nguồn sự thật:** `ai_core/ai_core/schemas.py` (Pydantic v2). File này là bản mô tả người-đọc; nếu lệch nhau, `schemas.py` thắng.
**Chủ sở hữu:** AI Core (Tuyền). Backend chỉ *tiêu thụ*. Muốn đổi → PR tag cả team.

## 1. Interface

Backend chỉ import từ `ai_core.api`, `ai_core.schemas` (và `ai_core.guardrails.*` để kiểm tra kế hoạch bác sĩ sửa).

```python
from ai_core.api import get_agent, AgentError, list_services, intake_from_profile, merge_intake, \
    genetics_codes_from_intake, CANCER_LABEL_VI

agent = get_agent()   # Agent (LLM thật) hoặc MockAgent (USE_MOCK_AGENT=true)

# Navigator — người dùng, không cần tài khoản
agent.navigator_questionnaire() -> Questionnaire
agent.navigate(*, message: str | None, answers: list[Answer], intake: IntakeProfile, history: list[ChatTurn]) -> NavigatorReply
agent.check_red_flags(answers: list[Answer], text: str | None = None) -> RedFlagResult

# Clinical Copilot — bác sĩ
agent.build_brief(record: PatientRecord) -> ClinicalBrief
agent.ask_copilot(question: str, record: PatientRecord, history: list[ChatTurn]) -> QuestionAnswer

# Sau khi bác sĩ duyệt — bệnh nhân
agent.answer_question(question: str, approved_plan: ScreeningPlan | None) -> QuestionAnswer
agent.get_education(cancer_type: CancerType) -> EducationContent
```

Tất cả hàm **đồng bộ**; backend gọi trong threadpool. Lỗi nội bộ → `AgentError` → HTTP 502.
Lỗi LLM **không** raise: agent tự rơi về câu trả lời xác định (fallback) và ghi `generator=template_fallback` trong trace.

## 2. Schemas chính

### Enum
| Enum | Giá trị |
|---|---|
| `Gender` | `male`, `female`, `other` |
| `CancerType` | `breast`, `cervical`, `colorectal`, `liver`, `lung`, `prostate`, `other` |
| `RiskLevel` | `average`, `elevated`, `high` |
| `NextAction` | `continue_chat`, `suggest_booking`, `urgent_care` |
| `BookingPriority` | `routine`, `urgent` |
| `RedFlagSeverity` | `urgent`, `soon` |

### Navigator
```
IntakeProfile       { age?, gender?, family_history: CancerType[], personal_cancer_history?, smoking?, pack_years?,
                      hepatitis_b_or_c?, cirrhosis?, hpv_vaccinated?, symptom_codes: str[] }
ScreeningSuggestion { rule_id, cancer_type, method, start_age?, interval_months? (null = quyết định cùng bác sĩ),
                      applies_because, note?, elevated_risk, sources: Source[≥1] }
BookingHint         { priority, service_codes: str[≥1], reason }
NavigatorReply      { reply, sources, intake, missing_info, suggestions, risk_factors, red_flag: RedFlagResult,
                      next_action, booking_hint?, insufficient_evidence, disclaimer, trace_id, trace_events }
```

### Clinical Copilot
```
RecordEvent    { id, at, kind, summary, data }
PatientRecord  { patient_id, full_name?, profile?: PatientProfile, intake?: IntakeProfile, reason_for_visit?, events: RecordEvent[] }
BriefFact      { text, event_ids: str[≥1] }
ClinicalBrief  { summary, key_facts: BriefFact[], red_flags: RedFlag[], risk_factors: RiskFactor[],
                 guideline_suggestions: ScreeningSuggestion[], questions_to_clarify: str[], data_gaps: str[],
                 draft_plan?: ScreeningPlan, disclaimer, generated_at, model, trace_id, trace_events }
```

### Dùng chung
```
Source         { doc_id, title, section?, excerpt, url? }      // Copilot: doc_id có thể là "record:<event_id>"
PlanItem       { cancer_type, method, start_age?, interval_months>0, next_due?, rationale, sources[≥1], priority 1–5 }
ScreeningPlan  { items[≥1], general_advice, generated_at, model }
QuestionAnswer { answer, sources, disclaimer, trace_id, insufficient_evidence, trace_events }
TraceEvent     = dict[str, str|int|float|bool]   // {node, status, duration_ms, …thuộc tính}
```

## 3. Bất biến backend có thể tin tưởng
1. `NavigatorReply.red_flag.detected` ⇒ `next_action = urgent_care`, `suggestions = []`, `booking_hint.priority = urgent` (validator Pydantic).
2. `next_action ≠ continue_chat` ⇒ có `booking_hint`; `urgent_care` ⇒ có red-flag.
3. Mọi `ScreeningSuggestion.sources` và `PlanItem.sources` có ≥ 1 phần tử, trỏ tới tài liệu có thật trong `data/guidelines`.
4. `ClinicalBrief.key_facts[*].event_ids` ⊆ `PatientRecord.events[*].id`.
5. `ClinicalBrief.draft_plan` có `next_due = null` cho mọi mục; `draft_plan = null` khi hồ sơ có red-flag.
6. `disclaimer` luôn non-empty, tiếng Việt. Không có văn bản nào ra khỏi agent chứa ngôn ngữ chẩn đoán đã biết.
7. `trace_events` chỉ chứa metadata (không chứa hồ sơ, câu trả lời, API key).
8. `MockAgent` và `Agent` cùng interface, cùng pipeline luật/RAG/guardrail — chỉ khác bước sinh văn bản.

## 4. Cấu hình (env)
`LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY`, `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`, `EMBEDDING_API_KEY`, `VECTOR_STORE_DIR`,
`RAG_TOP_K`, `USE_MOCK_AGENT`.

## 5. Quy trình đổi contract
1. PR sửa `schemas.py` + file này + `frontend/src/types/api.ts` + `API_CONTRACT.md` nếu ảnh hưởng FE.
2. Cập nhật test contract (`ai_core/tests/test_schemas.py`) và golden set nếu hành vi đổi.
3. Cả 3 thành viên approve.
