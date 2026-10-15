"""Embedding function cho Chroma theo EMBEDDING_PROVIDER."""

from __future__ import annotations

from functools import lru_cache

from ai_core.config import settings


@lru_cache(maxsize=1)
def get_embedding_function():
    """Trả chromadb EmbeddingFunction."""
    if settings.embedding_provider == "local":
        try:
            from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
        except ImportError as exc:
            raise RuntimeError('Thiếu embedding local: pip install -e "./ai_core[local-embed]"') from exc

        return SentenceTransformerEmbeddingFunction(model_name=settings.embedding_model)
    if settings.embedding_provider == "openai":
        from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction

        api_key = settings.embedding_api_key or (settings.llm_api_key if settings.llm_provider == "openai" else None)
        if not api_key:
            raise ValueError("EMBEDDING_API_KEY cần được cấu hình cho OpenAI embedding")
        return OpenAIEmbeddingFunction(api_key=api_key, model_name=settings.embedding_model)
    raise ValueError(f"Unknown EMBEDDING_PROVIDER={settings.embedding_provider!r}")
