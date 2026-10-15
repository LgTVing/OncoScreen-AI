"""Retriever: lọc metadata trước (gender, tuổi) rồi similarity search → list[Source]."""

from __future__ import annotations

import chromadb

from ai_core.config import settings
from ai_core.rag.embeddings import get_embedding_function
from ai_core.rag.ingest import COLLECTION
from ai_core.schemas import PatientProfile, RiskAssessment, Source


def retrieve_sources(profile: PatientProfile, risk: RiskAssessment | None, k: int = 6) -> list[Source]:
    client = chromadb.PersistentClient(path=str(settings.vector_store_dir))
    if COLLECTION not in {collection.name for collection in client.list_collections()}:
        return []
    col = client.get_collection(COLLECTION)
    count = col.count()
    if count == 0:
        return []
    col = client.get_collection(COLLECTION, embedding_function=get_embedding_function())
    query = _build_query(profile, risk)
    where = {"$or": [{"gender": profile.gender.value}, {"gender": "any"}]}
    res = col.query(query_texts=[query], n_results=min(count, k * 4), where=where)
    sources: list[Source] = []
    seen: set[tuple[str, str]] = set()
    levels = {factor.cancer_type.value: factor.level.value for factor in (risk.factors if risk else [])}
    for doc, meta in zip(res["documents"][0], res["metadatas"][0], strict=True):
        cancer_type = str(meta.get("cancer_type", ""))
        level = str(meta.get("risk_level", "any"))
        target_level = levels.get(cancer_type, "average")
        if int(meta.get("min_age", 0)) > profile.age or int(meta.get("max_age", 120)) < profile.age:
            continue
        if level not in {"any", target_level}:
            continue
        key = (str(meta.get("doc_id")), str(meta.get("section")))
        if key in seen:
            continue
        seen.add(key)
        sources.append(
            Source(
                doc_id=str(meta.get("doc_id")),
                title=str(meta.get("source", meta.get("doc_id"))),
                section=meta.get("section"),
                excerpt=doc[:1000],
                url=meta.get("url"),
            )
        )
        if len(sources) >= k:
            break
    return sources


def _build_query(profile: PatientProfile, risk: RiskAssessment | None) -> str:
    parts = [f"tầm soát ung thư cho {profile.gender.value} {profile.age} tuổi"]
    if risk:
        parts += [f"{f.cancer_type.value} nguy cơ {f.level.value}" for f in risk.factors]
    if profile.genetics_history:
        parts.append("tiền sử gia đình: " + ", ".join(profile.genetics_history))
    return "; ".join(parts)
