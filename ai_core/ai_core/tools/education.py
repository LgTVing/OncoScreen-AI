"""Nội dung giáo dục chỉ lấy từ bản Markdown guideline đã biên tập."""

from __future__ import annotations

import json
from functools import lru_cache

from ai_core.config import DATA_DIR
from ai_core.rag.corpus import load_docs
from ai_core.schemas import CancerType, EducationContent, Source
from ai_core.tools.eligibility import LABEL_VI


@lru_cache(maxsize=1)
def _warning_signs() -> list[str]:
    raw = json.loads((DATA_DIR / "red_flags.json").read_text(encoding="utf-8"))
    return [f"{r['symptom']}: {r['advice']}" for r in raw]


def get_education_content(cancer_type: CancerType) -> EducationContent:
    sources: list[Source] = []
    sections: list[str] = []
    for doc in load_docs().values():
        if doc.meta.get("cancer_type") != cancer_type.value:
            continue
        first = next(iter(doc.sections))
        sources.append(
            Source(
                doc_id=doc.doc_id,
                title=doc.title,
                section=first,
                excerpt=doc.sections[first][:500],
                url=doc.meta.get("url"),
            )
        )
        sections.append(
            f"### {doc.title}\n" + "\n\n".join(f"**{name}.** {text}" for name, text in doc.sections.items())
        )
    body = (
        "\n\n".join(sections) if sections else "Chưa có tài liệu phù hợp để cung cấp nội dung giáo dục cho chủ đề này."
    )
    return EducationContent(
        cancer_type=cancer_type,
        title=f"Tầm soát {LABEL_VI[cancer_type]}",
        warning_signs=_warning_signs(),
        prevention_tips=[],
        body_md=body,
        sources=sources,
    )
