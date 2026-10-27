"""Cấu hình AI Core — đọc từ .env ở root repo (hoặc env hệ thống)."""

from __future__ import annotations

from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PACKAGE_DIR = Path(__file__).resolve().parent
AI_CORE_DIR = PACKAGE_DIR.parent
REPO_ROOT = AI_CORE_DIR.parent
DATA_DIR = AI_CORE_DIR / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=REPO_ROOT / ".env", env_file_encoding="utf-8", extra="ignore")

    llm_provider: str = "openrouter"  # openrouter | openai | anthropic | ollama
    llm_model: str = "openai/gpt-5.4-mini"
    llm_api_key: str | None = None

    embedding_provider: str = "local"  # local | openai
    embedding_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    embedding_api_key: str | None = None
    vector_store_dir: Path = DATA_DIR / "vector_store"
    rag_top_k: int = 6

    use_mock_agent: bool = True

    @field_validator("vector_store_dir")
    @classmethod
    def resolve_vector_store_dir(cls, value: Path) -> Path:
        return value if value.is_absolute() else (REPO_ROOT / value).resolve()


settings = Settings()
