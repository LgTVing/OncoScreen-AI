"""Hỏi đáp giới hạn ở kế hoạch đã được bác sĩ phê duyệt."""

from __future__ import annotations

import json
import logging
import re
import uuid

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from ai_core.guardrails.disclaimer import DISCLAIMER_VI
from ai_core.guardrails.safety import find_diagnosis_language
from ai_core.llm import get_chat_model
from ai_core.prompts import (
    PATIENT_CHAT_PROMPT,
    PATIENT_CHAT_SYSTEM_PROMPT,
    PATIENT_QA_PROMPT,
    SYSTEM_PROMPT,
)
from ai_core.schemas import CancerType, ChatTurn, QuestionAnswer, ScreeningPlan, Source
from ai_core.tools.education import get_education_content

logger = logging.getLogger(__name__)

NO_ANSWER = "Chưa đủ thông tin trong kế hoạch đã duyệt để trả lời câu hỏi này. Vui lòng trao đổi với bác sĩ."
_CLINICAL_QUESTION = re.compile(
    r"triệu chứng|chẩn đoán|điều trị|kết quả (xét nghiệm|nhũ ảnh|ct|sinh thiết)|"
    r"có phải.*ung thư|đau (ở|vùng)|chảy máu|khối u|u cục|"
    r"\btôi (bị|mắc|đang|nên|cần)\b",
    re.IGNORECASE,
)


class AnswerDraft(BaseModel):
    answer: str
    source_ids: list[str] = Field(default_factory=list)
    insufficient_evidence: bool = False


def needs_clinical_review(question: str) -> bool:
    return bool(_CLINICAL_QUESTION.search(question))


def _fallback(trace_id: str, message: str = NO_ANSWER) -> QuestionAnswer:
    return QuestionAnswer(
        answer=message,
        disclaimer=DISCLAIMER_VI,
        trace_id=trace_id,
        insufficient_evidence=True,
    )


def _invoke_answer(prompt: str, system_prompt: str, source_map: dict[str, Source], trace_id: str) -> QuestionAnswer:
    try:
        model = get_chat_model().with_structured_output(AnswerDraft)
        draft = AnswerDraft.model_validate(
            model.invoke([SystemMessage(content=system_prompt), HumanMessage(content=prompt)])
        )
    except Exception as exc:  # noqa: BLE001 — không trả lời tự suy đoán khi LLM lỗi
        logger.warning(
            "patient_qa_unavailable trace_id=%s error_type=%s http_status=%s",
            trace_id,
            type(exc).__name__,
            getattr(exc, "status_code", None),
        )
        return _fallback(trace_id)
    citations = [source_map[doc_id] for doc_id in dict.fromkeys(draft.source_ids) if doc_id in source_map]
    if (
        draft.insufficient_evidence
        or not citations
        or not draft.answer.strip()
        or find_diagnosis_language(draft.answer)
    ):
        return _fallback(trace_id)
    return QuestionAnswer(
        answer=draft.answer.strip(),
        sources=citations,
        disclaimer=DISCLAIMER_VI,
        trace_id=trace_id,
    )


def answer_question(question: str, plan: ScreeningPlan | None) -> QuestionAnswer:
    trace_id = f"qa-{uuid.uuid4().hex[:12]}"
    if plan is None or needs_clinical_review(question):
        return _fallback(trace_id)
    source_map = {source.doc_id: source for item in plan.items for source in item.sources}
    if not source_map:
        return _fallback(trace_id)
    prompt = PATIENT_QA_PROMPT.format(
        question=question,
        plan=json.dumps(plan.model_dump(mode="json"), ensure_ascii=False),
        sources=json.dumps([s.model_dump(mode="json") for s in source_map.values()], ensure_ascii=False),
    )
    return _invoke_answer(prompt, SYSTEM_PROMPT, source_map, trace_id)


def answer_education_question(question: str, cancer_type: CancerType, history: list[ChatTurn]) -> QuestionAnswer:
    """Chat kiến thức chung từ guideline tại chỗ; không cần phiên tầm soát đã duyệt."""
    trace_id = f"chat-{uuid.uuid4().hex[:12]}"
    message = "Chưa đủ tài liệu cho chủ đề này để trả lời. Vui lòng trao đổi với bác sĩ."
    if needs_clinical_review(question):
        return _fallback(
            trace_id,
            "Câu hỏi này cần bác sĩ đánh giá trực tiếp; trợ lý chỉ giải thích kiến thức tầm soát chung.",
        )
    education = get_education_content(cancer_type)
    source_map = {source.doc_id: source for source in education.sources}
    if not source_map:
        return _fallback(trace_id, message)
    prompt = PATIENT_CHAT_PROMPT.format(
        topic=cancer_type.value,
        history=json.dumps([turn.model_dump() for turn in history[-8:]], ensure_ascii=False),
        sources=json.dumps([source.model_dump(mode="json") for source in source_map.values()], ensure_ascii=False),
        question=question,
    )
    result = _invoke_answer(prompt, PATIENT_CHAT_SYSTEM_PROMPT, source_map, trace_id)
    return _fallback(trace_id, message) if result.insufficient_evidence else result
