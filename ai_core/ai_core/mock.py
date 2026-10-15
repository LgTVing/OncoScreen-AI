"""MockAgent — trả dữ liệu giả HỢP LỆ theo contract để backend/frontend dev không cần LLM.

Red-flag ở mock là THẬT (rule-based, dùng chung detector) để FE test được màn cảnh báo.
TODO(Tuyền): bổ sung case khi contract đổi.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta

from ai_core.guardrails.disclaimer import DISCLAIMER_VI
from ai_core.guardrails.safety import validate_plan
from ai_core.schemas import (
    Answer,
    CancerType,
    ChatTurn,
    EducationContent,
    PatientContext,
    PatientProfile,
    PlanItem,
    QuestionAnswer,
    Questionnaire,
    RedFlagResult,
    RiskAssessment,
    RiskFactor,
    RiskLevel,
    ScreeningPlan,
    ScreeningResult,
    Source,
)
from ai_core.tools.education import get_education_content
from ai_core.tools.patient_qa import needs_clinical_review
from ai_core.tools.questionnaire import build_questionnaire, missing_required
from ai_core.tools.red_flag_detector import detect_red_flags

_SRC_BREAST = Source(
    doc_id="breast_uspstf_2024",
    title="USPSTF 2024 — Breast Cancer Screening",
    section="Recommendation",
    excerpt="Biennial screening mammography for women aged 40 to 74 years.",
    url="https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/screening-for-breast-cancer",
)
_SRC_LUNG = Source(
    doc_id="lung_uspstf_2021",
    title="USPSTF 2021 — Lung Cancer Screening",
    section="Recommendation",
    excerpt=(
        "Annual LDCT for adults aged 50–80 with at least 20 pack-years "
        "who currently smoke or quit within 15 years."
    ),
    url="https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/lung-cancer-screening",
)
_SRC_CRC = Source(
    doc_id="colorectal_uspstf_2021",
    title="USPSTF 2021 — Colorectal Cancer Screening",
    excerpt="Screening for colorectal cancer in adults aged 45 to 75 years.",
    url="https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/colorectal-cancer-screening",
)
_SRC_CERV = Source(
    doc_id="cervical_who_2021",
    title="WHO 2021 — Cervical Cancer Screening",
    excerpt="HPV DNA testing every 5 to 10 years starting at age 30 for the general population.",
    url="https://www.who.int/publications/i/item/9789240030824",
)
_SRC_GENERAL = Source(
    doc_id="mock_general_health",
    title="MockAgent — dữ liệu minh hoạ",
    excerpt="Nguồn giữ chỗ chỉ dùng cho ca demo tổng quát; không phải guideline y tế.",
)

_SOURCE_BY_TYPE = {
    CancerType.breast: _SRC_BREAST,
    CancerType.cervical: _SRC_CERV,
    CancerType.colorectal: _SRC_CRC,
    CancerType.lung: _SRC_LUNG,
}

_FAMILY_HISTORY_LABELS = {
    CancerType.breast: ("breast", "vú"),
    CancerType.cervical: ("cervical", "cổ tử cung"),
    CancerType.colorectal: ("colorectal", "đại trực tràng"),
    CancerType.liver: ("liver", "gan"),
    CancerType.lung: ("lung", "phổi"),
    CancerType.prostate: ("prostate", "tuyến tiền liệt"),
}


class MockAgent:
    """Deterministic agent dùng để FE/BE phát triển song song.

    Mock vẫn chạy detector red-flag thật và trả đúng schema như agent thật.
    ``today`` có thể truyền vào test để ngày ``next_due`` không phụ thuộc đồng hồ hệ thống.
    """

    name = "mock"

    def __init__(self, today: date | None = None) -> None:
        self._today = today

    def _current_date(self) -> date:
        return self._today or date.today()

    def get_questionnaire(self, profile: PatientProfile) -> Questionnaire:
        return build_questionnaire(profile)

    def check_red_flags(self, answers: list[Answer]) -> RedFlagResult:
        return detect_red_flags(answers)

    def missing_questions(self, profile: PatientProfile, answers: list[Answer]) -> list[str]:
        return missing_required(profile, answers)

    def run_screening(self, ctx: PatientContext) -> ScreeningResult:
        trace_id = f"mock-{uuid.uuid4().hex[:8]}"
        rf = self.check_red_flags(ctx.answers)
        if rf.detected:
            return ScreeningResult(status="red_flag", red_flag=rf, disclaimer=DISCLAIMER_VI, trace_id=trace_id)

        p = ctx.profile
        today = self._current_date()
        items: list[PlanItem] = []
        factors: list[RiskFactor] = []

        family_history = [*p.genetics_history, *_family_history_answers(ctx.answers)]
        family_cancers = _family_history_cancers(family_history)
        family_breast = CancerType.breast in family_cancers
        if p.gender.value == "female" and 40 <= p.age <= 74:
            level = RiskLevel.elevated if family_breast else RiskLevel.average
            factors.append(
                RiskFactor(
                    cancer_type=CancerType.breast,
                    level=level,
                    reasons=["Nữ ≥ 40 tuổi"] + (["Tiền sử gia đình ung thư vú"] if family_breast else []),
                )
            )
            items.append(
                PlanItem(
                    cancer_type=CancerType.breast,
                    method="Nhũ ảnh (mammography)",
                    start_age=40,
                    interval_months=24,
                    next_due=today + timedelta(days=30),
                    rationale=(
                        "Theo nguồn tham khảo của bản mock, nữ 40–74 tuổi có thể trao đổi với bác sĩ "
                        "về chụp nhũ ảnh định kỳ. Tiền sử gia đình được ghi nhận để bác sĩ xem xét."
                    ),
                    sources=[_SRC_BREAST],
                    priority=1,
                )
            )
        if p.gender.value == "female" and 30 <= p.age <= 65:
            factors.append(
                RiskFactor(
                    cancer_type=CancerType.cervical,
                    level=RiskLevel.average,
                    reasons=["Nữ 30–65 tuổi; cần bác sĩ xác nhận các yếu tố cá nhân trước khi áp dụng."],
                )
            )
            items.append(
                PlanItem(
                    cancer_type=CancerType.cervical,
                    method="Xét nghiệm HPV DNA",
                    start_age=30,
                    interval_months=60,
                    next_due=today + timedelta(days=60),
                    rationale="Xét nghiệm HPV mỗi 5–10 năm từ 30 tuổi.",
                    sources=[_SRC_CERV],
                    priority=2,
                )
            )
        smoking_answer = next((a.value for a in reversed(ctx.answers) if a.question_id == "smoking"), None)
        smoking = _as_bool(smoking_answer) if smoking_answer is not None else _as_bool(p.lifestyle.get("smoking"))
        pack_years = _as_float(p.lifestyle.get("pack_years"))
        for a in ctx.answers:
            if a.question_id == "pack_years":
                parsed = _as_float(a.value)
                if parsed is not None:
                    pack_years = parsed
        if smoking and 50 <= p.age <= 80 and pack_years is not None and pack_years >= 20:
            factors.append(
                RiskFactor(
                    cancer_type=CancerType.lung, level=RiskLevel.high, reasons=[f"Hút thuốc {pack_years:g} gói-năm"]
                )
            )
            items.append(
                PlanItem(
                    cancer_type=CancerType.lung,
                    method="CT liều thấp (LDCT) phổi",
                    start_age=50,
                    interval_months=12,
                    next_due=today + timedelta(days=14),
                    rationale=(
                        "Ca mock đánh dấu để bác sĩ xem xét LDCT ở người 50–80 tuổi có từ 20 gói-năm; "
                        "cần xác nhận thêm thời gian kể từ khi bỏ thuốc nếu có."
                    ),
                    sources=[_SRC_LUNG],
                    priority=1,
                )
            )
        if 45 <= p.age <= 75:
            family_crc = CancerType.colorectal in family_cancers
            factors.append(
                RiskFactor(
                    cancer_type=CancerType.colorectal,
                    level=RiskLevel.elevated if family_crc else RiskLevel.average,
                    reasons=["Tiền sử gia đình ung thư đại trực tràng" if family_crc else "Nằm trong nhóm tuổi 45–75."],
                )
            )
            items.append(
                PlanItem(
                    cancer_type=CancerType.colorectal,
                    method="Nội soi đại tràng",
                    start_age=45,
                    interval_months=120,
                    next_due=today + timedelta(days=90),
                    rationale="Nguồn tham khảo của bản mock nêu tầm soát ung thư đại trực tràng ở người 45–75 tuổi.",
                    sources=[_SRC_CRC],
                    priority=3,
                )
            )
        if not items:
            # luôn có ít nhất 1 item để FE có gì hiển thị (case trẻ, nguy cơ trung bình)
            items.append(
                PlanItem(
                    cancer_type=CancerType.other,
                    method="Khám sức khoẻ tổng quát định kỳ",
                    interval_months=12,
                    next_due=today + timedelta(days=180),
                    rationale="Chưa đến tuổi/nhóm nguy cơ cần tầm soát chuyên biệt theo guideline hiện có.",
                    sources=[_SRC_GENERAL],
                    priority=5,
                )
            )

        plan = ScreeningPlan(
            items=items,
            general_advice="Duy trì lối sống lành mạnh; trao đổi với bác sĩ về kế hoạch phù hợp với bạn.",
            generated_at=datetime.now(UTC),
            model="mock",
        )
        validate_plan(plan)
        risk = RiskAssessment(
            overall_summary="(MOCK) Đánh giá sơ bộ dựa trên tuổi, giới, tiền sử gia đình và lối sống.",
            factors=factors,
        )
        return ScreeningResult(
            status="pending_review",
            risk_assessment=risk,
            draft_plan=plan,
            disclaimer=DISCLAIMER_VI,
            trace_id=trace_id,
            trace_events=[
                {"node": name, "duration_ms": 0, "status": "ok"}
                for name in ("collect", "red_flag", "assess_risk", "retrieve", "recommend", "guardrail")
            ],
        )

    def get_education(self, cancer_type: CancerType) -> EducationContent:
        source = _SOURCE_BY_TYPE.get(cancer_type, _SRC_GENERAL)
        return EducationContent(
            cancer_type=cancer_type,
            title=f"(MOCK) Hiểu về tầm soát ung thư {cancer_type.value}",
            warning_signs=["Khối u bất thường", "Chảy máu bất thường", "Sụt cân không rõ nguyên nhân"],
            prevention_tips=["Không hút thuốc", "Vận động đều đặn", "Tầm soát đúng lịch"],
            body_md="Đây là nội dung minh hoạ của MockAgent, chưa phải tài liệu giáo dục lâm sàng.",
            sources=[source],
        )

    def answer_question(self, question: str, approved_plan: ScreeningPlan | None) -> QuestionAnswer:
        sources = [source for item in approved_plan.items for source in item.sources] if approved_plan else []
        if not sources:
            return QuestionAnswer(
                answer="Chưa đủ thông tin trong kế hoạch đã duyệt để trả lời. Vui lòng trao đổi với bác sĩ.",
                disclaimer=DISCLAIMER_VI,
                trace_id=f"qa-mock-{uuid.uuid4().hex[:8]}",
                insufficient_evidence=True,
            )
        return QuestionAnswer(
            answer="Đây là kế hoạch minh hoạ đã được bác sĩ duyệt. Hãy trao đổi với bác sĩ về câu hỏi cụ thể của bạn.",
            sources=sources[:3],
            disclaimer=DISCLAIMER_VI,
            trace_id=f"qa-mock-{uuid.uuid4().hex[:8]}",
        )

    def answer_education_question(
        self, question: str, cancer_type: CancerType, history: list[ChatTurn]
    ) -> QuestionAnswer:
        if needs_clinical_review(question):
            return QuestionAnswer(
                answer="Câu hỏi này cần bác sĩ đánh giá trực tiếp; trợ lý chỉ giải thích kiến thức tầm soát chung.",
                disclaimer=DISCLAIMER_VI,
                trace_id=f"chat-mock-{uuid.uuid4().hex[:8]}",
                insufficient_evidence=True,
            )
        education = get_education_content(cancer_type)
        if not education.sources:
            return QuestionAnswer(
                answer="Chưa đủ tài liệu cho chủ đề này để trả lời. Vui lòng trao đổi với bác sĩ.",
                disclaimer=DISCLAIMER_VI,
                trace_id=f"chat-mock-{uuid.uuid4().hex[:8]}",
                insufficient_evidence=True,
            )
        return QuestionAnswer(
            answer=f"(MOCK) Tài liệu hiện có: {education.sources[0].excerpt}",
            sources=education.sources[:1],
            disclaimer=DISCLAIMER_VI,
            trace_id=f"chat-mock-{uuid.uuid4().hex[:8]}",
        )


def _as_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value == 1
    return isinstance(value, str) and value.strip().casefold() in {"true", "yes", "y", "1", "có", "co"}


def _as_float(value: object) -> float | None:
    try:
        return float(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def _family_history_answers(answers: list[Answer]) -> list[str]:
    values: list[str] = []
    for answer in answers:
        if answer.question_id != "family_history":
            continue
        if isinstance(answer.value, (list, tuple, set)):
            values.extend(str(value) for value in answer.value)
        elif answer.value is not None:
            values.append(str(answer.value))
    return values


def _family_history_cancers(values: list[str]) -> set[CancerType]:
    normalized = [value.strip().casefold() for value in values]
    return {
        cancer_type
        for cancer_type, labels in _FAMILY_HISTORY_LABELS.items()
        if any(any(label in value for label in labels) for value in normalized)
    }
