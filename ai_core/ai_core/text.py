"""Chuẩn hoá văn bản tiếng Việt cho rule-based matching và tìm kiếm từ khoá.

Người dùng có thể gõ có dấu hoặc không dấu; mọi pattern rule-based được viết ở dạng không dấu và so khớp trên `fold()`.
"""

from __future__ import annotations

import re
import unicodedata

_SPACES = re.compile(r"\s+")
_NEGATION_BEFORE = re.compile(r"\b(khong|chua|chang|ko|k|chua tung|khong he|khong co)\s+(\w+\s+)?$")


def fold(text: str) -> str:
    """Bỏ dấu, chữ thường, gộp khoảng trắng: "Sờ thấy KHỐI u" → "so thay khoi u"."""
    text = text.replace("đ", "d").replace("Đ", "D")
    decomposed = unicodedata.normalize("NFD", text)
    stripped = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    return _SPACES.sub(" ", stripped.casefold()).strip()


def is_negated(folded: str, start: int, window: int = 24) -> bool:
    """True nếu trước vị trí `start` (cách tối đa một từ) có từ phủ định: "không sờ thấy khối u", "chưa từng hút"."""
    return bool(_NEGATION_BEFORE.search(folded[max(0, start - window) : start] + " ")) if start else False


def sentences(folded: str) -> list[str]:
    return [part.strip() for part in re.split(r"[.;!?\n]+", folded) if part.strip()]
