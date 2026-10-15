from pathlib import Path

import pytest

from ai_core.rag.ingest import _metadata, chunk_markdown


def test_long_section_splits_with_source_metadata():
    body = "## Khuyến nghị\n" + " ".join(f"term-{index}" for index in range(900))
    chunks = chunk_markdown("breast_source_2024", {"source": "Nguồn chính thức"}, body)
    assert len(chunks) == 3
    assert [chunk_id for chunk_id, _, _ in chunks] == [
        "breast_source_2024::0", "breast_source_2024::1", "breast_source_2024::2"
    ]
    assert all(metadata["doc_id"] == "breast_source_2024" for _, _, metadata in chunks)
    assert all(metadata["section"] == "Khuyến nghị" for _, _, metadata in chunks)


def test_ingest_requires_provenance_metadata():
    with pytest.raises(ValueError, match="thiếu metadata"):
        _metadata(Path("missing.md"), {"cancer_type": "breast"})
