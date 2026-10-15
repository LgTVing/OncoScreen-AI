"""Nội dung giáo dục chỉ lấy từ bản Markdown guideline đã biên tập."""

from __future__ import annotations

import frontmatter

from ai_core.config import DATA_DIR
from ai_core.schemas import CancerType, EducationContent, Source


def get_education_content(cancer_type: CancerType) -> EducationContent:
    sources: list[Source] = []
    sections: list[str] = []
    for path in sorted((DATA_DIR / "guidelines").glob("*.md")):
        if path.name.lower() == "readme.md":
            continue
        post = frontmatter.load(path, encoding="utf-8")
        if post.metadata.get("cancer_type") != cancer_type.value:
            continue
        sources.append(
            Source(
                doc_id=path.stem,
                title=str(post.metadata.get("source", path.stem)),
                excerpt=post.content[:500],
                url=post.metadata.get("url"),
            )
        )
        sections.append(post.content.strip()[:3000])
    body = (
        "\n\n".join(sections)
        if sections
        else "Chưa có tài liệu phù hợp để cung cấp nội dung giáo dục cho chủ đề này."
    )
    return EducationContent(
        cancer_type=cancer_type,
        title=f"Thông tin tầm soát ung thư {cancer_type.value}",
        body_md=body,
        sources=sources,
    )
