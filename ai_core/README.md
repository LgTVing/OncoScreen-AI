# ai_core — Module 1: AI Core & Data

Owner: **Tuyền**. Hướng dẫn chi tiết: [docs/guides/GUIDE_AI_CORE.md](../docs/guides/GUIDE_AI_CORE.md).
Contract: [docs/protocols/AI_CORE_CONTRACT.md](../docs/protocols/AI_CORE_CONTRACT.md) ⇄ `ai_core/schemas.py`.
Bản đồ từng file, node, use case và extension IDE: [FILE_MAP.md](FILE_MAP.md).

```bash
pip install -e ".[dev,local-embed,openai]"  # từ thư mục ai_core, cho OpenRouter và RAG embedding local
pytest -q
python -m ai_core.cli demo          # MockAgent
python -m ai_core.cli demo --case lung
python -m ai_core.cli demo --case red-flag
python scripts/ingest.py            # nạp data/guidelines → Chroma
python -m ai_core.cli demo --real   # agent thật (cần LLM key; không có nguồn thì chờ bác sĩ)
```

Backend chỉ import: `ai_core.api`, `ai_core.schemas`.

`MockAgent` chạy độc lập, không cần API key hoặc vector store. Ba ca demo bao gồm
nữ 45 tuổi có tiền sử gia đình ung thư vú, nam 55 tuổi hút thuốc 30 gói-năm,
và ca có red-flag. Kết quả mock chỉ là dữ liệu minh họa để phát triển và tích hợp,
không phải khuyến nghị y tế dùng cho bệnh nhân.

Để backend dùng agent thật, đặt `USE_MOCK_AGENT=false` trong root `.env` rồi khởi động lại backend. Agent chạy `collect → red_flag → assess_risk → retrieve → recommend → guardrail`; khi RAG rỗng, kết quả vẫn là `pending_review` với `draft_plan=null` và ghi rõ thiếu căn cứ. Bác sĩ duyệt hoặc từ chối qua giao diện; bệnh nhân chỉ hỏi đáp về phiên đã được duyệt. Trace từng node được lưu trong audit log và hiển thị cho bác sĩ, không lưu dữ liệu bệnh nhân trong trace.

`requirements.txt` ở root đã bao gồm extra `local-embed` và `openai`. Chỉ có một guideline mẫu ngắn trong `data/guidelines/`, nên phần lớn hồ sơ thật sẽ thiếu nguồn và không có kế hoạch tự động. Xem [hướng dẫn tích hợp](../docs/guides/GUIDE_INTEGRATION.md) để chạy FE/BE/AI.
