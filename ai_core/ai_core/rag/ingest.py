"""Ingest guideline đã biên tập: Markdown → chunk có header ngữ cảnh → Chroma (vector)."""

from __future__ import annotations

from pathlib import Path

import chromadb

from ai_core.config import settings
from ai_core.rag.corpus import chunk_markdown, load_chunks, load_docs, validate_metadata
from ai_core.rag.embeddings import get_embedding_function

__all__ = ["COLLECTION", "chunk_markdown", "get_collection", "ingest", "validate_metadata"]

COLLECTION = "guidelines"


def get_collection(reset: bool = False):
    client = chromadb.PersistentClient(path=str(settings.vector_store_dir))
    if reset:
        try:
            client.delete_collection(COLLECTION)
        except Exception:  # noqa: BLE001
            pass
    return client.get_or_create_collection(COLLECTION, embedding_function=get_embedding_function())


def ingest(guidelines_dir: Path | None = None, reset: bool = False) -> int:
    load_docs.cache_clear()
    load_chunks.cache_clear()
    chunks = load_chunks(guidelines_dir)
    if not chunks:
        return 0
    col = get_collection(reset=reset)
    col.upsert(ids=[c.id for c in chunks], documents=[c.text for c in chunks], metadatas=[c.meta for c in chunks])
    return len(chunks)
