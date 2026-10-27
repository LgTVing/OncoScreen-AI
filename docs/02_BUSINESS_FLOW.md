# 02 — Luồng nghiệp vụ

## Giai đoạn ① — Tìm hiểu với Navigator (ẩn danh)

| Bước | Actor | Hành động | Xử lý | Kết quả |
|---|---|---|---|---|
| 1 | Người dân | Mở trang chủ, gõ câu hỏi ("Tôi 45 tuổi, mẹ bị ung thư vú, nên khám gì?") hoặc làm bảng hỏi nhanh | FE `POST /navigator/consultations` → nhận `access_token` (lưu trình duyệt) | Phiên tư vấn ẩn danh |
| 2 | System | **Input guard**: nhận diện câu hỏi ngoài phạm vi (chẩn đoán, đọc kết quả, điều trị), dấu hiệu prompt injection | `guardrails/safety.py` | Cờ `out_of_scope`, `injection_suspected` trong trace |
| 3 | System | **Cập nhật intake**: trích xuất tuổi, giới, tiền sử gia đình, hút thuốc/gói-năm, viêm gan, tiền sử ung thư bản thân (luật; LLM chỉ điền chỗ trống) | `tools/intake.py` | `IntakeProfile` tích luỹ qua các lượt |
| 4 | System | **Red-flag** (luật, có xử lý phủ định "không sờ thấy…") | `tools/red_flag_detector.py` | Có → nhảy thẳng tới bước 8 (`urgent_care`) |
| 5 | System | **Eligibility engine**: đối chiếu luật tầm soát → mốc theo nhóm (loại ung thư, phương pháp, tuổi bắt đầu, chu kỳ) + yếu tố nguy cơ | `tools/eligibility.py` + `data/screening_rules.json` | `suggestions[]` (mỗi mục ≥1 nguồn), `risk_factors[]` |
| 6 | System | **RAG lai** cho câu hỏi tự do | `rag/retriever.py` | `sources[]` |
| 7 | System | **Trả lời**: LLM diễn giải (agent thật) → **output guard** (ngôn ngữ chẩn đoán, trích dẫn hợp lệ, con số có trong bằng chứng). Vi phạm/lỗi → câu trả lời mẫu xác định | `agents/navigator.py` | `reply` + nguồn |
| 8 | System | **Triage** → `continue_chat` / `suggest_booking` (kèm dịch vụ gợi ý) / `urgent_care` (ưu tiên khẩn) | `tools/triage.py` | FE hiển thị CTA tương ứng |

## Giai đoạn ② — Tạo tài khoản & đặt lịch

| Bước | Actor | Hành động | Xử lý | Kết quả |
|---|---|---|---|---|
| 9 | Người dân | Bấm "Tạo tài khoản để đặt lịch" | `POST /auth/register` kèm `consultation_id` + token | Phiên được gắn vào tài khoản; **hồ sơ điền sẵn**; mốc `account.created`, `consult.summary`, `red_flag.detected` vào hồ sơ xuyên suốt |
| 9' | Người đã có tài khoản | Đăng nhập rồi gắn phiên | `POST /navigator/consultations/{id}/claim` | Như trên |
| 10 | Bệnh nhân | Chọn dịch vụ (đã chọn sẵn theo `booking_hint`), ngày mong muốn, lý do (điền sẵn) | `POST /appointments` | Lịch `requested`; `priority=urgent` nếu phiên có red-flag |

## Giai đoạn ③ — Khám với Clinical Copilot (Human-in-the-loop)

| Bước | Actor | Hành động | Xử lý | Kết quả |
|---|---|---|---|---|
| 11 | Bác sĩ | Xem hàng chờ (khẩn lên đầu), xác nhận ngày | `GET /doctor/appointments`, `POST …/confirm` | `confirmed` |
| 12 | Bác sĩ | Bắt đầu khám | `POST …/start` → Copilot `build_brief(PatientRecord)` | `ClinicalBrief`: tóm tắt, dữ kiện **trỏ về event_id**, red-flag, yếu tố nguy cơ, gợi ý guideline có nguồn, câu hỏi cần làm rõ, khoảng trống dữ liệu, **bản nháp kế hoạch** (không có ngày hẹn; có red-flag thì không soạn) |
| 13 | Bác sĩ | Hỏi Copilot ("Guideline LDCT áp dụng thế nào cho bệnh nhân này?") | `POST …/copilot` | Câu trả lời trích dẫn guideline hoặc `record:<event_id>`; câu hỏi chẩn đoán/đọc kết quả bị từ chối |
| 14 | Bác sĩ | Khám, viết **kết luận** (bắt buộc) + ghi chú nội bộ; sửa kế hoạch, điền ngày hẹn; **duyệt** | `POST …/finalize` | Plan qua guardrail; khác bản nháp → audit `plan.edit`; sinh reminder cho mục có ngày; lịch `completed`; mốc `encounter.finalized` |

## Giai đoạn ④ — Theo dõi

| Bước | Actor | Hành động | Xử lý | Kết quả |
|---|---|---|---|---|
| 15 | Bệnh nhân | Xem kết luận, kế hoạch đã duyệt, hồ sơ xuyên suốt | `GET /encounters/{id}`, `GET /patients/me/record` | Không bao giờ thấy brief/bản nháp/ghi chú nội bộ |
| 16 | Bệnh nhân | Hỏi về kế hoạch đã duyệt | `POST /encounters/{id}/questions` | Trả lời chỉ trong phạm vi kế hoạch + nguồn; ngoài phạm vi → "chưa đủ thông tin, hỏi bác sĩ" |
| 17 | System | Scheduler quét reminder đến hạn | `services/scheduler.py` | `due` + lời nhắc |
| 18 | Bệnh nhân | Đánh dấu đã tầm soát | `POST /reminders/{id}/complete` | `done`, sinh chu kỳ kế tiếp; mốc `reminder.done` (Copilot dùng làm lịch sử tầm soát ở lần khám sau) |

## Quy tắc nghiệp vụ quan trọng
- **R1** Navigator chỉ đưa gợi ý **theo nhóm** (tuổi/giới/yếu tố nguy cơ) có nguồn; kế hoạch **cá nhân** chỉ do bác sĩ duyệt.
- **R2** Red-flag ngắt tư vấn tầm soát, không có `suggestions`, `next_action=urgent_care`, lịch đặt từ phiên này là `urgent`; Copilot không soạn kế hoạch tầm soát định kỳ cho ca có red-flag.
- **R3** Mọi `ScreeningSuggestion` / `PlanItem` có `sources[]` không rỗng; luật trỏ sai tài liệu làm hệ thống lỗi ngay khi khởi động.
- **R4** Bệnh nhân không bao giờ thấy `brief`, `draft_plan`, `clinical_notes`, trace; kết quả chỉ hiện khi `finalized`.
- **R5** Bác sĩ sửa kế hoạch → audit before/after; kế hoạch sửa vẫn phải qua guardrail.
- **R6** Mọi mốc quan trọng ghi vào **hồ sơ xuyên suốt**; Copilot chỉ được nêu dữ kiện có trong hồ sơ (truy vết bằng `event_id`).
- **R7** Ngôn ngữ: tiếng Việt, bình tĩnh, không gây hoảng loạn, luôn kèm disclaimer.

## Kịch bản demo (báo cáo)
1. **Nữ 45 tuổi, mẹ ung thư vú** → Navigator gợi ý vú (đánh dấu nguy cơ tăng + lưu ý), cổ tử cung, đại trực tràng → tạo tài khoản → đặt lịch tầm soát vú → bác sĩ mở brief, hỏi Copilot, điền ngày hẹn, duyệt → bệnh nhân thấy kết luận + nhắc lịch.
2. **Nam 55 tuổi, 30 gói-năm** (bảng hỏi nhanh) → gợi ý LDCT phổi, đại trực tràng, tư vấn PSA → Copilot hỏi thêm thời gian bỏ thuốc (tiêu chí ≤15 năm).
3. **"Em sờ thấy khối cứng ở vú"** → red-flag → ngắt, cảnh báo khám sớm, lịch ưu tiên → lên đầu hàng chờ; brief không có kế hoạch tầm soát.
4. **"Kết quả PSA của tôi là 6, có phải ung thư không?"** → từ chối chẩn đoán, mời đặt lịch khám.

## Sequence (rút gọn)
```
Người dân(FE)        Backend                     AI Core                         Bác sĩ(FE)
 │ POST /navigator/consultations ─► token
 │ POST …/messages ──►│ navigate() ───────────────►│ guard→intake→red_flag→eligibility→RAG→respond→triage
 │ ◄── reply + next_action ◄────────────────────────│
 │ POST /auth/register {consult} ─► link + prefill profile + record_events
 │ POST /appointments ─► requested
 │                    │◄──────────────────────────────────────────────── GET /doctor/appointments
 │                    │ start ─► build_brief(record) ►│ load_record→eligibility→retrieve→draft_brief→draft_plan
 │                    │◄─────────────────────────────── POST /copilot, POST /finalize (HITL)
 │ GET /encounters/{id} ◄─ kết luận + kế hoạch đã duyệt + reminders
```
