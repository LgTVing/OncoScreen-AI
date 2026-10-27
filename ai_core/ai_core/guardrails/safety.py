"""Guardrail an toàn đầu vào/đầu ra.

Đầu vào: nhận diện yêu cầu chẩn đoán/diễn giải kết quả/điều trị (ngoài phạm vi), dấu hiệu prompt injection.
Đầu ra: chặn ngôn ngữ chẩn đoán (S1), item không nguồn (S2), con số không có trong bằng chứng
(chống bịa mốc tuổi/chu kỳ).
Dùng ở các agent và ở backend khi bác sĩ sửa plan.
"""

from __future__ import annotations

import re

from ai_core.schemas import ScreeningPlan
from ai_core.text import fold

_DIAGNOSIS_PATTERNS = [
    r"\bbạn (đã |đang |có thể đã )?(bị|mắc)\b",
    r"\bbệnh nhân (đã |đang )?(bị|mắc) ung thư\b",
    r"\bchẩn đoán (là|bạn)\b",
    r"\bkết luận (bạn|là)\b.*ung thư",
    r"\b(chắc chắn|khả năng cao) (là |bị )?ung thư\b",
    r"\byou (have|are diagnosed)\b",
]
_RE = re.compile("|".join(_DIAGNOSIS_PATTERNS), re.IGNORECASE)

_OUT_OF_SCOPE = re.compile(
    "|".join(
        [
            r"(co (bi|mac)|bi|mac) (benh )?ung thu (khong|ko|chua|k)\b",
            r"co phai (la )?ung thu",
            r"chan doan (giup|cho|xem)",
            r"(doc|xem|giai thich) (giup |ho )?(ket qua|phim|chi so)",
            r"ket qua .{0,25}(xet nghiem|sinh thiet|nhu anh|chup|ct|sieu am|noi soi|pap|hpv|psa|afp|cea)"
            r".{0,30}(co sao|nghia la|the nao|binh thuong|bat thuong|ung thu|xau)",
            r"(chi so|psa|afp|cea|ca ?125|ca ?19.?9) .{0,25}(cao|thap|bat thuong|co sao|nghia la)",
            r"(cach|phuong phap|nen) dieu tri",
            r"dieu tri (the nao|ra sao|nhu the nao|o dau|bang gi)",
            r"\b(hoa tri|xa tri)\b",
            r"uong thuoc (gi|nao)",
        ]
    )
)
_INJECTION = re.compile(
    r"(ignore (all |the )?(previous|above|prior) instructions|disregard (the )?(system|previous)|system prompt|"
    r"you are now|developer mode|bo qua (moi|tat ca|cac) (huong dan|chi dan|quy tac)|"
    r"(quen|bo qua) (system|vai tro)|dong vai (bac si|chuyen gia) (va|de) chan doan)"
)
_NUMBER = re.compile(r"\d+(?:[.,]\d+)?")
_LIST_MARKER = re.compile(r"^\s*\d+[.)]\s", re.MULTILINE)


class GuardrailViolation(Exception):
    pass


_NEGATED_CLAIM = re.compile(r"(khong co nghia la|khong phai la|khong phai|chua chac|khong|chua)\s*(la\s*)?$")


def find_diagnosis_language(text: str) -> list[str]:
    """Cụm từ khẳng định chẩn đoán; bỏ qua câu phủ định như "không có nghĩa là bạn mắc bệnh"."""
    return [
        m.group(0)
        for m in _RE.finditer(text)
        if not _NEGATED_CLAIM.search(fold(text[max(0, m.start() - 30) : m.start()]))
    ]


def is_out_of_scope_request(text: str) -> bool:
    """Câu hỏi đòi chẩn đoán, đọc kết quả xét nghiệm/hình ảnh hoặc tư vấn điều trị."""
    return bool(_OUT_OF_SCOPE.search(fold(text)))


def looks_like_prompt_injection(text: str) -> bool:
    return bool(_INJECTION.search(fold(text)))


def ungrounded_numbers(text: str, evidence: list[str]) -> list[str]:
    """Các con số trong `text` không xuất hiện ở bất kỳ bằng chứng nào (nguồn, gợi ý, lời người dùng)."""
    allowed = {n.replace(",", ".") for chunk in evidence for n in _NUMBER.findall(chunk)}
    cleaned = _LIST_MARKER.sub("", text)
    return [n for n in _NUMBER.findall(cleaned) if n.replace(",", ".") not in allowed]


def validate_plan(plan: ScreeningPlan) -> ScreeningPlan:
    """Raise GuardrailViolation nếu vi phạm; trả lại plan nếu ổn."""
    problems: list[str] = []
    for i, item in enumerate(plan.items):
        if not item.sources:
            problems.append(f"item[{i}] không có nguồn")
        for hit in find_diagnosis_language(item.rationale):
            problems.append(f"item[{i}].rationale chứa ngôn ngữ chẩn đoán: {hit!r}")
    for hit in find_diagnosis_language(plan.general_advice):
        problems.append(f"general_advice chứa ngôn ngữ chẩn đoán: {hit!r}")
    if problems:
        raise GuardrailViolation("; ".join(problems))
    return plan
