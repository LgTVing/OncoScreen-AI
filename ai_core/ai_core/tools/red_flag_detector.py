"""Tool: red-flag detector — RULE-BASED, chạy TRƯỚC mọi suy luận LLM (ràng buộc S3).

Nguồn rule: data/red_flags.json. Hai đường vào:
- câu trả lời bảng hỏi có question_id == code (vd. symptom_lump=true);
- văn bản tự do (chat, other_symptoms): so khớp pattern không dấu, bỏ qua câu phủ định ("không sờ thấy khối u").
Cờ đã ghi nhận không bao giờ bị gỡ trong cùng phiên (fail-safe).
"""

from __future__ import annotations

import json
import re
from functools import lru_cache

from ai_core.config import DATA_DIR
from ai_core.schemas import Answer, RedFlag, RedFlagResult
from ai_core.text import fold, is_negated

_TRUTHY = {"true", "yes", "có", "co", "1"}

RED_FLAG_MESSAGE = (
    "Bạn có dấu hiệu cần được bác sĩ khám trực tiếp sớm. Hệ thống tạm dừng tư vấn tầm soát định kỳ "
    "để bạn ưu tiên đi khám. Điều này không có nghĩa là bạn mắc bệnh — chỉ là cần được đánh giá kỹ hơn."
)


@lru_cache(maxsize=1)
def _rules() -> dict[str, tuple[RedFlag, list[re.Pattern[str]]]]:
    raw = json.loads((DATA_DIR / "red_flags.json").read_text(encoding="utf-8"))
    return {r["code"]: (RedFlag.model_validate(r), [re.compile(p) for p in r.get("patterns", [])]) for r in raw}


def codes_from_answers(answers: list[Answer]) -> list[str]:
    rules = _rules()
    return [a.question_id for a in answers if a.question_id in rules and _is_truthy(a.value)]


def codes_from_text(text: str) -> list[str]:
    folded = fold(text)
    found: list[str] = []
    for code, (_, patterns) in _rules().items():
        for pattern in patterns:
            if any(not is_negated(folded, m.start()) for m in pattern.finditer(folded)):
                found.append(code)
                break
    return found


def result_for_codes(codes: list[str]) -> RedFlagResult:
    rules = _rules()
    flags = [rules[c][0] for c in dict.fromkeys(codes) if c in rules]
    if not flags:
        return RedFlagResult(detected=False)
    flags.sort(key=lambda f: 0 if f.severity.value == "urgent" else 1)
    return RedFlagResult(detected=True, flags=flags, message=RED_FLAG_MESSAGE)


def detect_red_flags(answers: list[Answer], text: str | None = None) -> RedFlagResult:
    codes = codes_from_answers(answers)
    for a in answers:
        if isinstance(a.value, str) and a.question_id not in _rules():
            codes += codes_from_text(a.value)
    if text:
        codes += codes_from_text(text)
    return result_for_codes(codes)


def _is_truthy(v: object) -> bool:
    if isinstance(v, str):
        return v.strip().casefold() in _TRUTHY
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return v == 1
    return v is True
