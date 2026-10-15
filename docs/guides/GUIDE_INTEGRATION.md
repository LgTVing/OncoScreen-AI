# Guide: Tích hợp FE, BE và AI Core

AI Core là package Python được backend gọi trực tiếp, không có server/port riêng. Frontend gọi REST API của backend. `USE_MOCK_AGENT=true` dùng dữ liệu demo; `false` chạy LangGraph thật. Khi RAG chưa có guideline phù hợp, agent thật vẫn trả phiên `pending_review` với `draft_plan=null` để bác sĩ xử lý.

## Khởi động (Linux/macOS, từ root repo)

```bash
# Terminal 1: kích hoạt venv hiện có hoặc tạo mới
if [ -x ai_core/.venv/bin/python ]; then source ai_core/.venv/bin/activate; else python3 -m venv .venv && source .venv/bin/activate; fi
python -m pip install -r requirements.txt
[ -f .env ] || cp .env.example .env

# Chọn database: với PostgreSQL cần Docker
docker compose up -d db
# Nếu không có Docker: đặt DATABASE_URL=sqlite:///./dev.db trong .env; bỏ qua lệnh docker.

cd backend
python scripts/seed.py
uvicorn app.main:app --reload --port 8000
```

```bash
# Terminal 2
cd frontend
npm ci
npm run dev
```

Mở `http://localhost:3000`, API docs `http://localhost:8000/docs`. Frontend dùng backend thật khi `NEXT_PUBLIC_USE_MOCK_API=false` (mặc định). Nếu mở terminal mới cho Python, kích hoạt lại cùng venv. Không cần khởi động AI Core riêng.

## Bật agent thật và ingest mẫu

1. Đặt `USE_MOCK_AGENT=false` trong `.env` ở root. Với key OpenRouter: `LLM_PROVIDER=openrouter`, `LLM_API_KEY` là key OpenRouter. Để demo bằng hồ sơ giả mà không cần credit, đặt `LLM_MODEL=nvidia/nemotron-3-super-120b-a12b:free`. Khi dùng dữ liệu bệnh nhân thật, cần chọn model và chính sách xử lý dữ liệu phù hợp; không dùng endpoint miễn phí này. Các provider khác cần model và key đúng nhà cung cấp. Không commit `.env`.

   [OpenRouter hướng dẫn endpoint tương thích OpenAI](https://openrouter.ai/docs/community/frameworks) và [thông tin model miễn phí](https://openrouter.ai/nvidia/nemotron-3-super-120b-a12b%3Afree) là căn cứ cho cấu hình demo. Key OpenRouter thông thường bắt đầu bằng `sk-or-`; nếu nhận lỗi xác thực, kiểm tra lại key trong tài khoản OpenRouter, không gửi key qua chat hoặc commit.
2. Chạy ingest khi muốn có RAG từ file `ai_core/data/guidelines/*.md`:

   ```bash
   # từ root repo, sau khi kích hoạt venv và cài requirements.txt
   cd ai_core
   python scripts/ingest.py
   ```

3. Khởi động lại backend và xem `GET /api/v1/health` trả `agent:"real"`.

`requirements.txt` bao gồm local embedding. Lần đầu tải model có thể cần mạng. Nếu chưa ingest hoặc không có nguồn hợp với tuổi/giới/nguy cơ, RAG trả rỗng; phiên vẫn sang hàng chờ bác sĩ, không tự tạo kế hoạch. Nếu LLM provider lỗi, agent cũng trả trạng thái thiếu căn cứ. Xem log backend theo `trace_id` và `GET /doctor/metrics` để quan sát.

## Tài khoản demo và luồng kiểm tra

`python backend/scripts/seed.py` tạo tài khoản sau (mật khẩu chung `123456`):

| Vai trò | Email |
|---|---|
| Bác sĩ | `doctor@demo.vn` |
| Bệnh nhân | `lan@demo.vn` |
| Bệnh nhân | `hung@demo.vn` |

1. Đăng nhập bệnh nhân, cập nhật hồ sơ, tạo phiên và trả lời khảo sát. Có thể gửi câu trả lời từng phần; phiên giữ `collecting` đến khi đủ câu.
2. Thử một câu trả lời red-flag: phiên chuyển `red_flag`, hiển thị cảnh báo, không có kế hoạch.
3. Với ca thường, phiên sang `pending_review`. Đăng nhập bác sĩ, vào hàng chờ, mở phiên để xem risk, nguồn/kế hoạch hoặc cảnh báo thiếu căn cứ, cùng trace các node.
4. Bác sĩ chỉnh kế hoạch rồi duyệt hoặc từ chối. Khi không có kế hoạch, ghi chú là bắt buộc để xác nhận thiếu căn cứ. Kế hoạch có ngày `next_due` mới tạo reminder; bệnh nhân đánh dấu hoàn thành thì hệ thống tạo lịch chu kỳ kế tiếp.
5. Đăng nhập lại bệnh nhân để xem kết quả đã duyệt, lịch nhắc nếu có, trang tài liệu tầm soát và đặt câu hỏi. Hỏi đáp chỉ dùng kế hoạch đã duyệt; phiên không có kế hoạch nhận câu trả lời thiếu thông tin.
6. Để thử chat kiến thức chung mà không cần chờ bác sĩ duyệt, vào **Chat AI** trong thanh điều hướng, chọn **Ung thư vú** và hỏi “Khuyến nghị tầm soát chung cho nhóm nguy cơ trung bình là gì?”. Hiện guideline mẫu chỉ có chủ đề này; các chủ đề chưa có tài liệu sẽ trả lời thiếu thông tin. Chat gửi các lượt trước làm ngữ cảnh nhưng không lưu cuộc hội thoại khi tải lại trang. Chỉ dùng dữ liệu giả với model miễn phí.

Tài khoản bác sĩ chỉ được tạo qua seed/quản trị viên; API đăng ký công khai chỉ tạo bệnh nhân. `GET /doctor/metrics` đếm phiên theo trạng thái, phiên chờ thiếu kế hoạch và số câu hỏi; audit log lưu dấu vết node, thời lượng, số nguồn, quyết định duyệt và metadata hỏi đáp, không lưu nội dung hỏi đáp.

## Sự cố thường gặp

| Triệu chứng | Cách kiểm tra |
|---|---|
| `docker: command not found` | Dùng SQLite dev bằng `DATABASE_URL=sqlite:///./dev.db`, hoặc cài Docker/Compose. |
| Không có `python`/`uvicorn` | Kích hoạt đúng venv và chạy `python -m pip install -r requirements.txt`. |
| `/api/v1/health` vẫn báo `mock` | Kiểm tra `USE_MOCK_AGENT=false` trong root `.env`, khởi động lại backend. |
| Agent trả thiếu căn cứ, log `http_status=402` | Key OpenRouter đã được nhận nhưng model có phí cần credit/quota; kiểm tra tài khoản OpenRouter hoặc chuyển sang model miễn phí ở trên để demo bằng hồ sơ giả. |
| Phiên có `draft_plan=null` | Xem trace node `retrieve`; kiểm tra guideline đã ingest, metadata và embedding. Đây là nhánh xử lý thiếu căn cứ. |
| FE lỗi CORS | Kiểm tra `CORS_ORIGINS` trong `.env` chứa `http://localhost:3000`. |
