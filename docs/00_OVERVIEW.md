# 00 — Tổng quan dự án

## Bối cảnh & vấn đề
Nhiều người bỏ lỡ tầm soát ung thư định kỳ (vú, cổ tử cung, đại trực tràng, gan, phổi, tuyến tiền liệt) dù thuộc nhóm nguy cơ.
Người chưa có kiến thức y khoa không biết **nên tầm soát loại ung thư nào, bắt đầu khi nào, bao lâu một lần**, và ngại đến bệnh viện
khi chưa rõ mình có cần khám hay không. Ở phía bệnh viện, bác sĩ thường bắt đầu buổi khám với rất ít thông tin về người bệnh.

## Định vị sản phẩm
OncoScreen AI là **trợ lý hành trình tầm soát ung thư** cho một bệnh viện (mô hình bệnh viện tư nhân đa khoa). AI **không chẩn đoán**.
Hệ thống có **hai agent dùng chung một lõi tri thức**:

| Agent | Người dùng | Vai trò | Không làm |
|---|---|---|---|
| **Navigator** (Trợ lý tầm soát) | Người dân, chưa cần tài khoản | Giải đáp kiến thức tầm soát; từ tuổi/giới/yếu tố nguy cơ gợi ý loại ung thư nên tầm soát, phương pháp, tuổi bắt đầu, tần suất (có nguồn); phát hiện dấu hiệu cảnh báo; điều hướng tạo tài khoản & đặt lịch | Chẩn đoán, đọc kết quả xét nghiệm, tư vấn điều trị, lập kế hoạch cá nhân |
| **Clinical Copilot** (Trợ lý bác sĩ) | Bác sĩ | Tổng hợp hồ sơ xuyên suốt thành bản tóm tắt trước khám (mỗi dữ kiện truy vết được), đối chiếu guideline, gợi ý câu hỏi cần làm rõ & khoảng trống dữ liệu, soạn **bản nháp** kế hoạch theo dõi, trả lời câu hỏi của bác sĩ có trích dẫn | Đưa ra chẩn đoán, diễn giải kết quả cận lâm sàng, tự gửi kết quả cho bệnh nhân |

## Hành trình 4 giai đoạn

```
① TÌM HIỂU (ẩn danh)        ② KẾT NỐI                    ③ KHÁM                           ④ THEO DÕI
Người dân ↔ Navigator  →  Tạo tài khoản (gắn phiên)  →  Bác sĩ + Clinical Copilot   →  Bệnh nhân xem kết luận,
- hỏi đáp có nguồn         - hồ sơ điền sẵn              - brief từ hồ sơ xuyên suốt      kế hoạch đã duyệt,
- bảng hỏi nhanh           - đặt lịch (gói gợi ý,        - hỏi Copilot có trích dẫn       nhắc lịch tái tầm soát,
- gợi ý tầm soát theo        ưu tiên nếu có red-flag)    - sửa & DUYỆT kế hoạch (HITL)     hỏi đáp về kế hoạch
  nhóm + red-flag                                        - kết luận do bác sĩ viết
            └──────────────── HỒ SƠ XUYÊN SUỐT (record_events) ghi lại mọi mốc ────────────────┘
```

## Phạm vi (Scope)

### Trong phạm vi (MVP)
- [x] Navigator công khai: chat + bảng hỏi nhanh, trích xuất thông tin, **gợi ý tầm soát theo luật có nguồn**, red-flag ngắt luồng, điều hướng `continue_chat | suggest_booking | urgent_care`.
- [x] Tạo tài khoản gắn phiên tư vấn ẩn danh (claim), hồ sơ điền sẵn.
- [x] Đặt lịch mô phỏng (danh mục dịch vụ cấu hình được), ưu tiên khẩn cho ca có red-flag.
- [x] Bác sĩ: hàng chờ (khẩn lên đầu), xác nhận lịch, mở lần khám → Clinical Copilot brief, hỏi Copilot, sửa/duyệt kế hoạch, viết kết luận.
- [x] Hồ sơ xuyên suốt (timeline) cho bệnh nhân và bác sĩ; nhắc lịch tái tầm soát; hỏi đáp về kế hoạch đã duyệt.
- [x] Độ tin cậy: RAG lai (BM25 + vector + RRF), guardrail vào/ra, HITL, tracing node-level, bảng `agent_runs`, bộ đánh giá golden set.

### Nâng cao (nếu còn thời gian)
- [ ] LLM-as-judge cho chất lượng diễn đạt; mở rộng golden set lên ≥ 100 ca có bác sĩ gán nhãn.
- [ ] Exporter Langfuse/OpenTelemetry (đã có điểm cắm `observability.add_sink`).
- [ ] Bổ sung guideline Bộ Y tế Việt Nam cho từng loại ung thư; reranker cross-encoder.
- [ ] Thông báo SMS/Zalo thật, tích hợp HIS/EMR.

### Ngoài phạm vi (KHÔNG làm)
- Chẩn đoán, đọc/diễn giải kết quả xét nghiệm hay hình ảnh y khoa, tư vấn điều trị — kể cả ở Copilot.
- Deploy cloud, HA, multi-tenant; tích hợp HIS/EMR thật, thanh toán.

## Ràng buộc an toàn (không thương lượng)
| # | Ràng buộc | Nơi thực thi |
|---|---|---|
| S1 | AI **không chẩn đoán**, không diễn giải kết quả, không tư vấn điều trị (cả Navigator và Copilot) | `guardrails/safety.py` (input: `is_out_of_scope_request`; output: `find_diagnosis_language`), system prompt, disclaimer |
| S2 | Mọi gợi ý/khuyến nghị **có nguồn**; mốc tuổi, chu kỳ do **luật xác định** sinh ra, LLM không được bịa | `tools/eligibility.py` + `data/screening_rules.json`, kiểm tra trích dẫn & con số (`ungrounded_numbers`) |
| S3 | Triệu chứng nghi ngờ → **ngắt luồng** trước mọi bước LLM/RAG, khuyên khám sớm, đặt lịch ưu tiên; cờ không bị gỡ trong phiên | `tools/red_flag_detector.py`, nhánh `update_intake → triage` của Navigator |
| S4 | **Kế hoạch cá nhân chỉ có hiệu lực sau khi bác sĩ duyệt**; bệnh nhân không thấy brief/bản nháp | `encounter_service.finalize`, quy tắc lộ dữ liệu `encounter_service.to_out` |
| S5 | Bảo mật PHI: mật khẩu bcrypt, JWT, token phiên ẩn danh chỉ lưu hash, bệnh nhân chỉ xem dữ liệu của mình, trace không chứa nội dung hội thoại | `core/security.py`, `navigator_service`, `observability.py` |
| S6 | Truyền thông cẩn trọng, không gây hoảng loạn, luôn kèm disclaimer | `guardrails/disclaimer.py`, `frontend` component `Disclaimer` |

## Thành viên & phân công
| Module | Thư mục | Phụ trách | Guide |
|---|---|---|---|
| 1. AI Core & Data | `ai_core/` | Tuyền | `docs/guides/GUIDE_AI_CORE.md` |
| 2. Backend & Database | `backend/` | _(điền tên)_ | `docs/guides/GUIDE_BACKEND.md` |
| 3. Frontend UI/UX | `frontend/` | _(điền tên)_ | `docs/guides/GUIDE_FRONTEND.md` |
| Tích hợp & demo | `docs/`, `scripts/` | cả nhóm | `docs/guides/GUIDE_INTEGRATION.md` |

## Tech stack
| Lớp | Công nghệ | Lý do |
|---|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind | Trang công khai cho Navigator + cổng bệnh nhân + cổng bác sĩ |
| Backend | FastAPI, SQLAlchemy 2, Pydantic v2, APScheduler, Alembic | Async, Swagger tự sinh, scheduler nhắc lịch |
| AI Core | LangGraph, LangChain, Chroma + BM25 thuần Python | Graph có nhánh an toàn tường minh; RAG chạy được cả khi chưa có vector store |
| DB | PostgreSQL 16 (`docker compose`), fallback SQLite | Dữ liệu có cấu trúc + JSON |
| LLM | Cấu hình qua env (`LLM_PROVIDER`: openrouter/openai/anthropic/ollama) | Đổi provider không sửa code; `USE_MOCK_AGENT=true` chạy không cần key |

Chi tiết: kiến trúc `01_ARCHITECTURE.md`, nghiệp vụ `02_BUSINESS_FLOW.md`, dữ liệu `03_DATA_MODEL.md`,
độ tin cậy của agent `05_AGENT_RELIABILITY.md`.
