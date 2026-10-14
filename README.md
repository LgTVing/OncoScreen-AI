# OncoScreen AI — AI Agent Hỗ Trợ Tầm Soát Ung Thư

Repo: https://github.com/Tuyen230605/OncoScreen-AI

> Hệ thống AI Agent đánh giá nguy cơ, khuyến nghị lịch tầm soát ung thư dựa trên guideline y khoa
> (RAG), **bác sĩ phê duyệt trước khi trả kết quả (HITL)**. Chạy hoàn toàn local, phục vụ báo cáo học phần.

⚠️ **AI KHÔNG chẩn đoán ung thư, KHÔNG diễn giải kết quả tầm soát.** Mọi khuyến nghị chỉ mang tính giáo dục / tham khảo và
phải qua bác sĩ duyệt. Xem [docs/00_OVERVIEW.md](docs/00_OVERVIEW.md).

## Bắt đầu ở đâu?

| Bạn là… | Đọc theo thứ tự |
|---|---|
| Thành viên mới, muốn hiểu dự án | `docs/00_OVERVIEW.md` → `docs/01_ARCHITECTURE.md` → `docs/02_BUSINESS_FLOW.md` |
| Làm **AI Core** (Tuyền) | `docs/guides/GUIDE_AI_CORE.md` + `docs/protocols/AI_CORE_CONTRACT.md` |
| Làm **Backend** | `docs/guides/GUIDE_BACKEND.md` + `docs/protocols/API_CONTRACT.md` + `docs/protocols/DB_SCHEMA.md` |
| Làm **Frontend** | `docs/guides/GUIDE_FRONTEND.md` + `docs/protocols/API_CONTRACT.md` |
| Ghép nối / demo | `docs/guides/GUIDE_INTEGRATION.md` |
| Trước khi commit | `docs/protocols/GIT_WORKFLOW.md` + `docs/protocols/DEFINITION_OF_DONE.md` |

## Cấu trúc repo

```
.
├── ai_core/      # [Module 1] LangGraph agent + RAG + tools + guardrails (Python package)
├── backend/      # [Module 2] FastAPI + PostgreSQL + HITL + scheduler
├── frontend/     # [Module 3] Next.js: giao diện bệnh nhân + dashboard bác sĩ
├── docs/         # Đặc tả, protocol, hướng dẫn từng khối, ADR
├── scripts/      # Script tiện ích chạy toàn hệ thống
├── topic/        # Đề bài gốc (không sửa)
└── docker-compose.yml  # PostgreSQL 16 cho dev/demo
```

## Chạy nhanh (dev)

```bash
# 1. Tạo môi trường Python và cài dependencies Python (chạy từ repo root)
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt

# 2. Cấu hình + database
cp .env.example .env            # điền LLM_API_KEY (DATABASE_URL mặc định trỏ tới container bên dưới)
docker compose up -d            # PostgreSQL 16 tại localhost:5432

# 3. Backend (tab mới; kích hoạt .venv trong tab đó)
cd backend && uvicorn app.main:app --reload
#    → http://localhost:8000/docs (Swagger)

# 4. Frontend (tab mới)
cd frontend && npm install && npm run dev
#    → http://localhost:3000
```

`requirements.txt` cài dependencies cho cả Backend và AI Core. Chạy AI Core mock không cần `LLM_API_KEY`; chỉ cần kích hoạt `.venv` rồi chạy demo từ thư mục `ai_core/`. Embedding local cho RAG thật cần cài thêm extra `local-embed` trong `ai_core/`.

Không muốn chạy Docker? Đặt `DATABASE_URL=sqlite:///./dev.db` trong `.env` (chỉ cho dev nhanh; demo/nộp dùng PostgreSQL).

## Nguyên tắc làm việc (bắt buộc)

1. **Chỉ sửa trong thư mục khối của mình.** Muốn đổi contract (`docs/protocols/*`, `ai_core/ai_core/schemas.py`,
   `frontend/src/types/api.ts`) → mở PR riêng, tag cả team. Xem `docs/protocols/OWNERSHIP.md`.
2. **Mock trước, thật sau.** Mỗi khối có mock của khối kế bên để không phải chờ nhau.
3. **Nhánh `feature/<tên>-<việc>`, commit nhỏ, PR trước khi merge.** Xem `docs/protocols/GIT_WORKFLOW.md`.
