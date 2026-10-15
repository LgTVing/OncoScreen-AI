"""Ingest guideline đã biên tập: Markdown → chunk có nguồn gốc → Chroma."""

from __future__ import annotations

from pathlib import Path

import chromadb
import frontmatter

from ai_core.config import DATA_DIR, settings
from ai_core.rag.embeddings import get_embedding_function

COLLECTION = "guidelines"
MAX_CHUNK_WORDS = 400
CHUNK_OVERLAP_WORDS = 40
REQUIRED_META = {"cancer_type", "source", "url", "gender", "risk_level", "language"}


def get_collection(reset: bool = False):
    client = chromadb.PersistentClient(path=str(settings.vector_store_dir))
    if reset:
        try:
            client.delete_collection(COLLECTION)
        except Exception:  # noqa: BLE001
            pass
    return client.get_or_create_collection(COLLECTION, embedding_function=get_embedding_function())


def chunk_markdown(doc_id: str, meta: dict, body: str) -> list[tuple[str, str, dict]]:
    """Trả list (chunk_id, text, metadata), chia mục dài với overlap để giữ ngữ cảnh."""
    chunks: list[tuple[str, str, dict]] = []
    section = "intro"
    buf: list[str] = []

    def flush() -> None:
        content = "\n".join(buf).strip()
        if not content:
            return
        words = content.split()
        if len(words) <= MAX_CHUNK_WORDS:
            chunks.append((f"{doc_id}::{len(chunks)}", content, {**meta, "doc_id": doc_id, "section": section}))
            return
        step = MAX_CHUNK_WORDS - CHUNK_OVERLAP_WORDS
        for start in range(0, len(words), step):
            part = " ".join(words[start : start + MAX_CHUNK_WORDS])
            if start:
                part = f"## {section}\n{part}"
            chunks.append((f"{doc_id}::{len(chunks)}", part, {**meta, "doc_id": doc_id, "section": section}))
            if start + MAX_CHUNK_WORDS >= len(words):
                break

    for line in body.splitlines():
        if line.startswith("## "):
            flush()
            buf = []
            section = line[3:].strip()
        buf.append(line)
    flush()
    return chunks


def _metadata(path: Path, raw: dict) -> dict:
    missing = [key for key in REQUIRED_META if not raw.get(key)]
    if missing:
        raise ValueError(f"{path}: thiếu metadata {', '.join(sorted(missing))}")
    if raw["gender"] not in {"female", "male", "any"}:
        raise ValueError(f"{path}: gender không hợp lệ")
    if raw["risk_level"] not in {"average", "elevated", "high", "any"}:
        raise ValueError(f"{path}: risk_level không hợp lệ")
    if "min_age" in raw and "max_age" in raw and int(raw["min_age"]) > int(raw["max_age"]):
        raise ValueError(f"{path}: min_age lớn hơn max_age")
    return {k: (v if isinstance(v, (str, int, float, bool)) else str(v)) for k, v in raw.items() if v is not None}


def ingest(guidelines_dir: Path | None = None, reset: bool = False) -> int:
    guidelines_dir = guidelines_dir or DATA_DIR / "guidelines"
    col = get_collection(reset=reset)
    total = 0
    for path in sorted(guidelines_dir.glob("*.md")):
        if path.name.lower() == "readme.md":
            continue
        post = frontmatter.load(path, encoding="utf-8")
        meta = _metadata(path, post.metadata)
        chunks = chunk_markdown(path.stem, meta, post.content)
        if chunks:
            col.upsert(ids=[c[0] for c in chunks], documents=[c[1] for c in chunks], metadatas=[c[2] for c in chunks])
            total += len(chunks)
    return total
