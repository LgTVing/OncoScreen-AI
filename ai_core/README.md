# ai_core — Module 1: AI Core & Data

Owner: **Tuyền**. Hướng dẫn chi tiết: [docs/guides/GUIDE_AI_CORE.md](../docs/guides/GUIDE_AI_CORE.md).
Contract: [docs/protocols/AI_CORE_CONTRACT.md](../docs/protocols/AI_CORE_CONTRACT.md) ⇄ `ai_core/schemas.py`.
Bản đồ từng file, node, use case và extension IDE: [FILE_MAP.md](FILE_MAP.md).

```bash
pip install -e ".[dev]"
pytest -q
python -m ai_core.cli demo          # MockAgent
python -m ai_core.cli demo --case lung
python -m ai_core.cli demo --case red-flag
python scripts/ingest.py            # nạp data/guidelines → Chroma
python -m ai_core.cli demo --real   # agent thật (cần LLM key + đã ingest)
```

Backend chỉ import: `ai_core.api`, `ai_core.schemas`.

`MockAgent` chạy độc lập, không cần API key hoặc vector store. Ba ca demo bao gồm
nữ 45 tuổi có tiền sử gia đình ung thư vú, nam 55 tuổi hút thuốc 30 gói-năm,
và ca có red-flag. Kết quả mock chỉ là dữ liệu minh họa để phát triển và tích hợp,
không phải khuyến nghị y tế dùng cho bệnh nhân.

Chỉ cài extra `local-embed` khi chạy RAG thật với embedding local.
