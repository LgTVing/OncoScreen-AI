"""MockAgent — cùng pipeline với agent thật nhưng KHÔNG gọi LLM và không cần vector store.

Luật tầm soát, red-flag, RAG từ khoá (BM25), guardrail và tracing đều là thật; chỉ phần sinh văn bản dùng mẫu xác định.
Nhờ vậy FE/BE phát triển và test mà không cần API key, và hành vi an toàn của mock trùng với agent thật.
"""

from __future__ import annotations

from ai_core.api import Agent


class MockAgent(Agent):
    name = "mock"

    def __init__(self) -> None:
        super().__init__(use_llm=False, dense=False)
