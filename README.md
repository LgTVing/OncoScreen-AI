# OncoScreen AI — AI Agent Hỗ Trợ Tầm Soát Ung Thư

Repo: https://github.com/Tuyen230605/OncoScreen-AI

> Hệ thống AI Agent đánh giá nguy cơ, khuyến nghị lịch tầm soát ung thư dựa trên guideline y khoa
> (RAG), **bác sĩ phê duyệt trước khi trả kết quả (HITL)**. Chế độ mock chạy local; chế độ agent thật gọi LLM từ nhà cung cấp được cấu hình.

⚠️ **AI KHÔNG chẩn đoán ung thư, KHÔNG diễn giải kết quả tầm soát.** Mọi khuyến nghị chỉ mang tính giáo dục / tham khảo và
phải qua bác sĩ duyệt. Chỉ dùng hồ sơ giả lập khi thử API LLM của bên thứ ba. Xem [docs/00_OVERVIEW.md](docs/00_OVERVIEW.md).

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

## Chạy dự án local (Linux/macOS)

Cần Python 3.11+, Node.js/npm. Repo hiện có sẵn `ai_core/.venv` (Python 3.12.3), các thư viện backend/AI Core đã cài trong venv này, cùng `frontend/node_modules`. Docker Compose chỉ cần nếu dùng PostgreSQL. Các lệnh dưới đây chạy frontend + backend ở chế độ mock; backend gọi AI Core mock trực tiếp nên không cần bật server AI riêng.

### 1. Kích hoạt môi trường Python và cấu hình

Chạy từ thư mục gốc repo. Mỗi terminal mới cần kích hoạt venv lại:

```bash
source ai_core/.venv/bin/activate
```

Nếu cần cài lại/cập nhật dependencies sau khi thay đổi requirements:

```bash
source ai_core/.venv/bin/activate
python -m pip install -r requirements.txt
```

Repo hiện đã có `.env`. Nếu tạo checkout mới và chưa có file này, chạy `cp .env.example .env`. Giữ `USE_MOCK_AGENT=true` để backend gọi MockAgent. Frontend mặc định dùng API backend (`NEXT_PUBLIC_USE_MOCK_API=false`) tại localhost; luồng mock không cần `LLM_API_KEY`.

### 2. Chạy database

Mặc định `.env.example` dùng PostgreSQL. Nếu máy đã cài Docker Engine và Docker Compose:

```bash
docker compose up -d db
```

Nếu chưa có Docker, có thể dùng SQLite cho dev: sửa dòng `DATABASE_URL` trong `.env` thành `DATABASE_URL=sqlite:///./dev.db`, rồi bỏ qua bước Docker. SQLite sẽ được backend khởi tạo tự động.

### 3. Chạy backend và tạo tài khoản demo

Mở terminal mới, chạy từ repo root:

```bash
source ai_core/.venv/bin/activate
cd backend
python scripts/seed.py
uvicorn app.main:app --reload --port 8000
```

Script seed tạo schema và tài khoản demo nếu chưa có. Mở Swagger tại <http://localhost:8000/docs>.

### 4. Chạy frontend

Mở terminal thứ hai:

```bash
cd frontend
npm ci                    # chỉ cần lần đầu hoặc khi package-lock.json thay đổi
npm run dev
```

Mở <http://localhost:3000>. Frontend mặc định gọi API ở `http://localhost:8000/api/v1`; không cần tạo `.env` riêng cho frontend khi chạy local theo cấu hình mặc định.

### 5. Tài khoản demo

Mật khẩu chung: `123456`.

| Vai trò | Email |
|---|---|
| Bác sĩ | `doctor@demo.vn` |
| Bệnh nhân | `lan@demo.vn` |
| Bệnh nhân | `hung@demo.vn` |

### Chạy riêng AI Core mock (tùy chọn)

Để xem JSON demo của AI Core mà không qua giao diện/API, chạy từ repo root trong terminal đã kích hoạt venv:

```bash
source ai_core/.venv/bin/activate
cd ai_core
python -m ai_core.cli demo
```

Có thể thay case bằng `python -m ai_core.cli demo --case lung` hoặc `python -m ai_core.cli demo --case red-flag`. Đây là lệnh demo độc lập; khi chạy full-stack, backend gọi MockAgent trực tiếp.

`requirements.txt` cài dependencies cho Backend, AI Core, local embedding và OpenRouter/OpenAI provider. Để dùng agent thật với API key đã thêm: đặt `USE_MOCK_AGENT=false` trong `.env`, chạy `cd ai_core && python scripts/ingest.py` nếu muốn dùng guideline mẫu, rồi khởi động lại backend. Để demo bằng hồ sơ giả trên OpenRouter mà không cần credit, đặt `LLM_MODEL=nvidia/nemotron-3-super-120b-a12b:free`; không dùng endpoint này cho dữ liệu bệnh nhân thật. Kiểm tra `http://localhost:8000/api/v1/health` báo `agent: "real"`. Khi chưa có nguồn RAG phù hợp, agent vẫn chạy hết các node và chuyển phiên sang bác sĩ với thông báo thiếu căn cứ; không tự sinh kế hoạch hay lịch nhắc. Sau khi bác sĩ duyệt, bệnh nhân có thể xem kết quả và hỏi trợ lý về kế hoạch đã duyệt. Xem [hướng dẫn tích hợp](docs/guides/GUIDE_INTEGRATION.md) để thử từng use case.

Bệnh nhân có thể mở **Chat AI** trên thanh điều hướng để hỏi kiến thức tầm soát chung mà không cần phiên đã duyệt. Chat dùng guideline đã biên tập theo chủ đề; hiện mới có tài liệu mẫu ngắn về ung thư vú. Nếu thiếu nguồn hoặc câu hỏi cần đánh giá lâm sàng, trợ lý sẽ báo thiếu căn cứ và hướng dẫn hỏi bác sĩ. Hội thoại chỉ giữ trên trang đang mở.

## Nguyên tắc làm việc (bắt buộc)

1. **Chỉ sửa trong thư mục khối của mình.** Muốn đổi contract (`docs/protocols/*`, `ai_core/ai_core/schemas.py`,
   `frontend/src/types/api.ts`) → mở PR riêng, tag cả team. Xem `docs/protocols/OWNERSHIP.md`.
2. **Mock trước, thật sau.** Mỗi khối có mock của khối kế bên để không phải chờ nhau.
3. **Nhánh `feature/<tên>-<việc>`, commit nhỏ, PR trước khi merge.** Xem `docs/protocols/GIT_WORKFLOW.md`.
