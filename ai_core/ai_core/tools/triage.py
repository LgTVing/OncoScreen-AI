"""Tool: triage — quyết định bước tiếp theo sau mỗi lượt Navigator và gợi ý dịch vụ để đặt lịch."""

from __future__ import annotations

import json
from functools import lru_cache

from ai_core.config import DATA_DIR
from ai_core.schemas import (
    BookingHint,
    BookingPriority,
    CancerType,
    IntakeProfile,
    NextAction,
    RedFlagResult,
    RiskFactor,
    RiskLevel,
    ScreeningSuggestion,
)
from ai_core.tools.eligibility import LABEL_VI


@lru_cache(maxsize=1)
def load_services() -> list[dict]:
    return json.loads((DATA_DIR / "services.json").read_text(encoding="utf-8"))["services"]


def service_for(cancer_type: CancerType) -> str:
    for service in load_services():
        if cancer_type.value in service["cancer_types"]:
            return service["code"]
    return "general_screening"


def triage(
    intake: IntakeProfile,
    red_flag: RedFlagResult,
    suggestions: list[ScreeningSuggestion],
    risk_factors: list[RiskFactor],
) -> tuple[NextAction, BookingHint | None]:
    if red_flag.detected:
        symptoms = ", ".join(f.symptom.lower() for f in red_flag.flags)
        return NextAction.urgent_care, BookingHint(
            priority=BookingPriority.urgent,
            service_codes=["oncology_priority"],
            reason=f"Có dấu hiệu cần khám sớm: {symptoms}.",
        )
    if intake.personal_cancer_history:
        return NextAction.suggest_booking, BookingHint(
            priority=BookingPriority.routine,
            service_codes=["oncology_followup"],
            reason="Người đã từng được chẩn đoán ung thư cần kế hoạch theo dõi của bác sĩ chuyên khoa.",
        )
    flagged = [f.cancer_type for f in risk_factors if f.level != RiskLevel.average]
    cancer_types = list(dict.fromkeys([*(s.cancer_type for s in suggestions), *flagged]))
    if not cancer_types:
        return NextAction.continue_chat, None
    # Câu trung tính: dùng cho cả người dùng (CTA) và làm lý do khám mặc định trong brief của bác sĩ.
    reasons = []
    if suggestions:
        labels = ", ".join(LABEL_VI[s.cancer_type] for s in suggestions)
        reasons.append(f"Thuộc nhóm có mốc tầm soát theo hướng dẫn: {labels}")
    if flagged:
        factors = "; ".join(r for f in risk_factors for r in f.reasons).lower()
        reasons.append(f"yếu tố nguy cơ cần bác sĩ đánh giá: {factors}")
    return NextAction.suggest_booking, BookingHint(
        priority=BookingPriority.routine,
        service_codes=list(dict.fromkeys(service_for(c) for c in cancer_types)),
        reason="; ".join(reasons) + ".",
    )
