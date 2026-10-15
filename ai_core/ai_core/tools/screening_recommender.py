"""Tạo bản nháp từ nguồn đã truy xuất và kiểm tra doc_id trước khi gắn trích dẫn."""

from __future__ import annotations

import json
from datetime import UTC, datetime

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from ai_core.config import settings
from ai_core.llm import get_chat_model
from ai_core.prompts import RECOMMEND_PROMPT, SYSTEM_PROMPT
from ai_core.schemas import CancerType, PatientProfile, PlanItem, RiskAssessment, ScreeningPlan, Source


class SuggestedItem(BaseModel):
    cancer_type: CancerType
    method: str
    start_age: int | None = None
    interval_months: int | None = Field(default=None, gt=0)
    rationale: str
    source_ids: list[str] = Field(default_factory=list)
    priority: int = Field(default=3, ge=1, le=5)


class SuggestedPlan(BaseModel):
    items: list[SuggestedItem] = Field(default_factory=list)
    general_advice: str = ""


def recommend(profile: PatientProfile, risk: RiskAssessment, sources: list[Source]) -> ScreeningPlan | None:
    if not sources:
        return None
    source_map = {source.doc_id: source for source in sources}
    prompt = RECOMMEND_PROMPT.format(
        profile=json.dumps(profile.model_dump(mode="json"), ensure_ascii=False),
        risk_assessment=json.dumps(risk.model_dump(mode="json"), ensure_ascii=False),
        sources=json.dumps([source.model_dump(mode="json") for source in sources], ensure_ascii=False),
    )
    model = get_chat_model().with_structured_output(SuggestedPlan)
    suggested = SuggestedPlan.model_validate(
        model.invoke([SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=prompt)])
    )
    items: list[PlanItem] = []
    for item in suggested.items:
        citations = [source_map[doc_id] for doc_id in dict.fromkeys(item.source_ids) if doc_id in source_map]
        # Không nhận khuyến nghị thiếu chu kỳ hoặc nguồn; không tự điền lịch khám khi thiếu lần khám gần nhất.
        if not item.interval_months or not citations or not item.method.strip():
            continue
        if not any(source.doc_id.startswith(f"{item.cancer_type.value}_") for source in citations):
            continue
        items.append(
            PlanItem(
                cancer_type=item.cancer_type,
                method=item.method.strip(),
                start_age=item.start_age,
                interval_months=item.interval_months,
                next_due=None,
                rationale=item.rationale.strip(),
                sources=citations,
                priority=item.priority,
            )
        )
    if not items:
        return None
    return ScreeningPlan(
        items=items,
        general_advice=suggested.general_advice,
        generated_at=datetime.now(UTC),
        model=settings.llm_model,
    )
