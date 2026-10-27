"""Kho guideline đã biên tập: đọc Markdown + frontmatter, chia chunk theo cấu trúc, tra nguồn theo doc_id.

Dùng chung cho ingest (Chroma), tìm kiếm từ khoá (BM25), bộ luật tầm soát và nội dung giáo dục để mọi nơi
trích dẫn cùng một doc_id/section.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import frontmatter

from ai_core.config import DATA_DIR
from ai_core.schemas import Source

MAX_CHUNK_WORDS = 400
CHUNK_OVERLAP_WORDS = 40
REQUIRED_META = {"cancer_type", "source", "url", "gender", "risk_level", "language"}


@dataclass(frozen=True)
class GuidelineDoc:
    doc_id: str
    meta: dict
    sections: dict[str, str] = field(default_factory=dict)

    @property
    def title(self) -> str:
        return str(self.meta.get("source", self.doc_id))


@dataclass(frozen=True)
class Chunk:
    id: str
    doc_id: str
    section: str
    text: str  # có header ngữ cảnh "<nguồn> — <mục>" để embedding/BM25 hiểu chunk thuộc tài liệu nào
    content: str  # nội dung gốc để trích dẫn
    meta: dict


def chunk_markdown(doc_id: str, meta: dict, body: str) -> list[tuple[str, str, dict]]:
    """Trả list (chunk_id, text, metadata): chia theo heading `## `, mục dài chia tiếp có overlap."""
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


def validate_metadata(path: Path, raw: dict) -> dict:
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


def _sections(body: str) -> dict[str, str]:
    out: dict[str, str] = {}
    current = "intro"
    for line in body.splitlines():
        if line.startswith("## "):
            current = line[3:].strip()
            out[current] = ""
            continue
        out[current] = (out.get(current, "") + "\n" + line).strip()
    return {name: text for name, text in out.items() if text}


@lru_cache(maxsize=4)
def load_docs(guidelines_dir: Path | None = None) -> dict[str, GuidelineDoc]:
    guidelines_dir = guidelines_dir or DATA_DIR / "guidelines"
    docs: dict[str, GuidelineDoc] = {}
    for path in sorted(guidelines_dir.glob("*.md")):
        if path.name.lower() == "readme.md":
            continue
        post = frontmatter.load(path, encoding="utf-8")
        meta = validate_metadata(path, post.metadata)
        docs[path.stem] = GuidelineDoc(doc_id=path.stem, meta=meta, sections=_sections(post.content))
    return docs


@lru_cache(maxsize=4)
def load_chunks(guidelines_dir: Path | None = None) -> tuple[Chunk, ...]:
    out: list[Chunk] = []
    for doc in load_docs(guidelines_dir).values():
        body = "\n\n".join(f"## {name}\n{text}" for name, text in doc.sections.items())
        for chunk_id, content, meta in chunk_markdown(doc.doc_id, doc.meta, body):
            header = f"{doc.title} — {meta['section']}"
            out.append(
                Chunk(
                    id=chunk_id,
                    doc_id=doc.doc_id,
                    section=meta["section"],
                    text=f"{header}\n{content}",
                    content=content,
                    meta=meta,
                )
            )
    return tuple(out)


def source_for(doc_id: str, section: str | None = None, max_chars: int = 800) -> Source:
    """Nguồn trích dẫn cho một mục guideline; KeyError nếu doc/section không tồn tại (bộ luật cấu hình sai)."""
    doc = load_docs()[doc_id]
    if section is None:
        section = next(iter(doc.sections))
    text = doc.sections[section]
    return Source(doc_id=doc_id, title=doc.title, section=section, excerpt=text[:max_chars], url=doc.meta.get("url"))
